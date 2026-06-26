/* Orders — placeholder. Table + RLS already exist; ready for future checkout. */
import * as db from "/assets/js/admin/db.js";
import { skeletonRows, emptyState, esc, timeAgo } from "/assets/js/lib/ui.js";

export async function render(el) {
  el.innerHTML = `
    <div class="page-head"><div><h1>Orders</h1>
      <div class="sub">Online ordering — coming soon.</div></div></div>
    <div class="panel"><div id="list">${skeletonRows(4)}</div></div>`;

  let orders = [];
  try { orders = await db.listOrders(); } catch { /* table empty is fine */ }

  const list = document.getElementById("list");
  if (!orders.length) {
    list.innerHTML = emptyState(
      "No orders yet",
      "Your store currently runs on WhatsApp enquiries. When you enable checkout, orders will appear here automatically — the database and security are already in place.");
    return;
  }
  list.innerHTML = `<table class="tbl"><thead><tr>
    <th>Customer</th><th>Phone</th><th>Total</th><th>Status</th><th>When</th></tr></thead>
    <tbody>${orders.map((o) => `<tr>
      <td>${esc(o.customer_name || "—")}</td><td>${esc(o.phone || "—")}</td>
      <td>${esc(o.total || "—")}</td><td><span class="badge">${esc(o.status)}</span></td>
      <td class="muted">${timeAgo(o.created_at)}</td></tr>`).join("")}</tbody></table>`;
}
