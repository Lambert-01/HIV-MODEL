import numpy as np
from flask import Blueprint, jsonify, request

from config import DOWNSAMPLE_TARGET
from model.fractional_sita_model import sita_rhs
from model.fractional_solver import fractional_abm_solver
from model.reproduction_number import (
    compute_effective_rates,
    compute_r0,
    disease_free_equilibrium,
    epidemic_status,
    stability_details,
    stability_interpretation,
)
from model.scenarios import SCENARIOS
from model.sensitivity import compute_sensitivity
from model.validation import coerce_payload, validate_payload


simulation_bp = Blueprint("simulation", __name__)


def _downsample(arr, target=DOWNSAMPLE_TARGET):
    """Return at most `target` evenly-spaced elements from arr."""
    n = len(arr)
    if n <= target:
        return arr
    idx = np.round(np.linspace(0, n - 1, target)).astype(int)
    return arr[idx]


def run_engine(payload, downsample=True):
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
    dfe = disease_free_equilibrium(params)
    fractional_stability = stability_details(params)
    bounded_limit = float(params["Lambda"] / params["mu"]) if params["mu"] > 0 else None
    bounded_ok = bool(bounded_limit is None or np.nanmax(N) <= bounded_limit * 1.05)

    # Downsample for browser transfer — keeps peak point
    if downsample:
        keep = np.round(np.linspace(0, len(t_grid) - 1, DOWNSAMPLE_TARGET)).astype(int)
        if peak_index not in keep:
            keep = np.sort(np.append(keep, peak_index))
        t_out = t_grid[keep]
        S_out, I_out, T_out, A_out, N_out = S[keep], I[keep], T[keep], A[keep], N[keep]
    else:
        t_out, S_out, I_out, T_out, A_out, N_out = t_grid, S, I, T, A, N

    result = {
        "status": "success",
        "r0": r0,
        "epidemic_status": epidemic_status(r0),
        "effective_rates": rates,
        "disease_free_equilibrium": dfe,
        "fractional_stability": fractional_stability,
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
            "time": t_out.round(4).tolist(),
            "S": S_out.round(4).tolist(),
            "I": I_out.round(4).tolist(),
            "T": T_out.round(4).tolist(),
            "A": A_out.round(4).tolist(),
            "N": N_out.round(4).tolist(),
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


def build_chapter6_payload(payload):
    result, errors = run_engine(payload, downsample=False)
    if errors:
        return None, errors

    base_payload = {
        "initial_conditions": dict(payload.get("initial_conditions", {})),
        "parameters": dict(payload.get("parameters", {})),
        "simulation": dict(payload.get("simulation", {})),
    }

    scenario_rows = []
    for key, scenario in SCENARIOS.items():
        scenario_payload = {
            "initial_conditions": dict(base_payload["initial_conditions"]),
            "parameters": dict(base_payload["parameters"]),
            "simulation": dict(base_payload["simulation"]),
        }
        scenario_payload["parameters"].update(
            {k: v for k, v in scenario.items() if k in {"q", "u1", "u2", "u3", "u4"}}
        )
        scenario_result, scenario_errors = run_engine(scenario_payload, downsample=True)
        if scenario_errors:
            return None, scenario_errors
        summary = scenario_result["summary"]
        rates = scenario_result["effective_rates"]
        scenario_rows.append(
            {
                "scenario": scenario["name"],
                "q": scenario_result["parameters"]["q"],
                "u1": scenario_result["parameters"]["u1"],
                "u2": scenario_result["parameters"]["u2"],
                "u3": scenario_result["parameters"]["u3"],
                "u4": scenario_result["parameters"]["u4"],
                "beta_eff": rates["beta_eff"],
                "tau_eff": rates["tau_eff"],
                "rho_eff": rates["rho_eff"],
                "r0": scenario_result["r0"],
                "status": scenario_result["epidemic_status"],
                "peak_infected": summary["peak_infected"],
                "time_peak": summary["time_peak"],
                "final_infected": summary["final_infected"],
                "final_treated": summary["final_treated"],
                "final_aids": summary["final_aids"],
            }
        )

    sensitivity_rows = compute_sensitivity(result["parameters"])
    memory_rows = []
    for q in [1.0, 0.95, 0.85, 0.75]:
        memory_payload = {
            "initial_conditions": dict(base_payload["initial_conditions"]),
            "parameters": dict(base_payload["parameters"]),
            "simulation": dict(base_payload["simulation"]),
        }
        memory_payload["parameters"]["q"] = q
        memory_result, memory_errors = run_engine(memory_payload, downsample=True)
        if memory_errors:
            return None, memory_errors
        memory_rows.append(
            {
                "q": q,
                "r0": memory_result["r0"],
                "peak_infected": memory_result["summary"]["peak_infected"],
                "time_peak": memory_result["summary"]["time_peak"],
                "final_infected": memory_result["summary"]["final_infected"],
                "final_treated": memory_result["summary"]["final_treated"],
                "final_aids": memory_result["summary"]["final_aids"],
            }
        )

    summary = result["summary"]
    rates = result["effective_rates"]
    best_r0 = min(scenario_rows, key=lambda row: row["r0"]) if scenario_rows else None
    best_final_i = min(scenario_rows, key=lambda row: row["final_infected"]) if scenario_rows else None
    strongest_positive = max(sensitivity_rows, key=lambda row: row["sensitivity"]) if sensitivity_rows else None
    strongest_negative = min(sensitivity_rows, key=lambda row: row["sensitivity"]) if sensitivity_rows else None

    baseline_text = (
        "The baseline fractional-order SITA simulation produced "
        f"R0 = {result['r0']:.3f}, corresponding to a {result['epidemic_status'].lower()} "
        "epidemic status. The infected population reached "
        f"{summary['peak_infected']:.0f} individuals at t = {summary['time_peak']:.1f} years, "
        f"with final values I = {summary['final_infected']:.0f}, "
        f"T = {summary['final_treated']:.0f}, and A = {summary['final_aids']:.0f}. "
        f"The effective intervention-adjusted rates were beta_eff = {rates['beta_eff']:.4f}, "
        f"tau_eff = {rates['tau_eff']:.4f}, and rho_eff = {rates['rho_eff']:.4f}."
    )
    scenario_text = (
        f"Across the scenario set, {best_r0['scenario']} gave the lowest reproduction number "
        f"(R0 = {best_r0['r0']:.3f}), while {best_final_i['scenario']} gave the lowest final "
        f"infected population ({best_final_i['final_infected']:.0f}). This supports the thesis "
        "interpretation that combined behavioural and treatment-related interventions are more "
        "effective than isolated controls."
    )
    memory_text = (
        "The memory comparison evaluates q = 1.00, 0.95, 0.85, and 0.75 under the same "
        "parameter configuration. Values q < 1 retain fractional memory, so trajectories differ "
        "from the ordinary q = 1 model and provide computational evidence for the Caputo model's "
        "memory effect."
    )
    sensitivity_text = (
        f"The largest positive normalized sensitivity is {strongest_positive['parameter']} "
        f"({strongest_positive['sensitivity']:.3f}), indicating a parameter that increases R0. "
        f"The strongest negative sensitivity is {strongest_negative['parameter']} "
        f"({strongest_negative['sensitivity']:.3f}), indicating a parameter that reduces R0."
    )

    return {
        "status": "success",
        "baseline": result,
        "tables": {
            "baseline_summary": [
                {"quantity": "R0", "value": result["r0"], "interpretation": result["epidemic_status"]},
                {"quantity": "Peak infected", "value": summary["peak_infected"], "interpretation": f"at t={summary['time_peak']:.1f} years"},
                {"quantity": "Final susceptible", "value": summary["final_susceptible"], "interpretation": "S(t_end)"},
                {"quantity": "Final infected", "value": summary["final_infected"], "interpretation": "I(t_end)"},
                {"quantity": "Final treated", "value": summary["final_treated"], "interpretation": "T(t_end)"},
                {"quantity": "Final AIDS", "value": summary["final_aids"], "interpretation": "A(t_end)"},
            ],
            "scenarios": scenario_rows,
            "sensitivity": sensitivity_rows,
            "memory": memory_rows,
        },
        "narrative": {
            "baseline": baseline_text,
            "scenarios": scenario_text,
            "memory": memory_text,
            "sensitivity": sensitivity_text,
            "conclusion": (
                "Overall, the dashboard results connect the analytical threshold result, "
                "fractional memory dynamics, and social behaviour interventions into a single "
                "simulation framework suitable for Chapter 6 discussion."
            ),
        },
    }, []


def build_reliability_payload(payload, step_values=None):
    step_values = step_values or [0.2, 0.1, 0.05]
    rows = []
    reference = None
    for step in step_values:
        test_payload = {
            "initial_conditions": dict(payload.get("initial_conditions", {})),
            "parameters": dict(payload.get("parameters", {})),
            "simulation": dict(payload.get("simulation", {})),
        }
        test_payload["simulation"]["step"] = step
        result, errors = run_engine(test_payload, downsample=False)
        if errors:
            return None, errors
        row = {
            "step": step,
            "steps": len(result["time_series"]["time"]),
            "r0": result["r0"],
            "peak_infected": result["summary"]["peak_infected"],
            "time_peak": result["summary"]["time_peak"],
            "final_infected": result["summary"]["final_infected"],
            "final_treated": result["summary"]["final_treated"],
            "final_aids": result["summary"]["final_aids"],
        }
        rows.append(row)
        reference = row

    for row in rows:
        row["final_infected_abs_error"] = abs(row["final_infected"] - reference["final_infected"])
        row["peak_infected_abs_error"] = abs(row["peak_infected"] - reference["peak_infected"])

    text = (
        f"Using h = {reference['step']:.2f} as the finest reference, the default-step final infected "
        f"absolute difference is {rows[0]['final_infected_abs_error']:.3f}. Smaller step sizes increase "
        "computational cost but provide a useful check that the ABM-type fractional solver gives stable "
        "qualitative conclusions."
    )
    return {"status": "success", "rows": rows, "interpretation": text}, []


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
    # Default: only the 8 scenarios shown in the comparison tab buttons
    selected = payload.get("scenarios") or [
        "no_intervention",
        "awareness_only",
        "safer_behaviour",
        "testing_boost",
        "adherence_support",
        "combined_intervention",
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
        result, errors = run_engine(scenario_payload, downsample=True)
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
        comparisons.append(comparison)
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


@simulation_bp.post("/api/chapter6")
def chapter6():
    result, errors = build_chapter6_payload(request.get_json(silent=True) or {})
    if errors:
        return jsonify({"status": "error", "errors": errors}), 400
    return jsonify(result)


@simulation_bp.post("/api/reliability")
def reliability():
    payload = request.get_json(silent=True) or {}
    step_values = payload.get("step_values", [0.2, 0.1, 0.05])
    try:
        steps = [float(value) for value in step_values]
    except (TypeError, ValueError):
        return jsonify({"status": "error", "errors": ["step_values must be numeric."]}), 400
    result, errors = build_reliability_payload(payload, steps)
    if errors:
        return jsonify({"status": "error", "errors": errors}), 400
    return jsonify(result)
