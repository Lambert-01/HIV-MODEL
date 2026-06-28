function validatePayload(payload) {
  const errors = [];
  const p = payload.parameters;
  const i = payload.initial_conditions;
  const s = payload.simulation;

  ["S0", "I0", "T0", "A0"].forEach((key) => {
    if (i[key] < 0) errors.push(`${key} cannot be negative.`);
  });
  ["u1", "u2", "u3", "u4", "eta"].forEach((key) => {
    if (p[key] < 0 || p[key] > 1) errors.push(`${key} must be between 0 and 1.`);
  });
  if (p.q <= 0 || p.q > 1) errors.push("Fractional order q must satisfy 0 < q <= 1. Use 0.01 for a near-zero value.");
  if (s.years <= 0) errors.push("Simulation years must be greater than 0.");
  if (s.step <= 0) errors.push("Time step must be positive.");
  if (Math.floor(s.years / s.step) + 1 > 5000) {
    errors.push("Simulation failed. Please reduce years or choose a faster run mode with a larger step size.");
  }

  return errors;
}
