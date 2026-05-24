import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-training-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function asInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asIsoDate(value: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date().toISOString().slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expectedToken = Deno.env.get("TRAINING_INGEST_TOKEN");
  const receivedToken = req.headers.get("x-training-token") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expectedToken || receivedToken !== expectedToken) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ ok: false, error: "missing_supabase_env" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => null);
  const raw = body?.raw || {};
  const sessionDate = asIsoDate(raw.date || body?.date);
  const ownerKey = Deno.env.get("TRAINING_OWNER_KEY") || "brian";

  const row = {
    owner_key: ownerKey,
    session_date: sessionDate,
    week: asInt(raw.week),
    day: raw.day || body?.day || null,
    activity_template: raw.activityTemplate || null,
    title: raw.title || null,
    type: raw.type || null,
    sleep: asInt(raw.sleep),
    readiness: asInt(raw.readiness),
    pain: raw.pain || null,
    bodyweight: raw.bodyweight || null,
    watch_duration: raw.watchDuration || null,
    watch_calories: raw.watchCalories || null,
    watch_avg_hr: raw.watchAvgHr || null,
    watch_distance: raw.watchDistance || null,
    cardio_entries: Array.isArray(raw.cardioEntries) ? raw.cardioEntries : [],
    exercises: Array.isArray(raw.exercises) ? raw.exercises : [],
    notes: raw.notes || null,
    summary: body?.summary || null,
    raw,
    submitted_at: body?.submittedAt || new Date().toISOString(),
    client_saved_at: raw.savedAt || null,
    updated_at: new Date().toISOString(),
  };

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("training_sessions")
    .upsert(row, { onConflict: "owner_key,session_date" })
    .select("id, session_date, updated_at")
    .single();

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, session: data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
