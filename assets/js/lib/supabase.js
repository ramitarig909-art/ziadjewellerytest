/* Supabase client (ES module) — shared by the whole admin dashboard. */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.ZIAD_SUPABASE || {};

if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("YOUR_PROJECT_REF")) {
  // Loud, friendly warning so setup mistakes are obvious during deploy.
  console.error("[ZIAD] Supabase is not configured. Edit assets/js/lib/config.js");
}

export const sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

export const BUCKET_PRODUCTS = "product-images";
export const BUCKET_SITE = "site-assets";
