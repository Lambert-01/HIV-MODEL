const plotLayout = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: { color: "#f8fafc", family: "Inter, sans-serif", size: 12 },
  margin: { t: 20, r: 16, b: 48, l: 60 },
  xaxis: {
    gridcolor: "rgba(255,255,255,0.06)",
    zerolinecolor: "rgba(255,255,255,0.1)",
    title: { text: "Time (years)", font: { size: 11 } }
  },
  yaxis: {
    gridcolor: "rgba(255,255,255,0.06)",
    zerolinecolor: "rgba(255,255,255,0.1)"
  },
  legend: { orientation: "h", y: -0.18, font: { size: 11 } },
  hovermode: "x unified"
};

const plotConfig = {
  responsive: true,
  displaylogo: false,
  modeBarButtonsToRemove: ["select2d", "lasso2d"],
  toImageButtonOptions: { format: "png", scale: 3 }
};

function layout(overrides = {}) {
  return Object.assign({}, plotLayout, overrides);
}

function renderMainChart(result) {
  const t = result.time_series.time;
  Plotly.react("mainChart", [
    { x: t, y: result.time_series.S, name: "S(t) Susceptible", mode: "lines", line: { color: "#00d4ff", width: 2.5 } },
    { x: t, y: result.time_series.I, name: "I(t) Infected",    mode: "lines", line: { color: "#ef476f", width: 2.5 } },
    { x: t, y: result.time_series.T, name: "T(t) Treated",     mode: "lines", line: { color: "#06d6a0", width: 2.5 } },
    { x: t, y: result.time_series.A, name: "A(t) AIDS",        mode: "lines", line: { color: "#ffd166", width: 2.5 } }
  ], layout({ yaxis: { ...plotLayout.yaxis, title: "Population" } }), plotConfig);
}

function renderGauge(r0, status) {
  const maxVal = Math.max(3, r0 + 0.5);
  const barColor = r0 < 1 ? "#06d6a0" : r0 <= 1.02 ? "#fca311" : "#ef476f";
  Plotly.react("r0Gauge", [{
    type: "indicator",
    mode: "gauge+number+delta",
    value: r0,
    delta: { reference: 1, increasing: { color: "#ef476f" }, decreasing: { color: "#06d6a0" } },
    number: { font: { size: 32, color: barColor } },
    gauge: {
      axis: { range: [0, maxVal], tickcolor: "#94a3b8", tickfont: { size: 10 } },
      bar: { color: barColor, thickness: 0.25 },
      bgcolor: "rgba(0,0,0,0)",
      bordercolor: "rgba(255,255,255,0.1)",
      steps: [
        { range: [0, 1],       color: "rgba(6,214,160,0.15)" },
        { range: [1, 2],       color: "rgba(252,163,17,0.15)" },
        { range: [2, maxVal],  color: "rgba(239,71,111,0.15)" }
      ],
      threshold: { line: { color: "#ffd166", width: 3 }, thickness: 0.8, value: 1 }
    },
    title: { text: `R₀ — ${status}`, font: { size: 13, color: "#94a3b8" } }
  }], layout({ margin: { t: 20, r: 20, b: 20, l: 20 } }), plotConfig);
}

function renderGaugeInto(chartId, r0, status) {
  if (!document.getElementById(chartId)) return;
  const maxVal = Math.max(3, r0 + 0.5);
  const barColor = r0 < 1 ? "#06d6a0" : r0 <= 1.02 ? "#fca311" : "#ef476f";
  Plotly.react(chartId, [{
    type: "indicator",
    mode: "gauge+number+delta",
    value: r0,
    delta: { reference: 1, increasing: { color: "#ef476f" }, decreasing: { color: "#06d6a0" } },
    number: { font: { size: 32, color: barColor } },
    gauge: {
      axis: { range: [0, maxVal], tickcolor: "#94a3b8", tickfont: { size: 10 } },
      bar: { color: barColor, thickness: 0.25 },
      bgcolor: "rgba(0,0,0,0)",
      bordercolor: "rgba(255,255,255,0.1)",
      steps: [
        { range: [0, 1], color: "rgba(6,214,160,0.15)" },
        { range: [1, 2], color: "rgba(252,163,17,0.15)" },
        { range: [2, maxVal], color: "rgba(239,71,111,0.15)" }
      ],
      threshold: { line: { color: "#ffd166", width: 3 }, thickness: 0.8, value: 1 }
    },
    title: { text: `R0 - ${status}`, font: { size: 13, color: "#94a3b8" } }
  }], layout({ margin: { t: 20, r: 20, b: 20, l: 20 } }), plotConfig);
}

function renderInterventions(params) {
  Plotly.react("interventionChart", [{
    x: ["u₁ Awareness", "u₂ Safer", "u₃ Testing", "u₄ Adherence"],
    y: [params.u1, params.u2, params.u3, params.u4],
    type: "bar",
    marker: {
      color: ["#00d4ff", "#ffd166", "#06d6a0", "#ef476f"],
      opacity: 0.85
    },
    text: [params.u1, params.u2, params.u3, params.u4].map((v) => v.toFixed(2)),
    textposition: "outside",
    textfont: { size: 11 }
  }], layout({
    yaxis: { ...plotLayout.yaxis, range: [0, 1.15], title: "Level" },
    xaxis: { ...plotLayout.xaxis, title: "" }
  }), plotConfig);
}

function renderInterventionsInto(chartId, params) {
  if (!document.getElementById(chartId)) return;
  Plotly.react(chartId, [{
    x: ["u1", "u2", "u3", "u4"],
    y: [params.u1, params.u2, params.u3, params.u4],
    type: "bar",
    marker: { color: ["#00d4ff", "#ffd166", "#06d6a0", "#ef476f"] },
    text: [params.u1, params.u2, params.u3, params.u4].map((v) => interventionLabel(v)),
    textposition: "outside"
  }], layout({
    yaxis: { ...plotLayout.yaxis, range: [0, 1.18], title: "Intervention strength" },
    xaxis: { ...plotLayout.xaxis, title: "" }
  }), plotConfig);
}

function interventionLabel(value) {
  if (value === 0) return "none";
  if (value < 0.5) return "weak";
  if (value < 0.75) return "moderate";
  if (value < 1) return "strong";
  return "maximum";
}

function renderInfectedFocus(result) {
  const t = result.time_series.time;
  const I = result.time_series.I;
  Plotly.react("infectedChart", [
    { x: t, y: I, name: "I(t)", mode: "lines", line: { color: "#ef476f", width: 2.5 } },
    {
      x: [result.summary.time_peak],
      y: [result.summary.peak_infected],
      name: "Peak",
      mode: "markers",
      marker: { color: "#ffd166", size: 10, symbol: "diamond" }
    }
  ], layout({ yaxis: { ...plotLayout.yaxis, title: "Infected" } }), plotConfig);
}

function renderTreatedAids(result) {
  const t = result.time_series.time;
  Plotly.react("treatedAidsChart", [
    { x: t, y: result.time_series.T, name: "T(t) Treated", mode: "lines", line: { color: "#06d6a0", width: 2.5 } },
    { x: t, y: result.time_series.A, name: "A(t) AIDS",    mode: "lines", line: { color: "#ffd166", width: 2.5 } }
  ], layout({ yaxis: { ...plotLayout.yaxis, title: "Population" } }), plotConfig);
}

function renderPopulation(result) {
  Plotly.react("populationChart", [{
    x: result.time_series.time,
    y: result.time_series.N,
    name: "N(t)",
    mode: "lines",
    fill: "tozeroy",
    fillcolor: "rgba(0,212,255,0.07)",
    line: { color: "#00d4ff", width: 2.5 }
  }], layout({ yaxis: { ...plotLayout.yaxis, title: "Total Population" } }), plotConfig);
}

function renderStackedAndPercentage(result) {
  const t = result.time_series.time;
  const traces = [
    { key: "S", color: "#00d4ff", name: "S(t)" },
    { key: "I", color: "#ef476f", name: "I(t)" },
    { key: "T", color: "#06d6a0", name: "T(t)" },
    { key: "A", color: "#ffd166", name: "A(t)" }
  ];
  Plotly.react("stackedChart", traces.map((item) => ({
    x: t,
    y: result.time_series[item.key],
    stackgroup: "one",
    mode: "lines",
    name: item.name,
    line: { color: item.color, width: 1.5 }
  })), layout({ yaxis: { ...plotLayout.yaxis, title: "Population" } }), plotConfig);

  Plotly.react("percentageChart", traces.map((item) => ({
    x: t,
    y: result.time_series[item.key].map((v, i) => result.time_series.N[i] ? 100 * v / result.time_series.N[i] : 0),
    mode: "lines",
    name: item.name,
    line: { color: item.color, width: 2.3 }
  })), layout({ yaxis: { ...plotLayout.yaxis, title: "Percent of N", range: [0, 100] } }), plotConfig);
}

function renderPhase(result) {
  Plotly.react("phaseChart", [{
    x: result.time_series.I,
    y: result.time_series.T,
    mode: "lines+markers",
    marker: {
      color: result.time_series.time,
      colorscale: "Viridis",
      size: 4,
      showscale: true,
      colorbar: { thickness: 10, len: 0.6, title: { text: "t", side: "right" } }
    },
    line: { color: "rgba(255,255,255,0.2)", width: 1 },
    name: "I–T phase"
  }], layout({
    xaxis: { ...plotLayout.xaxis, title: "I(t)" },
    yaxis: { ...plotLayout.yaxis, title: "T(t)" },
    hovermode: "closest"
  }), plotConfig);
}

function renderAnimatedPhase(result) {
  const t = result.time_series.time;
  const maxIdx = t.length - 1;
  
  Plotly.newPlot("phaseChart", [{
    x: result.time_series.I,
    y: result.time_series.T,
    mode: "lines",
    line: { color: "rgba(0,212,255,0.3)", width: 1.5 },
    name: "Phase trajectory"
  }, {
    x: [result.time_series.I[0]],
    y: [result.time_series.T[0]],
    mode: "markers+text",
    marker: { size: 12, color: "#ffd166", symbol: "circle" },
    text: ["Start"],
    textposition: "top center",
    textfont: { color: "#ffd166", size: 11 },
    name: "Current position"
  }], layout({
    xaxis: { ...plotLayout.xaxis, title: "I(t) Infected" },
    yaxis: { ...plotLayout.yaxis, title: "T(t) Treated" },
    hovermode: "closest"
  }), plotConfig);
  
  let idx = 0;
  const interval = setInterval(() => {
    idx++;
    if (idx >= maxIdx) {
      clearInterval(interval);
      Plotly.update("phaseChart", {
        x: [[result.time_series.I[maxIdx]]],
        y: [[result.time_series.T[maxIdx]]],
        text: [["End"]]
      }, {}, [1]);
      return;
    }
    Plotly.update("phaseChart", {
      x: [[result.time_series.I[idx]]],
      y: [[result.time_series.T[idx]]],
      text: [[t[idx].toFixed(1) + "y"]]
    }, {}, [1]);
  }, 50);
}

function renderPhaseVariant(chartId, result, xKey, yKey, xLabel, yLabel) {
  if (!document.getElementById(chartId)) return;
  const x = result.time_series[xKey];
  const y = result.time_series[yKey];
  const t = result.time_series.time;
  Plotly.react(chartId, [{
    x,
    y,
    mode: "lines+markers",
    marker: {
      color: t,
      colorscale: "Viridis",
      size: 4,
      showscale: true,
      colorbar: { thickness: 10, len: 0.55, title: { text: "t" } }
    },
    line: { color: "rgba(0,212,255,0.28)", width: 1.5 },
    customdata: t,
    hovertemplate: "Time: %{customdata:.2f}<br>" + xLabel + ": %{x:.2f}<br>" + yLabel + ": %{y:.2f}<extra></extra>",
    name: `${xLabel} vs ${yLabel}`
  }], layout({
    xaxis: { ...plotLayout.xaxis, title: xLabel },
    yaxis: { ...plotLayout.yaxis, title: yLabel },
    hovermode: "closest"
  }), plotConfig);
}

function renderScenarioChart(data) {
  const colors = ["#00d4ff", "#ef476f", "#06d6a0", "#ffd166", "#a78bfa", "#fb923c", "#38bdf8", "#f472b6"];
  const traces = Object.values(data.curves).map((curve, i) => ({
    x: curve.time,
    y: curve.I,
    mode: "lines",
    name: curve.name,
    line: { width: 2.5, color: colors[i % colors.length] }
  }));
  Plotly.react("scenarioChart", traces, layout({
    yaxis: { ...plotLayout.yaxis, title: "Infected I(t)" }
  }), plotConfig);
}

function renderScenarioAidsChart(data) {
  if (!document.getElementById("scenarioAidsChart")) return;
  const colors = ["#00d4ff", "#ef476f", "#06d6a0", "#ffd166", "#a78bfa", "#fb923c", "#38bdf8", "#f472b6", "#c084fc"];
  const traces = Object.values(data.curves).map((curve, i) => ({
    x: curve.time,
    y: curve.A,
    mode: "lines",
    name: curve.name,
    line: { width: 2.5, color: colors[i % colors.length] }
  }));
  Plotly.react("scenarioAidsChart", traces, layout({
    yaxis: { ...plotLayout.yaxis, title: "AIDS A(t)" }
  }), plotConfig);
}

function renderScenarioR0Chart(comparisons) {
  if (!document.getElementById("scenarioR0Chart")) return;
  Plotly.react("scenarioR0Chart", [{
    x: comparisons.map((row) => row.name),
    y: comparisons.map((row) => row.r0),
    type: "bar",
    marker: { color: comparisons.map((row) => row.r0 < 1 ? "#06d6a0" : row.r0 <= 1.02 ? "#fca311" : "#ef476f") },
    text: comparisons.map((row) => row.r0.toFixed(2)),
    textposition: "outside"
  }], layout({
    xaxis: { ...plotLayout.xaxis, title: "", tickangle: -25 },
    yaxis: { ...plotLayout.yaxis, title: "R0" },
    shapes: [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: 1, y1: 1, line: { color: "#ffd166", width: 2, dash: "dash" } }]
  }), plotConfig);
}

function renderScenarioRadar(comparisons) {
  if (!document.getElementById("scenarioRadarChart") || !comparisons.length) return;
  const maxPeak = Math.max(...comparisons.map((row) => row.peak_infected), 1);
  const maxFinalI = Math.max(...comparisons.map((row) => row.final_infected), 1);
  const maxFinalA = Math.max(...comparisons.map((row) => row.final_aids), 1);
  const rows = comparisons.slice(0, 6);
  const traces = rows.map((row) => ({
    type: "scatterpolar",
    r: [
      Math.min(row.r0 / 3, 1),
      row.peak_infected / maxPeak,
      row.final_infected / maxFinalI,
      row.final_aids / maxFinalA,
      row.final_treated / Math.max(...comparisons.map((r) => r.final_treated), 1),
      (row.u1 + row.u2 + row.u3 + row.u4) / 4
    ],
    theta: ["R0", "Peak I", "Final I", "Final A", "Final T", "Intervention"],
    fill: "toself",
    name: row.name
  }));
  Plotly.react("scenarioRadarChart", traces, {
    ...plotLayout,
    polar: { radialaxis: { visible: true, range: [0, 1], color: "#94a3b8" }, bgcolor: "rgba(0,0,0,0)" },
    margin: { t: 20, r: 35, b: 30, l: 35 }
  }, plotConfig);
}

function renderSensitivityChart(values) {
  Plotly.react("sensitivityChart", [{
    x: values.map((item) => item.parameter),
    y: values.map((item) => item.sensitivity),
    type: "bar",
    marker: {
      color: values.map((item) => item.sensitivity >= 0 ? "#ef476f" : "#06d6a0"),
      opacity: 0.85
    },
    text: values.map((item) => item.sensitivity.toFixed(3)),
    textposition: "outside",
    textfont: { size: 10 }
  }], layout({
    yaxis: { ...plotLayout.yaxis, title: "Sensitivity Index" },
    xaxis: { ...plotLayout.xaxis, title: "Parameter" }
  }), plotConfig);
}

function renderMemoryChart(results) {
  const colors = ["#00d4ff", "#06d6a0", "#ffd166", "#ef476f"];
  const traces = results.map((result, i) => ({
    x: result.time_series.time,
    y: result.time_series.I,
    mode: "lines",
    name: `q = ${result.parameters.q.toFixed(2)}`,
    line: { width: 2.5, color: colors[i] }
  }));
  Plotly.react("memoryChart", traces, layout({
    yaxis: { ...plotLayout.yaxis, title: "Infected I(t)" }
  }), plotConfig);
}

function renderMemoryExtraCharts(results) {
  const colors = ["#00d4ff", "#06d6a0", "#ffd166", "#ef476f"];
  const build = (key, chartId, title) => {
    if (!document.getElementById(chartId)) return;
    Plotly.react(chartId, results.map((result, i) => ({
      x: result.time_series.time,
      y: result.time_series[key],
      mode: "lines",
      name: `q=${result.parameters.q.toFixed(2)}`,
      line: { width: 2.3, color: colors[i] }
    })), layout({ yaxis: { ...plotLayout.yaxis, title } }), plotConfig);
  };
  build("T", "memoryTChart", "Treated T(t)");
  build("A", "memoryAChart", "AIDS A(t)");
  if (document.getElementById("memoryPhaseChart")) {
    Plotly.react("memoryPhaseChart", results.map((result, i) => ({
      x: result.time_series.I,
      y: result.time_series.T,
      mode: "lines",
      name: `q=${result.parameters.q.toFixed(2)}`,
      line: { width: 2.2, color: colors[i] }
    })), layout({
      xaxis: { ...plotLayout.xaxis, title: "I(t)" },
      yaxis: { ...plotLayout.yaxis, title: "T(t)" },
      hovermode: "closest"
    }), plotConfig);
  }
}

function renderSurface(params) {
  const axis = Array.from({ length: 21 }, (_, i) => i / 20);
  const z = axis.map((u2) => axis.map((u1) => {
    const betaEff = params.beta0 * (1 - u1) * (1 - u2);
    const tauEff  = params.tau * (1 + params.u3);
    const rhoEff  = params.rho * (1 - params.u4);
    return (betaEff / (tauEff + params.delta + params.mu)) *
           (1 + (params.eta * tauEff) / (rhoEff + params.mu));
  }));
  Plotly.react("surfaceChart", [{
    x: axis, y: axis, z,
    type: "surface",
    colorscale: "Viridis",
    contours: { z: { show: true, usecolormap: true, highlightcolor: "#ffd166", project: { z: true } } },
    colorbar: { thickness: 14, len: 0.6 }
  }], {
    ...plotLayout,
    margin: { t: 20, r: 20, b: 20, l: 20 },
    scene: {
      xaxis: { title: "u₁ Awareness",       gridcolor: "rgba(255,255,255,0.08)", color: "#94a3b8" },
      yaxis: { title: "u₂ Safer Behaviour", gridcolor: "rgba(255,255,255,0.08)", color: "#94a3b8" },
      zaxis: { title: "R₀",                 gridcolor: "rgba(255,255,255,0.08)", color: "#94a3b8" },
      bgcolor: "rgba(0,0,0,0)"
    }
  }, plotConfig);
}

function computeR0FromParams(params, updates = {}) {
  const p = { ...params, ...updates };
  const betaEff = p.beta0 * (1 - p.u1) * (1 - p.u2);
  const tauEff = p.tau * (1 + p.u3);
  const rhoEff = p.rho * (1 - p.u4);
  return (betaEff / (tauEff + p.delta + p.mu)) * (1 + (p.eta * tauEff) / (rhoEff + p.mu));
}

function renderHeatmapsAndWaterfall(params, result) {
  const axis = Array.from({ length: 21 }, (_, i) => i / 20);
  const r0Z = axis.map((u2) => axis.map((u1) => computeR0FromParams(params, { u1, u2 })));
  if (document.getElementById("r0HeatmapChart")) {
    Plotly.react("r0HeatmapChart", [{
      x: axis, y: axis, z: r0Z, type: "heatmap", colorscale: "Viridis",
      contours: { coloring: "heatmap", showlabels: true }
    }], layout({
      xaxis: { ...plotLayout.xaxis, title: "u1 Awareness" },
      yaxis: { ...plotLayout.yaxis, title: "u2 Safer Behaviour" }
    }), plotConfig);
  }

  if (document.getElementById("finalInfectedHeatmapChart")) {
    const baseFinal = result.summary.final_infected;
    const baseR0 = Math.max(result.r0, 1e-9);
    const z = r0Z.map((row) => row.map((r0) => baseFinal * (r0 / baseR0)));
    Plotly.react("finalInfectedHeatmapChart", [{
      x: axis, y: axis, z, type: "heatmap", colorscale: "RdYlGn", reversescale: true
    }], layout({
      xaxis: { ...plotLayout.xaxis, title: "u1 Awareness" },
      yaxis: { ...plotLayout.yaxis, title: "u2 Safer Behaviour" }
    }), plotConfig);
  }

  if (document.getElementById("finalAidsHeatmapChart")) {
    const baseFinalA = result.summary.final_aids;
    const z = axis.map((u4) => axis.map((u3) => baseFinalA * (1 - 0.35 * u3) * (1 - 0.55 * u4)));
    Plotly.react("finalAidsHeatmapChart", [{
      x: axis, y: axis, z, type: "heatmap", colorscale: "RdYlGn", reversescale: true
    }], layout({
      xaxis: { ...plotLayout.xaxis, title: "u3 Testing" },
      yaxis: { ...plotLayout.yaxis, title: "u4 Adherence" }
    }), plotConfig);
  }

  if (document.getElementById("waterfallChart")) {
    const base = computeR0FromParams(params, { u1: 0, u2: 0, u3: 0, u4: 0 });
    const afterU1 = computeR0FromParams(params, { u1: params.u1, u2: 0, u3: 0, u4: 0 });
    const afterU2 = computeR0FromParams(params, { u1: params.u1, u2: params.u2, u3: 0, u4: 0 });
    const afterU3 = computeR0FromParams(params, { u1: params.u1, u2: params.u2, u3: params.u3, u4: 0 });
    const final = computeR0FromParams(params);
    Plotly.react("waterfallChart", [{
      type: "waterfall",
      x: ["Baseline", "Awareness", "Safer", "Testing", "Adherence", "Final"],
      y: [base, afterU1 - base, afterU2 - afterU1, afterU3 - afterU2, final - afterU3, final],
      measure: ["absolute", "relative", "relative", "relative", "relative", "total"],
      decreasing: { marker: { color: "#06d6a0" } },
      increasing: { marker: { color: "#ef476f" } },
      totals: { marker: { color: "#00d4ff" } }
    }], layout({ yaxis: { ...plotLayout.yaxis, title: "R0" } }), plotConfig);
  }
}

function exportThesisFigure(chartId, filename) {
  const config = {
    ...plotConfig,
    toImageButtonOptions: {
      format: "png",
      filename: filename,
      height: null,
      width: null,
      scale: 4
    }
  };
  Plotly.downloadImage(chartId, config);
}
