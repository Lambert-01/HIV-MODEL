import copy
import json
from collections import OrderedDict

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
SIMULATION_CACHE_LIMIT = 64
_simulation_cache = OrderedDict()


def _cache_key(clean_payload, downsample):
    return json.dumps({"payload": clean_payload, "downsample": downsample}, sort_keys=True, separators=(",", ":"))


def _cache_get(key):
    if key not in _simulation_cache:
        return None
    _simulation_cache.move_to_end(key)
    return copy.deepcopy(_simulation_cache[key])


def _cache_set(key, value):
    _simulation_cache[key] = copy.deepcopy(value)
    _simulation_cache.move_to_end(key)
    while len(_simulation_cache) > SIMULATION_CACHE_LIMIT:
        _simulation_cache.popitem(last=False)


def _downsample(arr, target=DOWNSAMPLE_TARGET):
    """Return at most `target` evenly-spaced elements from arr."""
    n = len(arr)
    if n <= target:
        return arr
    idx = np.round(np.linspace(0, n - 1, target)).astype(int)
    return arr[idx]


def _animation_frame_indices(length, target=64):
    """Backend animation timeline used by the dashboard frontend."""
    length = int(length or 0)
    if length <= 1:
        return [0]
    frames = max(24, min(int(target), length))
    progress = np.linspace(0.0, 1.0, frames)
    eased = 1.0 - np.power(1.0 - progress, 2.35)
    idx = np.unique(np.round(eased * (length - 1)).astype(int))
    if idx[0] != 0:
        idx = np.insert(idx, 0, 0)
    if idx[-1] != length - 1:
        idx = np.append(idx, length - 1)
    return idx.astype(int).tolist()


def build_animation_payload(time_values, params=None):
    """Return animation metadata prepared in Python and consumed by Plotly UI."""
    frames = _animation_frame_indices(len(time_values))
    duration_ms = 1800
    return {
        "source": "python-engine",
        "duration_ms": duration_ms,
        "frame_ms": max(18, int(duration_ms / max(len(frames), 1))),
        "frame_indices": frames,
        "styles": {
            "line": {"name": "Animated Line", "description": "Line draws from the backend timeline."},
            "stack": {"name": "Animated Stack", "description": "Stacked population reveals over time."},
            "phase": {"name": "Phase Motion", "description": "Phase trajectory advances along backend frames."},
            "bar": {"name": "Bar Growth", "description": "Bars grow according to backend ranked values."},
            "race": {"name": "Bar Race", "description": "Bars reveal by ranked magnitude."},
        },
        "charts": {
            "mainChart": {"style": "line", "label": "Animated Line", "frame_indices": frames},
            "infectedChart": {"style": "line", "label": "Animated Line", "frame_indices": frames},
            "treatedAidsChart": {"style": "line", "label": "Animated Line", "frame_indices": frames},
            "stackedChart": {"style": "stack", "label": "Animated Stack", "frame_indices": frames},
            "populationChart": {"style": "line", "label": "Animated Line", "frame_indices": frames},
            "phaseChart": {"style": "phase", "label": "Phase Motion", "frame_indices": frames},
            "interventionChart": {
                "style": "bar",
                "label": "Bar Growth",
                "bar_order": _ranked_keys(params or {}, ["u1", "u2", "u3", "u4"]),
            },
            "interventionDetailChart": {
                "style": "bar",
                "label": "Bar Growth",
                "bar_order": _ranked_keys(params or {}, ["u1", "u2", "u3", "u4"]),
            },
        },
    }


def _ranked_keys(values, keys):
    ranked = sorted(
        enumerate(keys),
        key=lambda item: abs(float(values.get(item[1], 0.0))),
        reverse=True,
    )
    return [index for index, _key in ranked]


def build_baseline_interpretation(summary, r0, status, stability_text, initial, rates):
    """Build the dashboard interpretation from Python-computed outputs."""
    peak = summary["peak_infected"]
    time_peak = summary["time_peak"]
    final_i = summary["final_infected"]
    final_t = summary["final_treated"]
    final_a = summary["final_aids"]
    final_n = summary["final_population"]
    q = summary["memory_order"]
    bound = summary["bounded_limit"]
    bound_ok = summary["bounded_ok"]
    initial_i = float(initial["I0"])
    i_change = final_i - initial_i
    i_change_pct = (i_change / initial_i * 100.0) if initial_i > 0 else 0.0

    if time_peak <= 1e-9:
        headline = (
            f"The maximum infected value is the initial condition I(0)={peak:.0f}; "
            "after simulation begins, the infected trajectory declines under the selected controls."
        )
    else:
        headline = (
            f"The infected population rises to a peak of {peak:.0f} at t={time_peak:.1f} years "
            "before declining under the selected controls."
        )

    memory_text = (
        f" Because q={q:.2f}<1, the simulation uses a fractional memory model, so previous states influence the current trajectory."
        if q < 0.999
        else " Because q is approximately 1, the simulation is equivalent to the classical ordinary-order model."
    )
    bound_text = ""
    if bound is not None:
        bound_text = (
            f" The final total population is {final_n:.1f}, and the feasible-bound check "
            f"{'is satisfied' if bound_ok else 'requires attention'} against {bound:.1f}."
        )

    return {
        "headline": headline,
        "body": (
            f"At the end of the simulation, the computed values are I={final_i:.1f}, "
            f"T={final_t:.1f}, A={final_a:.1f}, and N={final_n:.1f}. "
            f"Infected individuals changed from I(0)={initial_i:.1f} to I(final)={final_i:.1f} "
            f"({i_change_pct:+.1f}%). The reproduction number is R0={r0:.3f}, giving a "
            f"{status.lower()} status. The effective rates used by the engine are "
            f"beta_eff={rates['beta_eff']:.5f}, tau_eff={rates['tau_eff']:.5f}, "
            f"and rho_eff={rates['rho_eff']:.5f}. {stability_text}{memory_text}{bound_text}"
        ),
    }


def run_engine(payload, downsample=True):
    errors = validate_payload(payload)
    if errors:
        return None, errors

    clean = coerce_payload(payload)
    key = _cache_key(clean, downsample)
    cached = _cache_get(key)
    if cached is not None:
        cached["cache_hit"] = True
        return cached, []

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
    asymptotic_bound = float(params["Lambda"] / params["mu"]) if params["mu"] > 0 else None
    finite_time_bound = max(float(N[0]), asymptotic_bound) if asymptotic_bound is not None else None
    bounded_ok = bool(finite_time_bound is None or np.nanmax(N) <= finite_time_bound * 1.05)

    # Downsample for browser transfer — keeps peak point
    if downsample:
        if len(t_grid) <= DOWNSAMPLE_TARGET:
            keep = np.arange(len(t_grid))
        else:
            keep = np.round(np.linspace(0, len(t_grid) - 1, DOWNSAMPLE_TARGET)).astype(int)
        if peak_index not in keep:
            keep = np.sort(np.append(keep, peak_index))
        t_out = t_grid[keep]
        S_out, I_out, T_out, A_out, N_out = S[keep], I[keep], T[keep], A[keep], N[keep]
    else:
        t_out, S_out, I_out, T_out, A_out, N_out = t_grid, S, I, T, A, N

    result = {
        "status": "success",
        "cache_hit": False,
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
            "bounded_limit": finite_time_bound,
            "asymptotic_bound": asymptotic_bound,
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
    result["baseline_interpretation"] = build_baseline_interpretation(
        result["summary"],
        r0,
        result["epidemic_status"],
        result["stability_text"],
        initial,
        rates,
    )
    result["animation"] = build_animation_payload(result["time_series"]["time"], params)
    _cache_set(key, result)
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
                "key": key,
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

    single_keys = {"awareness_only", "safer_behaviour", "testing_boost", "adherence_support"}
    combined_keys = {"combined_intervention", "combined_moderate", "strong_combined"}
    single_rows = [row for row in scenario_rows if row["key"] in single_keys]
    combined_rows = [row for row in scenario_rows if row["key"] in combined_keys]

    summary = result["summary"]
    rates = result["effective_rates"]
    best_r0 = min(scenario_rows, key=lambda row: row["r0"]) if scenario_rows else None
    best_final_i = min(scenario_rows, key=lambda row: row["final_infected"]) if scenario_rows else None
    strongest_positive = max(sensitivity_rows, key=lambda row: row["sensitivity"]) if sensitivity_rows else None
    strongest_negative = min(sensitivity_rows, key=lambda row: row["sensitivity"]) if sensitivity_rows else None
    ordinary_memory = next((row for row in memory_rows if abs(row["q"] - 1.0) < 1e-9), memory_rows[0])
    strongest_memory = min(memory_rows, key=lambda row: row["q"])
    highest_memory_i = max(memory_rows, key=lambda row: row["final_infected"])
    lowest_memory_i = min(memory_rows, key=lambda row: row["final_infected"])
    highest_memory_peak = max(memory_rows, key=lambda row: row["peak_infected"])

    if summary["time_peak"] <= 1e-9:
        peak_sentence = (
            f"The maximum infected value was the initial value I(0) = {summary['peak_infected']:.0f}; "
            "after the simulation begins, the infected trajectory declines under the selected controls"
        )
    else:
        peak_sentence = (
            f"The infected population reached {summary['peak_infected']:.0f} individuals "
            f"at t = {summary['time_peak']:.1f} years"
        )

    baseline_text = (
        "The baseline fractional-order SITA simulation produced "
        f"R0 = {result['r0']:.3f}, corresponding to a {result['epidemic_status'].lower()} "
        f"epidemic status. {peak_sentence}, "
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
    best_single = min(single_rows, key=lambda row: row["r0"]) if single_rows else None
    best_combined = min(combined_rows, key=lambda row: row["r0"]) if combined_rows else None
    single_text = (
        f"Among the single-intervention experiments, {best_single['scenario']} produced the lowest "
        f"R0 value ({best_single['r0']:.3f}). This section allows awareness, safer behaviour, testing, "
        "and adherence to be compared independently before combining the controls."
    )
    combined_text = (
        f"The strongest combined strategy was {best_combined['scenario']}, with R0 = "
        f"{best_combined['r0']:.3f} and final infected population "
        f"{best_combined['final_infected']:.0f}. This demonstrates the value of applying multiple "
        "behavioural and treatment-support interventions together."
    )
    memory_text = (
        "The memory comparison evaluates q = 1.00, 0.95, 0.85, and 0.75 under the same "
        f"parameter configuration. In this run, the ordinary q = {ordinary_memory['q']:.2f} case "
        f"ended with I = {ordinary_memory['final_infected']:.1f}, while the strongest-memory "
        f"case q = {strongest_memory['q']:.2f} ended with I = {strongest_memory['final_infected']:.1f}. "
        f"Final infected was highest at q = {highest_memory_i['q']:.2f} "
        f"({highest_memory_i['final_infected']:.1f}) and lowest at q = {lowest_memory_i['q']:.2f} "
        f"({lowest_memory_i['final_infected']:.1f}). The largest infected peak appeared at "
        f"q = {highest_memory_peak['q']:.2f} with peak I = {highest_memory_peak['peak_infected']:.1f}."
    )
    sensitivity_text = (
        f"The largest positive normalized sensitivity is {strongest_positive['parameter']} "
        f"({strongest_positive['sensitivity']:.3f}), indicating a parameter that increases R0. "
        f"The strongest negative sensitivity is {strongest_negative['parameter']} "
        f"({strongest_negative['sensitivity']:.3f}), indicating a parameter that reduces R0."
    )
    dashboard_text = (
        "The dashboard demonstration should include screenshots of the Baseline, Memory Effect, "
        "Scenario Comparison, Sensitivity, and Chapter 6 tabs. These figures show that the model "
        "is not only formulated mathematically but also implemented as an interactive simulation tool."
    )
    public_health_text = (
        "In public-health terms, lower transmission rates reduce new infections, faster testing and "
        "treatment uptake move infected individuals into care earlier, and improved adherence reduces "
        "progression to AIDS. The simulations should be interpreted as academic scenario evidence, not "
        "clinical or policy prediction."
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
            "single_interventions": single_rows,
            "combined_interventions": combined_rows,
            "sensitivity": sensitivity_rows,
            "memory": memory_rows,
        },
        "narrative": {
            "baseline": baseline_text,
            "scenarios": scenario_text,
            "single_interventions": single_text,
            "combined_intervention": combined_text,
            "memory": memory_text,
            "sensitivity": sensitivity_text,
            "dashboard_demo": dashboard_text,
            "public_health": public_health_text,
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
        rows = compute_sensitivity(values)
        strongest_positive = max(rows, key=lambda row: row["sensitivity"]) if rows else None
        strongest_negative = min(rows, key=lambda row: row["sensitivity"]) if rows else None
        strongest_abs = max(rows, key=lambda row: abs(row["sensitivity"])) if rows else None
        interpretation = ""
        if strongest_positive and strongest_negative and strongest_abs:
            interpretation = (
                f"The current parameter set is most sensitive in absolute value to "
                f"{strongest_abs['parameter']} ({strongest_abs['sensitivity']:.3f}). "
                f"The strongest positive index is {strongest_positive['parameter']} "
                f"({strongest_positive['sensitivity']:.3f}), meaning increases in that quantity raise R0. "
                f"The strongest negative index is {strongest_negative['parameter']} "
                f"({strongest_negative['sensitivity']:.3f}), meaning increases in that quantity reduce R0."
            )
        return jsonify({"status": "success", "sensitivity": rows, "interpretation": interpretation})
    except Exception as exc:
        return jsonify({"status": "error", "errors": [str(exc)]}), 400


@simulation_bp.post("/api/memory")
def memory_compare():
    payload = request.get_json(silent=True) or {}
    q_values = payload.get("q_values", [1.0, 0.95, 0.85, 0.75])
    results = []
    summaries = []
    for q in q_values:
        p = dict(payload)
        if "parameters" in p:
            p["parameters"] = dict(p["parameters"])
            p["parameters"]["q"] = q
        result, errors = run_engine(p)
        if errors:
            return jsonify({"status": "error", "errors": errors}), 400
        summary = result["summary"]
        results.append({"q": q, "time": result["time_series"]["time"], "I": result["time_series"]["I"]})
        summaries.append(
            {
                "q": float(q),
                "peak_infected": summary["peak_infected"],
                "time_peak": summary["time_peak"],
                "final_infected": summary["final_infected"],
                "final_treated": summary["final_treated"],
                "final_aids": summary["final_aids"],
            }
        )

    interpretation = ""
    if summaries:
        ordinary = next((row for row in summaries if abs(row["q"] - 1.0) < 1e-9), summaries[0])
        strongest_memory = min(summaries, key=lambda row: row["q"])
        highest_final_i = max(summaries, key=lambda row: row["final_infected"])
        lowest_final_i = min(summaries, key=lambda row: row["final_infected"])
        interpretation = (
            f"Under the current parameter set, q={ordinary['q']:.2f} ends with "
            f"I={ordinary['final_infected']:.1f}, while q={strongest_memory['q']:.2f} ends with "
            f"I={strongest_memory['final_infected']:.1f}. Final infected is highest at "
            f"q={highest_final_i['q']:.2f} ({highest_final_i['final_infected']:.1f}) and lowest at "
            f"q={lowest_final_i['q']:.2f} ({lowest_final_i['final_infected']:.1f})."
        )

    return jsonify({"status": "success", "curves": results, "summaries": summaries, "interpretation": interpretation})


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
