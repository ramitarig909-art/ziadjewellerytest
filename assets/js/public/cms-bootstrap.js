/* cms-bootstrap.js — loads live Supabase content onto the public site. */
(async function () {
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
  } catch (e) {}

  const cfg = window.ZIAD_SUPABASE || {};
  if (!window.supabase || !cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("YOUR_PROJECT_REF")) return;
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  try {
    const [contentRes, colRes, prodRes, setRes, revRes] = await Promise.all([
      sb.from("content").select("key,en,ar"),
      sb.from("collections").select("*").order("display_order"),
      sb.from("products").select("*, product_images(url,thumb_url,is_main,display_order)").order("display_order"),
      sb.from("settings").select("key,value"),
      sb.from("reviews").select("*").order("display_order")
    ]);

    if (contentRes.data && typeof T === "object") {
      contentRes.data.forEach((r) => { if (r.key && (r.en || r.ar)) T[r.key] = { en: r.en || r.ar, ar: r.ar || r.en }; });
    }

    if (revRes.data && revRes.data.length && typeof reviews !== "undefined" && Array.isArray(reviews)) {
      reviews.length = 0;
      revRes.data.forEach((r) => reviews.push({
        ini: (r.name || "?").trim().charAt(0).toUpperCase(),
        name: r.name, role: r.role || "Google review", role_ar: r.role || "مراجعة على Google",
        stars: r.stars || 5, text: r.text || "", text_ar: r.text_ar || r.text || ""
      }));
    }

    if (colRes.data && colRes.data.length && typeof collections !== "undefined") {
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

    if (prodRes.data && prodRes.data.length && typeof products !== "undefined") {
      products = prodRes.data.map((p) => {
        const gallery = (p.product_images || []).slice()
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
          specs: p.specs || {}, specs_ar: p.specs_ar || {}, _wa: p.whatsapp_message || ""
        };
      });
      if (typeof featuredIds !== "undefined") {
        const f = prodRes.data.filter((p) => p.featured).map((p) => p.slug);
        if (f.length) featuredIds = f;
      }
    }

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

    const outUrls = new Set((prodRes.data || []).filter((p) => p.in_stock === false && p.main_image).map((p) => p.main_image));
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
      window.__oosObs = new MutationObserver(() => { clearTimeout(window.__oosT); window.__oosT = setTimeout(badgeCards, 60); });
      window.__oosObs.observe(document.body, { childList: true, subtree: true });
    }

    if (typeof setLang === "function") setLang(typeof LANG !== "undefined" ? LANG : "en");
    if (typeof bindGeneralWa === "function") bindGeneralWa();
    if (typeof handleHash === "function") handleHash();
    badgeCards();
  } catch (err) {
    console.warn("[ZIAD CMS] Live content unavailable, using built-in content.", err);
  }
})();
