import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

function cors(request: Request) {
  const origin = request.headers.get("origin") || "";
  const allowed = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "null";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

async function hash(value: string) {
  const data = new TextEncoder().encode(`${Deno.env.get("LOOKUP_RATE_LIMIT_SALT")}:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  const headers = cors(request);
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405, headers });
  try {
    const { studentId } = await request.json();
    if (!/^\d{8,9}$/.test(String(studentId || ""))) {
      return Response.json({ error: "Invalid university ID." }, { status: 400, headers });
    }
    const ip = (request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: allowed, error: limitError } = await supabase.rpc("consume_lookup_limit", { p_ip_hash: await hash(ip) });
    if (limitError) throw limitError;
    if (!allowed) return Response.json({ error: "Too many lookup attempts. Try again later." }, { status: 429, headers });
    const { data, error } = await supabase.from("student_course_rooms").select("course_code, room").eq("student_id", String(studentId));
    if (error) throw error;
    if (!data?.length) return Response.json({ error: "No schedule was found for this university ID." }, { status: 404, headers });
    return Response.json({ courses: data.map((row) => ({ code: row.course_code, room: row.room })) }, { headers });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Lookup service is temporarily unavailable." }, { status: 500, headers });
  }
});
