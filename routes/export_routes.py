import io

import pandas as pd
from flask import Blueprint, Response, jsonify, request

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
