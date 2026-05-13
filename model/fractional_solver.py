import numpy as np
from scipy.special import gamma


def fractional_euler_solver(rhs, y0, t_grid, q, params):
    """Fractional Euler solver - fallback method with O(h^q) accuracy."""
    t_grid = np.asarray(t_grid, dtype=float)
    y0 = np.asarray(y0, dtype=float)
    n = len(t_grid)

    if n < 2:
        raise ValueError("Time grid must contain at least two points.")

    h = t_grid[1] - t_grid[0]
    y = np.zeros((n, len(y0)), dtype=float)
    y[0] = np.maximum(y0, 0.0)

    rhs_values = np.zeros_like(y)
    rhs_values[0] = rhs(t_grid[0], y[0], params)

    for k in range(1, n):
        memory_sum = np.zeros(len(y0), dtype=float)
        for j in range(k):
            weight = (k - j) ** q - (k - j - 1) ** q
            memory_sum += weight * rhs_values[j]

        y[k] = y[0] + (h**q / gamma(q + 1.0)) * memory_sum
        y[k] = np.nan_to_num(y[k], nan=0.0, posinf=1e12, neginf=0.0)
        y[k] = np.maximum(y[k], 0.0)
        rhs_values[k] = rhs(t_grid[k], y[k], params)

    return y


def fractional_abm_solver(rhs, y0, t_grid, q, params):
    """
    Adams-Bashforth-Moulton-type predictor-corrector method for Caputo fractional
    differential equations, providing improved accuracy compared with a simple
    fractional Euler approximation.

    Based on: Diethelm, Ford & Freed (2002), Diethelm (2010).

    Notes on numerical accuracy:
    - Accuracy depends on step size h, fractional order q, and the smoothness of
      the solution. Smaller h improves accuracy but increases computation time.
    - For q close to 0, solutions may exhibit slow convergence.
    - This implementation uses the standard Diethelm ABM weights for the Caputo
      derivative. It is not a fully adaptive solver; use a small fixed step size
      (e.g. h = 0.05–0.1) for reliable results.
    - When q = 1 the method reduces to a first-order Adams predictor-corrector
      for ordinary ODEs.

    Parameters:
        rhs    : callable f(t, y, params) returning array of shape (len(y0),)
        y0     : initial conditions array
        t_grid : uniform time grid array
        q      : Caputo fractional order, 0 < q <= 1
        params : parameter dictionary passed to rhs

    Returns:
        y : solution array of shape (n, len(y0)), all values >= 0
    """
    t_grid = np.asarray(t_grid, dtype=float)
    y0 = np.asarray(y0, dtype=float)
    n = len(t_grid)

    if n < 2:
        raise ValueError("Time grid must contain at least two points.")

    h = t_grid[1] - t_grid[0]
    y = np.zeros((n, len(y0)), dtype=float)
    y[0] = np.maximum(y0, 0.0)

    rhs_values = np.zeros((n, len(y0)), dtype=float)
    rhs_values[0] = rhs(t_grid[0], y[0], params)

    gamma_q  = gamma(q + 1.0)   # Γ(q+1)
    gamma_q1 = gamma(q + 2.0)   # Γ(q+2)

    for k in range(1, n):
        # ── Predictor (Adams-Bashforth) ──────────────────────────────────────
        # b_j^(k) = (k-j)^q - (k-j-1)^q  for j = 0, …, k-1
        history = np.arange(k, 0, -1, dtype=float)
        pred_weights = history**q - (history - 1.0) ** q
        sum_pred = pred_weights @ rhs_values[:k]
        y_pred = y[0] + (h ** q / gamma_q) * sum_pred
        y_pred = np.maximum(np.nan_to_num(y_pred, nan=0.0, posinf=1e12, neginf=0.0), 0.0)

        # ── Corrector (Adams-Moulton) ─────────────────────────────────────────
        # a_j^(k) for j = 0, …, k-1  (history weights)
        # a_k^(k) = 1  (current predicted value weight)
        corr_weights = np.empty(k, dtype=float)
        corr_weights[0] = (k - 1) ** (q + 1) - (k - 1 - q) * k**q
        if k > 1:
            m = np.arange(k - 1, 0, -1, dtype=float)
            corr_weights[1:] = (m + 1.0) ** (q + 1) + (m - 1.0) ** (q + 1) - 2.0 * m ** (q + 1)
        sum_corr = corr_weights @ rhs_values[:k]

        rhs_pred = rhs(t_grid[k], y_pred, params)
        y[k] = y[0] + (h ** q / gamma_q1) * (rhs_pred + sum_corr)
        y[k] = np.maximum(np.nan_to_num(y[k], nan=0.0, posinf=1e12, neginf=0.0), 0.0)

        rhs_values[k] = rhs(t_grid[k], y[k], params)

    return y
