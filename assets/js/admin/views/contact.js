/* Contact page editor — phone, WhatsApp, email, address, maps, hours, socials. */
import * as db from "/assets/js/admin/db.js";
import { skeletonRows, toast, esc } from "/assets/js/lib/ui.js";

const F = [
  ["phone", "Phone"], ["whatsapp_1", "WhatsApp number 1 (digits only)"],
  ["whatsapp_2", "WhatsApp number 2"], ["email", "Email"],
  ["address", "Address"], ["maps", "Google Maps link"],
  ["hours", "Working hours"], ["instagram", "Instagram"],
  ["facebook", "Facebook"], ["tiktok", "TikTok"]
];

export async function render(el) {
  el.innerHTML = `<div class="panel"><div class="panel-body">${skeletonRows(5)}</div></div>`;
  const c = await db.getSetting("contact");

  el.innerHTML = `
    <div class="page-head"><div><h1>Contact</h1>
      <div class="sub">These details power the Contact section, footer and WhatsApp buttons.</div></div>
      <button class="btn-gold" id="save">Save changes</button></div>
    <div class="panel"><div class="panel-body"><div class="grid-2">
      ${F.map(([k, label]) =>
        `<div class="field"><label>${label}</label><input id="f_${k}" value="${esc(c[k] || "")}"></div>`).join("")}
    </div></div></div>`;

  document.getElementById("save").onclick = async (e) => {
    e.target.disabled = true; e.target.textContent = "Saving…";
    try {
      const out = { ...c };
      F.forEach(([k]) => (out[k] = document.getElementById("f_" + k).value.trim()));
      await db.saveSetting("contact", out);
      toast("Saved successfully", "success");
    } catch (ex) { toast(ex.message, "error"); }
    e.target.disabled = false; e.target.textContent = "Save changes";
  };
}
