/* ── Sidebar accordion ── */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".ctrl-section-title[data-accordion]").forEach((title) => {
    title.addEventListener("click", () => {
      title.closest(".ctrl-section").classList.toggle("open");
    });
  });
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
document.addEventListener("click", (event) => {
  const tab = event.target.closest(".tab-btn");
  if (!tab || !tab.dataset.tab) return;
  document.querySelectorAll(".tab-btn").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
  tab.classList.add("active");
  const panel = document.getElementById(`tab-${tab.dataset.tab}`);
  if (panel) {
    panel.classList.add("active");
    window.dispatchEvent(new Event("resize"));
    setTimeout(() => {
      if (typeof flushPendingPlots === "function") flushPendingPlots();
    }, 80);
    // Dynamic page title
    const titleMap = {
      baseline: "Baseline Simulation", parameters: "Model Parameters",
      interventions: "Interventions", r0: "R\u2080 & Stability",
      "scenario-explorer": "Scenario Explorer", "scenario-comparison": "Scenario Comparison",
      phase: "Phase Analysis", sensitivity: "Sensitivity",
      memory: "Memory Effect", surface: "Surfaces & Heatmaps",
      export: "Export", overview: "Overview", "about-thesis": "About Thesis"
    };
    document.title = `FracHIV-SITA Lab | ${titleMap[tab.dataset.tab] || tab.dataset.tab}`;
    // Lazy-load secondary tab data on first open
    const lazyTabs = ["scenario-comparison", "scenario-explorer", "sensitivity", "memory", "surface", "phase"];
    if (lazyTabs.includes(tab.dataset.tab) && typeof loadTabData === "function") {
      loadTabData(tab.dataset.tab);
    }
  }
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
});
