/* Meta Pixel helpers for ZIAD Jewellery (static HTML site). */
(function () {
  function log(msg, extra) { try { console.log(msg, extra === undefined ? "" : extra); } catch (e) {} }

  window.trackPageView = function () {
    if (window.fbq) { fbq("track", "PageView"); log("PageView Fired"); }
  };

  window.trackViewContent = function (productName) {
    if (window.fbq) {
      fbq("track", "ViewContent", { content_name: productName || "", content_type: "product" });
      log("ViewContent Fired", productName || "");
    }
  };

  var lastContact = 0;
  window.trackContact = function () {
    var now = Date.now();
    if (now - lastContact < 1200) return;      // block duplicate Contact from one click
    lastContact = now;
    if (window.fbq) { fbq("track", "Contact"); log("Contact Fired"); }
  };

  // Fire Contact the moment any WhatsApp link is clicked (before it opens).
  document.addEventListener("click", function (e) {
    if (!e.target || !e.target.closest) return;
    var el = e.target.closest('a[href*="wa.me"], a[href*="api.whatsapp.com"], a[href*="whatsapp.com/send"]');
    if (el) window.trackContact();
  }, true);
})();
