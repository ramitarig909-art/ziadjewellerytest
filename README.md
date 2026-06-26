# ZIAD Jewellery — CMS-Powered Website

Your existing luxury website, now fully editable from a custom admin dashboard —
powered by **Supabase** (database + auth + storage) and hosted on **GitHub + Vercel**.
**The public design is unchanged**: the CMS overlays live content onto the original
site and falls back to the built-in content if Supabase is ever unreachable.

> The owner never touches code. Products, prices, images, categories, homepage
> content, contact info and SEO are all editable at `/admin`.

---

## 1. Folder structure

```
.
├── index.html                     ← public website (original design + CMS hook)
├── robots.txt                     ← hides /admin from search engines
├── vercel.json                    ← hosting config (noindex on /admin, caching)
├── admin/
│   ├── login.html                 ← secure admin login
│   └── dashboard.html             ← dashboard shell (single-page app)
├── assets/
│   ├── css/
│   │   └── admin.css              ← luxury dashboard theme (white/black/gold)
│   └── js/
│       ├── lib/
│       │   ├── config.js          ← ⚠️ EDIT THIS: your Supabase URL + anon key
│       │   ├── supabase.js        ← Supabase client
│       │   ├── auth.js            ← login / logout / route guard
│       │   ├── ui.js              ← toasts, confirm dialog, skeletons, helpers
│       │   └── storage.js         ← image compression + thumbnails + upload
│       ├── admin/
│       │   ├── app.js             ← router + sidebar/drawer + auth guard
│       │   ├── db.js              ← data access layer
│       │   ├── forms.js           ← shared editor helpers
│       │   └── views/             ← dashboard, products, categories, homepage,
│       │                            about, contact, orders, settings
│       └── public/
│           └── cms-bootstrap.js   ← loads live content into the public site
└── supabase/
    └── migrations/
        ├── 0001_init.sql          ← tables, RLS, triggers, storage buckets
        └── 0002_seed.sql          ← starter categories/collections/content
```

---

## 2. Set up Supabase (one time, ~5 minutes)

1. Create a free project at **https://supabase.com** → *New project*.
2. Open **SQL Editor → New query**, paste **all** of
   `supabase/migrations/0001_init.sql`, and click **Run**.
   This creates every table, enables Row Level Security, and creates the two
   storage buckets (`product-images`, `site-assets`) automatically.
3. Run `supabase/migrations/0002_seed.sql` the same way (optional but recommended —
   it pre-fills your categories, collections and homepage text so nothing looks empty).
4. **Create your admin user:** *Authentication → Users → Add user* →
   enter the owner's email + a strong password → *Create user*.
5. **Lock down sign-ups** so only you can log in:
   *Authentication → Providers → Email* → turn **OFF** “Allow new users to sign up”.
6. Copy your keys from *Project Settings → API*:
   - **Project URL** (e.g. `https://abcd1234.supabase.co`)
   - **anon public** key

### Connect the site
Open `assets/js/lib/config.js` and paste the two values:

```js
window.ZIAD_SUPABASE = {
  SUPABASE_URL:      "https://abcd1234.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi...your anon key..."
};
```

> ✅ The **anon** key is meant to be public — Row Level Security protects your data.
> ❌ **Never** put the `service_role` secret key in this file or in Git.

---

## 3. Run locally (optional)

Because the app uses absolute paths (`/assets/...`) and ES modules, open it through a
local web server (not by double-clicking the file):

```bash
# any one of these from the project folder:
npx serve .
# or
python -m http.server 8000
```

Then visit `http://localhost:8000` (site) and `http://localhost:8000/admin/login.html` (admin).

---

## 4. Deploy to GitHub + Vercel

### A. Push to GitHub
```bash
git init
git add .
git commit -m "ZIAD Jewellery CMS"
git branch -M main
git remote add origin https://github.com/<you>/ziad-jewellery.git
git push -u origin main
```

### B. Deploy on Vercel
1. Go to **https://vercel.com → Add New → Project** and import the GitHub repo.
2. Framework preset: **Other** (it's a static site — no build step).
   - Build command: *(leave empty)*
   - Output directory: *(leave empty / `./`)*
3. Click **Deploy**. Done — your site is live.
4. Add your custom domain under **Project → Settings → Domains**.

### C. Tell Supabase about your domain
In Supabase: *Authentication → URL Configuration* → add your Vercel/custom domain to
**Site URL** and **Redirect URLs** so login works in production.

> Every `git push` to `main` auto-deploys. The owner, however, never needs Git —
> all day-to-day changes happen in the dashboard and appear on the site instantly.

---

## 5. Using the dashboard

Visit `/admin` (or click the tiny **Admin** link in the website footer) and sign in.

| Section      | What you can do |
|--------------|-----------------|
| **Dashboard**| Totals for products, categories, featured, storage used, recent updates |
| **Products** | Add / edit / delete / **duplicate**, search, sort, filter. Drag-&-drop images, reorder, set the main image, delete images. Full fields incl. metal, purity, weight, collection, SKU, flags, SEO, slug. |
| **Categories**| Create unlimited categories **and** homepage collections (with cover images) |
| **Homepage** | Edit hero title/subtitle/button, about preview, footer, WhatsApp/phone/address/maps/hours |
| **About**    | Heading, paragraphs, mission, vision, history (English + Arabic) |
| **Contact**  | Phone, WhatsApp, email, address, maps, hours, social links |
| **Orders**   | Placeholder — table + security already in place for future checkout |
| **Settings** | Business name, logo & favicon upload, website title, meta description, socials, currency, language |

Every text field supports **English + Arabic** — matching the site's bilingual toggle.

---

## 6. How it stays "design-unchanged"

`cms-bootstrap.js` runs after the original page scripts and:
1. merges your edited text into the site's existing `data-k` translation map,
2. replaces the in-page `products` / `collections` arrays with live Supabase data,
3. updates WhatsApp numbers & contact details,
4. re-runs the site's **own** render functions.

The original hardcoded content remains as an instant-paint fallback, so the page
never flashes empty and keeps working even before Supabase is configured.

---

## 7. Security summary

- **Row Level Security** on every table: the public can only **read**; only
  authenticated admins can insert / update / delete.
- **Orders** are not publicly readable.
- **Storage**: public can read images; only admins can upload/replace/delete.
- Only the **anon** key is in the browser. The `service_role` key is never used here.
- `/admin` is `noindex` + blocked in `robots.txt`.

---

## 8. Image handling

Uploads are automatically **compressed** in the browser (max 1600px, JPEG ~82%) and a
**480px thumbnail** is generated for fast listings — then stored in Supabase Storage.
No server or external service required.
