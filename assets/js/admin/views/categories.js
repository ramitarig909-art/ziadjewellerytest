/* Categories + Collections manager (create unlimited, edit, delete). */
import * as db from "/assets/js/admin/db.js";
import { uploadImage } from "/assets/js/lib/storage.js";
import { toast, confirmDialog, skeletonRows, emptyState, esc, slugify } from "/assets/js/lib/ui.js";
import { BUCKET_SITE } from "/assets/js/lib/supabase.js";

let CATS = [], COLS = [];

export async function render(el) {
  el.innerHTML = `
    <div class="page-head"><div>
      <h1>Categories</h1>
      <div class="sub">Group your products. Collections also appear on the homepage.</div>
    </div></div>
    <div class="panel" style="margin-bottom:1.4rem">
      <div class="panel-head"><h2>Categories</h2>
        <button class="btn-gold-sm" id="addCat">＋ Add category</button></div>
      <div id="catList">${skeletonRows(4)}</div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Homepage Collections</h2>
        <button class="btn-gold-sm" id="addCol">＋ Add collection</button></div>
      <div id="colList">${skeletonRows(3)}</div>
    </div>`;

  document.getElementById("addCat").onclick = () => editCat(null);
  document.getElementById("addCol").onclick = () => editCol(null);

  [CATS, COLS] = await Promise.all([db.listCategories(), db.listCollections()]);
  paintCats(); paintCols();
}

/* ---------- Categories ---------- */
function paintCats() {
  const wrap = document.getElementById("catList");
  if (!CATS.length) {
    wrap.innerHTML = emptyState("No categories", "Add categories like Rings, Necklaces, Earrings…");
    return;
  }
  wrap.innerHTML = `<table class="tbl"><tbody>${CATS.map((c) => `
    <tr><td><strong>${esc(c.name)}</strong></td>
      <td dir="rtl">${esc(c.name_ar || "")}</td>
      <td class="muted">${esc(c.slug)}</td>
      <td><div class="row-actions">
        <button class="icon-btn" data-e="${c.id}">✎</button>
        <button class="icon-btn danger" data-d="${c.id}">🗑</button></div></td></tr>`).join("")}
    </tbody></table>`;
  wrap.querySelectorAll("[data-e]").forEach((b) => b.onclick = () => editCat(b.dataset.e));
  wrap.querySelectorAll("[data-d]").forEach((b) => b.onclick = () => delCat(b.dataset.d));
}

function editCat(id) {
  const c = id ? CATS.find((x) => x.id === id) : { name: "", name_ar: "", slug: "", display_order: CATS.length + 1 };
  modal(`${id ? "Edit" : "Add"} category`, `
    <div class="field"><label>Name</label><input id="m_name" value="${esc(c.name)}"></div>
    <div class="field"><label>Name (Arabic)</label><input id="m_name_ar" dir="rtl" value="${esc(c.name_ar || "")}"></div>
    <div class="grid-2">
      <div class="field"><label>Slug</label><input id="m_slug" value="${esc(c.slug)}"></div>
      <div class="field"><label>Display order</label><input id="m_order" type="number" value="${c.display_order || 0}"></div>
    </div>`, async (scope) => {
    const name = scope.querySelector("#m_name").value.trim();
    if (!name) return toast("Name required", "error");
    const row = {
      ...(id ? { id } : {}), name,
      name_ar: scope.querySelector("#m_name_ar").value.trim(),
      slug: scope.querySelector("#m_slug").value.trim() || slugify(name),
      display_order: parseInt(scope.querySelector("#m_order").value) || 0
    };
    const saved = await db.upsertCategory(row);
    CATS = id ? CATS.map((x) => x.id === id ? saved : x) : [...CATS, saved];
    CATS.sort((a, b) => a.display_order - b.display_order);
    paintCats(); toast("Saved successfully", "success");
  });
}

async function delCat(id) {
  const c = CATS.find((x) => x.id === id);
  if (!await confirmDialog({ title: "Delete category?", message: `“${c.name}” will be removed.`, confirmText: "Delete" })) return;
  await db.deleteCategory(id);
  CATS = CATS.filter((x) => x.id !== id);
  paintCats(); toast("Deleted successfully", "success");
}

/* ---------- Collections ---------- */
function paintCols() {
  const wrap = document.getElementById("colList");
  if (!COLS.length) {
    wrap.innerHTML = emptyState("No collections", "Collections are the worlds shown on your homepage grid.");
    return;
  }
  wrap.innerHTML = `<table class="tbl"><tbody>${COLS.map((c) => `
    <tr><td>${c.img ? `<img class="thumb" src="${esc(c.img)}">` : `<div class="thumb"></div>`}</td>
      <td><strong>${esc(c.title)}</strong><br><span class="muted" style="font-size:.78rem">${esc(c.key)}</span></td>
      <td class="muted" style="max-width:260px">${esc(c.tag || "")}</td>
      <td><div class="row-actions"><button class="icon-btn" data-e="${c.id}">✎</button></div></td></tr>`).join("")}
    </tbody></table>`;
  wrap.querySelectorAll("[data-e]").forEach((b) => b.onclick = () => editCol(b.dataset.e));
}

function editCol(id) {
  const c = id ? COLS.find((x) => x.id === id)
              : { key: "", title: "", title_ar: "", tag: "", tag_ar: "", img: "", display_order: COLS.length + 1 };
  let imgUrl = c.img || "";
  modal(`${id ? "Edit" : "Add"} collection`, `
    <div class="field"><label>Cover image</label>
      <div class="dropzone" id="m_dz">⤓ Click to upload cover image</div>
      <input type="file" id="m_file" accept="image/*" hidden>
      <div class="img-grid" id="m_prev">${imgUrl ? `<div class="img-tile"><img src="${esc(imgUrl)}"></div>` : ""}</div></div>
    <div class="grid-2">
      <div class="field"><label>Title</label><input id="m_title" value="${esc(c.title)}"></div>
      <div class="field"><label>Title (Arabic)</label><input id="m_title_ar" dir="rtl" value="${esc(c.title_ar || "")}"></div>
    </div>
    <div class="field"><label>Key (used in links — lowercase, no spaces)</label><input id="m_key" value="${esc(c.key)}" ${id ? "readonly" : ""}></div>
    <div class="field"><label>Tagline</label><input id="m_tag" value="${esc(c.tag || "")}"></div>
    <div class="field"><label>Tagline (Arabic)</label><input id="m_tag_ar" dir="rtl" value="${esc(c.tag_ar || "")}"></div>
    <div class="field"><label>Display order</label><input id="m_order" type="number" value="${c.display_order || 0}"></div>`,
  async (scope) => {
    const title = scope.querySelector("#m_title").value.trim();
    if (!title) return toast("Title required", "error");
    const row = {
      ...(id ? { id } : {}), title,
      title_ar: scope.querySelector("#m_title_ar").value.trim(),
      key: (scope.querySelector("#m_key").value.trim() || slugify(title)),
      tag: scope.querySelector("#m_tag").value.trim(),
      tag_ar: scope.querySelector("#m_tag_ar").value.trim(),
      img: imgUrl,
      display_order: parseInt(scope.querySelector("#m_order").value) || 0
    };
    const saved = await db.upsertCollection(row);
    COLS = id ? COLS.map((x) => x.id === id ? saved : x) : [...COLS, saved];
    COLS.sort((a, b) => a.display_order - b.display_order);
    paintCols(); toast("Saved successfully", "success");
  }, (scope) => {
    // wire upload after modal mounts
    const dz = scope.querySelector("#m_dz"), file = scope.querySelector("#m_file"), prev = scope.querySelector("#m_prev");
    dz.onclick = () => file.click();
    file.onchange = async () => {
      if (!file.files[0]) return;
      dz.textContent = "Uploading…";
      try {
        const up = await uploadImage(file.files[0], { bucket: BUCKET_SITE, folder: "collections" });
        imgUrl = up.url;
        prev.innerHTML = `<div class="img-tile"><img src="${esc(imgUrl)}"></div>`;
        dz.textContent = "⤓ Replace cover image"; toast("Upload complete", "success");
      } catch (e) { dz.textContent = "⤓ Click to upload cover image"; toast(e.message, "error"); }
    };
  });
}

/* ---------- Shared mini-modal ---------- */
function modal(title, body, onSave, onMount) {
  const back = document.createElement("div");
  back.className = "modal-back";
  back.innerHTML = `<div class="modal-panel" style="max-width:560px">
    <div class="panel-head"><h2>${title}</h2><button class="icon-btn" data-x>✕</button></div>
    <div class="panel-body">${body}</div>
    <div class="modal-foot"><button class="btn-ghost" data-x>Cancel</button>
      <button class="btn-gold" data-save>Save</button></div></div>`;
  document.body.appendChild(back);
  requestAnimationFrame(() => back.classList.add("show"));
  const close = () => { back.classList.remove("show"); setTimeout(() => back.remove(), 200); };
  back.querySelectorAll("[data-x]").forEach((b) => b.onclick = close);
  back.onclick = (e) => { if (e.target === back) close(); };
  back.querySelector("[data-save]").onclick = async (e) => {
    e.target.disabled = true; e.target.textContent = "Saving…";
    try { await onSave(back); close(); }
    catch (ex) { toast(ex.message, "error"); e.target.disabled = false; e.target.textContent = "Save"; }
  };
  if (onMount) onMount(back);
}
