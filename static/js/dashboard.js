const DEFAULTS = {
  S0: 10000, I0: 150, T0: 80, A0: 20,
  years: 50, step: 0.2,
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
let lastChapter6Data = null;
let lastReliabilityData = null;
let lastRunAt = null;
let lastRunSummary = null;

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
  updateLivePanels();
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

let lastPeakInfected = null;

function updateCards(result) {
  const r0 = result.r0;
  const status = result.epidemic_status.toLowerCase();
  document.querySelector(".dashboard-main")?.setAttribute("data-status", status);
  document.body.dataset.epidemicStatus = status;

  animateValue(document.getElementById("cardR0"), r0, 3);
  document.getElementById("cardStatus").textContent = result.epidemic_status;
  animateValue(document.getElementById("cardPeak"), result.summary.peak_infected, 0);
  animateValue(document.getElementById("cardTimePeak"), result.summary.time_peak, 1);
  animateValue(document.getElementById("cardFinalT"), result.summary.final_treated, 0);
  document.getElementById("cardQ").textContent = result.summary.memory_order.toFixed(2);

  // Trend indicator on Peak Infected
  const peakEl = document.getElementById("cardPeak");
  if (peakEl && lastPeakInfected !== null) {
    const diff = result.summary.peak_infected - lastPeakInfected;
    const existing = peakEl.parentElement.querySelector(".mc-trend");
    if (existing) existing.remove();
    const trend = document.createElement("span");
    trend.className = `mc-trend ${diff > 1 ? "up" : diff < -1 ? "down" : "flat"}`;
    trend.textContent = diff > 1 ? `\u25b2 ${diff.toFixed(0)}` : diff < -1 ? `\u25bc ${Math.abs(diff).toFixed(0)}` : "\u2014 stable";
    peakEl.insertAdjacentElement("afterend", trend);
  }
  lastPeakInfected = result.summary.peak_infected;

  // Memory badge on q card
  const qEl = document.getElementById("cardQ");
  if (qEl) {
    const existing = qEl.parentElement.querySelector(".mc-badge");
    if (existing) existing.remove();
    const badge = document.createElement("span");
    badge.className = `mc-badge ${result.summary.memory_order < 1 ? "memory" : "ordinary"}`;
    badge.textContent = result.summary.memory_order < 1 ? "Memory" : "Ordinary";
    qEl.insertAdjacentElement("afterend", badge);
  }

  // Color the R0 and status cards
  ["mc-r0", "mc-status"].forEach((id) => {
    const card = document.getElementById(id);
    if (card) {
      card.classList.remove("controlled", "threshold", "persistent");
      card.classList.add(status);
    }
  });

  const statusPill = document.getElementById("status-pill");
  if (statusPill) {
    statusPill.classList.remove("controlled", "threshold", "persistent");
    statusPill.classList.add(status);
  }

  // Update R0 tab result cards
  const Lambda = result.parameters.Lambda;
  const mu = result.parameters.mu;
  const q = result.parameters.q;
  const dfeVal = mu > 0 ? (Lambda / mu).toFixed(1) : "\u221e";
  const threshold = ((q * Math.PI) / 2).toFixed(4);

  const dfeValueEl = document.getElementById("dfeValue");
  if (dfeValueEl) dfeValueEl.textContent = `E\u2080 = (${dfeVal}, 0, 0, 0)`;
  const dfeTextEl = document.getElementById("dfeText");
  if (dfeTextEl) dfeTextEl.textContent = `\u039b/\u03bc = ${Lambda}/${mu} = ${dfeVal}. The susceptible population converges to this value when the epidemic is controlled.`;

  const stabEl = document.getElementById("stabilityThresholdText");
  if (stabEl) stabEl.textContent = `For q = ${q.toFixed(2)}, the stability threshold is q\u03c0/2 = ${threshold} rad. All eigenvalue arguments must exceed this value for the DFE to be locally asymptotically stable.`;

  const boundEl = document.getElementById("boundValue");
  if (boundEl) boundEl.textContent = `N(t) \u2264 \u039b/\u03bc = ${dfeVal}`;
  const boundTextEl = document.getElementById("boundText");
  if (boundTextEl) {
    const ok = result.summary.bounded_ok;
    boundTextEl.textContent = `Feasible region: \u03a9 = {(S,I,T,A) \u2208 \u211d\u2074\u208a : N(t) \u2264 ${dfeVal}}. Current simulation: ${ok ? "\u2713 within bound" : "\u26a0 check parameters"}.`;
  }
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

function effectiveRates(params) {
  return {
    beta_eff: params.beta0 * (1 - params.u1) * (1 - params.u2),
    tau_eff: params.tau * (1 + params.u3),
    rho_eff: params.rho * (1 - params.u4)
  };
}

function localR0(params) {
  const e = effectiveRates(params);
  return (e.beta_eff / (e.tau_eff + params.delta + params.mu)) *
    (1 + (params.eta * e.tau_eff) / (e.rho_eff + params.mu));
}

function updateLivePanels() {
  const payload = buildPayload();
  const p = payload.parameters;
  const rates = effectiveRates(p);
  const previewR0 = localR0(p);
  const previewStatus = previewR0 < 0.98 ? "controlled" : previewR0 <= 1.02 ? "threshold" : "persistent";
  const n0 = payload.initial_conditions.S0 + payload.initial_conditions.I0 + payload.initial_conditions.T0 + payload.initial_conditions.A0;

  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set("n0Value", n0.toFixed(0));
  set("paramQValue", p.q.toFixed(2));
  set("paramYearsValue", payload.simulation.years.toFixed(1));
  set("paramStepValue", payload.simulation.step.toFixed(2));
  set("betaEffLive", rates.beta_eff.toFixed(5));
  set("tauEffLive", rates.tau_eff.toFixed(5));
  set("rhoEffLive", rates.rho_eff.toFixed(5));
  set("sidebarR0Value", previewR0.toFixed(3));
  set("sidebarR0Status", previewStatus === "controlled" ? "Controlled" : previewStatus === "threshold" ? "Threshold" : "Persistent");
  const preview = document.getElementById("sidebarR0Preview");
  if (preview) {
    preview.classList.remove("controlled", "threshold", "persistent");
    preview.classList.add(previewStatus);
  }

  const memory = document.getElementById("memoryModeText");
  if (memory) {
    memory.textContent = p.q === 1
      ? "Classical ordinary model: no fractional memory effect."
      : "Fractional-order model: past states influence present dynamics.";
  }

  const meaning = document.getElementById("interventionMeaningText");
  if (meaning) {
    meaning.textContent = `u1=${interventionLabel(p.u1)}, u2=${interventionLabel(p.u2)}, u3=${interventionLabel(p.u3)}, u4=${interventionLabel(p.u4)}.`;
  }

  const table = document.getElementById("parameterSnapshotTable");
  if (table) {
    const rows = [
      ["Lambda", p.Lambda, "Recruitment rate"],
      ["beta0", p.beta0, "Baseline transmission"],
      ["mu", p.mu, "Natural mortality"],
      ["tau", p.tau, "Treatment initiation"],
      ["delta", p.delta, "I to AIDS progression"],
      ["rho", p.rho, "T to AIDS progression"],
      ["eta", p.eta, "Treated infectiousness"],
      ["d", p.d, "AIDS mortality"],
      ["q", p.q, "Fractional order"]
    ];
    table.innerHTML = `<thead><tr><th>Parameter</th><th>Value</th><th>Meaning</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${row[0]}</td><td>${Number(row[1]).toFixed(row[0] === "Lambda" ? 0 : 3)}</td><td>${row[2]}</td></tr>`).join("")}</tbody>`;
  }

  const chips = document.getElementById("parameterQuickCards");
  if (chips) {
    const r0 = localR0(p);
    const items = [
      ["Initial total N0", n0, "S0 + I0 + T0 + A0"],
      ["Fractional order q", p.q, p.q === 1 ? "ordinary model" : "memory model"],
      ["R0 now", r0, r0 < 1 ? "controlled" : r0 <= 1.02 ? "threshold" : "persistent"],
      ["Simulation steps", Math.floor(payload.simulation.years / payload.simulation.step) + 1, "time grid size"],
      ["beta_eff", rates.beta_eff, "effective transmission"],
      ["tau_eff", rates.tau_eff, "effective treatment uptake"],
      ["rho_eff", rates.rho_eff, "effective T-to-AIDS progression"]
    ];
    chips.innerHTML = items.map(([label, value, note]) => `
      <div class="parameter-chip">
        <span>${label}</span>
        <strong>${Number(value).toFixed(label.includes("steps") || label.includes("N0") ? 0 : 4)}</strong>
        <em>${note}</em>
      </div>
    `).join("");
  }
}

function updateLastRunStatus(result, payload) {
  lastRunAt = new Date();
  lastRunSummary = {
    q: payload.parameters.q,
    beta0: payload.parameters.beta0,
    r0: result.r0
  };
  renderLastRunStatus();
}

function renderLastRunStatus() {
  const bar = document.getElementById("lastRunStatus");
  if (!bar || !lastRunAt || !lastRunSummary) return;
  const seconds = Math.max(0, Math.floor((Date.now() - lastRunAt.getTime()) / 1000));
  const age = seconds < 5 ? "just now" : seconds < 60 ? `${seconds} seconds ago` : `${Math.floor(seconds / 60)} minutes ago`;
  bar.innerHTML = `
    <i class="fa fa-clock-rotate-left"></i>
    <span>Last run: q=${lastRunSummary.q.toFixed(2)} · beta0=${lastRunSummary.beta0.toFixed(2)} · R0=${lastRunSummary.r0.toFixed(3)} · ${age}</span>
  `;
}

function updateInterpretation(result) {
  const s = result.summary;
  const text = `
    The infected population reaches a peak of <strong>${s.peak_infected.toFixed(0)}</strong>
    at <strong>t=${s.time_peak.toFixed(1)} years</strong>. Final values are
    <strong>I=${s.final_infected.toFixed(0)}</strong>,
    <strong>T=${s.final_treated.toFixed(0)}</strong>, and
    <strong>A=${s.final_aids.toFixed(0)}</strong>. ${result.stability_text}
  `;
  const baseline = document.getElementById("baselineInterpretation");
  if (baseline) baseline.innerHTML = text;
  const thesis = document.getElementById("thesisTextBox");
  if (thesis) {
    thesis.innerHTML = `Under the selected parameter configuration, the fractional-order SITA model produced <strong>R0 = ${result.r0.toFixed(3)}</strong>, indicating a <strong>${result.epidemic_status.toLowerCase()}</strong> epidemic status. The simulation shows peak infected population <strong>${s.peak_infected.toFixed(0)}</strong> at <strong>${s.time_peak.toFixed(1)} years</strong> and final infected population <strong>${s.final_infected.toFixed(0)}</strong>. These results support interpretation of intervention-adjusted transmission, treatment uptake, AIDS progression, and fractional memory effects.`;
  }
  const stability = document.getElementById("stabilityText");
  if (stability) stability.textContent = result.stability_text;
  const dfe = document.getElementById("dfeText");
  if (dfe && result.disease_free_equilibrium) {
    const e0 = result.disease_free_equilibrium;
    const distance = Math.hypot(
      result.summary.final_susceptible - e0.S,
      result.summary.final_infected,
      result.summary.final_treated,
      result.summary.final_aids
    );
    dfe.innerHTML = `Current E0 = (${e0.S.toFixed(2)}, 0, 0, 0).<br>Final-state distance from E0: ${distance.toFixed(2)}.`;
  }
  const eigenPanel = document.getElementById("stabilityEigenPanel");
  if (eigenPanel && result.fractional_stability) {
    const details = result.fractional_stability;
    eigenPanel.innerHTML = `
      <table class="table table-dark table-sm align-middle mb-2">
        <thead><tr><th>Eigenvalue</th><th>|arg(lambda)|</th><th>q*pi/2</th><th>Check</th></tr></thead>
        <tbody>
          ${details.eigenvalues.map((row) => {
            const imag = Math.abs(row.imag) < 1e-10 ? "" : `${row.imag >= 0 ? "+" : "-"}${Math.abs(row.imag).toFixed(4)}i`;
            return `<tr>
              <td>${row.real.toFixed(4)}${imag}</td>
              <td>${row.argument.toFixed(4)}</td>
              <td>${row.threshold.toFixed(4)}</td>
              <td style="color:${row.passes ? 'var(--success)' : 'var(--danger)'}">${row.passes ? "Pass" : "Fail"}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
      <p class="mb-0">${details.stable ? "Both eigenvalues satisfy the fractional local stability criterion." : "At least one eigenvalue fails the fractional local stability criterion."}</p>`;
  }
  const cards = document.getElementById("effectiveRateCards");
  if (cards) {
    cards.innerHTML = [
      ["beta_eff", result.effective_rates.beta_eff],
      ["tau_eff", result.effective_rates.tau_eff],
      ["rho_eff", result.effective_rates.rho_eff],
      ["R0", result.r0]
    ].map(([name, value]) => `<div class="col-sm-6"><div class="sensitivity-rank-card"><h6>${name}</h6><p>${Number(value).toFixed(5)}</p></div></div>`).join("");
  }
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

function renderScenarioExplorer(data) {
  const box = document.getElementById("scenarioExplorerCards");
  if (!box) return;
  box.innerHTML = data.comparisons.map((row) => `
    <div class="col-md-6 col-xl-4">
      <div class="overview-card h-100">
        <div class="ov-icon ${row.r0 < 1 ? "icon-green" : row.r0 > 1.02 ? "icon-red" : "icon-gold"}"><i class="fa fa-flask"></i></div>
        <h5>${row.name}</h5>
        <p><strong>u:</strong> (${row.u1.toFixed(2)}, ${row.u2.toFixed(2)}, ${row.u3.toFixed(2)}, ${row.u4.toFixed(2)})</p>
        <div class="math-block">beta_eff=${row.beta_eff.toFixed(4)}<br>tau_eff=${row.tau_eff.toFixed(4)}<br>rho_eff=${row.rho_eff.toFixed(4)}<br>R0=${row.r0.toFixed(3)}</div>
        <p>Peak I=${row.peak_infected.toFixed(0)} at t=${row.time_peak.toFixed(1)}; final I=${row.final_infected.toFixed(0)}, T=${row.final_treated.toFixed(0)}, A=${row.final_aids.toFixed(0)}.</p>
        <p>${row.interpretation}</p>
      </div>
    </div>
  `).join("");
  const best = document.getElementById("bestScenarioText");
  if (best && data.best?.lowest_r0) {
    best.textContent = `Lowest R0: ${data.best.lowest_r0.name} (${data.best.lowest_r0.r0.toFixed(3)}). Lowest final infected: ${data.best.lowest_final_infected.name}. Lowest final AIDS: ${data.best.lowest_final_aids.name}.`;
  }
}

function renderSensitivityRank(values) {
   const box = document.getElementById("sensitivityRank");
   if (!box) return;
   box.innerHTML = values.slice(0, 4).map((item) => {
     const isPos = item.sensitivity >= 0;
     return `
     <div class="col-md-6 col-lg-3">
       <div class="sensitivity-rank-card">
         <h6 style="color:${isPos ? 'var(--danger)' : 'var(--success)'}">${item.parameter}</h6>
         <span class="rank-index ${isPos ? 'positive-rank' : 'negative-rank'}">
           ${isPos ? '↑ POSITIVE' : '↓ NEGATIVE'}
         </span>
         <p>${isPos ? "Increases" : "Reduces"} R₀</p>
         <p style="font-family:'JetBrains Mono',monospace;font-size:0.9rem;color:var(--text-main);margin-top:6px">
           Index: ${item.sensitivity.toFixed(4)}
         </p>
       </div>
     </div>`;
   }).join("");
 }

function formatNumber(value, digits = 3) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return Math.abs(number) >= 100 ? number.toFixed(1) : number.toFixed(digits);
}

function renderGenericTable(tableId, rows, columns) {
  const table = document.getElementById(tableId);
  if (!table) return;
  if (!rows?.length) {
    table.innerHTML = `<tbody><tr><td class="text-center text-muted">No rows available</td></tr></tbody>`;
    return;
  }
  table.innerHTML = `
    <thead><tr>${columns.map((col) => `<th>${col.label}</th>`).join("")}</tr></thead>
    <tbody>
      ${rows.map((row) => `
        <tr>${columns.map((col) => `<td>${col.format ? col.format(row[col.key], row) : formatNumber(row[col.key])}</td>`).join("")}</tr>
      `).join("")}
    </tbody>`;
}

function renderChapter6(data) {
  lastChapter6Data = data;
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set("chapter6BaselineText", data.narrative.baseline);
  set("chapter6ScenarioText", data.narrative.scenarios);
  set("chapter6SingleText", data.narrative.single_interventions);
  set("chapter6CombinedText", data.narrative.combined_intervention);
  set("chapter6MemoryText", data.narrative.memory);
  set("chapter6SensitivityText", data.narrative.sensitivity);
  set("chapter6DashboardText", data.narrative.dashboard_demo);
  set("chapter6PublicHealthText", data.narrative.public_health);

  renderGenericTable("chapter6BaselineTable", data.tables.baseline_summary, [
    { key: "quantity", label: "Quantity", format: (v) => v },
    { key: "value", label: "Value" },
    { key: "interpretation", label: "Interpretation", format: (v) => v }
  ]);
  renderGenericTable("chapter6ScenarioTable", data.tables.scenarios, [
    { key: "scenario", label: "Scenario", format: (v) => v },
    { key: "q", label: "q", format: (v) => Number(v).toFixed(2) },
    { key: "r0", label: "R0" },
    { key: "peak_infected", label: "Peak I", format: (v) => Number(v).toFixed(0) },
    { key: "final_infected", label: "Final I", format: (v) => Number(v).toFixed(0) },
    { key: "final_treated", label: "Final T", format: (v) => Number(v).toFixed(0) },
    { key: "final_aids", label: "Final A", format: (v) => Number(v).toFixed(0) }
  ]);
  const interventionColumns = [
    { key: "scenario", label: "Intervention", format: (v) => v },
    { key: "u1", label: "u1", format: (v) => Number(v).toFixed(2) },
    { key: "u2", label: "u2", format: (v) => Number(v).toFixed(2) },
    { key: "u3", label: "u3", format: (v) => Number(v).toFixed(2) },
    { key: "u4", label: "u4", format: (v) => Number(v).toFixed(2) },
    { key: "r0", label: "R0" },
    { key: "final_infected", label: "Final I", format: (v) => Number(v).toFixed(0) },
    { key: "final_aids", label: "Final A", format: (v) => Number(v).toFixed(0) }
  ];
  renderGenericTable("chapter6SingleTable", data.tables.single_interventions, interventionColumns);
  renderGenericTable("chapter6CombinedTable", data.tables.combined_interventions, interventionColumns);
  renderGenericTable("chapter6MemoryTable", data.tables.memory, [
    { key: "q", label: "q", format: (v) => Number(v).toFixed(2) },
    { key: "peak_infected", label: "Peak I", format: (v) => Number(v).toFixed(0) },
    { key: "time_peak", label: "Time Peak" },
    { key: "final_infected", label: "Final I", format: (v) => Number(v).toFixed(0) },
    { key: "final_treated", label: "Final T", format: (v) => Number(v).toFixed(0) },
    { key: "final_aids", label: "Final A", format: (v) => Number(v).toFixed(0) }
  ]);
}

function renderReliability(data) {
  lastReliabilityData = data;
  const text = document.getElementById("reliabilityText");
  if (text) text.textContent = data.interpretation;
  renderGenericTable("reliabilityTable", data.rows, [
    { key: "step", label: "h", format: (v) => Number(v).toFixed(2) },
    { key: "steps", label: "Grid", format: (v) => Number(v).toFixed(0) },
    { key: "peak_infected", label: "Peak I", format: (v) => Number(v).toFixed(1) },
    { key: "final_infected", label: "Final I", format: (v) => Number(v).toFixed(1) },
    { key: "final_infected_abs_error", label: "|Delta Final I|" }
  ]);
  if (typeof renderReliabilityChart === "function") renderReliabilityChart(data.rows);
}

// Track which tabs have been loaded for the current simulation
const tabLoaded = {};

async function runSimulation() {
  const payload = buildPayload();
  const errors = validatePayload(payload);
  if (errors.length) {
    showToast(errors[0], "error");
    return;
  }

  // Reset lazy-load flags so secondary tabs re-run with new params
  Object.keys(tabLoaded).forEach((k) => delete tabLoaded[k]);

  setBusy(true);
  const statusPill = document.getElementById("status-pill");
  if (statusPill) statusPill.textContent = "Running...";
  try {
    const result = await postJson("/api/simulate", payload);
    lastPayload = payload;
    lastResult = result;

    updateCards(result);
    updateLastRunStatus(result, payload);
    updateResultsTable(result);
    renderMainChart(result);
    renderGauge(result.r0, result.epidemic_status);
    renderGaugeInto("r0GaugeDetail", result.r0, result.epidemic_status);
    renderInterventions(result.parameters, result.animation);
    renderInterventionsInto("interventionDetailChart", result.parameters, result.animation);
    renderInfectedFocus(result);
    renderTreatedAids(result);
    renderPopulation(result);
    renderStackedAndPercentage(result);
    renderAnimatedPhase(result);
    renderVectorFieldPhase("phaseITChart", result, result.parameters);
    renderPhaseVariant("phaseIAChart", result, "I", "A", "I(t)", "A(t)");
    renderPhaseVariant("phaseSIChart", result, "S", "I", "S(t)", "I(t)");
    renderPhaseVariant("phaseTAChart", result, "T", "A", "T(t)", "A(t)");
    updateInterpretation(result);

    if (typeof flushPendingPlots === "function") flushPendingPlots();
    showToast(`Simulation ready. R\u2080 = ${result.r0.toFixed(3)} \u2014 ${result.epidemic_status}`, "success");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setBusy(false);
    if (statusPill && statusPill.textContent === "Running...") statusPill.textContent = "Ready";
  }
}

// Called when a secondary tab is first opened after a simulation
async function loadTabData(tabName) {
  if (!lastPayload || tabLoaded[tabName]) return;
  tabLoaded[tabName] = true;

  const statusPill = document.getElementById("status-pill");
  if (statusPill) statusPill.textContent = "Loading...";

  // Show skeleton for tabs that have one
  if (typeof showSkeleton === "function") showSkeleton(tabName);

  try {
    if (tabName === "scenario-comparison" || tabName === "scenario-explorer") {
      if (!tabLoaded["_scenario"]) {
        tabLoaded["_scenario"] = true;
        const scenarioData = await postJson("/api/scenario", { base_payload: lastPayload });
        lastScenarioData = scenarioData;
        renderScenarioChart(scenarioData);
        renderScenarioAidsChart(scenarioData);
        renderScenarioR0Chart(scenarioData.comparisons);
        renderScenarioRadar(scenarioData.comparisons);
        renderScenarioTable(scenarioData.comparisons);
        renderScenarioExplorer(scenarioData);
      }
      if (typeof hideSkeleton === "function") {
        hideSkeleton("scenario-explorer");
        hideSkeleton("scenario-comparison");
      }
    } else if (tabName === "sensitivity") {
      const sensitivity = await postJson("/api/sensitivity", { parameters: lastPayload.parameters });
      renderSensitivityChart(sensitivity.sensitivity);
      renderSensitivityRank(sensitivity.sensitivity);
      if (typeof hideSkeleton === "function") hideSkeleton("sensitivity");
    } else if (tabName === "memory") {
      const memoryResults = await Promise.all([1, 0.95, 0.85, 0.75].map(async (q) => {
        const mp = JSON.parse(JSON.stringify(lastPayload));
        mp.parameters.q = q;
        return await postJson("/api/simulate", mp);
      }));
      renderMemoryChart(memoryResults);
      renderMemoryExtraCharts(memoryResults);
      if (typeof hideSkeleton === "function") hideSkeleton("memory");
    } else if (tabName === "surface") {
      renderSurface(lastPayload.parameters);
      renderHeatmapsAndWaterfall(lastPayload.parameters, lastResult);
    } else if (tabName === "chapter6") {
      const chapter6 = await postJson("/api/chapter6", lastPayload);
      renderChapter6(chapter6);
      if (typeof hideSkeleton === "function") hideSkeleton("chapter6");
    } else if (tabName === "reliability") {
      const reliability = await postJson("/api/reliability", { ...lastPayload, step_values: [0.2, 0.1, 0.05] });
      renderReliability(reliability);
      if (typeof hideSkeleton === "function") hideSkeleton("reliability");
    } else if (tabName === "phase") {
      if (lastResult) {
        renderVectorFieldPhase("phaseITChart", lastResult, lastResult.parameters);
        renderPhaseVariant("phaseIAChart", lastResult, "I", "A", "I(t)", "A(t)");
        renderPhaseVariant("phaseSIChart", lastResult, "S", "I", "S(t)", "I(t)");
        renderPhaseVariant("phaseTAChart", lastResult, "T", "A", "T(t)", "A(t)");
      }
    }
    if (typeof flushPendingPlots === "function") flushPendingPlots();
  } catch (error) {
    showToast(`${tabName}: ${error.message}`, "error");
    delete tabLoaded[tabName];
    if (tabName === "scenario-comparison" || tabName === "scenario-explorer") delete tabLoaded["_scenario"];
    if (typeof showSkeleton === "function") showSkeleton(tabName); // keep skeleton on error
  } finally {
    if (statusPill) statusPill.textContent = "Ready";
  }
}

async function downloadEndpoint(url, payload, filename, contentType = "text/plain") {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("Export failed.");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(objectUrl);
    showToast(`${filename} downloaded.`, "success");
  } catch (e) {
    showToast(e.message, "error");
  }
}

function flashExportBtn(btnId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fa fa-circle-check me-2"></i>Downloaded!';
  btn.classList.add("btn-export-ok");
  setTimeout(() => { btn.innerHTML = orig; btn.classList.remove("btn-export-ok"); }, 2000);
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
    link.href = url; link.download = "fractional_hiv_simulation.csv"; link.click();
    URL.revokeObjectURL(url);
    flashExportBtn("exportCsvBtn");
    showToast("CSV downloaded.", "success");
  } catch (e) { showToast(e.message, "error"); }
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

function downloadServerReport() {
  downloadEndpoint("/api/export/report", lastPayload || buildPayload(), "fractional_hiv_report.txt");
}

function downloadScenarioCsv() {
  downloadEndpoint("/api/export/scenarios.csv", { base_payload: lastPayload || buildPayload() }, "fractional_hiv_scenarios.csv", "text/csv");
}

function downloadSensitivityCsv() {
  downloadEndpoint("/api/export/sensitivity.csv", lastPayload || buildPayload(), "fractional_hiv_sensitivity.csv", "text/csv");
}

function downloadChapter6Text() {
  downloadEndpoint("/api/export/chapter6.txt", lastPayload || buildPayload(), "chapter6_results_text.txt", "text/plain");
}

function downloadThesisTables() {
  downloadEndpoint("/api/export/thesis-tables.csv", lastPayload || buildPayload(), "chapter6_thesis_tables.csv", "text/csv");
}

function downloadReliabilityCsv() {
  downloadEndpoint("/api/export/reliability.csv", { ...(lastPayload || buildPayload()), step_values: [0.2, 0.1, 0.05] }, "numerical_reliability.csv", "text/csv");
}

async function copyThesisText() {
  const text = document.getElementById("thesisTextBox")?.textContent || "";
  if (!text || text.includes("Run simulation")) {
    showToast("Run simulation first.", "error");
    return;
  }
  await navigator.clipboard.writeText(text);
  showToast("Thesis text copied.", "success");
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
  document.getElementById("exportJsonBtn")?.addEventListener("click", () => { downloadParams(); flashExportBtn("exportJsonBtn"); });
  document.getElementById("exportReportBtn")?.addEventListener("click", () => { downloadServerReport(); flashExportBtn("exportReportBtn"); });
  document.getElementById("exportScenarioCsvBtn")?.addEventListener("click", () => { downloadScenarioCsv(); flashExportBtn("exportScenarioCsvBtn"); });
  document.getElementById("exportSensitivityCsvBtn")?.addEventListener("click", () => { downloadSensitivityCsv(); flashExportBtn("exportSensitivityCsvBtn"); });
  document.getElementById("copyThesisTextBtn")?.addEventListener("click", copyThesisText);
  document.getElementById("downloadChapter6Text")?.addEventListener("click", downloadChapter6Text);
  document.getElementById("downloadThesisTables")?.addEventListener("click", downloadThesisTables);
  document.getElementById("downloadReliabilityCsv")?.addEventListener("click", downloadReliabilityCsv);

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
  setInterval(renderLastRunStatus, 5000);
});

document.addEventListener("keydown", (event) => {
  const activeElement = document.activeElement;
  const isTyping = activeElement && ["INPUT", "SELECT", "TEXTAREA"].includes(activeElement.tagName);
  if (event.ctrlKey && event.key === "Enter") {
    event.preventDefault();
    runSimulation();
    return;
  }
  if (event.ctrlKey && event.key.toLowerCase() === "r") {
    event.preventDefault();
    resetDefaults();
    return;
  }
  if (!isTyping && /^[1-9]$/.test(event.key)) {
    const tabs = Array.from(document.querySelectorAll(".tab-btn[data-tab]"));
    const target = tabs[Number(event.key) - 1];
    if (target) {
      event.preventDefault();
      target.click();
    }
  }
});
