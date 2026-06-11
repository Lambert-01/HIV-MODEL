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
const chartAnimations = {};

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (!value || typeof value !== "object") return value;
  return Object.entries(value).reduce((clean, [key, item]) => {
    if (item !== undefined) clean[key] = stripUndefined(item);
    return clean;
  }, {});
}

function cloneTrace(trace) {
  if (!trace || typeof trace !== "object") return null;
  const next = { ...trace };
  if (Array.isArray(trace.x)) next.x = [...trace.x];
  if (Array.isArray(trace.y)) next.y = [...trace.y];
  if (Array.isArray(trace.text)) next.text = [...trace.text];
  if (!next.type && (Array.isArray(next.x) || Array.isArray(next.y))) next.type = "scatter";
  return stripUndefined(next);
}

function cleanTraces(traces) {
  return (Array.isArray(traces) ? traces : [])
    .map(cloneTrace)
    .filter((trace) => trace && typeof trace === "object");
}

function animationLayout(chartLayout, overrides = {}) {
  return {
    ...chartLayout,
    ...overrides,
    annotations: overrides.annotations ?? [],
    updatemenus: [],
    transition: { duration: 120, easing: "cubic-in-out" }
  };
}

function numericExtent(values, padding = 0.06) {
  const nums = (values || []).map(Number).filter(Number.isFinite);
  if (!nums.length) return null;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = Math.max(max - min, Math.abs(max) * padding, 1e-9);
  return [Math.max(0, min - span * padding), max + span * padding];
}

function mergedAxisRange(traces, axis) {
  const values = [];
  cleanTraces(traces).forEach((trace) => {
    if (Array.isArray(trace[axis])) values.push(...trace[axis]);
  });
  return numericExtent(values);
}

function lockedAnimationLayout(state) {
  const full = state.traces;
  const xRange = mergedAxisRange(full, "x");
  const yRange = mergedAxisRange(full, "y");
  const next = animationLayout(state.layout);
  next.xaxis = { ...(next.xaxis || {}), ...(xRange ? { range: xRange, autorange: false } : {}) };
  next.yaxis = { ...(next.yaxis || {}), ...(yRange ? { range: yRange, autorange: false } : {}) };
  return next;
}

function updatePlotData(chartId, traces) {
  const clean = cleanTraces(traces);
  const x = clean.map((trace) => Array.isArray(trace.x) ? trace.x : undefined);
  const y = clean.map((trace) => Array.isArray(trace.y) ? trace.y : undefined);
  const text = clean.map((trace) => Array.isArray(trace.text) || typeof trace.text === "string" ? trace.text : undefined);
  const update = {};
  if (x.some((item) => item !== undefined)) update.x = x;
  if (y.some((item) => item !== undefined)) update.y = y;
  if (text.some((item) => item !== undefined)) update.text = text;
  return Plotly.update(chartId, update, {}, clean.map((_trace, index) => index));
}

function animationFramesCount(length) {
  return Math.max(28, Math.min(150, Number(length) || 80));
}

function frameIndex(frame, totalFrames, length) {
  if (length <= 1) return length;
  const eased = 1 - Math.pow(1 - frame / Math.max(totalFrames - 1, 1), 2.4);
  return Math.max(1, Math.min(length, Math.round(1 + eased * (length - 1))));
}

function getChartCard(chartId) {
  const body = document.getElementById(chartId);
  return body?.closest(".chart-card") || null;
}

function attachAnimationControls(chartId, label, modeName) {
  const card = getChartCard(chartId);
  const title = card?.querySelector(".chart-card-title");
  if (!title || card.querySelector(`[data-animation-controls="${chartId}"]`)) return;

  const controls = document.createElement("div");
  controls.className = "chart-animation-toolbar";
  controls.dataset.animationControls = chartId;
  controls.innerHTML = `
    <div class="chart-animation-meta">
      <span class="chart-animation-badge"><i class="fa fa-wand-magic-sparkles"></i>${label}</span>
      <span class="chart-animation-source"><i class="fa fa-server"></i>Python engine</span>
    </div>
    <div class="chart-animation-actions">
      <button class="chart-animation-btn primary" type="button" data-animation-action="run" title="Run ${modeName}">
        <i class="fa fa-play"></i><span>Run</span>
      </button>
      <button class="chart-animation-btn" type="button" data-animation-action="pause" title="Pause animation">
        <i class="fa fa-pause"></i><span>Pause</span>
      </button>
      <button class="chart-animation-btn" type="button" data-animation-action="reset" title="Reset full graph">
        <i class="fa fa-rotate-left"></i><span>Reset</span>
      </button>
      <button class="chart-animation-btn speed" type="button" data-animation-action="speed" title="Animation speed">1x</button>
      <span class="chart-animation-status" data-animation-status>Ready</span>
    </div>
  `;
  title.insertAdjacentElement("afterend", controls);
  controls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-animation-action]");
    if (!button) return;
    const action = button.dataset.animationAction;
    if (action === "run") runChartAnimation(chartId);
    if (action === "pause") pauseChartAnimation(chartId);
    if (action === "reset") resetChartAnimation(chartId);
    if (action === "speed") toggleChartAnimationSpeed(chartId);
  });
}

function setAnimationStatus(chartId, text, active = false) {
  const controls = document.querySelector(`[data-animation-controls="${chartId}"]`);
  const status = controls?.querySelector("[data-animation-status]");
  if (status) status.textContent = text;
  controls?.classList.toggle("is-running", active);
}

function clearChartAnimationTimer(chartId) {
  const state = chartAnimations[chartId];
  if (state?.timer) clearInterval(state.timer);
  if (state) state.timer = null;
}

function toggleChartAnimationSpeed(chartId) {
  const state = chartAnimations[chartId];
  if (!state) return;
  state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 0.5 : 1;
  const controls = document.querySelector(`[data-animation-controls="${chartId}"]`);
  const speed = controls?.querySelector('[data-animation-action="speed"]');
  if (speed) speed.textContent = `${state.speed}x`;
  if (state.running) runChartAnimation(chartId, true);
}

function registerLineAnimation(chartId, traces, chartLayout, options = {}) {
  attachAnimationControls(chartId, options.label || "Animated Line", options.modeName || "animated line chart");
  chartAnimations[chartId] = {
    type: "line",
    traces: cleanTraces(traces),
    layout: chartLayout,
    config: options.config || plotConfig,
    backend: options.backend || null,
    label: options.label || "Animated Line",
    speed: chartAnimations[chartId]?.speed || 1,
    running: false,
    paused: false,
    frame: 0
  };
}

function registerBarRaceAnimation(chartId, traces, chartLayout, options = {}) {
  attachAnimationControls(chartId, options.label || "Bar Race", options.modeName || "bar chart race");
  chartAnimations[chartId] = {
    type: "bar",
    traces: cleanTraces(traces),
    layout: chartLayout,
    config: options.config || plotConfig,
    backend: options.backend || null,
    label: options.label || "Bar Race",
    speed: chartAnimations[chartId]?.speed || 1,
    running: false,
    paused: false,
    frame: 0
  };
}

function registerPhaseAnimation(chartId, traces, chartLayout, options = {}) {
  attachAnimationControls(chartId, options.label || "Phase Motion", options.modeName || "animated scatter plot");
  chartAnimations[chartId] = {
    type: "phase",
    traces: cleanTraces(traces),
    layout: chartLayout,
    config: options.config || plotConfig,
    backend: options.backend || null,
    label: options.label || "Phase Motion",
    speed: chartAnimations[chartId]?.speed || 1,
    running: false,
    paused: false,
    frame: 0
  };
}

function runChartAnimation(chartId, resume = false) {
  const state = chartAnimations[chartId];
  const element = document.getElementById(chartId);
  if (!state || !element || !window.Plotly) return;
  if (!state.traces.length) {
    setAnimationStatus(chartId, "No data", false);
    return;
  }
  clearChartAnimationTimer(chartId);
  state.running = true;
  state.paused = false;
  if (!resume) state.frame = 0;
  setAnimationStatus(chartId, "Running", true);

  if (state.type === "line") runLineAnimation(chartId, state);
  if (state.type === "bar") runBarAnimation(chartId, state);
  if (state.type === "phase") runPhaseAnimation(chartId, state);
}

function pauseChartAnimation(chartId) {
  const state = chartAnimations[chartId];
  if (!state) return;
  clearChartAnimationTimer(chartId);
  state.running = false;
  state.paused = true;
  setAnimationStatus(chartId, "Paused", false);
}

function resetChartAnimation(chartId) {
  const state = chartAnimations[chartId];
  if (!state || !window.Plotly) return;
  clearChartAnimationTimer(chartId);
  state.running = false;
  state.paused = false;
  state.frame = 0;
  setAnimationStatus(chartId, "Full graph", false);
  Plotly.react(chartId, cleanTraces(state.traces), state.layout, state.config);
}

function runLineAnimation(chartId, state) {
  const length = Math.max(...state.traces.map((trace) => Array.isArray(trace.x) ? trace.x.length : 1), 1);
  const backendFrames = Array.isArray(state.backend?.frame_indices) && state.backend.frame_indices.length
    ? state.backend.frame_indices
    : null;
  const totalFrames = backendFrames ? backendFrames.length : animationFramesCount(length);
  const initialTraces = state.traces.map((trace) => animatedLineTrace(trace, 1, length));
  Plotly.react(chartId, cleanTraces(initialTraces), lockedAnimationLayout(state), state.config).catch((error) => {
    clearChartAnimationTimer(chartId);
    state.running = false;
    setAnimationStatus(chartId, "Chart error", false);
    console.error(`Animation failed for ${chartId}`, error);
  });
  state.timer = setInterval(() => {
    state.frame += 1;
    const idx = backendFrames
      ? Math.min(length, (backendFrames[Math.min(state.frame, backendFrames.length - 1)] || 0) + 1)
      : frameIndex(state.frame, totalFrames, length);
    const traces = state.traces.map((trace) => animatedLineTrace(trace, idx, length));
    updatePlotData(chartId, traces);
    setAnimationStatus(chartId, `${Math.round((idx / length) * 100)}%`, true);
    if (state.frame >= totalFrames) {
      clearChartAnimationTimer(chartId);
      state.running = false;
      setAnimationStatus(chartId, "Complete", false);
      Plotly.react(chartId, cleanTraces(state.traces), state.layout, state.config);
    }
  }, Math.max(18, (state.backend?.frame_ms || 70) / state.speed));
}

function animatedLineTrace(trace, idx, length) {
  const next = cloneTrace(trace);
  if (!next) return null;
  if (Array.isArray(trace.x) && Array.isArray(trace.y) && trace.x.length > 1) {
    next.x = trace.x.slice(0, Math.min(idx, trace.x.length));
    next.y = trace.y.slice(0, Math.min(idx, trace.y.length));
    if (Array.isArray(trace.text)) next.text = trace.text.slice(0, Math.min(idx, trace.text.length));
    return next;
  }
  const showMarker = idx >= length;
  next.x = showMarker && Array.isArray(trace.x) ? trace.x : [];
  next.y = showMarker && Array.isArray(trace.y) ? trace.y : [];
  next.text = showMarker ? trace.text : [];
  return next;
}

function runBarAnimation(chartId, state) {
  const firstTrace = state.traces[0] || {};
  const values = Array.isArray(firstTrace.y) ? firstTrace.y.map(Number) : [];
  const totalFrames = 80;
  const backendOrder = Array.isArray(state.backend?.bar_order) ? state.backend.bar_order : null;
  const ordered = backendOrder?.length
    ? backendOrder.map((index) => ({ value: values[index] || 0, index }))
    : values.map((value, index) => ({ value, index })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const hasWaterfallTrace = state.traces.some((trace) => trace.type === "waterfall");
  Plotly.react(chartId, cleanTraces(state.traces.map((item) => ({
    ...cloneTrace(item),
    y: Array.isArray(item.y) ? item.y.map(() => 0) : item.y,
    text: Array.isArray(item.y) ? item.y.map(() => "") : item.text
  }))), lockedAnimationLayout(state), state.config).catch((error) => {
    clearChartAnimationTimer(chartId);
    state.running = false;
    setAnimationStatus(chartId, "Chart error", false);
    console.error(`Animation failed for ${chartId}`, error);
  });
  state.timer = setInterval(() => {
    state.frame += 1;
    const progress = Math.min(state.frame / totalFrames, 1);
    const eased = 1 - Math.pow(1 - progress, 2.6);
    const revealCount = Math.max(1, Math.ceil(eased * values.length));
    const animatedTraces = state.traces.map((trace) => {
      if (!Array.isArray(trace.y)) return cloneTrace(trace);
      const traceValues = trace.y.map(Number);
      const y = traceValues.map((value, index) => ordered.slice(0, revealCount).some((row) => row.index === index) ? value * eased : 0);
      const text = y.map((value, index) => Math.abs(value) > 0.001 ? (Math.abs(traceValues[index]) >= 10 ? traceValues[index].toFixed(1) : traceValues[index].toFixed(3)) : "");
      return { ...cloneTrace(trace), y, text };
    });
    if (hasWaterfallTrace) {
      Plotly.react(chartId, cleanTraces(animatedTraces), lockedAnimationLayout(state), state.config);
    } else {
      updatePlotData(chartId, animatedTraces);
    }
    setAnimationStatus(chartId, `${Math.round(progress * 100)}%`, true);
    if (progress >= 1) {
      clearChartAnimationTimer(chartId);
      state.running = false;
      setAnimationStatus(chartId, "Complete", false);
      Plotly.react(chartId, cleanTraces(state.traces), state.layout, state.config);
    }
  }, Math.max(18, (state.backend?.frame_ms || 60) / state.speed));
}

function runPhaseAnimation(chartId, state) {
  const pathTrace = state.traces.find((trace) =>
    Array.isArray(trace.x) &&
    Array.isArray(trace.y) &&
    trace.x.length > 2 &&
    trace.hoverinfo !== "skip" &&
    !/direction/i.test(trace.name || "")
  ) || state.traces[0];
  const pathIndex = Math.max(0, state.traces.indexOf(pathTrace));
  const length = Math.max(pathTrace?.x?.length || 1, 1);
  const backendFrames = Array.isArray(state.backend?.frame_indices) && state.backend.frame_indices.length
    ? state.backend.frame_indices
    : null;
  const totalFrames = backendFrames ? backendFrames.length : animationFramesCount(length);
  Plotly.react(chartId, cleanTraces(state.traces.map((trace, index) => {
    if (trace.hoverinfo === "skip" || /direction/i.test(trace.name || "")) return cloneTrace(trace);
    return index === pathIndex ? animatedLineTrace(trace, 1, length) : { ...cloneTrace(trace), x: [], y: [], text: [] };
  })), lockedAnimationLayout(state), state.config).catch((error) => {
    clearChartAnimationTimer(chartId);
    state.running = false;
    setAnimationStatus(chartId, "Chart error", false);
    console.error(`Animation failed for ${chartId}`, error);
  });
  state.timer = setInterval(() => {
    state.frame += 1;
    const idx = backendFrames
      ? Math.min(length, (backendFrames[Math.min(state.frame, backendFrames.length - 1)] || 0) + 1)
      : frameIndex(state.frame, totalFrames, length);
    const traces = state.traces.map((trace, index) => {
      if (trace.hoverinfo === "skip" || /direction/i.test(trace.name || "")) return cloneTrace(trace);
      if (index === pathIndex) return animatedLineTrace(trace, idx, length);
      if (index === pathIndex + 1 && Array.isArray(pathTrace.x)) {
        return {
          ...cloneTrace(trace),
          x: [pathTrace.x[Math.min(idx - 1, length - 1)]],
          y: [pathTrace.y[Math.min(idx - 1, length - 1)]],
          text: [`t=${Math.round((idx / length) * 100)}%`]
        };
      }
      return idx >= length ? cloneTrace(trace) : { ...cloneTrace(trace), x: [], y: [], text: [] };
    });
    updatePlotData(chartId, traces);
    setAnimationStatus(chartId, `${Math.round((idx / length) * 100)}%`, true);
    if (state.frame >= totalFrames) {
      clearChartAnimationTimer(chartId);
      state.running = false;
      setAnimationStatus(chartId, "Complete", false);
      Plotly.react(chartId, cleanTraces(state.traces), state.layout, state.config);
    }
  }, Math.max(18, (state.backend?.frame_ms || 58) / state.speed));
}

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
  return Plotly.react(chartId, cleanTraces(plot.traces), plot.chartLayout, plot.config).then(() => {
    if (element.classList.contains("plot-ready")) return;
    element.classList.add("plot-ready");
    element.animate(
      [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 420, easing: "ease-out" }
    );
  }).catch((error) => {
    console.error(`Plot failed for ${chartId}`, error);
  });
}

function flushPendingPlots() {
  Object.keys(pendingPlots).forEach((chartId) => {
    if (!isPlotTargetVisible(chartId)) return;
    const plot = pendingPlots[chartId];
    delete pendingPlots[chartId];
    Plotly.react(chartId, cleanTraces(plot.traces), plot.chartLayout, plot.config).catch((error) => {
      console.error(`Plot failed for ${chartId}`, error);
    });
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

function backendAnimation(result, chartId) {
  const chart = result?.animation?.charts?.[chartId];
  if (!chart) return null;
  return {
    ...chart,
    frame_ms: result.animation.frame_ms,
    duration_ms: result.animation.duration_ms,
    source: result.animation.source
  };
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
  const chartLayout = layout({
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
  });
  safePlotlyReact("mainChart", traces, chartLayout, plotConfig);
  const backend = backendAnimation(result, "mainChart");
  registerLineAnimation("mainChart", traces, chartLayout, {
    backend,
    label: backend?.label || "Animated Line",
    modeName: "SITA line drawing"
  });
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

function renderInterventions(params, animation = null) {
  const traces = [{
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
  }];
  const chartLayout = layout({
    yaxis: { ...plotLayout.yaxis, range: [0, 1.15], title: "Level" },
    xaxis: { ...plotLayout.xaxis, title: "" }
  });
  safePlotlyReact("interventionChart", traces, chartLayout, plotConfig);
  const backend = animation?.charts?.interventionChart
    ? { ...animation.charts.interventionChart, frame_ms: animation.frame_ms, source: animation.source }
    : null;
  registerBarRaceAnimation("interventionChart", traces, chartLayout, {
    backend,
    label: backend?.label || "Bar Growth",
    modeName: "intervention bar animation"
  });
}

function renderInterventionsInto(chartId, params, animation = null) {
  if (!document.getElementById(chartId)) return;
  const traces = [{
    x: ["u1", "u2", "u3", "u4"],
    y: [params.u1, params.u2, params.u3, params.u4],
    type: "bar",
    marker: { color: ["#00d4ff", "#ffd166", "#06d6a0", "#ef476f"] },
    text: [params.u1, params.u2, params.u3, params.u4].map((v) => interventionLabel(v)),
    textposition: "outside"
  }];
  const chartLayout = layout({
    yaxis: { ...plotLayout.yaxis, range: [0, 1.18], title: "Intervention strength" },
    xaxis: { ...plotLayout.xaxis, title: "" }
  });
  safePlotlyReact(chartId, traces, chartLayout, plotConfig);
  registerBarRaceAnimation(chartId, traces, chartLayout, {
    backend: animation?.charts?.[chartId] ? { ...animation.charts[chartId], frame_ms: animation.frame_ms, source: animation.source } : null,
    label: animation?.charts?.[chartId]?.label || "Bar Growth",
    modeName: "intervention bar animation"
  });
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
  const traces = [
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
  ];
  const chartLayout = layout({
    yaxis: { title: "Infected population" },
    annotations: [
      endpointAnnotation(t[t.length - 1], I[I.length - 1], `Final I: ${compactNumber(I[I.length - 1])}`, "#ef476f", 18)
    ]
  });
  safePlotlyReact("infectedChart", traces, chartLayout, plotConfig);
  const backend = backendAnimation(result, "infectedChart");
  registerLineAnimation("infectedChart", traces, chartLayout, {
    backend,
    label: backend?.label || "Animated Line",
    modeName: "infected line drawing"
  });
}

function renderTreatedAids(result) {
  const t = result.time_series.time;
  const traces = [
    lineTrace(t, result.time_series.T, "T(t) Treated", "#06d6a0", {
      fill: "tozeroy",
      fillcolor: "rgba(6,214,160,0.08)"
    }),
    lineTrace(t, result.time_series.A, "A(t) AIDS", "#ffd166", {
      fill: "tozeroy",
      fillcolor: "rgba(255,209,102,0.08)"
    })
  ];
  const chartLayout = layout({
    yaxis: { title: "Population" },
    annotations: [
      endpointAnnotation(t[t.length - 1], result.time_series.T.at(-1), `Final T: ${compactNumber(result.time_series.T.at(-1))}`, "#06d6a0", -18),
      endpointAnnotation(t[t.length - 1], result.time_series.A.at(-1), `Final A: ${compactNumber(result.time_series.A.at(-1))}`, "#ffd166", 18)
    ]
  });
  safePlotlyReact("treatedAidsChart", traces, chartLayout, plotConfig);
  const backend = backendAnimation(result, "treatedAidsChart");
  registerLineAnimation("treatedAidsChart", traces, chartLayout, {
    backend,
    label: backend?.label || "Animated Line",
    modeName: "treated/AIDS line drawing"
  });
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
  const chartLayout = layout({ yaxis: { ...plotLayout.yaxis, title: "Total Population" } });
  safePlotlyReact("populationChart", traces, chartLayout, plotConfig);
  const backend = backendAnimation(result, "populationChart");
  registerLineAnimation("populationChart", traces, chartLayout, {
    backend,
    label: backend?.label || "Animated Line",
    modeName: "population line drawing"
  });
}

function renderDemoMotionStudio(result) {
  if (!document.getElementById("demoMotionLineChart") && !document.getElementById("demoMotionRankChart")) return;

  const t = result.time_series.time;
  const lineTraces = [
    lineTrace(t, result.time_series.S, "S(t) Susceptible", "#00d4ff"),
    lineTrace(t, result.time_series.I, "I(t) Infected", "#ef476f"),
    lineTrace(t, result.time_series.T, "T(t) Treated", "#06d6a0"),
    lineTrace(t, result.time_series.A, "A(t) AIDS", "#ffd166")
  ];
  const lineLayout = layout({
    margin: { t: 24, r: 28, b: 60, l: 74 },
    yaxis: { ...plotLayout.yaxis, title: "Population", tickformat: "~s" },
    legend: { ...plotLayout.legend, y: -0.24 }
  });
  if (document.getElementById("demoMotionLineChart")) {
    safePlotlyReact("demoMotionLineChart", lineTraces, lineLayout, plotConfig);
    const backend = backendAnimation(result, "mainChart") || {
      frame_indices: result.animation?.frame_indices,
      frame_ms: result.animation?.frame_ms,
      source: result.animation?.source
    };
    registerLineAnimation("demoMotionLineChart", lineTraces, lineLayout, {
      backend,
      label: "Animated Line",
      modeName: "SITA trajectory replay"
    });
  }

  if (document.getElementById("demoMotionRankChart")) {
    const finalRows = [
      { label: "S Susceptible", value: result.summary.final_susceptible, color: "#00d4ff" },
      { label: "I Infected", value: result.summary.final_infected, color: "#ef476f" },
      { label: "T Treated", value: result.summary.final_treated, color: "#06d6a0" },
      { label: "A AIDS", value: result.summary.final_aids, color: "#ffd166" }
    ];
    const rankOrder = finalRows
      .map((row, index) => ({ index, value: row.value }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .map((row) => row.index);
    const barTraces = [{
      x: finalRows.map((row) => row.label),
      y: finalRows.map((row) => row.value),
      type: "bar",
      marker: { color: finalRows.map((row) => row.color), opacity: 0.9 },
      text: finalRows.map((row) => compactNumber(row.value)),
      textposition: "outside",
      hovertemplate: "%{x}<br>Final value: %{y:,.3f}<extra></extra>",
      name: "Final state"
    }];
    const barLayout = layout({
      margin: { t: 24, r: 24, b: 74, l: 70 },
      yaxis: { ...plotLayout.yaxis, title: "Final population", tickformat: "~s" },
      xaxis: { ...plotLayout.xaxis, title: "", tickangle: -18 },
      showlegend: false
    });
    safePlotlyReact("demoMotionRankChart", barTraces, barLayout, plotConfig);
    registerBarRaceAnimation("demoMotionRankChart", barTraces, barLayout, {
      backend: {
        bar_order: rankOrder,
        frame_ms: result.animation?.frame_ms || 36,
        source: result.animation?.source || "python-engine"
      },
      label: "Bar Race",
      modeName: "compartment ranking race"
    });
  }
}

function renderStackedAndPercentage(result) {
  const t = result.time_series.time;
  const traces = [
    { key: "S", color: "#00d4ff", name: "S(t)" },
    { key: "I", color: "#ef476f", name: "I(t)" },
    { key: "T", color: "#06d6a0", name: "T(t)" },
    { key: "A", color: "#ffd166", name: "A(t)" }
  ];
  const stackedTraces = traces.map((item) => ({
    x: t,
    y: result.time_series[item.key],
    stackgroup: "one",
    mode: "lines",
    name: item.name,
    line: { color: item.color, width: 1.5 }
  }));
  const stackedLayout = layout({ yaxis: { ...plotLayout.yaxis, title: "Population" } });
  safePlotlyReact("stackedChart", stackedTraces, stackedLayout, plotConfig);
  const stackedBackend = backendAnimation(result, "stackedChart");
  registerLineAnimation("stackedChart", stackedTraces, stackedLayout, {
    backend: stackedBackend,
    label: stackedBackend?.label || "Animated Stack",
    modeName: "stacked area animation"
  });

  const percentageTraces = traces.map((item) => ({
    x: t,
    y: result.time_series[item.key].map((v, i) => result.time_series.N[i] ? 100 * v / result.time_series.N[i] : 0),
    mode: "lines",
    name: item.name,
    line: { color: item.color, width: 2.3 }
  }));
  const percentageLayout = layout({ yaxis: { ...plotLayout.yaxis, title: "Percent of N", range: [0, 100] } });
  safePlotlyReact("percentageChart", percentageTraces, percentageLayout, plotConfig);
  registerLineAnimation("percentageChart", percentageTraces, percentageLayout, { label: "Animated Line", modeName: "percentage line drawing" });
}

function renderPhase(result) {
  const traces = [{
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
  }];
  const chartLayout = layout({
    xaxis: { ...plotLayout.xaxis, title: "I(t)" },
    yaxis: { ...plotLayout.yaxis, title: "T(t)" },
    hovermode: "closest"
  });
  safePlotlyReact("phaseChart", traces, chartLayout, plotConfig);
  const backend = backendAnimation(result, "phaseChart");
  registerPhaseAnimation("phaseChart", traces, chartLayout, {
    backend,
    label: backend?.label || "Phase Motion",
    modeName: "animated scatter plot"
  });
}

function renderAnimatedPhase(result) {
  const t = result.time_series.time;
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

  safePlotlyReact("phaseChart", traces, phaseLayout, plotConfig);
  const backend = backendAnimation(result, "phaseChart");
  registerPhaseAnimation("phaseChart", traces, phaseLayout, {
    backend,
    label: backend?.label || "Phase Motion",
    modeName: "animated scatter plot"
  });
}

function renderPhaseVariant(chartId, result, xKey, yKey, xLabel, yLabel) {
  if (!document.getElementById(chartId)) return;
  const x = result.time_series[xKey];
  const y = result.time_series[yKey];
  const t = result.time_series.time;
  const e0 = result.disease_free_equilibrium || { S: 0, I: 0, T: 0, A: 0 };
  const dfeX = e0[xKey] ?? 0;
  const dfeY = e0[yKey] ?? 0;
  const traces = [{
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
  }];
  const chartLayout = layout({
    xaxis: { ...plotLayout.xaxis, title: xLabel },
    yaxis: { ...plotLayout.yaxis, title: yLabel },
    hovermode: "closest"
  });
  safePlotlyReact(chartId, traces, chartLayout, plotConfig);
  registerPhaseAnimation(chartId, traces, chartLayout, { label: "Phase Motion", modeName: "animated scatter plot" });
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
  const traces = [
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
  ];
  const chartLayout = layout({
    xaxis: { ...plotLayout.xaxis, title: "I(t) Infected", range: [xmin, xmax], zeroline: true, zerolinecolor: "rgba(255,255,255,0.28)" },
    yaxis: { ...plotLayout.yaxis, title: "T(t) Treated", range: [ymin, ymax], zeroline: true, zerolinecolor: "rgba(255,255,255,0.28)" },
    hovermode: "closest",
    legend: { orientation: "h", y: -0.2 }
  });
  safePlotlyReact(chartId, traces, chartLayout, plotConfig);
  registerPhaseAnimation(chartId, traces, chartLayout, { label: "Phase Motion", modeName: "animated scatter plot" });
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
  const chartLayout = layout({
    yaxis: { title: "Infected I(t)" },
    margin: { t: 28, r: 150, b: 64, l: 72 },
    annotations
  });
  safePlotlyReact("scenarioChart", traces, chartLayout, plotConfig);
  registerLineAnimation("scenarioChart", traces, chartLayout, { label: "Animated Line", modeName: "scenario line drawing" });
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
  const chartLayout = layout({
    yaxis: { title: "AIDS A(t)" }
  });
  safePlotlyReact("scenarioAidsChart", traces, chartLayout, plotConfig);
  registerLineAnimation("scenarioAidsChart", traces, chartLayout, { label: "Animated Line", modeName: "AIDS scenario line drawing" });
}

function renderScenarioR0Chart(comparisons) {
  if (!document.getElementById("scenarioR0Chart")) return;
  const traces = [{
    x: comparisons.map((row) => row.name),
    y: comparisons.map((row) => row.r0),
    type: "bar",
    marker: { color: comparisons.map((row) => row.r0 < 1 ? "#06d6a0" : row.r0 <= 1.02 ? "#fca311" : "#ef476f") },
    text: comparisons.map((row) => row.r0.toFixed(2)),
    textposition: "outside"
  }];
  const chartLayout = layout({
    xaxis: { ...plotLayout.xaxis, title: "", tickangle: -25 },
    yaxis: { ...plotLayout.yaxis, title: "R0" },
    shapes: [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: 1, y1: 1, line: { color: "#ffd166", width: 2, dash: "dash" } }]
  });
  safePlotlyReact("scenarioR0Chart", traces, chartLayout, plotConfig);
  registerBarRaceAnimation("scenarioR0Chart", traces, chartLayout, { label: "Bar Race", modeName: "R0 bar chart race" });
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
  const chartLayout = {
    ...plotLayout,
    polar: { radialaxis: { visible: true, range: [0, 1], color: "#94a3b8" }, bgcolor: "rgba(0,0,0,0)" },
    margin: { t: 20, r: 35, b: 30, l: 35 }
  };
  safePlotlyReact("scenarioRadarChart", traces, chartLayout, plotConfig);
}

function renderSensitivityChart(values) {
  const ranked = [...values].sort((a, b) => Math.abs(b.sensitivity) - Math.abs(a.sensitivity));
  const traces = [{
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
  }];
  const chartLayout = layout({
    yaxis: { title: "Sensitivity Index" },
    xaxis: { title: "Parameter" },
    shapes: [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: 0, y1: 0, line: { color: "rgba(248,250,252,0.55)", width: 2 } }],
    annotations: [
      { xref: "paper", yref: "paper", x: 0.01, y: 1.08, showarrow: false, text: "Positive increases R0", font: { color: "#ef476f", size: 12 } },
      { xref: "paper", yref: "paper", x: 0.99, y: 1.08, showarrow: false, text: "Negative reduces R0", font: { color: "#06d6a0", size: 12 }, xanchor: "right" }
    ]
  });
  safePlotlyReact("sensitivityChart", traces, chartLayout, plotConfig);
  registerBarRaceAnimation("sensitivityChart", traces, chartLayout, { label: "Bar Race", modeName: "sensitivity bar chart race" });
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
  const chartLayout = layout({
    yaxis: { title: "Infected I(t)" },
    margin: { t: 28, r: 120, b: 64, l: 72 },
    annotations
  });
  safePlotlyReact("memoryChart", traces, chartLayout, plotConfig);
  registerLineAnimation("memoryChart", traces, chartLayout, { label: "Animated Line", modeName: "memory comparison line drawing" });
}

function renderMemoryExtraCharts(results) {
  const colors = ["#00d4ff", "#06d6a0", "#ffd166", "#ef476f"];
  const build = (key, chartId, title) => {
    if (!document.getElementById(chartId)) return;
    const traces = results.map((result, i) => ({
      x: result.time_series.time,
      y: result.time_series[key],
      mode: "lines",
      name: `q=${result.parameters.q.toFixed(2)}`,
      line: { width: 2.3, color: colors[i] }
    }));
    const chartLayout = layout({ yaxis: { ...plotLayout.yaxis, title } });
    safePlotlyReact(chartId, traces, chartLayout, plotConfig);
    registerLineAnimation(chartId, traces, chartLayout, { label: "Animated Line", modeName: `${title} line drawing` });
  };
  build("T", "memoryTChart", "Treated T(t)");
  build("A", "memoryAChart", "AIDS A(t)");
  if (document.getElementById("memoryPhaseChart")) {
    const traces = results.map((result, i) => ({
      x: result.time_series.I,
      y: result.time_series.T,
      mode: "lines",
      name: `q=${result.parameters.q.toFixed(2)}`,
      line: { width: 2.2, color: colors[i] }
    }));
    const chartLayout = layout({
      xaxis: { ...plotLayout.xaxis, title: "I(t)" },
      yaxis: { ...plotLayout.yaxis, title: "T(t)" },
      hovermode: "closest"
    });
    safePlotlyReact("memoryPhaseChart", traces, chartLayout, plotConfig);
    registerPhaseAnimation("memoryPhaseChart", traces, chartLayout, { label: "Phase Motion", modeName: "memory phase animation" });
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
  const chartLayout = layout({
    yaxis: { ...plotLayout.yaxis, title: "Memory kernel", range: [0, 1.05] },
    xaxis: { ...plotLayout.xaxis, title: "Time (years)" }
  });
  safePlotlyReact("mittagChart", traces, chartLayout, plotConfig);
  registerLineAnimation("mittagChart", traces, chartLayout, { label: "Animated Line", modeName: "memory kernel line drawing" });
}

function renderReliabilityChart(rows) {
  if (!document.getElementById("reliabilityChart")) return;
  const x = rows.map((row) => `h=${Number(row.step).toFixed(2)}`);
  const traces = [
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
  ];
  const chartLayout = layout({
    barmode: "group",
    yaxis: { ...plotLayout.yaxis, title: "Population" },
    xaxis: { ...plotLayout.xaxis, title: "Time step" }
  });
  safePlotlyReact("reliabilityChart", traces, chartLayout, plotConfig);
  registerBarRaceAnimation("reliabilityChart", traces, chartLayout, { label: "Bar Growth", modeName: "reliability bar animation" });
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
    const traces = [{
      type: "waterfall",
      x: ["Baseline", "Awareness", "Safer", "Testing", "Adherence", "Final"],
      y: [base, afterU1 - base, afterU2 - afterU1, afterU3 - afterU2, final - afterU3, final],
      measure: ["absolute", "relative", "relative", "relative", "relative", "total"],
      decreasing: { marker: { color: "#06d6a0" } },
      increasing: { marker: { color: "#ef476f" } },
      totals: { marker: { color: "#00d4ff" } }
    }];
    const chartLayout = layout({ yaxis: { ...plotLayout.yaxis, title: "R0" } });
    safePlotlyReact("waterfallChart", traces, chartLayout, plotConfig);
    registerBarRaceAnimation("waterfallChart", traces, chartLayout, { label: "Step Race", modeName: "R0 waterfall animation" });
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
