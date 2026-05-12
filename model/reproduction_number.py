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
