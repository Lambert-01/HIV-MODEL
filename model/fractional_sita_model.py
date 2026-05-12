import numpy as np


def sita_rhs(t, y, params):
    S, I, T, A = np.maximum(np.asarray(y, dtype=float), 0.0)
    N = max(S + I + T + A, 1e-9)

    beta_eff = params["beta0"] * (1.0 - params["u1"]) * (1.0 - params["u2"])
    lambda_force = beta_eff * (I + params["eta"] * T) / N
    tau_eff = params["tau"] * (1.0 + params["u3"])
    rho_eff = params["rho"] * (1.0 - params["u4"])

    dS = params["Lambda"] - lambda_force * S - params["mu"] * S
    dI = lambda_force * S - (tau_eff + params["delta"] + params["mu"]) * I
    dT = tau_eff * I - (rho_eff + params["mu"]) * T
    dA = params["delta"] * I + rho_eff * T - (params["mu"] + params["d"]) * A

    return np.array([dS, dI, dT, dA], dtype=float)
