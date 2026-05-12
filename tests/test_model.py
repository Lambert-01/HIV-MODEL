from model.fractional_sita_model import sita_rhs
from model.reproduction_number import compute_r0


def default_params():
    return {
        "Lambda": 100,
        "beta0": 0.3,
        "mu": 0.02,
        "tau": 0.2,
        "delta": 0.1,
        "rho": 0.03,
        "eta": 0.1,
        "d": 0.33,
        "q": 0.95,
        "u1": 0.4,
        "u2": 0.5,
        "u3": 0.6,
        "u4": 0.7,
    }


def test_rhs_has_four_components():
    result = sita_rhs(0, [10000, 150, 80, 20], default_params())
    assert len(result) == 4


def test_r0_positive():
    assert compute_r0(default_params()) >= 0
