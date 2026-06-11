const plotLayout = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: { color: "#f8fafc", family: "Inter, sans-serif", size: 13 },
  margin: { t: 28, r: 28, b: 58, l: 70 },
  xaxis: {
    gridcolor: "rgba(148,163,184,0.16)",
    zerolinecolor: "rgba(248,250,252,0.22)",
    linecolor: "rgba(148,163,184,0.35)",
    tickcolor: "rgba(148,163,184,0.45)",
    tickfont: { color: "#e2e8f0", size: 12 },
    title: { text: "Time (years)", font: { size: 13, color: "#f8fafc" } },
    showspikes: true,
    spikemode: "across",
    spikecolor: "rgba(248,250,252,0.45)",
    spikethickness: 1
  },
  yaxis: {
    gridcolor: "rgba(148,163,184,0.16)",
    zerolinecolor: "rgba(248,250,252,0.22)",
    linecolor: "rgba(148,163,184,0.35)",
    tickcolor: "rgba(148,163,184,0.45)",
    tickfont: { color: "#e2e8f0", size: 12 },
    separatethousands: true,
    rangemode: "tozero",
    showspikes: true,
    spikemode: "across",
    spikecolor: "rgba(248,250,252,0.45)",
    spikethickness: 1
  },
  legend: {
    orientation: "h",
    y: -0.2,
    x: 0,
    font: { size: 12, color: "#f8fafc" },
    bgcolor: "rgba(7,17,31,0.72)",
    bordercolor: "rgba(148,163,184,0.18)",
    borderwidth: 1
  },
  hovermode: "x unified",
  hoverlabel: {
    bgcolor: "#07111f",
    bordercolor: "rgba(0,212,255,0.55)",
    font: { color: "#f8fafc", family: "Inter, sans-serif", size: 13 }
  },
  transition: { duration: 450, easing: "cubic-in-out" }
};

const plotConfig = {
  responsive: true,
  displaylogo: false,
  scrollZoom: true,
  modeBarButtonsToRemove: ["select2d", "lasso2d"],
  toImageButtonOptions: { format: "png", scale: 3 }
};

const pendingPlots = {};

function isPlotTargetVisible(chartId) {
  const element = document.getElementById(chartId);
  if (!element) return false;
  const box = element.getBoundingClientRect();
  return element.offsetParent !== null && box.width > 40 && box.height > 40;
}

function safePlotlyReact(chartId, traces, chartLayout, config = plotConfig) {
  const element = document.getElementById(chartId);
  if (!element || !window.Plotly) return Promise.resolve();

  pendingPlots[chartId] = { traces, chartLayout, config };
  if (!isPlotTargetVisible(chartId)) return Promise.resolve();

  const plot = pendingPlots[chartId];
  delete pendingPlots[chartId];
  return Plotly.react(chartId, plot.traces, plot.chartLayout, plot.config).then(() => {
    if (element.classList.contains("plot-ready")) return;
    element.classList.add("plot-ready");
    element.animate(
      [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 420, easing: "ease-out" }
    );
  });
}

function flushPendingPlots() {
  Object.keys(pendingPlots).forEach((chartId) => {
    if (!isPlotTargetVisible(chartId)) return;
    const plot = pendingPlots[chartId];
    delete pendingPlots[chartId];
    Plotly.react(chartId, plot.traces, plot.chartLayout, plot.config);
  });

  document.querySelectorAll(".js-plotly-plot").forEach((chart) => {
    if (chart.offsetParent !== null && window.Plotly) {
      Plotly.Plots.resize(chart);
    }
  });
}

function layout(overrides = {}) {
  return {
    ...plotLayout,
    ...overrides,
    xaxis: { ...plotLayout.xaxis, ...(overrides.xaxis || {}) },
    yaxis: { ...plotLayout.yaxis, ...(overrides.yaxis || {}) },
    legend: { ...plotLayout.legend, ...(overrides.legend || {}) },
    hoverlabel: { ...plotLayout.hoverlabel, ...(overrides.hoverlabel || {}) }
  };
}

function compactNumber(value) {
  const abs = Math.abs(Number(value));
  if (abs >= 1000) return `${(value / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  if (abs >= 100) return Number(value).toFixed(0);
  if (abs >= 10) return Number(value).toFixed(1);
  return Number(value).toFixed(2);
}

function lineTrace(x, y, name, color, extra = {}) {
  return {
    x,
    y,
    name,
    mode: "lines",
    line: { color, width: 3, shape: "spline", smoothing: 0.45 },
    hovertemplate: `<b>${name}</b><br>Time: %{x:.2f} years<br>Population: %{y:,.3f}<extra></extra>`,
    ...extra
  };
}

function endpointAnnotation(x, y, text, color, offset = -18) {
  return {
    x,
    y,
    text,
    showarrow: true,
    arrowhead: 2,
    ax: 36,
    ay: offset,
    font: { color, size: 11 },
    arrowcolor: color,
    bgcolor: "rgba(7,17,31,0.86)",
    bordercolor: color,
    borderpad: 4
  };
}

function renderMainChart(result) {
  const t = result.time_series.time;
  const series = [
    { key: "S", label: "S(t) Susceptible", color: "#00d4ff" },
    { key: "I", label: "I(t) Infected", color: "#ef476f" },
    { key: "T", label: "T(t) Treated", color: "#06d6a0" },
    { key: "A", label: "A(t) AIDS", color: "#ffd166" }
  ];
  const peakI = result.summary.peak_infected;
  const timePeak = result.summary.time_peak;
  const traces = series.map((item) => lineTrace(t, result.time_series[item.key], item.label, item.color));
  traces.push({
    x: [timePeak],
    y: [peakI],
    name: "Peak I",
    mode: "markers+text",
    marker: { color: "#f8fafc", size: 11, symbol: "diamond", line: { color: "#ef476f", width: 2 } },
    text: [`Peak I: ${compactNumber(peakI)}`],
    textposition: "top right",
    textfont: { color: "#f8fafc", size: 12 },
    hovertemplate: "<b>Peak infected</b><br>Time: %{x:.2f} years<br>I: %{y:,.3f}<extra></extra>"
  });
  const lastIndex = t.length - 1;
  const annotations = series.map((item, index) => ({
    x: t[lastIndex],
    y: result.time_series[item.key][lastIndex],
    text: `${item.key}: ${compactNumber(result.time_series[item.key][lastIndex])}`,
    showarrow: true,
    arrowhead: 2,
    ax: 34,
    ay: index % 2 === 0 ? -18 : 18,
    font: { color: item.color, size: 12 },
    arrowcolor: item.color,
    bgcolor: "rgba(7,17,31,0.82)",
    bordercolor: item.color,
    borderpad: 4
  }));
  safePlotlyReact("mainChart", traces, layout({
    margin: { t: 30, r: 110, b: 62, l: 72 },
    yaxis: { title: "Population", tickformat: "~s" },
    annotations,
    updatemenus: [{
      type: "buttons",
      direction: "right",
      x: 1,
      xanchor: "right",
      y: 1.14,
      yanchor: "top",
      bgcolor: "rgba(7,17,31,0.88)",
      bordercolor: "rgba(0,212,255,0.35)",
      font: { color: "#f8fafc", size: 11 },
      buttons: [
        { label: "Linear", method: "relayout", args: [{ "yaxis.type": "linear", "yaxis.title.text": "Population" }] },
        { label: "Log", method: "relayout", args: [{ "yaxis.type": "log", "yaxis.title.text": "Population (log scale)" }] }
      ]
    }]
  }), plotConfig);
}

function renderGauge(r0, status) {
  const maxVal = Math.max(3, r0 + 0.5);
  const barColor = r0 < 1 ? "#06d6a0" : r0 <= 1.02 ? "#fca311" : "#ef476f";
  safePlotlyReact("r0Gauge", [{
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
  safePlotlyReact(chartId, [{
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
  safePlotlyReact("interventionChart", [{
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
  safePlotlyReact(chartId, [{
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
  safePlotlyReact("infectedChart", [
    lineTrace(t, I, "I(t) Infected", "#ef476f", {
      fill: "tozeroy",
      fillcolor: "rgba(239,71,111,0.12)"
    }),
    {
      x: [result.summary.time_peak],
      y: [result.summary.peak_infected],
      name: "Peak",
      mode: "markers+text",
      marker: { color: "#ffd166", size: 11, symbol: "diamond", line: { color: "#07111f", width: 2 } },
      text: [`Peak ${compactNumber(result.summary.peak_infected)}`],
      textposition: "top right",
      textfont: { color: "#ffd166", size: 12 },
      hovertemplate: "Peak I: %{y:,.3f}<br>Time: %{x:.2f} years<extra></extra>"
    }
  ], layout({
    yaxis: { title: "Infected population" },
    annotations: [
      endpointAnnotation(t[t.length - 1], I[I.length - 1], `Final I: ${compactNumber(I[I.length - 1])}`, "#ef476f", 18)
    ]
  }), plotConfig);
}

function renderTreatedAids(result) {
  const t = result.time_series.time;
  safePlotlyReact("treatedAidsChart", [
    lineTrace(t, result.time_series.T, "T(t) Treated", "#06d6a0", {
      fill: "tozeroy",
      fillcolor: "rgba(6,214,160,0.08)"
    }),
    lineTrace(t, result.time_series.A, "A(t) AIDS", "#ffd166", {
      fill: "tozeroy",
      fillcolor: "rgba(255,209,102,0.08)"
    })
  ], layout({
    yaxis: { title: "Population" },
    annotations: [
      endpointAnnotation(t[t.length - 1], result.time_series.T.at(-1), `Final T: ${compactNumber(result.time_series.T.at(-1))}`, "#06d6a0", -18),
      endpointAnnotation(t[t.length - 1], result.time_series.A.at(-1), `Final A: ${compactNumber(result.time_series.A.at(-1))}`, "#ffd166", 18)
    ]
  }), plotConfig);
}

function renderPopulation(result) {
  const t = result.time_series.time;
  const traces = [{
    x: result.time_series.time,
    y: result.time_series.N,
    name: "N(t)",
    mode: "lines",
    fill: "tozeroy",
    fillcolor: "rgba(0,212,255,0.07)",
    line: { color: "#00d4ff", width: 2.5 }
  }];
  if (Number.isFinite(result.summary?.bounded_limit)) {
    traces.push({
      x: [t[0], t[t.length - 1]],
      y: [result.summary.bounded_limit, result.summary.bounded_limit],
      name: "Feasible bound Lambda/mu",
      mode: "lines",
      line: { color: "#ffd166", width: 2, dash: "dash" },
      hovertemplate: "Lambda/mu = %{y:.2f}<extra>Boundedness</extra>"
    });
  }
  safePlotlyReact("populationChart", traces, layout({ yaxis: { ...plotLayout.yaxis, title: "Total Population" } }), plotConfig);
}

function renderStackedAndPercentage(result) {
  const t = result.time_series.time;
  const traces = [
    { key: "S", color: "#00d4ff", name: "S(t)" },
    { key: "I", color: "#ef476f", name: "I(t)" },
    { key: "T", color: "#06d6a0", name: "T(t)" },
    { key: "A", color: "#ffd166", name: "A(t)" }
  ];
  safePlotlyReact("stackedChart", traces.map((item) => ({
    x: t,
    y: result.time_series[item.key],
    stackgroup: "one",
    mode: "lines",
    name: item.name,
    line: { color: item.color, width: 1.5 }
  })), layout({ yaxis: { ...plotLayout.yaxis, title: "Population" } }), plotConfig);

  safePlotlyReact("percentageChart", traces.map((item) => ({
    x: t,
    y: result.time_series[item.key].map((v, i) => result.time_series.N[i] ? 100 * v / result.time_series.N[i] : 0),
    mode: "lines",
    name: item.name,
    line: { color: item.color, width: 2.3 }
  })), layout({ yaxis: { ...plotLayout.yaxis, title: "Percent of N", range: [0, 100] } }), plotConfig);
}

function renderPhase(result) {
  safePlotlyReact("phaseChart", [{
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

let phaseAnimationTimer = null;
const dashboardAnimationTimers = {};

function clearDashboardAnimations() {
  Object.values(dashboardAnimationTimers).forEach((timer) => clearInterval(timer));
  Object.keys(dashboardAnimationTimers).forEach((key) => delete dashboardAnimationTimers[key]);
}

function animationIndices(length, target = 90) {
  if (!length) return [];
  const step = Math.max(1, Math.floor(length / target));
  const values = [];
  for (let i = 0; i < length; i += step) values.push(i);
  if (values[values.length - 1] !== length - 1) values.push(length - 1);
  return values;
}

function animationSeries() {
  return [
    { key: "S", label: "S(t) Susceptible", short: "S", color: "#00d4ff" },
    { key: "I", label: "I(t) Infected", short: "I", color: "#ef476f" },
    { key: "T", label: "T(t) Treated", short: "T", color: "#06d6a0" },
    { key: "A", label: "A(t) AIDS", short: "A", color: "#ffd166" }
  ];
}

function animationBadge(timeValue, text = "Year") {
  return {
    xref: "paper",
    yref: "paper",
    x: 0.02,
    y: 1.08,
    text: `<b>${text}: ${Number(timeValue).toFixed(1)}</b>`,
    showarrow: false,
    align: "left",
    bgcolor: "rgba(7,17,31,0.88)",
    bordercolor: "rgba(0,212,255,0.35)",
    borderpad: 6,
    font: { color: "#f8fafc", size: 13 }
  };
}

function renderAnimatedLineChart(result) {
  const chartId = "animatedLineChart";
  if (!document.getElementById(chartId)) return;
  const t = result.time_series.time;
  const idxs = animationIndices(t.length, 96);
  const series = animationSeries();
  const maxY = Math.max(...series.flatMap((item) => result.time_series[item.key])) * 1.06;
  const traces = series.map((item) => ({
    x: [t[0]],
    y: [result.time_series[item.key][0]],
    name: item.label,
    mode: "lines",
    line: { color: item.color, width: 3.4, shape: "spline", smoothing: 0.42 },
    hovertemplate: `<b>${item.label}</b><br>Time: %{x:.2f} years<br>Population: %{y:,.2f}<extra></extra>`
  }));

  safePlotlyReact(chartId, traces, layout({
    margin: { t: 44, r: 32, b: 62, l: 72 },
    xaxis: { ...plotLayout.xaxis, range: [t[0], t[t.length - 1]], title: "Time (years)" },
    yaxis: { ...plotLayout.yaxis, range: [0, maxY], title: "Population" },
    annotations: [animationBadge(t[0])],
    legend: { ...plotLayout.legend, y: -0.18 }
  }), plotConfig).then(() => {
    let frame = 0;
    dashboardAnimationTimers.line = setInterval(() => {
      const idx = idxs[frame];
      const dataUpdate = {
        x: series.map(() => t.slice(0, idx + 1)),
        y: series.map((item) => result.time_series[item.key].slice(0, idx + 1))
      };
      Plotly.update(chartId, dataUpdate, { annotations: [animationBadge(t[idx])] });
      frame = (frame + 1) % idxs.length;
    }, 85);
  });
}

function renderBarChartRace(result) {
  const chartId = "barRaceChart";
  if (!document.getElementById(chartId)) return;
  const t = result.time_series.time;
  const idxs = animationIndices(t.length, 85);
  const series = animationSeries();
  const maxY = Math.max(...series.flatMap((item) => result.time_series[item.key])) * 1.12;

  const frameValues = (idx) => series
    .map((item) => ({
      label: `${item.short}  ${item.label.replace(/^.\(t\)\s*/, "")}`,
      value: result.time_series[item.key][idx],
      color: item.color
    }))
    .sort((a, b) => a.value - b.value);

  const first = frameValues(0);
  safePlotlyReact(chartId, [{
    type: "bar",
    orientation: "h",
    x: first.map((row) => row.value),
    y: first.map((row) => row.label),
    marker: { color: first.map((row) => row.color), opacity: 0.9 },
    text: first.map((row) => compactNumber(row.value)),
    textposition: "outside",
    hovertemplate: "<b>%{y}</b><br>Population: %{x:,.2f}<extra></extra>"
  }], layout({
    margin: { t: 44, r: 70, b: 56, l: 118 },
    xaxis: { ...plotLayout.xaxis, range: [0, maxY], title: "Population" },
    yaxis: { ...plotLayout.yaxis, title: "", automargin: true },
    annotations: [animationBadge(t[0])]
  }), plotConfig).then(() => {
    let frame = 0;
    dashboardAnimationTimers.bar = setInterval(() => {
      const idx = idxs[frame];
      const rows = frameValues(idx);
      Plotly.update(chartId, {
        x: [rows.map((row) => row.value)],
        y: [rows.map((row) => row.label)],
        text: [rows.map((row) => compactNumber(row.value))],
        "marker.color": [rows.map((row) => row.color)]
      }, { annotations: [animationBadge(t[idx])] });
      frame = (frame + 1) % idxs.length;
    }, 110);
  });
}

function renderAnimatedScatter(result) {
  const chartId = "animatedScatterChart";
  if (!document.getElementById(chartId)) return;
  const t = result.time_series.time;
  const I = result.time_series.I;
  const T = result.time_series.T;
  const idxs = animationIndices(t.length, 95);
  const xmax = Math.max(...I) * 1.12 + 1;
  const ymax = Math.max(...T) * 1.12 + 1;

  safePlotlyReact(chartId, [
    {
      x: I,
      y: T,
      mode: "lines",
      name: "Full path",
      line: { color: "rgba(148,163,184,0.30)", width: 1.5 },
      hoverinfo: "skip"
    },
    {
      x: [I[0]],
      y: [T[0]],
      mode: "markers+text",
      name: "Current state",
      marker: { size: 16, color: "#ffd166", line: { color: "#07111f", width: 2 } },
      text: [`Year ${t[0].toFixed(1)}`],
      textposition: "top center",
      textfont: { color: "#ffd166", size: 12 },
      hovertemplate: "Time: %{text}<br>I(t): %{x:.2f}<br>T(t): %{y:.2f}<extra></extra>"
    }
  ], layout({
    xaxis: { ...plotLayout.xaxis, range: [0, xmax], title: "Infected I(t)" },
    yaxis: { ...plotLayout.yaxis, range: [0, ymax], title: "Treated T(t)" },
    hovermode: "closest",
    annotations: [animationBadge(t[0])]
  }), plotConfig).then(() => {
    let frame = 0;
    dashboardAnimationTimers.scatter = setInterval(() => {
      const idx = idxs[frame];
      Plotly.update(chartId, {
        x: [[I[idx]]],
        y: [[T[idx]]],
        text: [[`Year ${t[idx].toFixed(1)}`]]
      }, { annotations: [animationBadge(t[idx])] }, [1]);
      frame = (frame + 1) % idxs.length;
    }, 90);
  });
}

function renderBubbleAnimation(result) {
  const chartId = "bubbleAnimationChart";
  if (!document.getElementById(chartId)) return;
  const t = result.time_series.time;
  const idxs = animationIndices(t.length, 85);
  const series = animationSeries();
  const x = [1, 2, 3, 4];
  const y = [1, 1, 1, 1];
  const maxCompartment = Math.max(...series.flatMap((item) => result.time_series[item.key]), 1);
  const sizesAt = (idx) => series.map((item) => 24 + 72 * Math.sqrt(Math.max(result.time_series[item.key][idx], 0) / maxCompartment));
  const textAt = (idx) => series.map((item) => `${item.short}: ${compactNumber(result.time_series[item.key][idx])}`);

  safePlotlyReact(chartId, [{
    x,
    y,
    type: "scatter",
    mode: "markers+text",
    text: textAt(0),
    textposition: "bottom center",
    textfont: { color: "#f8fafc", size: 12 },
    marker: {
      size: sizesAt(0),
      color: series.map((item) => item.color),
      opacity: 0.78,
      line: { color: "#07111f", width: 2 }
    },
    hovertemplate: "<b>%{text}</b><extra></extra>"
  }], layout({
    margin: { t: 44, r: 28, b: 48, l: 28 },
    xaxis: {
      ...plotLayout.xaxis,
      range: [0.45, 4.55],
      tickmode: "array",
      tickvals: x,
      ticktext: series.map((item) => item.short),
      title: "",
      showgrid: false,
      zeroline: false
    },
    yaxis: {
      ...plotLayout.yaxis,
      range: [0.45, 1.55],
      showticklabels: false,
      title: "",
      showgrid: false,
      zeroline: false
    },
    annotations: [animationBadge(t[0])]
  }), plotConfig).then(() => {
    let frame = 0;
    dashboardAnimationTimers.bubble = setInterval(() => {
      const idx = idxs[frame];
      Plotly.update(chartId, {
        text: [textAt(idx)],
        "marker.size": [sizesAt(idx)]
      }, { annotations: [animationBadge(t[idx])] });
      frame = (frame + 1) % idxs.length;
    }, 110);
  });
}

function renderAnimationStudio(result) {
  if (!result?.time_series?.time?.length) return;
  clearDashboardAnimations();
  renderAnimatedLineChart(result);
  renderBarChartRace(result);
  renderAnimatedScatter(result);
  renderBubbleAnimation(result);
}

function renderAnimatedPhase(result) {
  const t = result.time_series.time;
  const maxIdx = t.length - 1;
  const traces = [{
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
  }];
  const phaseLayout = layout({
    xaxis: { ...plotLayout.xaxis, title: "I(t) Infected" },
    yaxis: { ...plotLayout.yaxis, title: "T(t) Treated" },
    hovermode: "closest"
  });

  if (phaseAnimationTimer) clearInterval(phaseAnimationTimer);
  if (!isPlotTargetVisible("phaseChart")) {
    safePlotlyReact("phaseChart", traces, phaseLayout, plotConfig);
    return;
  }
  
  Plotly.newPlot("phaseChart", traces, phaseLayout, plotConfig);
  
  let idx = 0;
  phaseAnimationTimer = setInterval(() => {
    idx++;
    if (idx >= maxIdx) {
      clearInterval(phaseAnimationTimer);
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
  const e0 = result.disease_free_equilibrium || { S: 0, I: 0, T: 0, A: 0 };
  const dfeX = e0[xKey] ?? 0;
  const dfeY = e0[yKey] ?? 0;
  safePlotlyReact(chartId, [{
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
  }, {
    x: [dfeX],
    y: [dfeY],
    mode: "markers+text",
    marker: { color: "#ffd166", size: 11, symbol: "diamond", line: { color: "#07111f", width: 1 } },
    text: ["E0"],
    textposition: "top center",
    name: "Disease-free equilibrium",
    hovertemplate: "E0<br>" + xLabel + ": %{x:.2f}<br>" + yLabel + ": %{y:.2f}<extra></extra>"
  }], layout({
    xaxis: { ...plotLayout.xaxis, title: xLabel },
    yaxis: { ...plotLayout.yaxis, title: yLabel },
    hovermode: "closest"
  }), plotConfig);
}

function sitaDerivativeForPhase(S, I, T, A, params) {
  const N = Math.max(S + I + T + A, 1e-9);
  const betaEff = params.beta0 * (1 - params.u1) * (1 - params.u2);
  const lambdaForce = betaEff * (I + params.eta * T) / N;
  const tauEff = params.tau * (1 + params.u3);
  const rhoEff = params.rho * (1 - params.u4);
  return {
    dS: params.Lambda - lambdaForce * S - params.mu * S,
    dI: lambdaForce * S - (tauEff + params.delta + params.mu) * I,
    dT: tauEff * I - (rhoEff + params.mu) * T,
    dA: params.delta * I + rhoEff * T - (params.mu + params.d) * A
  };
}

function renderVectorFieldPhase(chartId, result, params) {
  if (!document.getElementById(chartId)) return;

  const Ivals = result.time_series.I;
  const Tvals = result.time_series.T;
  const Sbar = result.time_series.S.reduce((a, b) => a + b, 0) / result.time_series.S.length;
  const Abar = result.time_series.A.reduce((a, b) => a + b, 0) / result.time_series.A.length;
  const xmin = Math.max(0, Math.min(...Ivals) * 0.75);
  const xmax = Math.max(...Ivals) * 1.2 + 1;
  const ymin = Math.max(0, Math.min(...Tvals) * 0.75);
  const ymax = Math.max(...Tvals) * 1.2 + 1;
  const nx = 24;
  const ny = 18;
  const dx = (xmax - xmin) / Math.max(nx - 1, 1);
  const dy = (ymax - ymin) / Math.max(ny - 1, 1);
  const seg = 0.28 * Math.min(dx, dy || dx);
  const vx = [];
  const vy = [];

  for (let a = 0; a < nx; a++) {
    for (let b = 0; b < ny; b++) {
      const I = xmin + a * dx;
      const T = ymin + b * dy;
      const d = sitaDerivativeForPhase(Sbar, I, T, Abar, params);
      const mag = Math.hypot(d.dI, d.dT);
      if (!Number.isFinite(mag) || mag === 0) continue;
      const ux = d.dI / mag;
      const uy = d.dT / mag;
      vx.push(I - ux * seg, I + ux * seg, null);
      vy.push(T - uy * seg, T + uy * seg, null);
    }
  }

  const peakIndex = Ivals.indexOf(Math.max(...Ivals));
  safePlotlyReact(chartId, [
    {
      x: vx,
      y: vy,
      mode: "lines",
      name: "Direction field",
      line: { color: "rgba(148,163,184,0.58)", width: 1 },
      hoverinfo: "skip"
    },
    {
      x: Ivals,
      y: Tvals,
      mode: "lines",
      name: "I-T trajectory",
      line: { color: "#31d843", width: 3 },
      hovertemplate: "I(t): %{x:.2f}<br>T(t): %{y:.2f}<extra>trajectory</extra>"
    },
    {
      x: [Ivals[0], Ivals[peakIndex], Ivals[Ivals.length - 1]],
      y: [Tvals[0], Tvals[peakIndex], Tvals[Tvals.length - 1]],
      mode: "markers+text",
      text: ["start", "peak I", "end"],
      textposition: ["top center", "top center", "bottom center"],
      marker: { color: ["#00d4ff", "#ffd166", "#ef476f"], size: [9, 11, 9], line: { color: "#07111f", width: 1 } },
      name: "Key points"
    },
    {
      x: [0],
      y: [0],
      mode: "markers+text",
      text: ["E0"],
      textposition: "bottom right",
      marker: { color: "#ffd166", size: 12, symbol: "diamond", line: { color: "#07111f", width: 1 } },
      name: "Disease-free equilibrium"
    }
  ], layout({
    xaxis: { ...plotLayout.xaxis, title: "I(t) Infected", range: [xmin, xmax], zeroline: true, zerolinecolor: "rgba(255,255,255,0.28)" },
    yaxis: { ...plotLayout.yaxis, title: "T(t) Treated", range: [ymin, ymax], zeroline: true, zerolinecolor: "rgba(255,255,255,0.28)" },
    hovermode: "closest",
    legend: { orientation: "h", y: -0.2 }
  }), plotConfig);
}

function renderScenarioChart(data) {
  const colors = ["#00d4ff", "#ef476f", "#06d6a0", "#ffd166", "#a78bfa", "#fb923c", "#38bdf8", "#f472b6"];
  const curves = Object.values(data.curves);
  const traces = curves.map((curve, i) => ({
    x: curve.time,
    y: curve.I,
    mode: "lines",
    name: curve.name,
    line: { width: 3, color: colors[i % colors.length], shape: "spline", smoothing: 0.35 },
    hovertemplate: `<b>${curve.name}</b><br>Time: %{x:.2f} years<br>I(t): %{y:,.3f}<extra></extra>`
  }));
  const finalValues = curves.map((curve, i) => ({
    curve,
    i,
    final: curve.I[curve.I.length - 1]
  })).sort((a, b) => a.final - b.final);
  const annotations = finalValues.slice(0, 3).map((row, rank) => endpointAnnotation(
    row.curve.time[row.curve.time.length - 1],
    row.final,
    `${rank + 1}. ${row.curve.name}: ${compactNumber(row.final)}`,
    colors[row.i % colors.length],
    rank % 2 === 0 ? -18 : 18
  ));
  safePlotlyReact("scenarioChart", traces, layout({
    yaxis: { title: "Infected I(t)" },
    margin: { t: 28, r: 150, b: 64, l: 72 },
    annotations
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
    line: { width: 3, color: colors[i % colors.length], shape: "spline", smoothing: 0.35 },
    hovertemplate: `<b>${curve.name}</b><br>Time: %{x:.2f} years<br>A(t): %{y:,.3f}<extra></extra>`
  }));
  safePlotlyReact("scenarioAidsChart", traces, layout({
    yaxis: { title: "AIDS A(t)" }
  }), plotConfig);
}

function renderScenarioR0Chart(comparisons) {
  if (!document.getElementById("scenarioR0Chart")) return;
  safePlotlyReact("scenarioR0Chart", [{
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
  safePlotlyReact("scenarioRadarChart", traces, {
    ...plotLayout,
    polar: { radialaxis: { visible: true, range: [0, 1], color: "#94a3b8" }, bgcolor: "rgba(0,0,0,0)" },
    margin: { t: 20, r: 35, b: 30, l: 35 }
  }, plotConfig);
}

function renderSensitivityChart(values) {
  const ranked = [...values].sort((a, b) => Math.abs(b.sensitivity) - Math.abs(a.sensitivity));
  safePlotlyReact("sensitivityChart", [{
    x: ranked.map((item) => item.parameter),
    y: ranked.map((item) => item.sensitivity),
    type: "bar",
    marker: {
      color: ranked.map((item) => item.sensitivity >= 0 ? "#ef476f" : "#06d6a0"),
      opacity: 0.85
    },
    text: ranked.map((item) => item.sensitivity.toFixed(3)),
    textposition: "outside",
    textfont: { size: 11, color: "#f8fafc" },
    hovertemplate: "<b>%{x}</b><br>Sensitivity: %{y:.4f}<extra></extra>"
  }], layout({
    yaxis: { title: "Sensitivity Index" },
    xaxis: { title: "Parameter" },
    shapes: [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: 0, y1: 0, line: { color: "rgba(248,250,252,0.55)", width: 2 } }],
    annotations: [
      { xref: "paper", yref: "paper", x: 0.01, y: 1.08, showarrow: false, text: "Positive increases R0", font: { color: "#ef476f", size: 12 } },
      { xref: "paper", yref: "paper", x: 0.99, y: 1.08, showarrow: false, text: "Negative reduces R0", font: { color: "#06d6a0", size: 12 }, xanchor: "right" }
    ]
  }), plotConfig);
}

function renderMemoryChart(results) {
  const colors = ["#00d4ff", "#06d6a0", "#ffd166", "#ef476f"];
  const traces = results.map((result, i) => ({
    x: result.time_series.time,
    y: result.time_series.I,
    mode: "lines",
    name: `q = ${result.parameters.q.toFixed(2)}`,
    line: { width: 3, color: colors[i], shape: "spline", smoothing: 0.35 },
    hovertemplate: `<b>q=${result.parameters.q.toFixed(2)}</b><br>Time: %{x:.2f} years<br>I(t): %{y:,.3f}<extra></extra>`
  }));
  const annotations = results.map((result, i) => endpointAnnotation(
    result.time_series.time.at(-1),
    result.time_series.I.at(-1),
    `q=${result.parameters.q.toFixed(2)}: ${compactNumber(result.time_series.I.at(-1))}`,
    colors[i],
    i % 2 === 0 ? -18 : 18
  ));
  safePlotlyReact("memoryChart", traces, layout({
    yaxis: { title: "Infected I(t)" },
    margin: { t: 28, r: 120, b: 64, l: 72 },
    annotations
  }), plotConfig);
}

function renderMemoryExtraCharts(results) {
  const colors = ["#00d4ff", "#06d6a0", "#ffd166", "#ef476f"];
  const build = (key, chartId, title) => {
    if (!document.getElementById(chartId)) return;
    safePlotlyReact(chartId, results.map((result, i) => ({
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
    safePlotlyReact("memoryPhaseChart", results.map((result, i) => ({
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
  renderMittagLefflerChart(results[0]?.parameters || {});
}

function gammaLanczos(z) {
  const p = [
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaLanczos(1 - z));
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) x += p[i] / (z + i + 1);
  const t = z + p.length - 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

function mittagLeffler(q, z) {
  let sum = 0;
  for (let k = 0; k < 55; k++) {
    const term = Math.pow(z, k) / gammaLanczos(q * k + 1);
    sum += term;
    if (Math.abs(term) < 1e-9) break;
  }
  return Number.isFinite(sum) ? sum : null;
}

function renderMittagLefflerChart(params) {
  if (!document.getElementById("mittagChart")) return;
  const mu = Number(params.mu || 0.02);
  const t = Array.from({ length: 101 }, (_, i) => i * 0.5);
  const qValues = [1.0, 0.95, 0.85, 0.75];
  const colors = ["#00d4ff", "#06d6a0", "#ffd166", "#ef476f"];
  const traces = qValues.map((q, i) => ({
    x: t,
    y: t.map((value) => q === 1 ? Math.exp(-mu * value) : mittagLeffler(q, -mu * Math.pow(value, q))),
    mode: "lines",
    name: q === 1 ? "exp(-mu t), q=1" : `E_q(-mu t^q), q=${q.toFixed(2)}`,
    line: { width: 2.4, color: colors[i] }
  }));
  safePlotlyReact("mittagChart", traces, layout({
    yaxis: { ...plotLayout.yaxis, title: "Memory kernel", range: [0, 1.05] },
    xaxis: { ...plotLayout.xaxis, title: "Time (years)" }
  }), plotConfig);
}

function renderReliabilityChart(rows) {
  if (!document.getElementById("reliabilityChart")) return;
  const x = rows.map((row) => `h=${Number(row.step).toFixed(2)}`);
  safePlotlyReact("reliabilityChart", [
    {
      x,
      y: rows.map((row) => row.final_infected),
      name: "Final infected",
      type: "bar",
      marker: { color: "#ef476f" },
      text: rows.map((row) => Number(row.final_infected).toFixed(1)),
      textposition: "outside"
    },
    {
      x,
      y: rows.map((row) => row.peak_infected),
      name: "Peak infected",
      type: "bar",
      marker: { color: "#ffd166" },
      text: rows.map((row) => Number(row.peak_infected).toFixed(1)),
      textposition: "outside"
    }
  ], layout({
    barmode: "group",
    yaxis: { ...plotLayout.yaxis, title: "Population" },
    xaxis: { ...plotLayout.xaxis, title: "Time step" }
  }), plotConfig);
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
  safePlotlyReact("surfaceChart", [{
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
    safePlotlyReact("r0HeatmapChart", [{
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
    safePlotlyReact("finalInfectedHeatmapChart", [{
      x: axis, y: axis, z, type: "heatmap", colorscale: "RdYlGn", reversescale: true
    }], layout({
      xaxis: { ...plotLayout.xaxis, title: "u1 Awareness" },
      yaxis: { ...plotLayout.yaxis, title: "u2 Safer Behaviour" }
    }), plotConfig);
  }

  if (document.getElementById("finalAidsHeatmapChart")) {
    const baseFinalA = result.summary.final_aids;
    const z = axis.map((u4) => axis.map((u3) => baseFinalA * (1 - 0.35 * u3) * (1 - 0.55 * u4)));
    safePlotlyReact("finalAidsHeatmapChart", [{
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
    safePlotlyReact("waterfallChart", [{
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
