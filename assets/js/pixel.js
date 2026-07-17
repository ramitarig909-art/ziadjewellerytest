/* Meta Pixel helpers for ZIAD Jewellery (static HTML site). */
(function () {
  function log(msg, extra) { try { console.log(msg, extra === undefined ? "" : extra); } catch (e) {} }

  window.trackPageView = function () {
    if (window.fbq) { fbq("track", "PageView"); log("PageView Fired"); }
  };

  /* De-duplicated: same product opened twice within 1.2s fires once. */
  var lastVC = 0, lastVCName = "";
  window.trackViewContent = function (productName) {
    var name = productName || "", now = Date.now();
    if (name === lastVCName && now - lastVC < 1200) return;
    lastVC = now; lastVCName = name;
    if (window.fbq) {
      fbq("track", "ViewContent", { content_name: name, content_type: "product" });
      log("ViewContent Fired", name);
    }
  };

  var lastContact = 0;
  window.trackContact = function () {
    var now = Date.now();
    if (now - lastContact < 1200) return;
    lastContact = now;
    if (window.fbq) { fbq("track", "Contact"); log("Contact Fired"); }
  };

  document.addEventListener("click", function (e) {
    if (!e.target || !e.target.closest) return;
    var el = e.target.closest('a[href*="wa.me"], a[href*="api.whatsapp.com"], a[href*="whatsapp.com/send"]');
    if (el) window.trackContact();
  }, true);
})();
