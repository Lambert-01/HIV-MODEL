def compute_r0(params):
    beta_eff = params["beta0"] * (1.0 - params["u1"]) * (1.0 - params["u2"])
    tau_eff = params["tau"] * (1.0 + params["u3"])
    rho_eff = params["rho"] * (1.0 - params["u4"])

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
