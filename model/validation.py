from config import MAX_STEPS


PARAMETER_KEYS = ["Lambda", "beta0", "mu", "tau", "delta", "rho", "eta", "d", "q", "u1", "u2", "u3", "u4"]
INITIAL_KEYS = ["S0", "I0", "T0", "A0"]


def validate_payload(payload):
    errors = []
    if not isinstance(payload, dict):
        return ["Request body must be a JSON object."]

    initial = payload.get("initial_conditions", {})
    params = payload.get("parameters", {})
    simulation = payload.get("simulation", {})

    for key in INITIAL_KEYS:
        if key not in initial:
            errors.append(f"{key} is required.")
        elif float(initial[key]) < 0:
            errors.append(f"{key} cannot be negative.")

    for key in PARAMETER_KEYS:
        if key not in params:
            errors.append(f"{key} is required.")

    if errors:
        return errors

    for key in ["u1", "u2", "u3", "u4", "eta"]:
        if not 0 <= float(params[key]) <= 1:
            errors.append(f"{key} must be between 0 and 1.")

    if not 0 < float(params["q"]) <= 1:
        errors.append("Fractional order q must satisfy 0 < q <= 1.")

    for key in ["Lambda", "beta0", "mu", "tau", "delta", "rho", "d"]:
        if float(params[key]) < 0:
            errors.append(f"{key} must be non-negative.")

    years = float(simulation.get("years", 0))
    step = float(simulation.get("step", 0))
    if years <= 0:
        errors.append("Simulation years must be greater than 0.")
    if step <= 0:
        errors.append("Time step must be positive.")
    if step > 0 and int(years / step) + 1 > MAX_STEPS:
        errors.append(f"Simulation is too large. Use at most {MAX_STEPS} time steps.")

    return errors


def coerce_payload(payload):
    return {
        "initial_conditions": {key: float(payload["initial_conditions"][key]) for key in INITIAL_KEYS},
        "parameters": {key: float(payload["parameters"][key]) for key in PARAMETER_KEYS},
        "simulation": {
            "years": float(payload["simulation"]["years"]),
            "step": float(payload["simulation"]["step"]),
        },
    }
