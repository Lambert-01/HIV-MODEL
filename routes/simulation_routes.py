import numpy as np
from flask import Blueprint, jsonify, request

from model.fractional_sita_model import sita_rhs
from model.fractional_solver import fractional_abm_solver
from model.reproduction_number import compute_effective_rates, compute_r0, epidemic_status, stability_interpretation
from model.scenarios import SCENARIOS
from model.sensitivity import compute_sensitivity
from model.validation import coerce_payload, validate_payload


simulation_bp = Blueprint("simulation", __name__)


def run_engine(payload):
    errors = validate_payload(payload)
    if errors:
        return None, errors

    clean = coerce_payload(payload)
    initial = clean["initial_conditions"]
    params = clean["parameters"]
    simulation = clean["simulation"]

    t_grid = np.arange(0.0, simulation["years"] + simulation["step"], simulation["step"])
    y0 = [initial["S0"], initial["I0"], initial["T0"], initial["A0"]]
    y = fractional_abm_solver(sita_rhs, y0, t_grid, params["q"], params)
    S, I, T, A = y.T
    N = S + I + T + A

    peak_index = int(np.argmax(I))
    r0 = float(compute_r0(params))
    rates = compute_effective_rates(params)
    bounded_limit = float(params["Lambda"] / params["mu"]) if params["mu"] > 0 else None
    bounded_ok = bool(bounded_limit is None or np.nanmax(N) <= bounded_limit * 1.05)

    result = {
        "status": "success",
        "r0": r0,
        "epidemic_status": epidemic_status(r0),
        "effective_rates": rates,
        "stability_text": stability_interpretation(r0),
        "summary": {
            "peak_infected": float(I[peak_index]),
            "time_peak": float(t_grid[peak_index]),
            "final_susceptible": float(S[-1]),
            "final_infected": float(I[-1]),
            "final_treated": float(T[-1]),
            "final_aids": float(A[-1]),
            "final_population": float(N[-1]),
            "memory_order": float(params["q"]),
            "bounded_limit": bounded_limit,
            "bounded_ok": bounded_ok,
        },
        "time_series": {
            "time": t_grid.round(6).tolist(),
            "S": S.round(6).tolist(),
            "I": I.round(6).tolist(),
            "T": T.round(6).tolist(),
            "A": A.round(6).tolist(),
            "N": N.round(6).tolist(),
        },
        "parameters": params,
        "initial_conditions": initial,
        "simulation": simulation,
    }
    return result, []


def scenario_interpretation(key, comparison):
    name = comparison["name"]
    r0 = comparison["r0"]
    status = epidemic_status(r0)
    intro = {
        "no_intervention": "This scenario represents natural disease dynamics without social behaviour intervention.",
        "awareness_only": "Awareness reduces risky behaviour and lowers the effective transmission rate.",
        "safer_behaviour": "Safer sexual behaviour reduces the probability of transmission per contact.",
        "testing_boost": "Testing and treatment-seeking move infected individuals into treatment faster.",
        "adherence_support": "Adherence reduces progression from treatment to AIDS and can lower AIDS-stage burden.",
        "combined_moderate": "Combined moderate intervention reduces transmission, increases treatment uptake, and reduces AIDS progression.",
        "combined_intervention": "Combined intervention applies multiple behavioural and treatment supports at the same time.",
        "strong_combined": "Strong combined intervention is designed to push the reproduction number below the epidemic threshold.",
        "ordinary_model": "This scenario uses q=1, representing the classical ordinary model without fractional memory.",
        "high_memory": "This scenario uses lower q, representing stronger fractional memory effects.",
    }.get(key, f"{name} is evaluated under the selected parameter set.")
    return f"{intro} The computed status is {status} with R0 = {r0:.3f}."


@simulation_bp.post("/api/simulate")
def simulate():
    result, errors = run_engine(request.get_json(silent=True) or {})
    if errors:
        return jsonify({"status": "error", "errors": errors}), 400
    return jsonify(result)


@simulation_bp.get("/api/scenarios")
def scenario_presets():
    return jsonify({"status": "success", "scenarios": SCENARIOS})


@simulation_bp.post("/api/r0")
def r0_live():
    payload = request.get_json(silent=True) or {}
    params = payload.get("parameters", {})
    try:
        values = {key: float(value) for key, value in params.items()}
        rates = compute_effective_rates(values)
        r0 = float(compute_r0(values))
        return jsonify(
            {
                "status": "success",
                "r0": r0,
                "epidemic_status": epidemic_status(r0),
                "stability_text": stability_interpretation(r0),
                **rates,
            }
        )
    except Exception as exc:
        return jsonify({"status": "error", "errors": [str(exc)]}), 400


@simulation_bp.post("/api/scenario")
def scenario_compare():
    payload = request.get_json(silent=True) or {}
    selected = payload.get("scenarios") or [
        "no_intervention",
        "awareness_only",
        "safer_behaviour",
        "testing_boost",
        "adherence_support",
        "combined_moderate",
        "combined_intervention",
        "strong_combined",
        "ordinary_model",
        "high_memory",
    ]

    base_payload = payload.get("base_payload", payload)
    comparisons = []
    curves = {}

    for key in selected:
        if key not in SCENARIOS:
            continue
        scenario_payload = {
            "initial_conditions": dict(base_payload.get("initial_conditions", {})),
            "parameters": dict(base_payload.get("parameters", {})),
            "simulation": dict(base_payload.get("simulation", {})),
        }
        scenario_payload["parameters"].update(
            {k: v for k, v in SCENARIOS[key].items() if k in {"q", "u1", "u2", "u3", "u4"}}
        )
        result, errors = run_engine(scenario_payload)
        if errors:
            return jsonify({"status": "error", "errors": errors}), 400

        summary = result["summary"]
        rates = result["effective_rates"]
        comparison = {
            "key": key,
            "name": SCENARIOS[key]["name"],
            "q": result["parameters"]["q"],
            "u1": result["parameters"]["u1"],
            "u2": result["parameters"]["u2"],
            "u3": result["parameters"]["u3"],
            "u4": result["parameters"]["u4"],
            "beta_eff": rates["beta_eff"],
            "tau_eff": rates["tau_eff"],
            "rho_eff": rates["rho_eff"],
            "r0": result["r0"],
            "status": result["epidemic_status"],
            "peak_infected": summary["peak_infected"],
            "time_peak": summary["time_peak"],
            "final_infected": summary["final_infected"],
            "final_aids": summary["final_aids"],
            "final_treated": summary["final_treated"],
        }
        comparison["interpretation"] = scenario_interpretation(key, comparison)
        comparisons.append(
            comparison
        )
        curves[key] = {
            "name": SCENARIOS[key]["name"],
            "time": result["time_series"]["time"],
            "I": result["time_series"]["I"],
            "A": result["time_series"]["A"],
            "T": result["time_series"]["T"],
            "S": result["time_series"]["S"],
        }

    best = {
        "lowest_r0": min(comparisons, key=lambda row: row["r0"]) if comparisons else None,
        "lowest_final_infected": min(comparisons, key=lambda row: row["final_infected"]) if comparisons else None,
        "lowest_final_aids": min(comparisons, key=lambda row: row["final_aids"]) if comparisons else None,
    }
    return jsonify({"status": "success", "comparisons": comparisons, "curves": curves, "best": best})

@simulation_bp.post("/api/sensitivity")
def sensitivity():
    payload = request.get_json(silent=True) or {}
    params = payload.get("parameters", {})
    try:
        values = {key: float(value) for key, value in params.items()}
        return jsonify({"status": "success", "sensitivity": compute_sensitivity(values)})
    except Exception as exc:
        return jsonify({"status": "error", "errors": [str(exc)]}), 400


@simulation_bp.post("/api/memory")
def memory_compare():
    payload = request.get_json(silent=True) or {}
    q_values = payload.get("q_values", [1.0, 0.95, 0.85, 0.75])
    results = []
    for q in q_values:
        p = dict(payload)
        if "parameters" in p:
            p["parameters"] = dict(p["parameters"])
            p["parameters"]["q"] = q
        result, errors = run_engine(p)
        if errors:
            return jsonify({"status": "error", "errors": errors}), 400
        results.append({"q": q, "time": result["time_series"]["time"], "I": result["time_series"]["I"]})
    return jsonify({"status": "success", "curves": results})
