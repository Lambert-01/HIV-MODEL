import numpy as np
from flask import Blueprint, jsonify, request

from model.fractional_sita_model import sita_rhs
from model.fractional_solver import fractional_abm_solver
from model.reproduction_number import compute_r0, epidemic_status
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

    result = {
        "status": "success",
        "r0": r0,
        "epidemic_status": epidemic_status(r0),
        "summary": {
            "peak_infected": float(I[peak_index]),
            "time_peak": float(t_grid[peak_index]),
            "final_susceptible": float(S[-1]),
            "final_infected": float(I[-1]),
            "final_treated": float(T[-1]),
            "final_aids": float(A[-1]),
            "final_population": float(N[-1]),
            "memory_order": float(params["q"]),
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


@simulation_bp.post("/api/simulate")
def simulate():
    result, errors = run_engine(request.get_json(silent=True) or {})
    if errors:
        return jsonify({"status": "error", "errors": errors}), 400
    return jsonify(result)


@simulation_bp.get("/api/scenarios")
def scenario_presets():
    return jsonify({"status": "success", "scenarios": SCENARIOS})


@simulation_bp.post("/api/scenario")
def scenario_compare():
    payload = request.get_json(silent=True) or {}
    selected = payload.get("scenarios") or [
        "no_intervention",
        "awareness_only",
        "safer_behaviour",
        "testing_boost",
        "adherence_support",
        "combined_intervention",
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
        comparisons.append(
            {
                "key": key,
                "name": SCENARIOS[key]["name"],
                "r0": result["r0"],
                "peak_infected": summary["peak_infected"],
                "final_infected": summary["final_infected"],
                "final_aids": summary["final_aids"],
                "final_treated": summary["final_treated"],
            }
        )
        curves[key] = {
            "name": SCENARIOS[key]["name"],
            "time": result["time_series"]["time"],
            "I": result["time_series"]["I"],
        }

    return jsonify({"status": "success", "comparisons": comparisons, "curves": curves})


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
