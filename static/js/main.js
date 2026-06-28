/* ── Sidebar accordion ── */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".ctrl-section-title[data-accordion]").forEach((title) => {
    title.addEventListener("click", () => {
      title.closest(".ctrl-section").classList.toggle("open");
    });
  });
});

/* ── Graph formula reference tabs ── */
const GRAPH_FORMULAS = {
  mainChart: {
    title: "Baseline SITA Time Series",
    formula: String.raw`\({}^{C}D_t^qS=\Lambda-\lambda S-\mu S,\quad {}^{C}D_t^qI=\lambda S-(\tau_{\mathrm{eff}}+\delta+\mu)I,\quad {}^{C}D_t^qT=\tau_{\mathrm{eff}}I-(\rho_{\mathrm{eff}}+\mu)T,\quad {}^{C}D_t^qA=\delta I+\rho_{\mathrm{eff}}T-(\mu+d)A\)`,
    meaning: "This system generates the S(t), I(t), T(t), and A(t) curves."
  },
  infectedChart: {
    title: "Infected Focus I(t)",
    formula: String.raw`\({}^{C}D_t^qI=\lambda(t)S-(\tau_{\mathrm{eff}}+\delta+\mu)I\)`,
    meaning: "This equation tracks untreated infected individuals and produces the infected curve and peak marker."
  },
  treatedAidsChart: {
    title: "Treated and AIDS Curves",
    formula: String.raw`\({}^{C}D_t^qT=\tau_{\mathrm{eff}}I-(\rho_{\mathrm{eff}}+\mu)T,\quad {}^{C}D_t^qA=\delta I+\rho_{\mathrm{eff}}T-(\mu+d)A\)`,
    meaning: "These equations generate the treated and AIDS-stage trajectories."
  },
  stackedChart: {
    title: "Population Composition",
    formula: String.raw`\(N(t)=S(t)+I(t)+T(t)+A(t)\)`,
    meaning: "The stacked graph shows how the four compartments combine to form the total population."
  },
  populationChart: {
    title: "Total Population Bound",
    formula: String.raw`\({}^{C}D_t^qN(t)=\Lambda-\mu N(t)-dA(t),\quad N(t)\leq\max\{N(0),\Lambda/\mu\}\)`,
    meaning: "This graph checks total population against the feasible bound."
  },
  interventionDetailChart: {
    title: "Intervention Strengths",
    formula: String.raw`\(\beta_{\mathrm{eff}}=\beta_0(1-u_1)(1-u_2),\quad \tau_{\mathrm{eff}}=\tau(1+u_3),\quad \rho_{\mathrm{eff}}=\rho(1-u_4)\)`,
    meaning: "The bars show the selected intervention controls that modify transmission, treatment uptake, and AIDS progression."
  },
  r0Gauge: {
    title: "R0 Gauge",
    formula: String.raw`\(\mathcal{R}_0=\dfrac{\beta_{\mathrm{eff}}}{\tau_{\mathrm{eff}}+\delta+\mu}\left(1+\dfrac{\eta\tau_{\mathrm{eff}}}{\rho_{\mathrm{eff}}+\mu}\right)\)`,
    meaning: "The gauge classifies the selected parameters as controlled, threshold, or persistent."
  },
  r0GaugeDetail: {
    title: "R0 and Stability",
    formula: String.raw`\(\mathcal{R}_0=\dfrac{\beta_{\mathrm{eff}}}{\tau_{\mathrm{eff}}+\delta+\mu}\left(1+\dfrac{\eta\tau_{\mathrm{eff}}}{\rho_{\mathrm{eff}}+\mu}\right),\quad |\arg(\lambda_i)|>q\pi/2\)`,
    meaning: "The R0 formula gives the threshold value; the argument condition is the fractional local stability check."
  },
  scenarioChart: {
    title: "Scenario Infected Curves",
    formula: String.raw`\({}^{C}D_t^qI=\lambda S-(\tau(1+u_3)+\delta+\mu)I,\quad \lambda=\dfrac{\beta_0(1-u_1)(1-u_2)(I+\eta T)}{N}\)`,
    meaning: "Each scenario reruns the infected equation with different q and intervention values."
  },
  scenarioAidsChart: {
    title: "Scenario AIDS Curves",
    formula: String.raw`\({}^{C}D_t^qA=\delta I+\rho(1-u_4)T-(\mu+d)A\)`,
    meaning: "The AIDS-stage scenario graph compares how each intervention affects A(t)."
  },
  scenarioR0Chart: {
    title: "Scenario R0 Ranking",
    formula: String.raw`\(\mathcal{R}_0=\dfrac{\beta_0(1-u_1)(1-u_2)}{\tau(1+u_3)+\delta+\mu}\left(1+\dfrac{\eta\tau(1+u_3)}{\rho(1-u_4)+\mu}\right)\)`,
    meaning: "Each bar is the R0 value computed for one intervention scenario."
  },
  scenarioRadarChart: {
    title: "Scenario Radar Summary",
    formula: String.raw`\(R_0,\ I_{\max},\ I(t_{\mathrm{end}}),\ A(t_{\mathrm{end}}),\ T(t_{\mathrm{end}}),\ \overline{u}=(u_1+u_2+u_3+u_4)/4\)`,
    meaning: "The radar chart combines threshold, peak, final outcomes, and average intervention strength."
  },
  phaseITChart: {
    title: "I-T Phase Plane",
    formula: String.raw`\(\left(I(t),T(t)\right),\quad {}^{C}D_t^qI=\lambda S-(\tau_{\mathrm{eff}}+\delta+\mu)I,\quad {}^{C}D_t^qT=\tau_{\mathrm{eff}}I-(\rho_{\mathrm{eff}}+\mu)T\)`,
    meaning: "This phase graph plots infected against treated values over time."
  },
  phaseIAChart: {
    title: "I-A Phase Plane",
    formula: String.raw`\(\left(I(t),A(t)\right),\quad {}^{C}D_t^qA=\delta I+\rho_{\mathrm{eff}}T-(\mu+d)A\)`,
    meaning: "This graph shows the dynamic relationship between infected and AIDS-stage populations."
  },
  phaseSIChart: {
    title: "S-I Phase Plane",
    formula: String.raw`\(\left(S(t),I(t)\right),\quad {}^{C}D_t^qS=\Lambda-\lambda S-\mu S,\quad {}^{C}D_t^qI=\lambda S-(\tau_{\mathrm{eff}}+\delta+\mu)I\)`,
    meaning: "This graph shows how susceptible and infected populations move together."
  },
  phaseTAChart: {
    title: "T-A Phase Plane",
    formula: String.raw`\(\left(T(t),A(t)\right),\quad {}^{C}D_t^qT=\tau_{\mathrm{eff}}I-(\rho_{\mathrm{eff}}+\mu)T,\quad {}^{C}D_t^qA=\delta I+\rho_{\mathrm{eff}}T-(\mu+d)A\)`,
    meaning: "This graph shows the treatment-to-AIDS pathway over time."
  },
  sensitivityChart: {
    title: "Sensitivity Analysis",
    formula: String.raw`\(\Upsilon_p^{\mathcal{R}_0}=\dfrac{\partial\mathcal{R}_0}{\partial p}\cdot\dfrac{p}{\mathcal{R}_0}\)`,
    meaning: "Each bar measures the proportional effect of a parameter on R0."
  },
  memoryChart: {
    title: "Memory Effect on I(t)",
    formula: String.raw`\({}^{C}D_t^qI=\lambda S-(\tau_{\mathrm{eff}}+\delta+\mu)I,\quad q\in\{1.00,0.95,0.85,0.75\}\)`,
    meaning: "The same infected equation is solved for different fractional orders q."
  },
  memoryTChart: {
    title: "Memory Effect on T(t)",
    formula: String.raw`\({}^{C}D_t^qT=\tau_{\mathrm{eff}}I-(\rho_{\mathrm{eff}}+\mu)T\)`,
    meaning: "The treated curve changes when the fractional memory order q changes."
  },
  memoryAChart: {
    title: "Memory Effect on A(t)",
    formula: String.raw`\({}^{C}D_t^qA=\delta I+\rho_{\mathrm{eff}}T-(\mu+d)A\)`,
    meaning: "The AIDS-stage curve changes when fractional memory is strengthened or weakened."
  },
  memoryPhaseChart: {
    title: "Memory Phase Comparison",
    formula: String.raw`\(\left(I_q(t),T_q(t)\right),\quad q\in\{1.00,0.95,0.85,0.75\}\)`,
    meaning: "The phase trajectories compare infected and treated dynamics under different q values."
  },
  mittagChart: {
    title: "Mittag-Leffler Memory Kernel",
    formula: String.raw`\(E_q(-\mu t^q)=\sum_{k=0}^{\infty}\dfrac{(-\mu t^q)^k}{\Gamma(qk+1)},\quad q=1:\ e^{-\mu t}\)`,
    meaning: "This graph explains why fractional memory decays more slowly than the ordinary exponential case."
  }
};

function graphFormulaFor(chartId, titleText = "") {
  if (GRAPH_FORMULAS[chartId]) return GRAPH_FORMULAS[chartId];
  return {
    title: titleText.replace(/\s+/g, " ").trim() || "Graph Formula",
    formula: String.raw`\({}^{C}D_t^qX(t)=F(t,X(t))\)`,
    meaning: "This graph is generated from the fractional SITA model using the selected parameters."
  };
}

function renderFormulaMath(element) {
  if (!element || typeof renderMathInElement !== "function") return;
  renderMathInElement(element, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "\\(", right: "\\)", display: false }
    ],
    throwOnError: false
  });
}

/* ── Chart header actions ── */
function enhanceChartHeaders() {
  document.querySelectorAll(".chart-card-title").forEach((title) => {
    if (title.querySelector(".chart-actions")) return;
    const card = title.closest(".chart-card");
    const chart = card?.querySelector(".chart-body[id]");
    if (!chart) return;
    const original = title.innerHTML;
    const formula = graphFormulaFor(chart.id, title.textContent);
    card.dataset.formulaChart = chart.id;
    title.innerHTML = `
      <span class="chart-title-main">${original}</span>
      <span class="chart-actions">
        <button class="chart-action-btn" type="button" data-chart-action="formula" title="Show formula behind this graph"><i class="fa fa-square-root-variable"></i></button>
        <button class="chart-action-btn" type="button" data-chart-action="reset-view" title="Reset zoom and graph view"><i class="fa fa-rotate-left"></i></button>
        <button class="chart-action-btn" type="button" data-chart-action="download" title="Download chart as PNG"><i class="fa fa-download"></i></button>
        <button class="chart-action-btn" type="button" data-chart-action="expand" title="Expand chart"><i class="fa fa-up-right-and-down-left-from-center"></i></button>
      </span>`;

    const formulaTab = document.createElement("div");
    formulaTab.className = "chart-formula-tab";
    formulaTab.innerHTML = `
      <div class="chart-formula-kicker"><i class="fa fa-square-root-variable me-1"></i> Formula behind this graph</div>
      <h6>${formula.title}</h6>
      <div class="chart-formula-equation">${formula.formula}</div>
      <p>${formula.meaning}</p>`;
    title.insertAdjacentElement("afterend", formulaTab);
    renderFormulaMath(formulaTab);

    title.querySelector('[data-chart-action="formula"]')?.addEventListener("click", (event) => {
      event.stopPropagation();
      card?.classList.toggle("formula-open");
      title.querySelector('[data-chart-action="formula"]')?.classList.toggle("active", card?.classList.contains("formula-open"));
    });

    title.querySelector('[data-chart-action="reset-view"]')?.addEventListener("click", (event) => {
      event.stopPropagation();
      resetChartView(chart);
    });

    title.querySelector('[data-chart-action="download"]')?.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!chart?.id || !window.Plotly) return;
      Plotly.downloadImage(chart.id, {
        format: "png",
        filename: chart.id,
        scale: 4
      });
    });

    const expandBtn = title.querySelector('[data-chart-action="expand"]');
    expandBtn?.addEventListener("click", (event) => {
      event.stopPropagation();
      setChartExpanded(card, chart, !card?.classList.contains("chart-expanded"));
    });
  });
}

document.addEventListener("DOMContentLoaded", enhanceChartHeaders);

document.addEventListener("DOMContentLoaded", () => {
  ["surface", "reliability", "export"].forEach((name) => {
    document.querySelectorAll(`[data-tab="${name}"], #tab-${name}`).forEach((element) => element.remove());
  });
});

function resizeChartLater(chart, delay = 120) {
  setTimeout(() => {
    if (chart && window.Plotly) Plotly.Plots.resize(chart);
  }, delay);
}

function resetChartView(chart) {
  if (!chart?.id || !window.Plotly) return;

  if (typeof resetChartAnimation === "function") {
    resetChartAnimation(chart.id);
  }

  const relayout = {
    "xaxis.autorange": true,
    "yaxis.autorange": true,
    "xaxis2.autorange": true,
    "yaxis2.autorange": true,
    "xaxis3.autorange": true,
    "yaxis3.autorange": true,
    "xaxis4.autorange": true,
    "yaxis4.autorange": true,
    "scene.xaxis.autorange": true,
    "scene.yaxis.autorange": true,
    "scene.zaxis.autorange": true,
    "scene.camera": null
  };

  Promise.resolve(Plotly.relayout(chart.id, relayout))
    .catch(() => Plotly.react(chart.id, chart.data || [], chart.layout || {}))
    .finally(() => resizeChartLater(chart, 60));
}

function ensureExpandedCloseButton(card, chart) {
  let closeBtn = card.querySelector(".chart-expanded-close");
  if (!closeBtn) {
    closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "chart-expanded-close";
    closeBtn.setAttribute("aria-label", "Return to dashboard");
    closeBtn.title = "Return to dashboard";
    closeBtn.innerHTML = '<i class="fa fa-xmark"></i>';
    card.appendChild(closeBtn);
  }
  closeBtn.onclick = (event) => {
    event.stopPropagation();
    setChartExpanded(card, chart, false);
  };
}

function setChartExpanded(card, chart, expanded) {
  if (!card) return;

  document.querySelectorAll(".chart-card.chart-expanded").forEach((openCard) => {
    if (openCard !== card) {
      const openChart = openCard.querySelector(".chart-body[id]");
      setChartExpanded(openCard, openChart, false);
    }
  });

  card.classList.toggle("chart-expanded", expanded);
  document.body.classList.toggle("dashboard-chart-expanded", expanded);
  if (expanded) ensureExpandedCloseButton(card, chart);

  const expandBtn = card.querySelector('[data-chart-action="expand"]');
  const icon = expandBtn?.querySelector("i");
  expandBtn?.classList.toggle("active", expanded);
  if (expandBtn) {
    expandBtn.title = expanded ? "Return to dashboard" : "Expand chart";
    expandBtn.setAttribute("aria-label", expanded ? "Return to dashboard" : "Expand chart");
  }
  if (icon) {
    icon.className = expanded
      ? "fa fa-down-left-and-up-right-to-center"
      : "fa fa-up-right-and-down-left-from-center";
  }

  resizeChartLater(chart, 80);
  resizeChartLater(chart, 260);
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const card = document.querySelector(".chart-card.chart-expanded");
  if (!card) return;
  const chart = card.querySelector(".chart-body[id]");
  setChartExpanded(card, chart, false);
});

/* ── Skeleton helpers ── */
function showSkeleton(tabName) {
  const sk = document.getElementById(`tab-${tabName}-skeleton`);
  const ct = document.getElementById(`tab-${tabName}-content`);
  if (sk) sk.style.display = "flex";
  if (ct) ct.style.display = "none";
}

function hideSkeleton(tabName) {
  const sk = document.getElementById(`tab-${tabName}-skeleton`);
  const ct = document.getElementById(`tab-${tabName}-content`);
  if (sk) sk.style.display = "none";
  if (ct) ct.style.display = "block";
}

/* ── Tab group dropdowns ── */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab-group-trigger").forEach((trigger) => {
    const menu = trigger.nextElementSibling;
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.contains("open");
      // close all menus first
      document.querySelectorAll(".tab-group-menu").forEach((m) => m.classList.remove("open"));
      document.querySelectorAll(".tab-group-trigger").forEach((t) => t.classList.remove("group-active"));
      if (!isOpen) {
        menu.classList.add("open");
        trigger.classList.add("group-active");
      }
    });
  });

  // clicking a tab inside a dropdown closes the menu
  document.querySelectorAll(".tab-group-menu .tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-group-menu").forEach((m) => m.classList.remove("open"));
      document.querySelectorAll(".tab-group-trigger").forEach((t) => t.classList.remove("group-active"));
      // mark the parent trigger as group-active when a child tab is active
      const menu = btn.closest(".tab-group-menu");
      const trigger = menu?.previousElementSibling;
      if (trigger) trigger.classList.add("group-active");
    });
  });

  // close dropdowns when clicking outside
  document.addEventListener("click", () => {
    document.querySelectorAll(".tab-group-menu").forEach((m) => m.classList.remove("open"));
    document.querySelectorAll(".tab-group-trigger").forEach((t) => {
      // keep group-active if a child tab is still active
      const menu = t.nextElementSibling;
      if (!menu?.querySelector(".tab-btn.active")) t.classList.remove("group-active");
    });
  });
});

/* ── Tab switching ── */
function activateDashboardTab(tabName) {
  const tab = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  const panel = document.getElementById(`tab-${tabName}`);
  if (!panel) return false;
  document.querySelectorAll(".tab-btn").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
  tab?.classList.add("active");
  panel.classList.add("active");
  window.dispatchEvent(new Event("resize"));
  setTimeout(() => {
    if (typeof flushPendingPlots === "function") flushPendingPlots();
  }, 80);

  const titleMap = {
    baseline: "Baseline Simulation",
    "scenario-comparison": "Scenario Comparison",
    sensitivity: "Sensitivity",
    memory: "Memory Effect",
    demo: "Defense Demo"
  };
  document.title = `FracHIV-SITA Lab | ${titleMap[tabName] || tabName}`;

  const lazyTabs = ["scenario-comparison", "sensitivity", "memory"];
  if (lazyTabs.includes(tabName) && typeof loadTabData === "function") {
    loadTabData(tabName);
  }
  return true;
}

window.activateDashboardTab = activateDashboardTab;

document.addEventListener("click", (event) => {
  const tab = event.target.closest(".tab-btn");
  if (!tab || !tab.dataset.tab) return;
  activateDashboardTab(tab.dataset.tab);
});

/* ── Mobile sidebar toggle ── */
document.addEventListener("DOMContentLoaded", () => {
  const openBtn   = document.getElementById("sidebarOpen");
  const closeBtn  = document.getElementById("sidebarClose");
  const panel     = document.getElementById("controlPanel");
  const backdrop  = document.getElementById("sidebarBackdrop");

  function openSidebar() {
    panel?.classList.add("open");
    backdrop?.classList.add("visible");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    panel?.classList.remove("open");
    backdrop?.classList.remove("visible");
    document.body.style.overflow = "";
  }

  openBtn?.addEventListener("click", (e) => { e.stopPropagation(); openSidebar(); });
  closeBtn?.addEventListener("click", (e) => { e.stopPropagation(); closeSidebar(); });
  backdrop?.addEventListener("click", closeSidebar);

  // Close on outside click (desktop fallback)
  document.addEventListener("click", (e) => {
    if (panel?.classList.contains("open") && !panel.contains(e.target) && !openBtn?.contains(e.target)) {
      closeSidebar();
    }
  });

  let touchStartX = 0;
  let touchStartY = 0;
  document.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  document.addEventListener("touchend", (e) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = Math.abs(touch.clientY - touchStartY);
    if (touchStartX < 28 && dx > 80 && dy < 60) openSidebar();
  }, { passive: true });
});
