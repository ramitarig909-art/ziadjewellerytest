/* Settings — business identity, logo/favicon upload, SEO, socials, locale. */
import * as db from "/assets/js/admin/db.js";
import { uploadImage } from "/assets/js/lib/storage.js";
import { BUCKET_SITE } from "/assets/js/lib/supabase.js";
import { skeletonRows, toast, esc } from "/assets/js/lib/ui.js";

export async function render(el) {
  el.innerHTML = `<div class="panel"><div class="panel-body">${skeletonRows(5)}</div></div>`;
  const [site, contact] = await Promise.all([db.getSetting("site"), db.getSetting("contact")]);
  let logo = site.logo_url || "", favicon = site.favicon_url || "";

  const text = [
    ["business_name", "Business name"], ["website_title", "Website title"],
    ["meta_description", "Meta description"], ["domain", "Domain"]
  ];
  const social = [
    ["facebook", "Facebook"], ["instagram", "Instagram"],
    ["tiktok", "TikTok"], ["whatsapp_1", "WhatsApp"], ["email", "Email"]
  ];

  el.innerHTML = `
    <div class="page-head"><div><h1>Settings</h1>
      <div class="sub">Brand identity, SEO and locale.</div></div>
      <button class="btn-gold" id="save">Save changes</button></div>

    <div class="panel" style="margin-bottom:1.4rem"><div class="panel-head"><h2>Brand</h2></div>
      <div class="panel-body">
        <div class="grid-2">
          ${uploadField("Logo", "logo", logo)}
          ${uploadField("Favicon", "favicon", favicon)}
        </div>
        ${text.map(([k, l]) =>
          `<div class="field"><label>${l}</label><input id="s_${k}" value="${esc(site[k] || "")}"></div>`).join("")}
      </div></div>

    <div class="panel" style="margin-bottom:1.4rem"><div class="panel-head"><h2>Social & contact</h2></div>
      <div class="panel-body"><div class="grid-2">
        ${social.map(([k, l]) =>
          `<div class="field"><label>${l}</label><input id="soc_${k}" value="${esc(contact[k] || "")}"></div>`).join("")}
      </div></div></div>

    <div class="panel"><div class="panel-head"><h2>Locale</h2></div>
      <div class="panel-body"><div class="grid-2">
        <div class="field"><label>Currency</label><input id="s_currency" value="${esc(site.currency || "EGP")}"></div>
        <div class="field"><label>Default language</label>
          <select id="s_language">
            <option value="en" ${site.language === "en" ? "selected" : ""}>English</option>
            <option value="ar" ${site.language === "ar" ? "selected" : ""}>العربية</option>
          </select></div>
      </div></div></div>`;

  // wire uploads
  wireUpload("logo", BUCKET_SITE, (url) => (logo = url));
  wireUpload("favicon", BUCKET_SITE, (url) => (favicon = url));

  document.getElementById("save").onclick = async (e) => {
    e.target.disabled = true; e.target.textContent = "Saving…";
    try {
      const outSite = { ...site, logo_url: logo, favicon_url: favicon,
        currency: val("s_currency"), language: document.getElementById("s_language").value };
      text.forEach(([k]) => (outSite[k] = val("s_" + k)));
      const outContact = { ...contact };
      social.forEach(([k]) => (outContact[k] = val("soc_" + k)));
      await Promise.all([db.saveSetting("site", outSite), db.saveSetting("contact", outContact)]);
      toast("Saved successfully", "success");
    } catch (ex) { toast(ex.message, "error"); }
    e.target.disabled = false; e.target.textContent = "Save changes";
  };
}

const val = (id) => document.getElementById(id).value.trim();

function uploadField(label, name, url) {
  return `<div class="field"><label>${label}</label>
    <div class="dropzone" id="dz_${name}" style="padding:1rem">⤓ Upload ${label.toLowerCase()}</div>
    <input type="file" id="file_${name}" accept="image/*" hidden>
    <div class="img-grid" id="prev_${name}">${url ? `<div class="img-tile"><img src="${esc(url)}"></div>` : ""}</div></div>`;
}

function wireUpload(name, bucket, set) {
  const dz = document.getElementById("dz_" + name);
  const file = document.getElementById("file_" + name);
  const prev = document.getElementById("prev_" + name);
  dz.onclick = () => file.click();
  file.onchange = async () => {
    if (!file.files[0]) return;
    dz.textContent = "Uploading…";
    try {
      const up = await uploadImage(file.files[0], { bucket, folder: name });
      set(up.url);
      prev.innerHTML = `<div class="img-tile"><img src="${up.url}"></div>`;
      dz.textContent = "⤓ Replace"; toast("Upload complete", "success");
    } catch (e) { dz.textContent = "⤓ Upload"; toast(e.message, "error"); }
  };
}
