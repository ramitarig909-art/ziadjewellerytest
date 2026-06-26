/* =====================================================================
 *  products.js — full product CRUD: search · sort · filter · duplicate
 *  · delete protection · image manager (upload / reorder / delete).
 * ===================================================================== */
import * as db from "/assets/js/admin/db.js";
import { uploadImage, deleteByUrl } from "/assets/js/lib/storage.js";
import {
  toast, confirmDialog, skeletonRows, emptyState, esc, slugify, debounce
} from "/assets/js/lib/ui.js";

let PRODUCTS = [], CATS = [], COLS = [];
let q = "", sortBy = "display_order", filterCol = "";

export async function render(el) {
  el.innerHTML = `
    <div class="page-head">
      <div><h1>Products</h1><div class="sub">Add, edit and organise your catalogue.</div></div>
      <button class="btn-gold" id="addBtn">＋ Add Product</button>
    </div>
    <div class="toolbar">
      <div class="search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/></svg>
        <input id="search" placeholder="Search products by name, SKU…" />
      </div>
      <select id="filterCol" style="width:auto"><option value="">All collections</option></select>
      <select id="sortBy" style="width:auto">
        <option value="display_order">Sort: Display order</option>
        <option value="name">Sort: Name A–Z</option>
        <option value="created_at">Sort: Newest</option>
        <option value="price">Sort: Price</option>
      </select>
    </div>
    <div class="panel"><div id="list">${skeletonRows(6)}</div></div>`;

  document.getElementById("addBtn").onclick = () => openEditor(null);
  document.getElementById("search").addEventListener("input", debounce((e) => {
    q = e.target.value.toLowerCase(); paint();
  }, 200));
  document.getElementById("filterCol").onchange = (e) => { filterCol = e.target.value; paint(); };
  document.getElementById("sortBy").onchange = (e) => { sortBy = e.target.value; paint(); };

  [PRODUCTS, CATS, COLS] = await Promise.all([
    db.listProducts(), db.listCategories(), db.listCollections()
  ]);
  const fc = document.getElementById("filterCol");
  COLS.forEach((c) => fc.insertAdjacentHTML("beforeend", `<option value="${c.key}">${esc(c.title)}</option>`));
  paint();
}

/* ---------- List rendering ---------- */
function filtered() {
  let list = PRODUCTS.filter((p) => {
    const hay = `${p.name} ${p.name_ar || ""} ${p.sku || ""} ${p.cat || ""}`.toLowerCase();
    return (!q || hay.includes(q)) && (!filterCol || p.collection === filterCol);
  });
  list.sort((a, b) => {
    if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
    if (sortBy === "created_at") return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === "price") return num(a.price) - num(b.price);
    return (a.display_order || 0) - (b.display_order || 0);
  });
  return list;
}
const num = (s) => parseFloat(String(s || "").replace(/[^\d.]/g, "")) || 0;

function paint() {
  const wrap = document.getElementById("list");
  const list = filtered();
  if (!PRODUCTS.length) {
    wrap.innerHTML = emptyState("No products yet",
      "Your catalogue is empty. Add your first piece to see it on the website instantly.",
      `<button class="btn-gold" onclick="document.getElementById('addBtn').click()">＋ Add your first product</button>`);
    return;
  }
  if (!list.length) {
    wrap.innerHTML = emptyState("No matches", "Try a different search or filter.");
    return;
  }
  wrap.innerHTML = `<table class="tbl"><thead><tr>
    <th></th><th>Name</th><th>Collection</th><th>Price</th><th>Flags</th><th>Stock</th><th></th>
    </tr></thead><tbody>${list.map(row).join("")}</tbody></table>`;

  wrap.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => openEditor(b.dataset.edit));
  wrap.querySelectorAll("[data-dup]").forEach((b) => b.onclick = () => duplicate(b.dataset.dup));
  wrap.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => removeProduct(b.dataset.del));
}

function row(p) {
  const img = p.main_image || p.product_images?.[0]?.thumb_url || "";
  const flags = [
    p.featured && `<span class="badge gold">Featured</span>`,
    p.new_arrival && `<span class="badge">New</span>`,
    p.best_seller && `<span class="badge">Best</span>`
  ].filter(Boolean).join(" ") || `<span class="muted">—</span>`;
  return `<tr>
    <td>${img ? `<img class="thumb" src="${esc(img)}" alt="">` : `<div class="thumb"></div>`}</td>
    <td><strong>${esc(p.name)}</strong><br><span class="muted" style="font-size:.78rem">${esc(p.sku || p.slug || "")}</span></td>
    <td>${esc(collTitle(p.collection))}</td>
    <td>${esc(p.price || "—")}</td>
    <td>${flags}</td>
    <td>${p.in_stock ? `<span class="badge ok">In stock</span>` : `<span class="badge off">Out</span>`}</td>
    <td><div class="row-actions">
      <button class="icon-btn" title="Edit" data-edit="${p.id}">✎</button>
      <button class="icon-btn" title="Duplicate" data-dup="${p.id}">⧉</button>
      <button class="icon-btn danger" title="Delete" data-del="${p.id}">🗑</button>
    </div></td></tr>`;
}
const collTitle = (key) => COLS.find((c) => c.key === key)?.title || key || "—";

/* ---------- Delete & duplicate ---------- */
async function removeProduct(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  const ok = await confirmDialog({
    title: "Delete product?",
    message: `“${p?.name}” and its images will be permanently removed from the website.`,
    confirmText: "Delete"
  });
  if (!ok) return;
  try {
    // remove stored images first
    for (const im of p.product_images || []) await deleteByUrl(im.url).catch(() => {});
    if (p.main_image) await deleteByUrl(p.main_image).catch(() => {});
    await db.deleteProduct(id);
    PRODUCTS = PRODUCTS.filter((x) => x.id !== id);
    paint();
    toast("Deleted successfully", "success");
  } catch (e) { toast(e.message, "error"); }
}

async function duplicate(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return;
  try {
    const { id: _i, created_at, updated_at, product_images, ...rest } = p;
    rest.name = `${p.name} (Copy)`;
    rest.slug = `${p.slug}-copy-${Math.random().toString(36).slice(2, 6)}`;
    rest.featured = false;
    const created = await db.insertProduct(rest);
    // copy image references (reuse same stored files)
    for (const im of product_images || []) {
      const { id: _x, product_id, created_at: _c, ...irest } = im;
      await db.addImage({ ...irest, product_id: created.id });
    }
    const full = await db.getProduct(created.id);
    PRODUCTS.unshift(full);
    paint();
    toast("Product duplicated", "success");
  } catch (e) { toast(e.message, "error"); }
}

/* ---------- Editor modal ---------- */
let editorImages = [];      // working set: [{id?,url,thumb_url,is_main,display_order,_new?}]
let editingId = null;

function openEditor(id) {
  editingId = id;
  const p = id ? PRODUCTS.find((x) => x.id === id) : blank();
  editorImages = (p.product_images || []).map((i) => ({ ...i }))
    .sort((a, b) => (b.is_main - a.is_main) || (a.display_order - b.display_order));
  if (p.main_image && !editorImages.some((i) => i.url === p.main_image))
    editorImages.unshift({ url: p.main_image, thumb_url: p.main_image, is_main: true, display_order: 0 });

  const catOpts = CATS.map((c) => `<option value="${esc(c.name)}" ${p.cat === c.name ? "selected" : ""}>${esc(c.name)}</option>`).join("");
  const colOpts = COLS.map((c) => `<option value="${esc(c.key)}" ${p.collection === c.key ? "selected" : ""}>${esc(c.title)}</option>`).join("");

  const back = document.createElement("div");
  back.className = "modal-back";
  back.innerHTML = `<div class="modal-panel">
    <div class="panel-head"><h2>${id ? "Edit" : "Add"} product</h2>
      <button class="icon-btn" data-x>✕</button></div>
    <div class="panel-body">
      <div class="field"><label>Images — drag to reorder · first image is the main image</label>
        <div class="dropzone" id="dz">⤓ Drag & drop images here, or click to upload</div>
        <input type="file" id="fileInp" accept="image/*" multiple hidden>
        <div class="img-grid" id="imgGrid"></div>
      </div>
      <div class="grid-2">
        <div class="field"><label>Name</label><input id="f_name" value="${esc(p.name)}"></div>
        <div class="field"><label>Name (Arabic)</label><input id="f_name_ar" dir="rtl" value="${esc(p.name_ar)}"></div>
      </div>
      <div class="grid-3">
        <div class="field"><label>Category</label><select id="f_cat"><option value="">—</option>${catOpts}</select></div>
        <div class="field"><label>Collection</label><select id="f_col"><option value="">—</option>${colOpts}</select></div>
        <div class="field"><label>SKU</label><input id="f_sku" value="${esc(p.sku)}"></div>
      </div>
      <div class="grid-2">
        <div class="field"><label>Price</label><input id="f_price" placeholder="EGP 25,550" value="${esc(p.price)}"></div>
        <div class="field"><label>Price (Arabic)</label><input id="f_price_ar" dir="rtl" placeholder="25,550 ج.م" value="${esc(p.price_ar)}"></div>
      </div>
      <div class="grid-3">
        <div class="field"><label>Metal</label><input id="f_metal" placeholder="18k Yellow Gold" value="${esc(p.metal)}"></div>
        <div class="field"><label>Purity</label><input id="f_purity" placeholder="18k" value="${esc(p.purity)}"></div>
        <div class="field"><label>Weight</label><input id="f_weight" placeholder="4.51 g" value="${esc(p.weight)}"></div>
      </div>
      <div class="field"><label>Description</label><textarea id="f_desc">${esc(p.description)}</textarea></div>
      <div class="field"><label>Description (Arabic)</label><textarea id="f_desc_ar" dir="rtl">${esc(p.description_ar)}</textarea></div>
      <div class="toggle-row">
        ${tog("f_featured", "Featured", p.featured)}
        ${tog("f_new", "New Arrival", p.new_arrival)}
        ${tog("f_best", "Best Seller", p.best_seller)}
        ${tog("f_stock", "In Stock", p.in_stock)}
      </div>
      <div class="grid-2">
        <div class="field"><label>Display order</label><input id="f_order" type="number" value="${p.display_order || 0}"></div>
        <div class="field"><label>Slug (friendly URL)</label><input id="f_slug" value="${esc(p.slug)}"></div>
      </div>
      <div class="field"><label>WhatsApp message (optional override)</label><textarea id="f_wa">${esc(p.whatsapp_message)}</textarea></div>
      <details><summary style="cursor:pointer;font-weight:600;margin-bottom:.6rem">SEO</summary>
        <div class="field"><label>SEO Title</label><input id="f_seo_title" value="${esc(p.seo_title)}"></div>
        <div class="field"><label>SEO Description</label><textarea id="f_seo_desc">${esc(p.seo_description)}</textarea></div>
        <div class="field"><label>Image alt text</label><input id="f_alt" value="${esc(p.alt_text)}"></div>
      </details>
    </div>
    <div class="modal-foot">
      <button class="btn-ghost" data-x>Cancel</button>
      <button class="btn-gold" id="saveBtn">Save product</button>
    </div></div>`;

  document.body.appendChild(back);
  requestAnimationFrame(() => back.classList.add("show"));
  const close = () => { back.classList.remove("show"); setTimeout(() => back.remove(), 200); };
  back.querySelectorAll("[data-x]").forEach((b) => b.onclick = close);
  back.onclick = (e) => { if (e.target === back) close(); };

  // auto-slug from name when slug empty
  back.querySelector("#f_name").addEventListener("blur", (e) => {
    const s = back.querySelector("#f_slug");
    if (!s.value) s.value = slugify(e.target.value);
  });

  setupImages(back);
  back.querySelector("#saveBtn").onclick = () => save(back, close);
}

function tog(id, label, on) {
  return `<label class="toggle"><input type="checkbox" id="${id}" ${on ? "checked" : ""}>
    <span class="track"></span>${label}</label>`;
}

/* ---------- Image manager (upload, drag-reorder, delete) ---------- */
function setupImages(scope) {
  const grid = scope.querySelector("#imgGrid");
  const dz = scope.querySelector("#dz");
  const inp = scope.querySelector("#fileInp");

  const paintGrid = () => {
    editorImages.forEach((im, i) => (im.is_main = i === 0));
    grid.innerHTML = editorImages.map((im, i) => `
      <div class="img-tile ${im._uploading ? "uploading" : ""}" draggable="${!im._uploading}" data-i="${i}">
        <img src="${esc(im.thumb_url || im.url)}" alt="">
        ${i === 0 ? `<span class="main-tag">MAIN</span>` : ""}
        <button class="rm" data-rm="${i}" title="Remove">✕</button>
      </div>`).join("");
    grid.querySelectorAll("[data-rm]").forEach((b) => b.onclick = (e) => {
      e.stopPropagation(); editorImages.splice(+b.dataset.rm, 1); paintGrid();
    });
    enableDrag(grid, paintGrid);
  };

  const handleFiles = async (files) => {
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const tile = { url: "", thumb_url: URL.createObjectURL(file), _uploading: true, _new: true };
      editorImages.push(tile); paintGrid();
      try {
        const up = await uploadImage(file);
        Object.assign(tile, { url: up.url, thumb_url: up.thumb_url, _uploading: false });
        toast("Upload complete", "success");
      } catch (e) {
        editorImages = editorImages.filter((x) => x !== tile);
        toast("Upload failed: " + e.message, "error");
      }
      paintGrid();
    }
  };

  dz.onclick = () => inp.click();
  inp.onchange = () => { handleFiles([...inp.files]); inp.value = ""; };
  ["dragover", "dragenter"].forEach((ev) => dz.addEventListener(ev, (e) => {
    e.preventDefault(); dz.classList.add("drag");
  }));
  ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, () => dz.classList.remove("drag")));
  dz.addEventListener("drop", (e) => { e.preventDefault(); handleFiles([...e.dataTransfer.files]); });

  paintGrid();
}

function enableDrag(grid, after) {
  let dragIdx = null;
  grid.querySelectorAll(".img-tile").forEach((tile) => {
    tile.ondragstart = () => { dragIdx = +tile.dataset.i; tile.classList.add("dragging"); };
    tile.ondragend = () => tile.classList.remove("dragging");
    tile.ondragover = (e) => e.preventDefault();
    tile.ondrop = (e) => {
      e.preventDefault();
      const to = +tile.dataset.i;
      if (dragIdx === null || dragIdx === to) return;
      const [moved] = editorImages.splice(dragIdx, 1);
      editorImages.splice(to, 0, moved);
      after();
    };
  });
}

/* ---------- Save ---------- */
async function save(scope, close) {
  const v = (id) => scope.querySelector("#" + id).value.trim();
  const chk = (id) => scope.querySelector("#" + id).checked;
  const name = v("f_name");
  if (!name) return toast("Name is required", "error");
  if (editorImages.some((i) => i._uploading)) return toast("Please wait for uploads to finish", "error");

  const slug = v("f_slug") || slugify(name);
  const metal = v("f_metal"), purity = v("f_purity"), weight = v("f_weight");
  const specs = {};
  if (metal) specs["Metal"] = metal;
  if (purity) specs["Purity"] = purity;
  if (weight) specs["Weight"] = weight;

  const main = editorImages[0];
  const row = {
    name, name_ar: v("f_name_ar"), slug,
    cat: v("f_cat"), collection: v("f_col"), sku: v("f_sku"),
    price: v("f_price"), price_ar: v("f_price_ar"),
    metal, purity, weight,
    description: v("f_desc"), description_ar: v("f_desc_ar"),
    featured: chk("f_featured"), new_arrival: chk("f_new"),
    best_seller: chk("f_best"), in_stock: chk("f_stock"),
    display_order: parseInt(v("f_order")) || 0,
    whatsapp_message: v("f_wa"),
    seo_title: v("f_seo_title"), seo_description: v("f_seo_desc"),
    alt_text: v("f_alt"),
    main_image: main?.url || "",
    og_image: main?.url || "",
    specs
  };

  const btn = scope.querySelector("#saveBtn");
  btn.disabled = true; btn.textContent = "Saving…";
  try {
    let prod;
    if (editingId) prod = await db.updateProduct(editingId, row);
    else prod = await db.insertProduct(row);

    // Sync product_images table: delete all, re-insert in current order.
    const existing = (PRODUCTS.find((x) => x.id === editingId)?.product_images) || [];
    for (const im of existing) await db.removeImage(im.id).catch(() => {});
    let order = 0;
    for (const im of editorImages) {
      if (!im.url) continue;
      await db.addImage({
        product_id: prod.id, url: im.url, thumb_url: im.thumb_url,
        alt: row.alt_text || name, is_main: order === 0, display_order: order++
      });
    }

    const full = await db.getProduct(prod.id);
    if (editingId) PRODUCTS = PRODUCTS.map((x) => (x.id === full.id ? full : x));
    else PRODUCTS.unshift(full);
    paint();
    close();
    toast("Saved successfully", "success");
  } catch (e) {
    toast(e.message, "error");
    btn.disabled = false; btn.textContent = "Save product";
  }
}

function blank() {
  return {
    name: "", name_ar: "", slug: "", cat: "", collection: "", sku: "",
    price: "", price_ar: "", metal: "", purity: "", weight: "",
    description: "", description_ar: "", featured: false, new_arrival: false,
    best_seller: false, in_stock: true, display_order: 0, whatsapp_message: "",
    seo_title: "", seo_description: "", alt_text: "", main_image: "", product_images: []
  };
}
