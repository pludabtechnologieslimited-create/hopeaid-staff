import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const ORIGIN = "https://staff.hopeaid.ngo";
const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
function respond(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed" });
  const auth = req.headers.get("authorization") || "";
  const match = /^Bearer ([^\s]+)$/.exec(auth);
  if (!match) return respond(401, { error: "Sign in required" });
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return respond(503, { error: "Staff administration is not configured" });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data: actor, error: authError } = await admin.auth.getUser(match[1]);
    if (authError || !actor.user) return respond(401, { error: "Your session is invalid or expired" });
    const { data: profile, error: profileError } = await admin.from("staff_profiles")
      .select("role,is_active").eq("id", actor.user.id).maybeSingle();
    if (profileError || !profile || !profile.is_active || profile.role !== "super_admin") {
      return respond(403, { error: "Only an active Super Admin can create staff accounts" });
    }
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const full_name = String(body?.full_name || "").trim();
    const department = String(body?.department || "").trim();
    const job_title = String(body?.job_title || "").trim();
    const role = String(body?.role || "staff");
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return respond(400, { error: "Enter a valid email address" });
    if (password.length < 12 || password.length > 128) return respond(400, { error: "Initial password must be between 12 and 128 characters" });
    if (full_name.length < 2 || full_name.length > 120 || department.length > 120 || job_title.length > 120) {
      return respond(400, { error: "Check the staff name, title and department lengths" });
    }
    if (!["staff", "manager", "admin"].includes(role)) return respond(400, { error: "Invalid staff role" });
    const created = await admin.auth.admin.createUser({
      email, password, email_confirm: true
    });
    if (created.error || !created.data.user) return respond(400, { error: created.error?.message || "Could not create staff login" });
    const id = created.data.user.id;
    const saved = await admin.from("staff_profiles").insert({
      id, email, full_name, job_title: job_title || null, department: department || null, role, is_active: true
    });
    if (saved.error) {
      const cleanup = await admin.auth.admin.deleteUser(id);
      console.error("Staff profile creation failed", saved.error.message, "cleanup", cleanup.error?.message || "ok");
      return respond(500, { error: "Staff profile could not be created. Contact an administrator." });
    }
    return respond(201, { ok: true, staff: { id, email, full_name, role } });
  } catch (error) {
    console.error("Create staff error", error instanceof Error ? error.message : "unknown");
    return respond(500, { error: "Unable to create staff account" });
  }
});