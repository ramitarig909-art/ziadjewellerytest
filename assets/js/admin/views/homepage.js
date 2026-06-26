/* Homepage editor — hero text, about preview, footer + key contact links. */
import * as db from "/assets/js/admin/db.js";
import { editorPage, loadContent, saveBilingual } from "/assets/js/admin/forms.js";
import { skeletonRows, toast, esc } from "/assets/js/lib/ui.js";

const FIELDS = [
  { key: "hero_eyebrow", label: "Hero eyebrow" },
  { key: "hero_h1", label: "Hero title (HTML allowed: <br>, <em>)", multiline: true },
  { key: "hero_p", label: "Hero subtitle", multiline: true },
  { key: "hero_btn", label: "Hero button text" },
  { key: "about_h2", label: "About preview heading" },
  { key: "footer_rights", label: "Footer text", multiline: true }
];

export async function render(el) {
  el.innerHTML = `<div class="panel"><div class="panel-body">${skeletonRows(5)}</div></div>`;
  const [fields, contact] = await Promise.all([loadContent(FIELDS), db.getSetting("contact")]);

  const extra = `<hr style="border:none;border-top:1px solid var(--line);margin:1.4rem 0">
    <h2 style="font-family:var(--serif);font-size:1.2rem;margin-bottom:1rem">Contact & links shown across the site</h2>
    <div class="grid-2">
      <div class="field"><label>WhatsApp number 1 (digits only)</label><input id="c_wa1" value="${esc(contact.whatsapp_1 || "")}"></div>
      <div class="field"><label>WhatsApp number 2 (optional)</label><input id="c_wa2" value="${esc(contact.whatsapp_2 || "")}"></div>
    </div>
    <div class="grid-2">
      <div class="field"><label>Phone</label><input id="c_phone" value="${esc(contact.phone || "")}"></div>
      <div class="field"><label>Instagram link</label><input id="c_ig" value="${esc(contact.instagram || "")}"></div>
    </div>
    <div class="field"><label>Store address</label><input id="c_addr" value="${esc(contact.address || "")}"></div>
    <div class="grid-2">
      <div class="field"><label>Google Maps link</label><input id="c_maps" value="${esc(contact.maps || "")}"></div>
      <div class="field"><label>Business hours</label><input id="c_hours" value="${esc(contact.hours || "")}"></div>
    </div>
    <p class="muted" style="font-size:.82rem">Featured Products and Collections are managed in the
      <b>Products</b> and <b>Categories</b> tabs.</p>`;

  editorPage(el, {
    title: "Homepage", sub: "Edit your homepage without touching code.",
    fields, extraHtml: extra,
    onSave: async (scope) => {
      await saveBilingual(scope, fields);
      const merged = { ...contact,
        whatsapp_1: scope.querySelector("#c_wa1").value.trim(),
        whatsapp_2: scope.querySelector("#c_wa2").value.trim(),
        phone: scope.querySelector("#c_phone").value.trim(),
        instagram: scope.querySelector("#c_ig").value.trim(),
        address: scope.querySelector("#c_addr").value.trim(),
        maps: scope.querySelector("#c_maps").value.trim(),
        hours: scope.querySelector("#c_hours").value.trim()
      };
      await db.saveSetting("contact", merged);
      toast("Homepage saved", "success");
    }
  });
}
