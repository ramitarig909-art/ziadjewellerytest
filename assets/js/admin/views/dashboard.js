/* Dashboard home — stat cards + recent updates. */
import * as db from "/assets/js/admin/db.js";
import { bucketUsage } from "/assets/js/lib/storage.js";
import { skeletonCards, fmtBytes, timeAgo, esc } from "/assets/js/lib/ui.js";

export async function render(el) {
  el.innerHTML = `
    <div class="page-head"><div>
      <h1>Dashboard</h1>
      <div class="sub">Welcome back — here is your store at a glance.</div>
    </div></div>
    <div class="stat-grid" id="stats">${skeletonCards(4)}</div>
    <div class="panel"><div class="panel-head"><h2>Recent updates</h2></div>
      <div class="panel-body" id="recent">${skeletonCards(1)}</div></div>`;

  // Load everything in parallel
  const [c, products, storage] = await Promise.all([
    db.counts(),
    db.listProducts(),
    bucketUsage().catch(() => 0)
  ]);

  document.getElementById("stats").innerHTML = `
    ${card("Total Products", c.products)}
    ${card("Categories", c.categories)}
    ${card("Featured Products", c.featured)}
    ${card("Storage Used", fmtBytes(storage), `${products.length} products`)}`;

  const recent = [...products]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 6);

  const recentEl = document.getElementById("recent");
  if (!recent.length) {
    recentEl.innerHTML = `<p class="muted" style="text-align:center;padding:1rem">
      No products yet. Add your first piece from the Products tab.</p>`;
    return;
  }
  recentEl.className = "panel-body recent";
  recentEl.innerHTML = recent.map((p) => {
    const img = p.main_image || p.product_images?.[0]?.thumb_url || "";
    return `<div class="item">
      ${img ? `<img src="${esc(img)}" alt="">` : `<div class="item-noimg"></div>`}
      <div><div class="t">${esc(p.name)}</div>
        <div class="m">${esc(p.cat || "—")} · ${esc(p.price || "")}</div></div>
      <span class="when">${timeAgo(p.updated_at)}</span></div>`;
  }).join("");
}

function card(label, value, foot = "") {
  return `<div class="stat-card">
    <div class="label">${label}</div>
    <div class="value">${value}</div>
    ${foot ? `<div class="foot">${foot}</div>` : ""}</div>`;
}
