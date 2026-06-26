/* =====================================================================
 *  auth.js — Supabase email/password authentication
 * ===================================================================== */
import { sb } from "./supabase.js";

export async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await sb.auth.signOut();
  window.location.href = "/admin/login.html";
}

export async function getSession() {
  const { data } = await sb.auth.getSession();
  return data.session;
}

/**
 * Page guard. Call at the top of every protected page.
 * Redirects to the login page when there is no valid session.
 * @returns {Promise<import('@supabase/supabase-js').Session|null>}
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.replace("/admin/login.html");
    return null;
  }
  return session;
}

/** Redirect away from the login page if already signed in. */
export async function redirectIfAuthed() {
  const session = await getSession();
  if (session) window.location.replace("/admin/dashboard.html");
}
