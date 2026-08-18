import { createClient } from "npm:@supabase/supabase-js@2";

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function isAllowedOrigin(origin: string | null) {
  if (!origin) return false;
  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  const cors = corsHeaders(origin);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...jsonHeaders, ...cors } });
  if (!isAllowedOrigin(origin)) return new Response(JSON.stringify({ error: "Origin not allowed" }), { status: 403, headers: { ...jsonHeaders, ...cors } });

  try {
    const { profileId, turnstileToken } = await request.json();
    if (
      typeof profileId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profileId) ||
      typeof turnstileToken !== "string" || turnstileToken.length === 0 || turnstileToken.length > 2048
    ) {
      return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { ...jsonHeaders, ...cors } });
    }

    const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!secret) throw new Error("Turnstile is not configured");
    const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: turnstileToken, remoteip: request.headers.get("CF-Connecting-IP") ?? undefined }),
    });
    const verificationResult = await verification.json();
    const expectedHostname = new URL(origin ?? "http://invalid").hostname;
    if (!verificationResult.success || verificationResult.action !== "reveal_specialist_contact" || verificationResult.hostname !== expectedHostname) {
      return new Response(JSON.stringify({ error: "Verification failed" }), { status: 403, headers: { ...jsonHeaders, ...cors } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const { data: profile, error: profileError } = await supabase
      .from("specialist_profiles")
      .select("id")
      .eq("id", profileId)
      .eq("is_published", true)
      .eq("moderation_status", "verified")
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: { ...jsonHeaders, ...cors } });

    const { data: contact, error: contactError } = await supabase
      .from("specialist_contacts")
      .select("street_address, postal_code, email, phone")
      .eq("profile_id", profileId)
      .single();
    if (contactError) throw contactError;
    return new Response(JSON.stringify({ contact }), { status: 200, headers: { ...jsonHeaders, ...cors } });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Unable to reveal contact" }), { status: 400, headers: { ...jsonHeaders, ...cors } });
  }
});
