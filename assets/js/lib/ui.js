/* =====================================================================
 *  ui.js — reusable interface helpers
 *  Toast notifications · confirm dialog · skeleton loaders · helpers
 * ===================================================================== */

/* ---- Toast notifications ------------------------------------------- */
let toastRoot;
function ensureToastRoot() {
  if (!toastRoot) {
    toastRoot = document.createElement("div");
    toastRoot.className = "toast-root";
    document.body.appendChild(toastRoot);
  }
  return toastRoot;
}

/**
 * Show an elegant toast.
 * @param {string} msg   message text
 * @param {"success"|"error"|"info"} type
 */
export function toast(msg, type = "success") {
  const root = ensureToastRoot();
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  const icon = type === "success" ? "✓" : type === "error" ? "!" : "i";
  el.innerHTML = `<span class="toast-ic">${icon}</span><span>${msg}</span>`;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

/* ---- Confirm dialog (Delete protection) ---------------------------- */
/**
 * Promise-based confirm. Resolves true if confirmed.
 * @returns {Promise<boolean>}
 */
export function confirmDialog({
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Delete",
  danger = true
} = {}) {
  return new Promise((resolve) => {
    const back = document.createElement("div");
    back.className = "confirm-back";
    back.innerHTML = `
      <div class="confirm-box" role="dialog" aria-modal="true">
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="confirm-actions">
          <button class="btn-ghost-sm" data-no>Cancel</button>
          <button class="${danger ? "btn-danger-sm" : "btn-gold-sm"}" data-yes>${confirmText}</button>
        </div>
      </div>`;
    document.body.appendChild(back);
    requestAnimationFrame(() => back.classList.add("show"));
    const close = (val) => {
      back.classList.remove("show");
      setTimeout(() => back.remove(), 200);
      resolve(val);
    };
    back.querySelector("[data-yes]").onclick = () => close(true);
    back.querySelector("[data-no]").onclick = () => close(false);
    back.onclick = (e) => { if (e.target === back) close(false); };
  });
}

/* ---- Skeleton loaders ---------------------------------------------- */
export function skeletonRows(count = 6) {
  let html = "";
  for (let i = 0; i < count; i++) {
    html += `<div class="skel-row"><div class="skel skel-thumb"></div>
      <div class="skel-lines"><div class="skel skel-line w60"></div>
      <div class="skel skel-line w30"></div></div></div>`;
  }
  return html;
}

export function skeletonCards(count = 4) {
  let html = "";
  for (let i = 0; i < count; i++) html += `<div class="skel skel-card"></div>`;
  return html;
}

/* ---- Empty state --------------------------------------------------- */
export function emptyState(title, subtitle, actionHtml = "") {
  return `<div class="empty-state">
    <div class="empty-ic">◇</div>
    <h3>${title}</h3>
    <p>${subtitle}</p>
    ${actionHtml}
  </div>`;
}

/* ---- Small utilities ----------------------------------------------- */
export const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function slugify(s = "") {
  return s.toString().toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const debounce = (fn, ms = 250) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

export function fmtBytes(bytes = 0) {
  if (!bytes) return "0 B";
  const k = 1024, u = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${u[i]}`;
}

export function timeAgo(date) {
  const d = new Date(date), s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString();
}
