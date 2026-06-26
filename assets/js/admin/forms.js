/* =====================================================================
 *  forms.js — helpers shared by the Homepage / About / Contact editors.
 *  These editors write to the bilingual `content` table (key/en/ar),
 *  which the public site reads to override its built-in text.
 * ===================================================================== */
import * as db from "/assets/js/admin/db.js";
import { toast, esc } from "/assets/js/lib/ui.js";

/**
 * Render a list of bilingual text fields bound to content keys.
 * @param {Array<{key,label,multiline?,en,ar}>} fields
 */
export function bilingualFields(fields) {
  return fields.map((f) => {
    const input = (id, val, rtl) => f.multiline
      ? `<textarea id="${id}" ${rtl ? 'dir="rtl"' : ""}>${esc(val || "")}</textarea>`
      : `<input id="${id}" ${rtl ? 'dir="rtl"' : ""} value="${esc(val || "")}">`;
    return `<div class="field"><label>${f.label}</label>
      <div class="grid-2">
        <div>${input(`en_${f.key}`, f.en)}<small class="muted">English</small></div>
        <div>${input(`ar_${f.key}`, f.ar, true)}<small class="muted">العربية</small></div>
      </div></div>`;
  }).join("");
}

/** Read the bilingual fields back into content rows and save them. */
export async function saveBilingual(scope, fields) {
  const rows = fields.map((f) => ({
    key: f.key,
    en: scope.querySelector(`#en_${f.key}`).value,
    ar: scope.querySelector(`#ar_${f.key}`).value
  }));
  await db.saveContent(rows);
  toast("Saved successfully", "success");
}

/** Load content for a set of keys and merge defaults. */
export async function loadContent(fields) {
  const map = await db.getContent(fields.map((f) => f.key));
  fields.forEach((f) => { f.en = map[f.key]?.en ?? f.en ?? ""; f.ar = map[f.key]?.ar ?? f.ar ?? ""; });
  return fields;
}

/** Wire a Save button + page scaffold for a content editor. */
export function editorPage(el, { title, sub, fields, extraHtml = "", onSave }) {
  el.innerHTML = `
    <div class="page-head"><div><h1>${title}</h1><div class="sub">${sub}</div></div>
      <button class="btn-gold" id="saveAll">Save changes</button></div>
    <div class="panel"><div class="panel-body" id="formBody">${bilingualFields(fields)}${extraHtml}</div></div>`;
  const btn = document.getElementById("saveAll");
  btn.onclick = async () => {
    btn.disabled = true; btn.textContent = "Saving…";
    try { await onSave(el); }
    catch (e) { toast(e.message, "error"); }
    btn.disabled = false; btn.textContent = "Save changes";
  };
}
