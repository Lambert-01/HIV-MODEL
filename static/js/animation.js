/* ── Loading Overlay ── */
function setBusy(isBusy, message = "Running fractional simulation...") {
  const overlay = document.getElementById("loadingOverlay");
  const loadingText = overlay?.querySelector(".loading-text");
  const pill = document.getElementById("status-pill");
  if (overlay) overlay.classList.toggle("d-none", !isBusy);
  if (loadingText && isBusy) loadingText.textContent = message;
  if (pill) {
    if (isBusy) {
      pill.textContent = "Running";
    } else if (pill.textContent === "Running" || pill.textContent === "Running...") {
      pill.textContent = "Ready";
    }
    pill.classList.toggle("running", isBusy);
  }
}

window.addEventListener("error", () => setBusy(false));
window.addEventListener("unhandledrejection", () => setBusy(false));

/* ── Toast Notifications ── */
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const icon = type === "success"
    ? '<i class="fa fa-circle-check me-2 text-success"></i>'
    : '<i class="fa fa-circle-xmark me-2 text-danger"></i>';

  const id = `toast-${Date.now()}`;
  const html = `
    <div id="${id}" class="toast toast-sci toast-${type} show align-items-center" role="alert">
      <div class="d-flex align-items-center p-3 gap-2">
        ${icon}
        <span style="font-size:0.85rem;font-weight:600">${message}</span>
        <button type="button" class="btn-close btn-close-white ms-auto" onclick="document.getElementById('${id}').remove()"></button>
      </div>
    </div>`;
  container.insertAdjacentHTML("beforeend", html);
  setTimeout(() => document.getElementById(id)?.remove(), 4000);
}

/* ── Animated Counter ── */
function animateValue(el, target, decimals = 0) {
  if (!el) return;
  const start = parseFloat(el.textContent) || 0;
  const duration = 600;
  const startTime = performance.now();
  const update = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * eased;
    el.textContent = current.toFixed(decimals);
    el.classList.add("updated");
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target.toFixed(decimals);
  };
  requestAnimationFrame(update);
}
