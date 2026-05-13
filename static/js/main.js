/* ── Tab switching ── */
document.addEventListener("click", (event) => {
  const tab = event.target.closest(".tab-btn");
  if (!tab) return;
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
  }
});

/* ── Mobile sidebar toggle ── */
document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("sidebarOpen");
  const closeBtn = document.getElementById("sidebarClose");
  const panel = document.getElementById("controlPanel");

  openBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    panel?.classList.add("open");
  });
  closeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    panel?.classList.remove("open");
  });

  // Close sidebar when clicking outside on mobile
  document.addEventListener("click", (e) => {
    if (panel?.classList.contains("open") && !panel.contains(e.target) && !openBtn?.contains(e.target)) {
      panel.classList.remove("open");
    }
  });
});
