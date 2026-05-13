import cmath


def compute_effective_rates(params):
    beta_eff = params["beta0"] * (1.0 - params["u1"]) * (1.0 - params["u2"])
    tau_eff = params["tau"] * (1.0 + params["u3"])
    rho_eff = params["rho"] * (1.0 - params["u4"])
    return {
        "beta_eff": beta_eff,
        "tau_eff": tau_eff,
        "rho_eff": rho_eff,
    }


def compute_r0(params):
    rates = compute_effective_rates(params)
    beta_eff = rates["beta_eff"]
    tau_eff = rates["tau_eff"]
    rho_eff = rates["rho_eff"]

    denominator = tau_eff + params["delta"] + params["mu"]
    return (beta_eff / denominator) * (
        1.0 + (params["eta"] * tau_eff) / (rho_eff + params["mu"])
    )


def epidemic_status(r0):
    if r0 < 0.98:
        return "Controlled"
    if r0 <= 1.02:
        return "Threshold"
    return "Persistent"


def stability_interpretation(r0):
    status = epidemic_status(r0)
    if status == "Controlled":
        return (
            "The disease-free equilibrium is expected to be locally asymptotically "
            "stable under the fractional-order stability condition."
        )
    if status == "Threshold":
        return (
            "The system is close to the epidemic threshold, so small parameter "
            "changes can move the model toward control or persistence."
        )
    return (
        "The infection may persist because each infected individual generates "
        "more than one secondary infection on average."
    )


def disease_free_equilibrium(params):
    susceptible = params["Lambda"] / params["mu"] if params["mu"] > 0 else float("inf")
    return {
        "S": susceptible,
        "I": 0.0,
        "T": 0.0,
        "A": 0.0,
    }


def stability_details(params):
    rates = compute_effective_rates(params)
    beta_eff = rates["beta_eff"]
    tau_eff = rates["tau_eff"]
    rho_eff = rates["rho_eff"]
    q = params["q"]

    a = beta_eff - (tau_eff + params["delta"] + params["mu"])
    b = params["eta"] * beta_eff
    c = tau_eff
    d = -(rho_eff + params["mu"])

    trace = a + d
    determinant = a * d - b * c
    discriminant = trace * trace - 4.0 * determinant
    root = cmath.sqrt(discriminant)
    eigenvalues = [(trace + root) / 2.0, (trace - root) / 2.0]
    threshold = q * 3.141592653589793 / 2.0

    rows = []
    stable = True
    for value in eigenvalues:
        argument = abs(cmath.phase(value))
        passes = argument > threshold
        stable = stable and passes
        rows.append(
            {
                "real": value.real,
                "imag": value.imag,
                "argument": argument,
                "threshold": threshold,
                "passes": passes,
            }
        )

    return {
        "criterion": "|arg(lambda_i)| > q*pi/2",
        "q": q,
        "threshold": threshold,
        "stable": stable,
        "eigenvalues": rows,
    }
