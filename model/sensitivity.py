from copy import deepcopy

from model.reproduction_number import compute_r0


SENSITIVITY_KEYS = ["beta0", "eta", "tau", "delta", "rho", "mu", "u1", "u2", "u3", "u4"]


def compute_sensitivity(params, keys=None, epsilon=1e-4):
    keys = keys or SENSITIVITY_KEYS
    base_r0 = compute_r0(params)
    results = []

    for key in keys:
        value = float(params[key])
        step = epsilon * max(abs(value), 1.0)
        if key in {"u1", "u2", "u3", "u4", "eta"}:
            high = min(1.0, value + step)
            low = max(0.0, value - step)
        else:
            high = value + step
            low = max(0.0, value - step)

        if high == low:
            derivative = 0.0
        else:
            p_high = deepcopy(params)
            p_low = deepcopy(params)
            p_high[key] = high
            p_low[key] = low
            derivative = (compute_r0(p_high) - compute_r0(p_low)) / (high - low)

        index = derivative * value / base_r0 if base_r0 else 0.0
        results.append({"parameter": key, "sensitivity": index})

    return sorted(results, key=lambda item: abs(item["sensitivity"]), reverse=True)
