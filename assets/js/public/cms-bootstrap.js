/* =====================================================================
 *  cms-bootstrap.js  (classic script, loaded at the end of the page)
 *  ---------------------------------------------------------------------
 *  Loads live content from Supabase and overlays it onto the existing
 *  website WITHOUT changing any markup or design:
 *    1. text   -> merged into the site's `T` translation map (data-k)
 *    2. collections / products -> replace the global arrays
 *    3. contact/WhatsApp -> updated links + displayed numbers
 *  Then the site's own render functions are re-run.
 *
 *  The original hardcoded content stays in place as an instant-paint
 *  fallback, so the site never looks empty and still works offline /
 *  before Supabase is configured.
 * ===================================================================== */
(async function () {
  /* Mobile UX: keep the "Back to collections" button always visible (floating
     pill at the bottom) while scrolling a collection on small screens. */
  try {
    const st = document.createElement("style");
    st.textContent =
      "@media(max-width:760px){#collectionPage.active .back-link{" +
      "position:sticky;top:58px;z-index:900;display:inline-block;margin:0 0 .8rem;" +
      "background:#14110c;color:#c8a24a;border:1px solid rgba(200,162,71,.6);padding:.55rem 1.1rem;" +
      "border-radius:40px;box-shadow:0 4px 14px rgba(0,0,0,.25);font-size:.8rem;white-space:nowrap}}" +
      ".prod-thumb{position:relative}" +
      ".prod-thumb img{object-fit:cover!important}" +
      ".oos-badge{position:absolute;top:10px;right:10px;z-index:4;background:#a8442e;color:#fff;" +
      "font-size:.6rem;letter-spacing:.08em;text-transform:uppercase;padding:.3rem .55rem;" +
      "border-radius:3px;box-shadow:0 2px 6px rgba(0,0,0,.25)}";
    document.head.appendChild(st);
  } catch (e) { /* ignore */ }

  const cfg = window.ZIAD_SUPABASE || {};
  if (!window.supabase || !cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("YOUR_PROJECT_REF")) {
    return; // not configured yet -> keep built-in content
  }
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  try {
    const [contentRes, colRes, prodRes, setRes, revRes] = await Promise.all([
      sb.from("content").select("key,en,ar"),
      sb.from("collections").select("*").order("display_order"),
      sb.from("products").select("*, product_images(url,thumb_url,is_main,display_order)")
        .order("display_order"),
      sb.from("settings").select("key,value"),
      sb.from("reviews").select("*").order("display_order")
    ]);

    /* ---- 1. Text overrides (uses the site's own data-k system).
       Skip empty values so a blank field in the editor never wipes the
       site's built-in text. ---- */
    if (contentRes.data && typeof T === "object") {
      contentRes.data.forEach((r) => {
        if (r.key && (r.en || r.ar)) T[r.key] = { en: r.en || r.ar, ar: r.ar || r.en };
      });
    }

    /* ---- Reviews (mutate the site's existing array in place) ---- */
    if (revRes.data && revRes.data.length && typeof reviews !== "undefined" && Array.isArray(reviews)) {
      reviews.length = 0;
      revRes.data.forEach((r) => reviews.push({
        ini: (r.name || "?").trim().charAt(0).toUpperCase(),
        name: r.name, role: r.role || "Google review", role_ar: r.role || "مراجعة على Google",
        stars: r.stars || 5, text: r.text || "", text_ar: r.text_ar || r.text || ""
      }));
    }

    /* ---- 2. Collections ---- */
    if (colRes.data && colRes.data.length && typeof collections !== "undefined") {
      // Keep the site's built-in cover image whenever the CMS has none,
      // and fall back to a product photo from that collection as a last resort.
      const origImg = {};
      collections.forEach((c) => { origImg[c.key] = c.img; });
      const firstProductImg = (key) => {
        const p = (prodRes.data || []).find((x) => x.collection === key && x.main_image);
        return p ? p.main_image : "";
      };
      collections = colRes.data.map((c) => ({
        key: c.key, title: c.title, title_ar: c.title_ar || c.title,
        tag: c.tag, tag_ar: c.tag_ar || c.tag,
        img: c.img || origImg[c.key] || firstProductImg(c.key) || ""
      }));
    }

    /* ---- 3. Products (mapped to the shape the site expects) ---- */
    if (prodRes.data && prodRes.data.length && typeof products !== "undefined") {
      products = prodRes.data.map((p) => {
        const gallery = (p.product_images || [])
          .slice()
          .sort((a, b) => (b.is_main - a.is_main) || (a.display_order - b.display_order))
          .map((i) => i.url);
        let images = (p.main_image ? [p.main_image] : []).concat(gallery)
          .filter((v, i, a) => v && a.indexOf(v) === i);
        if (!images.length) images = [""];
        return {
          id: p.slug, col: p.collection, cat: p.cat || "",
          name: p.name, name_ar: p.name_ar || p.name,
          price: p.price || "", price_ar: p.price_ar || p.price || "",
          weight: p.weight || "", weight_ar: p.weight_ar || p.weight || "",
          items: p.items || [],
          isNew: !!p.new_arrival, images,
          desc: p.description || "", desc_ar: p.description_ar || p.description || "",
          specs: p.specs || {}, specs_ar: p.specs_ar || {},
          _wa: p.whatsapp_message || ""
        };
      });
      // Featured list is derived from the "featured" flag.
      if (typeof featuredIds !== "undefined") {
        const f = prodRes.data.filter((p) => p.featured).map((p) => p.slug);
        if (f.length) featuredIds = f;
      }
    }

    /* ---- 4. Settings: WhatsApp numbers + contact texts + displayed numbers ---- */
    const settings = {};
    (setRes.data || []).forEach((r) => (settings[r.key] = r.value));
    const contact = settings.contact || {};

    // Pretty-print an Egyptian number: "201227709928" -> "+20 122 770 9928"
    function fmtWa(n) {
      n = String(n || "").replace(/\D/g, "");
      if (n.length === 12 && n.slice(0, 2) === "20") {
        const r = n.slice(2);
        return "+20 " + r.slice(0, 3) + " " + r.slice(3, 6) + " " + r.slice(6);
      }
      return n ? "+" + n : "";
    }

    const waList = [];
    if (contact.whatsapp_1) waList.push({ num: String(contact.whatsapp_1).replace(/\D/g, ""), disp: fmtWa(contact.whatsapp_1) });
    if (contact.whatsapp_2) waList.push({ num: String(contact.whatsapp_2).replace(/\D/g, ""), disp: fmtWa(contact.whatsapp_2) });

    if (waList.length && typeof WA_NUMBERS !== "undefined") {
      WA_NUMBERS.length = 0; waList.forEach((n) => WA_NUMBERS.push(n));
      if (typeof WHATSAPP_NUMBER !== "undefined") WHATSAPP_NUMBER = waList[0].num;
    }
    if (typeof T === "object") {
      if (contact.address) T["val_showroom"] = { en: contact.address, ar: contact.address };
      if (contact.hours) T["val_hours"] = { en: contact.hours, ar: contact.hours };
    }

    /* Push the live phone / WhatsApp numbers into the DISPLAYED contact section.
       Those bits of markup are static, so editor changes must be written in.
       Guarded so it never loops when re-run by the MutationObserver below. */
    function applyContactDisplay() {
      try {
        document.querySelectorAll(".info-row").forEach((row) => {
          const lab = row.querySelector(".lab"); if (!lab) return;
          const k = lab.getAttribute("data-k");
          const val = row.querySelector(".val"); if (!val) return;
          if (k === "lab_wa" && waList.length) {
            const html = waList.map((n) => n.disp).join("<br>");
            if (val.innerHTML !== html) val.innerHTML = html;
          }
          if (k === "lab_call" && contact.phone) {
            const txt = fmtWa(contact.phone);
            if (val.textContent !== txt) val.textContent = txt;
          }
        });
        if (contact.phone) {
          const tel = "tel:+" + String(contact.phone).replace(/\D/g, "");
          document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
            if (a.getAttribute("href") !== tel) a.setAttribute("href", tel);
          });
        }
      } catch (e) { /* ignore */ }
    }
    window.__ziadApplyContact = applyContactDisplay;
    applyContactDisplay();

    /* ---- Out-of-stock badges: products stay visible, marked unavailable ---- */
    const outUrls = new Set((prodRes.data || [])
      .filter((p) => p.in_stock === false && p.main_image)
      .map((p) => p.main_image));
    function badgeCards() {
      document.querySelectorAll(".prod-card .prod-thumb").forEach((th) => {
        const img = th.querySelector("img"); if (!img) return;
        const isOut = outUrls.has(img.getAttribute("src")) || outUrls.has(img.src);
        let b = th.querySelector(".oos-badge");
        if (isOut) {
          if (!b) { b = document.createElement("span"); b.className = "oos-badge"; th.appendChild(b); }
          b.textContent = (typeof LANG !== "undefined" && LANG === "ar") ? "غير متوفّر" : "Out of Stock";
        } else if (b) { b.remove(); }
      });
    }
    if (!window.__oosObs) {
      window.__oosObs = new MutationObserver(() => { clearTimeout(window.__oosT); window.__oosT = setTimeout(() => { badgeCards(); if (window.__ziadApplyContact) window.__ziadApplyContact(); }, 60); });
      window.__oosObs.observe(document.body, { childList: true, subtree: true });
    }

    /* ---- Re-render using the site's own pipeline ---- */
    if (typeof setLang === "function") setLang(typeof LANG !== "undefined" ? LANG : "en");
    if (typeof bindGeneralWa === "function") bindGeneralWa();
    if (typeof handleHash === "function") handleHash();
    badgeCards();
  } catch (err) {
    console.warn("[ZIAD CMS] Live content unavailable, using built-in content.", err);
  }
})();
