from model.validation import validate_payload
from tests.test_model import default_params


def test_validation_rejects_bad_q():
    payload = {
        "initial_conditions": {"S0": 10000, "I0": 150, "T0": 80, "A0": 20},
        "parameters": {**default_params(), "q": 1.2},
        "simulation": {"years": 10, "step": 0.1},
    }
    assert validate_payload(payload)
