import { createClient } from "npm:@supabase/supabase-js@2";

const canonicalOrigin = "https://kancelio.pl";

Deno.serve(async (request) => {
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET" } });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const [specialists, offices] = await Promise.all([
      supabase.from("specialist_profiles").select("slug,updated_at").eq("is_published", true).eq("moderation_status", "verified"),
      supabase.from("notary_offices").select("slug,updated_at").eq("is_published", true).eq("moderation_status", "verified"),
    ]);
    if (specialists.error) throw specialists.error;
    if (offices.error) throw offices.error;
    const rows = [...(specialists.data ?? []), ...(offices.data ?? [])]
      .filter((row) => /^[a-z0-9-]+$/.test(row.slug))
      .sort((a, b) => a.slug.localeCompare(b.slug));
    const urls = rows.map((row) => `  <url><loc>${canonicalOrigin}/specjalista/${row.slug}</loc><lastmod>${new Date(row.updated_at).toISOString()}</lastmod></url>`).join("\n");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
    return new Response(xml, { status: 200, headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=900" } });
  } catch (error) {
    console.error(error);
    return new Response("Unable to build sitemap", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
});
