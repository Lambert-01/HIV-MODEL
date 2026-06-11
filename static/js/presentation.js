(function () {
  const basePayload = {
    initial_conditions: {
      S0: 10000,
      I0: 150,
      T0: 80,
      A0: 20
    },
    parameters: {
      Lambda: 100,
      beta0: 0.3,
      mu: 0.02,
      tau: 0.2,
      delta: 0.1,
      rho: 0.03,
      eta: 0.1,
      d: 0.33,
      q: 0.95,
      u1: 0.4,
      u2: 0.5,
      u3: 0.6,
      u4: 0.7
    },
    simulation: {
      years: 50,
      step: 0.2
    }
  };

  const scenarioPresets = {
    baseline: {
      label: "Baseline Scenario",
      overrides: {}
    },
    no_intervention: {
      label: "No Intervention",
      overrides: { q: 0.95, u1: 0, u2: 0, u3: 0, u4: 0 }
    },
    combined_intervention: {
      label: "Combined Intervention",
      overrides: { q: 0.95, u1: 0.7, u2: 0.7, u3: 0.6, u4: 0.8 }
    },
    high_memory: {
      label: "High Memory Effect q=0.75",
      overrides: { q: 0.75, u1: 0.4, u2: 0.4, u3: 0.4, u4: 0.4 }
    },
    ordinary_model: {
      label: "Ordinary Model q=1",
      overrides: { q: 1, u1: 0.5, u2: 0.5, u3: 0.5, u4: 0.5 }
    }
  };

  const state = {
    animationTimer: null,
    lastScenarioKey: "baseline"
  };

  const colors = {
    S: "#128277",
    I: "#b84545",
    T: "#cc9900",
    A: "#6e63b8",
    text: "#172033",
    grid: "#e5ecf3"
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function buildPayload(key) {
    const payload = clone(basePayload);
    const preset = scenarioPresets[key] || scenarioPresets.baseline;
    payload.parameters = { ...payload.parameters, ...preset.overrides };
    return payload;
  }

  function formatNumber(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setStatus(message, mode) {
    const status = document.getElementById("presentationStatus");
    if (!status) return;
    const icon = mode === "error" ? "fa-triangle-exclamation" : mode === "ready" ? "fa-circle-check" : "fa-spinner fa-spin";
    status.className = `presentation-status ${mode || ""}`.trim();
    status.innerHTML = `<i class="fa ${icon}"></i><span>${message}</span>`;
  }

  function plotConfig() {
    return {
      responsive: true,
      displayModeBar: false
    };
  }

  function baseLayout(extra) {
    return {
      margin: { l: 56, r: 24, t: 20, b: 46 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "#ffffff",
      font: { color: colors.text, family: "Inter, system-ui, sans-serif" },
      xaxis: {
        title: "Years",
        gridcolor: colors.grid,
        zeroline: false
      },
      yaxis: {
        gridcolor: colors.grid,
        zeroline: false,
        rangemode: "tozero"
      },
      legend: {
        orientation: "h",
        y: -0.18,
        x: 0,
        font: { size: 12 }
      },
      hovermode: "x unified",
      ...extra
    };
  }

  function lineTrace(name, x, y, color) {
    return {
      type: "scatter",
      mode: "lines",
      name,
      x,
      y,
      line: { color, width: 3 },
      hovertemplate: `${name}: %{y:,.0f}<extra></extra>`
    };
  }

  function updateMetrics(result) {
    const summary = result.summary;
    setText("metricR0", Number(result.r0).toFixed(3));
    setText("metricStatus", result.epidemic_status);
    setText("metricPeak", formatNumber(summary.peak_infected));
    setText("metricPeakTime", `At year ${Number(summary.time_peak).toFixed(1)}`);
    setText("metricFinalI", formatNumber(summary.final_infected));
    setText("metricQ", Number(summary.memory_order).toFixed(2));
    setText("metricMemoryMode", summary.memory_order < 1 ? "Fractional memory" : "Ordinary model");
  }

  function renderTrajectory(result) {
    const series = result.time_series;
    const title = scenarioPresets[state.lastScenarioKey].label;
    setText("activeScenarioTitle", title);

    const traces = [
      lineTrace("S(t) Susceptible", series.time, series.S, colors.S),
      lineTrace("I(t) Infected", series.time, series.I, colors.I),
      lineTrace("T(t) Treated", series.time, series.T, colors.T),
      lineTrace("A(t) AIDS stage", series.time, series.A, colors.A),
      {
        type: "scatter",
        mode: "markers",
        name: "Current year",
        x: [series.time[0]],
        y: [series.I[0]],
        marker: {
          color: "#172033",
          size: 15,
          symbol: "circle",
          line: { color: "#ffffff", width: 3 }
        },
        hovertemplate: "Year %{x:.1f}<br>I: %{y:,.0f}<extra></extra>"
      }
    ];

    Plotly.react(
      "presentationTrajectory",
      traces,
      baseLayout({
        yaxis: { title: "Population", gridcolor: colors.grid, zeroline: false, rangemode: "tozero" }
      }),
      plotConfig()
    );
  }

  function animateTrajectory(result) {
    window.clearInterval(state.animationTimer);
    const series = result.time_series;
    let index = 0;

    state.animationTimer = window.setInterval(() => {
      if (!series.time.length) return;
      const time = series.time[index];
      const infected = series.I[index];
      setText("currentYear", Number(time).toFixed(1));
      Plotly.restyle("presentationTrajectory", { x: [[time]], y: [[infected]] }, [4]);
      index = (index + 1) % series.time.length;
    }, 170);
  }

  function renderScenarioComparison(data) {
    const rows = data.comparisons || [];
    Plotly.react(
      "presentationScenarioChart",
      [
        {
          type: "bar",
          orientation: "h",
          y: rows.map((row) => row.name),
          x: rows.map((row) => row.r0),
          text: rows.map((row) => Number(row.r0).toFixed(2)),
          textposition: "auto",
          marker: {
            color: rows.map((row) => row.r0 < 1 ? "#128277" : "#b84545")
          },
          hovertemplate: "%{y}<br>R0: %{x:.3f}<extra></extra>"
        }
      ],
      baseLayout({
        margin: { l: 170, r: 20, t: 20, b: 44 },
        xaxis: { title: "R0", gridcolor: colors.grid, zeroline: false },
        yaxis: { automargin: true },
        shapes: [
          {
            type: "line",
            x0: 1,
            x1: 1,
            y0: -0.5,
            y1: rows.length - 0.5,
            line: { color: "#172033", width: 2, dash: "dot" }
          }
        ],
        showlegend: false
      }),
      plotConfig()
    );
  }

  function renderMemoryComparison(data) {
    const traces = (data.curves || []).map((row, index) => {
      const palette = ["#172033", "#128277", "#cc9900", "#6e63b8"];
      return lineTrace(`q=${Number(row.q).toFixed(2)}`, row.time, row.I, palette[index % palette.length]);
    });

    Plotly.react(
      "presentationMemoryChart",
      traces,
      baseLayout({
        yaxis: { title: "Infected I(t)", gridcolor: colors.grid, zeroline: false, rangemode: "tozero" }
      }),
      plotConfig()
    );
  }

  function renderSensitivity(data) {
    const ranked = [...(data.sensitivity || [])].sort((a, b) => Math.abs(a.sensitivity) - Math.abs(b.sensitivity));
    Plotly.react(
      "presentationSensitivityChart",
      [
        {
          type: "bar",
          y: ranked.map((row) => row.parameter),
          x: ranked.map((row) => row.sensitivity),
          orientation: "h",
          text: ranked.map((row) => Number(row.sensitivity).toFixed(3)),
          textposition: "auto",
          marker: {
            color: ranked.map((row) => row.sensitivity >= 0 ? "#b84545" : "#128277")
          },
          hovertemplate: "%{y}<br>Index: %{x:.4f}<extra></extra>"
        }
      ],
      baseLayout({
        margin: { l: 86, r: 28, t: 18, b: 44 },
        xaxis: { title: "Normalized sensitivity index", gridcolor: colors.grid, zeroline: true },
        yaxis: { automargin: true },
        showlegend: false
      }),
      plotConfig()
    );
  }

  async function refreshSupportingCharts(payload) {
    const selected = [
      "no_intervention",
      "awareness_only",
      "safer_behaviour",
      "testing_boost",
      "adherence_support",
      "combined_intervention",
      "ordinary_model",
      "high_memory"
    ];

    const [scenarioData, memoryData, sensitivityData] = await Promise.all([
      postJson("/api/scenario", { base_payload: payload, scenarios: selected }),
      postJson("/api/memory", { ...payload, q_values: [1, 0.95, 0.85, 0.75] }),
      postJson("/api/sensitivity", { parameters: payload.parameters })
    ]);

    renderScenarioComparison(scenarioData);
    renderMemoryComparison(memoryData);
    renderSensitivity(sensitivityData);
  }

  async function runScenario(key) {
    state.lastScenarioKey = key;
    const payload = buildPayload(key);
    setStatus(`Running ${scenarioPresets[key].label}...`, "");

    document.querySelectorAll(".scenario-chip").forEach((button) => {
      button.classList.toggle("active", button.dataset.scenario === key);
      button.disabled = true;
    });

    try {
      const result = await postJson("/api/simulate", payload);
      updateMetrics(result);
      renderTrajectory(result);
      animateTrajectory(result);
      await refreshSupportingCharts(payload);
      setStatus("Live presentation mode is ready. Use the scenario buttons to defend the results.", "ready");
    } catch (error) {
      setStatus(error.message || "Simulation failed.", "error");
    } finally {
      document.querySelectorAll(".scenario-chip").forEach((button) => {
        button.disabled = false;
      });
    }
  }

  function boot() {
    document.querySelectorAll(".scenario-chip").forEach((button) => {
      button.addEventListener("click", () => runScenario(button.dataset.scenario));
    });
    runScenario("baseline");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
