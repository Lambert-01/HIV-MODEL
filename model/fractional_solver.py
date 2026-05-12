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
    Fractional Adams-Bashforth-Moulton predictor-corrector solver.
    
    Uses predictor-corrector method for Caputo fractional ODEs with O(h^2) accuracy.
    Reference: Diethelm et al. (2002), Diethelm (2010)
    
    Parameters:
        rhs: Right-hand side function f(t, y, params)
        y0: Initial conditions array
        t_grid: Time grid array
        q: Fractional order (0 < q <= 1)
        params: Parameter dictionary
    
    Returns:
        Solution array of shape (n, len(y0))
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
    
    gamma_q = gamma(q + 1)
    gamma_q1 = gamma(q + 2)
    
    for k in range(1, n):
        # Predictor step (Adams-Bashforth)
        sum_pred = np.zeros(len(y0), dtype=float)
        for j in range(k):
            weight = ((k - j) ** q - (k - j - 1) ** q)
            sum_pred += weight * rhs_values[j]
        y_pred = y[0] + (h**q / gamma_q) * sum_pred
        y_pred = np.maximum(np.nan_to_num(y_pred, nan=0.0, posinf=1e12, neginf=0.0), 0.0)
        
        # Corrector step (Adams-Moulton)
        sum_corr = np.zeros(len(y0), dtype=float)
        for j in range(k):
            weight = ((k + 1 - j) ** q - (k - j) ** q)
            sum_corr += weight * rhs_values[j]
        
        rhs_pred = rhs(t_grid[k], y_pred, params)
        y[k] = y[0] + (h**q / gamma_q1) * (rhs_pred + sum_corr)
        y[k] = np.maximum(np.nan_to_num(y[k], nan=0.0, posinf=1e12, neginf=0.0), 0.0)
        
        rhs_values[k] = rhs(t_grid[k], y[k], params)
    
    return y