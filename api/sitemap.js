/* =====================================================================
 *  /sitemap.xml  — auto-generated sitemap (Vercel serverless).
 *  Lists the homepage + every product page. READ-ONLY from Supabase,
 *  so it stays up to date automatically as products are added/removed.
 * ===================================================================== */
const SUPABASE_URL = "https://mwpkmzsryrywldkzuacs.supabase.co";
const ANON = "sb_publishable_MIpqtLl-tVXX6Lgquq0p5Q_gdo32rKJ";
const SITE = "https://ziadjewellery.com";

module.exports = async (req, res) => {
  let products = [];
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/products?select=slug,updated_at&order=display_order`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
    });
    if (r.ok) products = await r.json();
  } catch (e) { /* fall back to homepage-only */ }

  const enc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  let urls = `<url><loc>${SITE}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`;
  for (const p of products) {
    if (!p.slug) continue;
    const lastmod = p.updated_at ? `<lastmod>${new Date(p.updated_at).toISOString().slice(0, 10)}</lastmod>` : "";
    urls += `<url><loc>${SITE}/product/${enc(encodeURIComponent(p.slug))}</loc>${lastmod}<changefreq>weekly</changefreq><priority>0.8</priority></url>`;
  }

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
};
