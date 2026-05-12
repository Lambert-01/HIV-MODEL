SCENARIOS = {
    "no_intervention": {
        "name": "No Intervention",
        "q": 0.95,
        "u1": 0.0, "u2": 0.0, "u3": 0.0, "u4": 0.0,
    },
    "awareness_only": {
        "name": "Awareness Only",
        "q": 0.95,
        "u1": 0.7, "u2": 0.0, "u3": 0.0, "u4": 0.0,
    },
    "safer_behaviour": {
        "name": "Safer Behaviour Only",
        "q": 0.95,
        "u1": 0.0, "u2": 0.7, "u3": 0.0, "u4": 0.0,
    },
    "testing_boost": {
        "name": "Testing & Treatment-Seeking",
        "q": 0.95,
        "u1": 0.0, "u2": 0.0, "u3": 0.7, "u4": 0.0,
    },
    "adherence_support": {
        "name": "Treatment Adherence Only",
        "q": 0.95,
        "u1": 0.0, "u2": 0.0, "u3": 0.0, "u4": 0.8,
    },
    "combined_intervention": {
        "name": "Combined Intervention",
        "q": 0.95,
        "u1": 0.7, "u2": 0.7, "u3": 0.6, "u4": 0.8,
    },
    "combined_moderate": {
        "name": "Combined Moderate (u=0.5)",
        "q": 0.95,
        "u1": 0.5, "u2": 0.5, "u3": 0.5, "u4": 0.5,
    },
    "strong_combined": {
        "name": "Strong Combined (u=0.8)",
        "q": 0.95,
        "u1": 0.8, "u2": 0.8, "u3": 0.8, "u4": 0.8,
    },
    "ordinary_model": {
        "name": "Ordinary Model q=1",
        "q": 1.0,
        "u1": 0.5, "u2": 0.5, "u3": 0.5, "u4": 0.5,
    },
    "high_memory": {
        "name": "High Memory Effect q=0.75",
        "q": 0.75,
        "u1": 0.4, "u2": 0.4, "u3": 0.4, "u4": 0.4,
    },
}
