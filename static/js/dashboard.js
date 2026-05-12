const DEFAULTS = {
  S0: 10000, I0: 150, T0: 80, A0: 20,
  years: 50, step: 0.1,
  q: 0.95,
  Lambda: 100, beta0: 0.30, mu: 0.02, tau: 0.20,
  delta: 0.10, rho: 0.03, eta: 0.10, d: 0.33,
  u1: 0.40, u2: 0.50, u3: 0.60, u4: 0.70
};

const SLIDER_IDS = ["q", "Lambda", "beta0", "mu", "tau", "delta", "rho", "eta", "d", "u1", "u2", "u3", "u4"];
let scenarioPresets = {};
let lastPayload = null;
let lastResult = null;
let lastScenarioData = null;

function val(id) { return Number(document.getElementById(id).value); }

function buildPayload() {
  return {
    initial_conditions: { S0: val("S0"), I0: val("I0"), T0: val("T0"), A0: val("A0") },
    parameters: {
      Lambda: val("Lambda"), beta0: val("beta0"), mu: val("mu"), tau: val("tau"),
      delta: val("delta"), rho: val("rho"), eta: val("eta"), d: val("d"),
      q: val("q"), u1: val("u1"), u2: val("u2"), u3: val("u3"), u4: val("u4")
    },
    simulation: { years: val("years"), step: val("step") }
  };
}

function syncSliderLabels() {
  SLIDER_IDS.forEach((id) => {
    const label = document.getElementById(`${id}Value`);
    if (label) label.textContent = val(id).toFixed(id === "Lambda" ? 0 : 2);
  });
}

function applyScenario(key) {
  const preset = scenarioPresets[key];
  if (!preset) return;
  ["q", "u1", "u2", "u3", "u4"].forEach((id) => {
    if (preset[id] !== undefined) document.getElementById(id).value = preset[id];
  });
  syncSliderLabels();
}

function resetDefaults() {
  Object.entries(DEFAULTS).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
  syncSliderLabels();
  showToast("Parameters reset to defaults.", "success");
}

function updateCards(result) {
  const r0 = result.r0;
  const status = result.epidemic_status.toLowerCase();

  animateValue(document.getElementById("cardR0"), r0, 3);
  document.getElementById("cardStatus").textContent = result.epidemic_status;
  animateValue(document.getElementById("cardPeak"), result.summary.peak_infected, 0);
  animateValue(document.getElementById("cardTimePeak"), result.summary.time_peak, 1);
  animateValue(document.getElementById("cardFinalT"), result.summary.final_treated, 0);
  document.getElementById("cardQ").textContent = result.summary.memory_order.toFixed(2);

  // Color the R0 and status cards
  ["mc-r0", "mc-status"].forEach((id) => {
    const card = document.getElementById(id);
    if (card) {
      card.classList.remove("controlled", "threshold", "persistent");
      card.classList.add(status);
    }
  });
}

function updateResultsTable(result) {
  const s = result.summary;
  const ts = result.time_series;
  const tbody = document.getElementById("resultsTableBody");
  if (!tbody) return;
  tbody.innerHTML = [
    ["Susceptible (S)", s.final_susceptible, "—"],
    ["Infected (I)", s.final_infected, s.peak_infected.toFixed(0)],
    ["Treated (T)", s.final_treated, "—"],
    ["AIDS (A)", s.final_aids, "—"],
    ["Total (N)", s.final_population, "—"]
  ].map(([name, final, peak]) => `
    <tr>
      <td>${name}</td>
      <td>${Number(final).toFixed(1)}</td>
      <td>${peak}</td>
    </tr>`).join("");
}

function renderScenarioTable(rows) {
  const table = document.getElementById("scenarioTable");
  if (!table) return;
  table.innerHTML = `
    <thead><tr><th>Scenario</th><th>R₀</th><th>Peak I</th><th>Final I</th><th>Final A</th><th>Final T</th></tr></thead>
    <tbody>
      ${rows.map((row) => `
        <tr>
          <td>${row.name}</td>
          <td style="color:${row.r0 < 1 ? 'var(--success)' : row.r0 <= 1.02 ? 'var(--warning)' : 'var(--danger)'}">${row.r0.toFixed(3)}</td>
          <td>${row.peak_infected.toFixed(0)}</td>
          <td>${row.final_infected.toFixed(0)}</td>
          <td>${row.final_aids.toFixed(0)}</td>
          <td>${row.final_treated.toFixed(0)}</td>
        </tr>`).join("")}
    </tbody>`;
}

function renderSensitivityRank(values) {
  const box = document.getElementById("sensitivityRank");
  if (!box) return;
  box.innerHTML = values.slice(0, 4).map((item) => `
    <div class="col-md-6 col-lg-3">
      <div class="sensitivity-rank-card">
        <h6 style="color:${item.sensitivity >= 0 ? 'var(--danger)' : 'var(--success)'}">${item.parameter}</h6>
        <p>${item.sensitivity >= 0 ? "Increases" : "Reduces"} R₀</p>
        <p style="font-family:'JetBrains Mono',monospace;font-size:0.9rem;color:var(--text-main);margin-top:6px">
          Index: ${item.sensitivity.toFixed(4)}
        </p>
      </div>
    </div>`).join("");
}

async function runSimulation() {
  const payload = buildPayload();
  const errors = validatePayload(payload);
  if (errors.length) {
    showToast(errors[0], "error");
    return;
  }

  setBusy(true);
  const statusPill = document.getElementById("status-pill");
  if (statusPill) statusPill.textContent = "Running...";
  try {
    const result = await postJson("/api/simulate", payload);
    lastPayload = payload;
    lastResult = result;

    updateCards(result);
    updateResultsTable(result);
    renderMainChart(result);
    renderGauge(result.r0, result.epidemic_status);
    renderInterventions(result.parameters);
    renderInfectedFocus(result);
    renderTreatedAids(result);
    renderPopulation(result);
    renderAnimatedPhase(result);

    const scenarioData = await postJson("/api/scenario", { base_payload: payload });
    lastScenarioData = scenarioData;
    renderScenarioChart(scenarioData);
    renderScenarioTable(scenarioData.comparisons);

    const sensitivity = await postJson("/api/sensitivity", { parameters: payload.parameters });
    renderSensitivityChart(sensitivity.sensitivity);
    renderSensitivityRank(sensitivity.sensitivity);

    const memoryResults = [];
    await Promise.all([1, 0.95, 0.85, 0.75].map(async (q) => {
      const mp = JSON.parse(JSON.stringify(payload));
      mp.parameters.q = q;
      return await postJson("/api/simulate", mp);
    })).then(results => memoryResults.push(...results));
    renderMemoryChart(memoryResults);
    renderSurface(payload.parameters);

    showToast(`Simulation complete. R₀ = ${result.r0.toFixed(3)} — ${result.epidemic_status}`, "success");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setBusy(false);
    const statusPill = document.getElementById("status-pill");
    if (statusPill) statusPill.textContent = "Ready";
  }
}

async function downloadCsv() {
  const payload = lastPayload || buildPayload();
  try {
    const response = await fetch("/api/export/csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("CSV export failed.");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fractional_hiv_simulation.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast("CSV downloaded.", "success");
  } catch (e) {
    showToast(e.message, "error");
  }
}

function downloadParams() {
  const payload = lastPayload || buildPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "fractional_hiv_parameters.json";
  link.click();
  URL.revokeObjectURL(url);
  showToast("Parameters JSON downloaded.", "success");
}

function downloadReport() {
  if (!lastScenarioData) { showToast("Run simulation first.", "error"); return; }
  const lines = ["FracHIV-SITA Lab — Scenario Comparison Report", "=".repeat(50), ""];
  lastScenarioData.comparisons.forEach((row) => {
    lines.push(`Scenario: ${row.name}`);
    lines.push(`  R0: ${row.r0.toFixed(4)}`);
    lines.push(`  Peak Infected: ${row.peak_infected.toFixed(0)}`);
    lines.push(`  Final Infected: ${row.final_infected.toFixed(0)}`);
    lines.push(`  Final AIDS: ${row.final_aids.toFixed(0)}`);
    lines.push(`  Final Treated: ${row.final_treated.toFixed(0)}`);
    lines.push("");
  });
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "scenario_report.txt";
  link.click();
  URL.revokeObjectURL(url);
  showToast("Report downloaded.", "success");
}

async function loadScenarios() {
  const data = await getJson("/api/scenarios");
  scenarioPresets = data.scenarios;
  const select = document.getElementById("scenarioSelect");
  if (select) {
    select.innerHTML = Object.entries(scenarioPresets)
      .map(([key, value]) => `<option value="${key}">${value.name}</option>`)
      .join("");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  SLIDER_IDS.forEach((id) => {
    document.getElementById(id)?.addEventListener("input", syncSliderLabels);
  });

  document.getElementById("applyScenario")?.addEventListener("click", () => {
    applyScenario(document.getElementById("scenarioSelect").value);
  });

  document.getElementById("runSimulation")?.addEventListener("click", runSimulation);
  document.getElementById("resetDefaults")?.addEventListener("click", resetDefaults);
  document.getElementById("downloadCsv")?.addEventListener("click", downloadCsv);
  document.getElementById("downloadParams")?.addEventListener("click", downloadParams);
  document.getElementById("exportCsvBtn")?.addEventListener("click", downloadCsv);
  document.getElementById("exportJsonBtn")?.addEventListener("click", downloadParams);
  document.getElementById("exportReportBtn")?.addEventListener("click", downloadReport);

  // Scenario preset buttons
  document.querySelectorAll(".btn-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-preset").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      applyScenario(btn.dataset.scenario);
    });
  });

  syncSliderLabels();
  await loadScenarios();
  await runSimulation();
});
