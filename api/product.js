/* =====================================================================
 *  /product/<slug>  — individual product page (Vercel serverless).
 *  READ-ONLY: fetches the product from Supabase and renders an SEO-ready
 *  page. Does not touch index.html, the dashboard, or any data.
 * ===================================================================== */
const SUPABASE_URL = "https://mwpkmzsryrywldkzuacs.supabase.co";
const ANON = "sb_publishable_MIpqtLl-tVXX6Lgquq0p5Q_gdo32rKJ";
const SITE = "https://ziadjewellery.com";

async function sb(path) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
    });
    return r.ok ? await r.json() : [];
  } catch (e) { return []; }
}
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

module.exports = async (req, res) => {
  const slug = (req.query && req.query.slug ? req.query.slug : "").toString();
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (!slug) { res.status(404).send(shell("Not found", "<div class='wrap'><h1>Product not found</h1><p><a href='/'>← Back to ZIAD Jewellery</a></p></div>")); return; }

  const rows = await sb(`products?slug=eq.${encodeURIComponent(slug)}&select=*,product_images(url,is_main,display_order)&limit=1`);
  const p = rows[0];
  if (!p) { res.status(404).send(shell("Not found", "<div class='wrap'><h1>Product not found</h1><p><a href='/'>← Back to ZIAD Jewellery</a></p></div>")); return; }

  const gallery = (p.product_images || []).slice()
    .sort((a, b) => (b.is_main - a.is_main) || (a.display_order - b.display_order)).map((i) => i.url);
  const images = [p.main_image, ...gallery].filter((v, i, a) => v && a.indexOf(v) === i);
  const img = images[0] || `${SITE}/og-image.png`;

  const url = `${SITE}/product/${encodeURIComponent(slug)}`;
  const title = `${p.seo_title || p.name} | ZIAD Jewellery`;
  const desc = (p.seo_description || p.description || `${p.name} — fine gold jewellery handcrafted by ZIAD Jewellery, Nasr City, Cairo.`).replace(/\s+/g, " ").slice(0, 300);
  const priceNum = (p.price || "").replace(/[^\d.]/g, "");

  const contact = (await sb(`settings?key=eq.contact&select=value&limit=1`))[0]?.value || {};
  const wa = contact.whatsapp_1 || "201227709928";
  const waMsg = encodeURIComponent(`Hello ZIAD Jewellery — I'd like more information about ${p.name}${p.price ? ` (${p.price})` : ""}.\n${url}`);

  const jsonld = {
    "@context": "https://schema.org", "@type": "Product",
    name: p.name, image: images.length ? images : [img], description: desc,
    brand: { "@type": "Brand", name: "ZIAD Jewellery" }, url,
    category: p.cat || undefined, material: p.metal || undefined, weight: p.weight || undefined
  };
  if (priceNum) jsonld.offers = {
    "@type": "Offer", price: priceNum, priceCurrency: "EGP",
    availability: p.in_stock === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock", url
  };

  const head = `
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    <link rel="canonical" href="${esc(url)}" />
    <meta property="og:type" content="product" />
    <meta property="og:title" content="${esc(p.name)} — ZIAD Jewellery" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:image" content="${esc(img)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(p.name)} — ZIAD Jewellery" />
    <meta name="twitter:image" content="${esc(img)}" />
    <script type="application/ld+json">${JSON.stringify(jsonld)}</script>`;

  const thumbs = images.map((u, i) =>
    `<img src="${esc(u)}" class="thumb${i === 0 ? " active" : ""}" onclick="document.getElementById('main').src=this.src;document.querySelectorAll('.thumb').forEach(t=>t.classList.remove('active'));this.classList.add('active')" alt="${esc(p.name)}" />`).join("");

  const oos = p.in_stock === false ? `<span class="oos">Out of Stock</span>` : "";
  const body = `
  <header class="nav"><a href="/" class="brandlink"><img src="/logo.png" alt="ZIAD Jewellery" /></a></header>
  <main class="wrap">
    <a href="/#collections" class="back">← Back to collections</a>
    <div class="product">
      <div class="gallery">
        <div class="main-wrap">${oos}<img id="main" src="${esc(img)}" alt="${esc(p.name)}" /></div>
        ${images.length > 1 ? `<div class="thumbs">${thumbs}</div>` : ""}
      </div>
      <div class="info">
        ${p.cat ? `<div class="eyebrow">${esc(p.cat)}</div>` : ""}
        <h1>${esc(p.name)}</h1>
        ${p.name_ar ? `<div class="name-ar" dir="rtl">${esc(p.name_ar)}</div>` : ""}
        ${p.price ? `<div class="price">${esc(p.price)}</div>` : ""}
        <div class="specs">
          ${p.weight ? `<div><span>Weight</span> ${esc(p.weight)}</div>` : ""}
          ${p.metal ? `<div><span>Metal</span> ${esc(p.metal)}</div>` : ""}
        </div>
        ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ""}
        ${p.description_ar ? `<p class="desc" dir="rtl">${esc(p.description_ar)}</p>` : ""}
        <a class="wa" href="https://wa.me/${esc(wa)}?text=${waMsg}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24z"/></svg>
          Ask about this piece
        </a>
      </div>
    </div>
  </main>
  <footer class="foot">© ${new Date().getFullYear()} ZIAD Jewellery · Nasr City, Cairo · <a href="/">ziadjewellery.com</a></footer>`;

  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=600, must-revalidate");
  res.status(200).send(shell(title, body, head));
};

function shell(title, body, extraHead = "") {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
${extraHead || `<title>${title}</title>`}
<link rel="icon" type="image/png" href="/favicon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Jost:wght@300;400;500&family=Cairo:wght@400;600&display=swap" rel="stylesheet" />
<style>
:root{--ivory:#FAF6EF;--pearl:#F2EBDD;--sand:#EFE7D7;--espresso:#241F1A;--ink:#2E2922;--gold:#B8923D;--gold-deep:#977629;--muted:#7d7568;--warn:#a8442e;--serif:'Cormorant Garamond',Georgia,serif;--sans:'Jost',sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--ivory);color:var(--espresso);font-family:var(--sans);font-weight:300;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit}
h1{font-family:var(--serif);font-weight:500;font-size:2.3rem;line-height:1.1}
.nav{padding:1.2rem;text-align:center;border-bottom:1px solid rgba(184,146,61,.2);background:#fff}
.nav img{height:46px;width:auto}
.wrap{max-width:1080px;margin:0 auto;padding:2rem 1.3rem 3rem}
.back{display:inline-block;margin-bottom:1.4rem;font-size:.85rem;color:var(--gold-deep);text-decoration:none;letter-spacing:.03em}
.back:hover{text-decoration:underline}
.product{display:grid;grid-template-columns:1fr 1fr;gap:2.4rem;align-items:start}
.main-wrap{position:relative;aspect-ratio:1;background:var(--sand);border-radius:8px;overflow:hidden}
.main-wrap img{width:100%;height:100%;object-fit:cover;display:block}
.oos{position:absolute;top:14px;right:14px;z-index:2;background:var(--warn);color:#fff;font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;padding:.35rem .7rem;border-radius:4px}
.thumbs{display:flex;gap:.6rem;margin-top:.7rem;flex-wrap:wrap}
.thumb{width:70px;height:70px;object-fit:cover;border-radius:6px;border:1px solid rgba(184,146,61,.3);cursor:pointer;opacity:.7;transition:.2s}
.thumb.active,.thumb:hover{opacity:1;border-color:var(--gold)}
.eyebrow{font-size:.75rem;letter-spacing:.22em;text-transform:uppercase;color:var(--gold-deep);margin-bottom:.6rem}
.name-ar{font-family:'Cairo';font-size:1.3rem;color:var(--gold-deep);margin-top:.3rem}
.price{font-family:var(--serif);font-size:1.9rem;color:var(--gold-deep);margin:1rem 0}
.specs{display:flex;gap:1.6rem;flex-wrap:wrap;margin:1rem 0;font-size:.92rem}
.specs span{display:block;font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.desc{color:var(--ink);margin:1rem 0;max-width:52ch}
.wa{display:inline-flex;align-items:center;gap:.6rem;margin-top:1.4rem;background:linear-gradient(120deg,var(--gold-deep),var(--gold));color:#241402;font-weight:500;letter-spacing:.06em;text-transform:uppercase;font-size:.82rem;padding:.9rem 1.6rem;border-radius:3px;text-decoration:none}
.wa:hover{filter:brightness(1.06)}
.foot{text-align:center;padding:2rem 1rem;border-top:1px solid rgba(184,146,61,.2);color:var(--muted);font-size:.82rem}
.foot a{color:var(--gold-deep)}
@media(max-width:760px){.product{grid-template-columns:1fr;gap:1.4rem}h1{font-size:1.9rem}.wrap{padding:1.3rem 1rem 2.5rem}}
</style></head>
<body>${body}</body></html>`;
}
