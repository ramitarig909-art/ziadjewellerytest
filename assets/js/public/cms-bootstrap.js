/* =====================================================================
 *  cms-bootstrap.js  (classic script, loaded at the end of the page)
 *  ---------------------------------------------------------------------
 *  Loads live content from Supabase and overlays it onto the existing
 *  website WITHOUT changing any markup or design:
 *    1. text   -> merged into the site's `T` translation map (data-k)
 *    2. collections / products -> replace the global arrays
 *    3. contact/WhatsApp -> updated links
 *  Then the site's own render functions are re-run.
 *
 *  The original hardcoded content stays in place as an instant-paint
 *  fallback, so the site never looks empty and still works offline /
 *  before Supabase is configured.
 * ===================================================================== */
(async function () {
  const cfg = window.ZIAD_SUPABASE || {};
  if (!window.supabase || !cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("YOUR_PROJECT_REF")) {
    return; // not configured yet -> keep built-in content
  }
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  try {
    const [contentRes, colRes, prodRes, setRes] = await Promise.all([
      sb.from("content").select("key,en,ar"),
      sb.from("collections").select("*").order("display_order"),
      sb.from("products").select("*, product_images(url,thumb_url,is_main,display_order)")
        .eq("in_stock", true).order("display_order"),
      sb.from("settings").select("key,value")
    ]);

    /* ---- 1. Text overrides (uses the site's own data-k system) ---- */
    if (contentRes.data && typeof T === "object") {
      contentRes.data.forEach((r) => {
        if (r.key) T[r.key] = { en: r.en || "", ar: r.ar || r.en || "" };
      });
    }

    /* ---- 2. Collections ---- */
    if (colRes.data && colRes.data.length && typeof collections !== "undefined") {
      collections = colRes.data.map((c) => ({
        key: c.key, title: c.title, title_ar: c.title_ar || c.title,
        tag: c.tag, tag_ar: c.tag_ar || c.tag, img: c.img || ""
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

    /* ---- 4. Settings: WhatsApp numbers + a couple of contact texts ---- */
    const settings = {};
    (setRes.data || []).forEach((r) => (settings[r.key] = r.value));
    const contact = settings.contact || {};
    if (contact.whatsapp_1 && typeof WA_NUMBERS !== "undefined") {
      const nums = [];
      if (contact.whatsapp_1) nums.push({ num: contact.whatsapp_1, disp: "+" + contact.whatsapp_1 });
      if (contact.whatsapp_2) nums.push({ num: contact.whatsapp_2, disp: "+" + contact.whatsapp_2 });
      WA_NUMBERS.length = 0; nums.forEach((n) => WA_NUMBERS.push(n));
      if (typeof WHATSAPP_NUMBER !== "undefined") WHATSAPP_NUMBER = nums[0].num;
    }
    if (typeof T === "object") {
      if (contact.address) T["val_showroom"] = { en: contact.address, ar: contact.address };
      if (contact.hours) T["val_hours"] = { en: contact.hours, ar: contact.hours };
    }

    /* ---- Re-render using the site's own pipeline ---- */
    if (typeof setLang === "function") setLang(typeof LANG !== "undefined" ? LANG : "en");
    if (typeof bindGeneralWa === "function") bindGeneralWa();
    if (typeof handleHash === "function") handleHash();
  } catch (err) {
    console.warn("[ZIAD CMS] Live content unavailable, using built-in content.", err);
  }
})();
