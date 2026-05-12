"""
FracHIV-SITA Lab — comprehensive test suite.
Run: python -m pytest tests -p no:cacheprovider -v
"""
import json

import numpy as np
import pytest

from app import create_app
from model.fractional_sita_model import sita_rhs
from model.fractional_solver import fractional_abm_solver, fractional_euler_solver
from model.reproduction_number import compute_r0, epidemic_status
from model.sensitivity import compute_sensitivity
from model.validation import coerce_payload, validate_payload


# ── Fixtures ──────────────────────────────────────────────────────────────────

def default_params():
    return {
        "Lambda": 100.0, "beta0": 0.3, "mu": 0.02, "tau": 0.2,
        "delta": 0.1, "rho": 0.03, "eta": 0.1, "d": 0.33,
        "q": 0.95, "u1": 0.4, "u2": 0.5, "u3": 0.6, "u4": 0.7,
    }


def baseline_payload():
    return {
        "initial_conditions": {"S0": 10000, "I0": 150, "T0": 80, "A0": 20},
        "parameters": default_params(),
        "simulation": {"years": 10, "step": 0.1},
    }


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


# ── R0 and effective rates ─────────────────────────────────────────────────────

def test_r0_positive():
    assert compute_r0(default_params()) > 0


def test_r0_zero_interventions_higher():
    p_no = {**default_params(), "u1": 0.0, "u2": 0.0, "u3": 0.0, "u4": 0.0}
    p_int = {**default_params(), "u1": 0.8, "u2": 0.8, "u3": 0.8, "u4": 0.8}
    assert compute_r0(p_no) > compute_r0(p_int)


def test_r0_formula_manual():
    p = default_params()
    beta_eff = p["beta0"] * (1 - p["u1"]) * (1 - p["u2"])
    tau_eff  = p["tau"]  * (1 + p["u3"])
    rho_eff  = p["rho"]  * (1 - p["u4"])
    expected = (beta_eff / (tau_eff + p["delta"] + p["mu"])) * (
        1 + (p["eta"] * tau_eff) / (rho_eff + p["mu"])
    )
    assert abs(compute_r0(p) - expected) < 1e-10


def test_effective_rates():
    p = default_params()
    assert abs(p["beta0"] * (1 - p["u1"]) * (1 - p["u2"]) - 0.3 * 0.6 * 0.5) < 1e-10
    assert abs(p["tau"]  * (1 + p["u3"]) - 0.2 * 1.6) < 1e-10
    assert abs(p["rho"]  * (1 - p["u4"]) - 0.03 * 0.3) < 1e-10


def test_epidemic_status_labels():
    assert epidemic_status(0.5)  == "Controlled"
    assert epidemic_status(1.0)  == "Threshold"
    assert epidemic_status(2.0)  == "Persistent"


# ── RHS ───────────────────────────────────────────────────────────────────────

def test_rhs_shape():
    result = sita_rhs(0, [10000, 150, 80, 20], default_params())
    assert len(result) == 4


def test_rhs_nonnegative_clamp():
    # Negative inputs should be clamped to 0 inside rhs
    result = sita_rhs(0, [-100, -50, 0, 0], default_params())
    assert len(result) == 4  # should not raise


# ── Solver ────────────────────────────────────────────────────────────────────

def _run_solver(solver_fn, q=0.95, years=5, step=0.1):
    t = np.arange(0, years + step, step)
    y0 = [10000, 150, 80, 20]
    return solver_fn(sita_rhs, y0, t, q, default_params()), t


def test_abm_solver_shape():
    y, t = _run_solver(fractional_abm_solver)
    assert y.shape == (len(t), 4)


def test_abm_solver_nonnegative():
    y, _ = _run_solver(fractional_abm_solver)
    assert (y >= 0).all()


def test_euler_solver_shape():
    y, t = _run_solver(fractional_euler_solver)
    assert y.shape == (len(t), 4)


def test_euler_solver_nonnegative():
    y, _ = _run_solver(fractional_euler_solver)
    assert (y >= 0).all()


def test_solver_requires_two_points():
    with pytest.raises(ValueError):
        fractional_abm_solver(sita_rhs, [10000, 150, 80, 20], [0.0], 0.95, default_params())


def test_abm_q1_close_to_scipy():
    """When q=1 the ABM solver should approximate scipy solve_ivp reasonably."""
    from scipy.integrate import solve_ivp

    p = {**default_params(), "q": 1.0}
    t_end = 5.0
    step = 0.05
    t_grid = np.arange(0, t_end + step, step)
    y0 = [10000.0, 150.0, 80.0, 20.0]

    y_abm = fractional_abm_solver(sita_rhs, y0, t_grid, 1.0, p)

    sol = solve_ivp(
        lambda t, y: sita_rhs(t, y, p),
        [0, t_end], y0,
        t_eval=t_grid, method="RK45", rtol=1e-6, atol=1e-8
    )
    y_scipy = sol.y.T  # shape (n, 4)

    # Allow up to 5% relative error at final time for each compartment
    for i in range(4):
        ref = abs(y_scipy[-1, i])
        if ref > 1.0:
            rel_err = abs(y_abm[-1, i] - y_scipy[-1, i]) / ref
            assert rel_err < 0.05, f"Compartment {i}: rel_err={rel_err:.4f}"


# ── Validation ────────────────────────────────────────────────────────────────

def test_validation_accepts_valid():
    assert validate_payload(baseline_payload()) == []


def test_validation_rejects_bad_q():
    p = baseline_payload()
    p["parameters"]["q"] = 1.5
    assert validate_payload(p)


def test_validation_rejects_negative_initial():
    p = baseline_payload()
    p["initial_conditions"]["S0"] = -1
    assert validate_payload(p)


def test_validation_rejects_u_out_of_range():
    p = baseline_payload()
    p["parameters"]["u1"] = 1.5
    assert validate_payload(p)


def test_validation_rejects_zero_years():
    p = baseline_payload()
    p["simulation"]["years"] = 0
    assert validate_payload(p)


def test_validation_rejects_missing_key():
    p = baseline_payload()
    del p["parameters"]["beta0"]
    assert validate_payload(p)


def test_coerce_payload_types():
    clean = coerce_payload(baseline_payload())
    assert isinstance(clean["parameters"]["beta0"], float)
    assert isinstance(clean["initial_conditions"]["S0"], float)


# ── Sensitivity ───────────────────────────────────────────────────────────────

def test_sensitivity_returns_all_keys():
    results = compute_sensitivity(default_params())
    keys = {r["parameter"] for r in results}
    assert "beta0" in keys
    assert "u1" in keys
    assert "u2" in keys


def test_sensitivity_beta0_positive():
    results = compute_sensitivity(default_params())
    beta_item = next(r for r in results if r["parameter"] == "beta0")
    assert beta_item["sensitivity"] > 0


def test_sensitivity_u1_negative():
    results = compute_sensitivity(default_params())
    u1_item = next(r for r in results if r["parameter"] == "u1")
    assert u1_item["sensitivity"] < 0


# ── API: health ───────────────────────────────────────────────────────────────

def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.get_json()["status"] == "ok"


# ── API: simulate ─────────────────────────────────────────────────────────────

def test_simulate_baseline(client):
    r = client.post("/api/simulate", json=baseline_payload())
    assert r.status_code == 200
    data = r.get_json()
    assert data["status"] == "success"
    assert data["r0"] > 0
    assert len(data["time_series"]["S"]) > 0


def test_simulate_nonnegative_output(client):
    r = client.post("/api/simulate", json=baseline_payload())
    data = r.get_json()
    for key in ("S", "I", "T", "A"):
        assert all(v >= 0 for v in data["time_series"][key])


def test_simulate_invalid_params(client):
    p = baseline_payload()
    p["parameters"]["q"] = 2.0
    r = client.post("/api/simulate", json=p)
    assert r.status_code == 400


def test_simulate_empty_body(client):
    r = client.post("/api/simulate", json={})
    assert r.status_code == 400


# ── API: r0 live ──────────────────────────────────────────────────────────────

def test_r0_api(client):
    r = client.post("/api/r0", json={"parameters": default_params()})
    assert r.status_code == 200
    data = r.get_json()
    assert "r0" in data
    assert "beta_eff" in data
    assert "tau_eff" in data
    assert "rho_eff" in data


# ── API: scenarios ────────────────────────────────────────────────────────────

def test_scenarios_list(client):
    r = client.get("/api/scenarios")
    assert r.status_code == 200
    data = r.get_json()
    assert "no_intervention" in data["scenarios"]
    assert "strong_combined" in data["scenarios"]


def test_scenario_compare(client):
    payload = {**baseline_payload(), "scenarios": ["no_intervention", "combined_intervention"]}
    r = client.post("/api/scenario", json=payload)
    assert r.status_code == 200
    data = r.get_json()
    assert len(data["comparisons"]) == 2


# ── API: CSV export ───────────────────────────────────────────────────────────

def test_csv_export(client):
    r = client.post("/api/export/csv", json=baseline_payload())
    assert r.status_code == 200
    assert "text/csv" in r.content_type
    text = r.data.decode()
    assert "time" in text
    assert "S" in text
    assert "I" in text


# ── API: sensitivity ──────────────────────────────────────────────────────────

def test_sensitivity_api(client):
    r = client.post("/api/sensitivity", json={"parameters": default_params()})
    assert r.status_code == 200
    data = r.get_json()
    assert data["status"] == "success"
    assert len(data["sensitivity"]) > 0


# ── API: memory ───────────────────────────────────────────────────────────────

def test_memory_api(client):
    payload = {**baseline_payload(), "q_values": [1.0, 0.95]}
    r = client.post("/api/memory", json=payload)
    assert r.status_code == 200
    data = r.get_json()
    assert len(data["curves"]) == 2
