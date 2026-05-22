import io

import pandas as pd
from flask import Blueprint, Response, jsonify, request

from model.sensitivity import compute_sensitivity
from routes.simulation_routes import build_chapter6_payload
from routes.simulation_routes import build_reliability_payload
from routes.simulation_routes import scenario_compare
from routes.simulation_routes import run_engine


export_bp = Blueprint("export", __name__)


@export_bp.post("/api/export/csv")
def export_csv():
    result, errors = run_engine(request.get_json(silent=True) or {})
    if errors:
        return jsonify({"status": "error", "errors": errors}), 400

    series = result["time_series"]
    df = pd.DataFrame(
        {
            "time": series["time"],
            "S": series["S"],
            "I": series["I"],
            "T": series["T"],
            "A": series["A"],
            "N": series["N"],
        }
    )
    buffer = io.StringIO()
    df.to_csv(buffer, index=False)
    return Response(
        buffer.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=fractional_hiv_simulation.csv"},
    )


@export_bp.post("/api/export/sensitivity.csv")
def export_sensitivity_csv():
    payload = request.get_json(silent=True) or {}
    params = payload.get("parameters", {})
    try:
        values = {key: float(value) for key, value in params.items()}
        df = pd.DataFrame(compute_sensitivity(values))
    except Exception as exc:
        return jsonify({"status": "error", "errors": [str(exc)]}), 400

    buffer = io.StringIO()
    df.to_csv(buffer, index=False)
    return Response(
        buffer.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=fractional_hiv_sensitivity.csv"},
    )


@export_bp.post("/api/export/scenarios.csv")
def export_scenarios_csv():
    # Reuse the scenario endpoint logic through a request context call.
    response = scenario_compare()
    if response.status_code != 200:
        return response

    data = response.get_json()
    df = pd.DataFrame(data["comparisons"])
    buffer = io.StringIO()
    df.to_csv(buffer, index=False)
    return Response(
        buffer.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=fractional_hiv_scenarios.csv"},
    )


@export_bp.post("/api/export/report")
def export_report():
    result, errors = run_engine(request.get_json(silent=True) or {})
    if errors:
        return jsonify({"status": "error", "errors": errors}), 400

    summary = result["summary"]
    rates = result["effective_rates"]
    lines = [
        "FracHIV-SITA Lab Simulation Report",
        "=" * 42,
        "",
        f"R0: {result['r0']:.4f}",
        f"Status: {result['epidemic_status']}",
        f"Stability interpretation: {result['stability_text']}",
        "",
        "Effective rates:",
        f"  beta_eff: {rates['beta_eff']:.6f}",
        f"  tau_eff: {rates['tau_eff']:.6f}",
        f"  rho_eff: {rates['rho_eff']:.6f}",
        "",
        "Simulation outcomes:",
        f"  Peak infected: {summary['peak_infected']:.2f}",
        f"  Time of peak: {summary['time_peak']:.2f}",
        f"  Final infected: {summary['final_infected']:.2f}",
        f"  Final treated: {summary['final_treated']:.2f}",
        f"  Final AIDS: {summary['final_aids']:.2f}",
        f"  Final population: {summary['final_population']:.2f}",
        "",
        "Thesis text:",
        (
            "Under the selected parameter configuration, the fractional-order SITA model "
            f"produced R0 = {result['r0']:.3f}, indicating a {result['epidemic_status'].lower()} "
            "epidemic status. The simulation connects intervention-adjusted transmission, "
            "treatment uptake, AIDS progression, and memory effects in a single computational result."
        ),
    ]
    return Response(
        "\n".join(lines),
        mimetype="text/plain",
        headers={"Content-Disposition": "attachment; filename=fractional_hiv_report.txt"},
    )


@export_bp.post("/api/export/chapter6.txt")
def export_chapter6_text():
    result, errors = build_chapter6_payload(request.get_json(silent=True) or {})
    if errors:
        return jsonify({"status": "error", "errors": errors}), 400

    narrative = result["narrative"]
    lines = [
        "Chapter 6 Draft Results Text",
        "=" * 28,
        "",
        "Baseline simulation",
        narrative["baseline"],
        "",
        "Scenario comparison",
        narrative["scenarios"],
        "",
        "Single interventions",
        narrative["single_interventions"],
        "",
        "Combined intervention",
        narrative["combined_intervention"],
        "",
        "Memory effect",
        narrative["memory"],
        "",
        "Sensitivity analysis",
        narrative["sensitivity"],
        "",
        "Dashboard demonstration",
        narrative["dashboard_demo"],
        "",
        "Public health interpretation",
        narrative["public_health"],
        "",
        "Conclusion",
        narrative["conclusion"],
    ]
    return Response(
        "\n\n".join(lines),
        mimetype="text/plain",
        headers={"Content-Disposition": "attachment; filename=chapter6_results_text.txt"},
    )


@export_bp.post("/api/export/thesis-tables.csv")
def export_thesis_tables_csv():
    result, errors = build_chapter6_payload(request.get_json(silent=True) or {})
    if errors:
        return jsonify({"status": "error", "errors": errors}), 400

    buffer = io.StringIO()
    for name, rows in result["tables"].items():
        buffer.write(f"[{name}]\n")
        pd.DataFrame(rows).to_csv(buffer, index=False)
        buffer.write("\n")

    return Response(
        buffer.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=chapter6_thesis_tables.csv"},
    )


@export_bp.post("/api/export/reliability.csv")
def export_reliability_csv():
    payload = request.get_json(silent=True) or {}
    step_values = payload.get("step_values", [0.2, 0.1, 0.05])
    try:
        steps = [float(value) for value in step_values]
    except (TypeError, ValueError):
        return jsonify({"status": "error", "errors": ["step_values must be numeric."]}), 400

    result, errors = build_reliability_payload(payload, steps)
    if errors:
        return jsonify({"status": "error", "errors": errors}), 400

    buffer = io.StringIO()
    pd.DataFrame(result["rows"]).to_csv(buffer, index=False)
    return Response(
        buffer.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=numerical_reliability.csv"},
    )
