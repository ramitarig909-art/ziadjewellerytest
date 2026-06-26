/* =====================================================================
 *  app.js — admin SPA shell: auth guard, hash router, sidebar/drawer.
 *  Each section lives in its own module and exports `render(container)`.
 * ===================================================================== */
import { requireAuth, signOut } from "/assets/js/lib/auth.js";
import { sb } from "/assets/js/lib/supabase.js";

import * as dashboard  from "/assets/js/admin/views/dashboard.js";
import * as products   from "/assets/js/admin/views/products.js";
import * as categories from "/assets/js/admin/views/categories.js";
import * as homepage   from "/assets/js/admin/views/homepage.js";
import * as about      from "/assets/js/admin/views/about.js";
import * as contact    from "/assets/js/admin/views/contact.js";
import * as orders     from "/assets/js/admin/views/orders.js";
import * as settings   from "/assets/js/admin/views/settings.js";

const ROUTES = { dashboard, products, categories, homepage, about, contact, orders, settings };
const DEFAULT = "dashboard";

const view    = document.getElementById("view");
const sideNav = document.getElementById("sideNav");
const sidebar = document.getElementById("sidebar");
const scrim   = document.getElementById("scrim");

/* ---- Mobile drawer ---- */
const closeDrawer = () => { sidebar.classList.remove("open"); scrim.classList.remove("show"); };
document.getElementById("hamburger").onclick = () => {
  sidebar.classList.add("open"); scrim.classList.add("show");
};
scrim.onclick = closeDrawer;

/* ---- Logout ---- */
document.getElementById("logoutBtn").onclick = () => signOut();

/* ---- Router ---- */
async function route() {
  const name = (location.hash.replace("#", "") || DEFAULT).split("/")[0];
  const mod = ROUTES[name] || ROUTES[DEFAULT];

  // highlight active link
  sideNav.querySelectorAll("a").forEach((a) =>
    a.classList.toggle("active", a.dataset.route === (ROUTES[name] ? name : DEFAULT)));

  closeDrawer();
  view.innerHTML = "";
  try {
    await mod.render(view);
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="empty-state"><div class="empty-ic">⚠</div>
      <h3>Something went wrong</h3><p>${e.message || e}</p></div>`;
  }
}

/* ---- Boot ---- */
(async function init() {
  const session = await requireAuth();   // redirects to login if not signed in
  if (!session) return;
  document.getElementById("whoami").textContent = session.user.email;

  sideNav.querySelectorAll("a").forEach((a) =>
    (a.href = `#${a.dataset.route}`));

  window.addEventListener("hashchange", route);
  if (!location.hash) location.hash = DEFAULT;
  route();

  // Keep the session fresh / kick out on sign-out from another tab.
  sb.auth.onAuthStateChange((_e, s) => { if (!s) location.replace("/admin/login.html"); });
})();
