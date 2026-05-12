import numpy as np

from model.fractional_sita_model import sita_rhs
from model.fractional_solver import fractional_euler_solver
from tests.test_model import default_params


def test_solver_shape_and_nonnegative():
    t = np.arange(0, 2.1, 0.1)
    y = fractional_euler_solver(sita_rhs, [10000, 150, 80, 20], t, 0.95, default_params())
    assert y.shape == (len(t), 4)
    assert (y >= 0).all()
