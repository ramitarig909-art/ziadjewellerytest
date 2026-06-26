/* =====================================================================
 *  db.js — thin data-access layer over Supabase for the dashboard.
 *  Keeps all table/column names in one place.
 * ===================================================================== */
import { sb } from "/assets/js/lib/supabase.js";

/* ---------- Products ---------- */
export async function listProducts() {
  const { data, error } = await sb
    .from("products")
    .select("*, product_images(*)")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function getProduct(id) {
  const { data, error } = await sb.from("products")
    .select("*, product_images(*)").eq("id", id).single();
  if (error) throw error;
  return data;
}
export async function insertProduct(row) {
  const { data, error } = await sb.from("products").insert(row).select().single();
  if (error) throw error;
  return data;
}
export async function updateProduct(id, row) {
  const { data, error } = await sb.from("products").update(row).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
export async function deleteProduct(id) {
  const { error } = await sb.from("products").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- Product images ---------- */
export async function addImage(row) {
  const { data, error } = await sb.from("product_images").insert(row).select().single();
  if (error) throw error;
  return data;
}
export async function removeImage(id) {
  const { error } = await sb.from("product_images").delete().eq("id", id);
  if (error) throw error;
}
export async function reorderImages(items) {
  // items: [{id, display_order, is_main}]
  const { error } = await sb.from("product_images").upsert(items);
  if (error) throw error;
}

/* ---------- Categories ---------- */
export async function listCategories() {
  const { data, error } = await sb.from("categories").select("*")
    .order("display_order", { ascending: true });
  if (error) throw error;
  return data || [];
}
export async function upsertCategory(row) {
  const { data, error } = await sb.from("categories").upsert(row).select().single();
  if (error) throw error;
  return data;
}
export async function deleteCategory(id) {
  const { error } = await sb.from("categories").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- Collections ---------- */
export async function listCollections() {
  const { data, error } = await sb.from("collections").select("*")
    .order("display_order", { ascending: true });
  if (error) throw error;
  return data || [];
}
export async function upsertCollection(row) {
  const { data, error } = await sb.from("collections").upsert(row).select().single();
  if (error) throw error;
  return data;
}

/* ---------- Content (bilingual page text) ---------- */
export async function getContent(keys) {
  let q = sb.from("content").select("*");
  if (keys) q = q.in("key", keys);
  const { data, error } = await q;
  if (error) throw error;
  const map = {};
  (data || []).forEach((r) => (map[r.key] = r));
  return map;
}
export async function saveContent(rows) {
  // rows: [{key,en,ar}]
  const { error } = await sb.from("content").upsert(rows);
  if (error) throw error;
}

/* ---------- Settings (key -> jsonb) ---------- */
export async function getSetting(key) {
  const { data, error } = await sb.from("settings").select("value").eq("key", key).maybeSingle();
  if (error) throw error;
  return data?.value || {};
}
export async function saveSetting(key, value) {
  const { error } = await sb.from("settings").upsert({ key, value });
  if (error) throw error;
}

/* ---------- Orders ---------- */
export async function listOrders() {
  const { data, error } = await sb.from("orders").select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/* ---------- Dashboard counts ---------- */
export async function counts() {
  const c = async (t, filter) => {
    let q = sb.from(t).select("*", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count } = await q;
    return count || 0;
  };
  const [products, featured, cats, cols] = await Promise.all([
    c("products"),
    c("products", (q) => q.eq("featured", true)),
    c("categories"),
    c("collections")
  ]);
  return { products, featured, categories: cats, collections: cols };
}
