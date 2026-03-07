import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelemetryEvent {
  user_id: string;
  session_id: string;
  timestamp: string;
  event_type: string;
  platform: string;
  model?: string;
  prompt_encrypted?: string;
  response_encrypted?: string;
  metadata?: Record<string, unknown>;
}

export const handler = async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const events: TelemetryEvent[] = await req.json();

    // Validate events
    const validEvents = events.filter(
      (e) => e.user_id && e.session_id && e.timestamp && e.event_type && e.platform
    );

    if (validEvents.length === 0) {
      return new Response(JSON.stringify({ error: "No valid events" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert events
    const { error } = await supabase.from("events").insert(validEvents);

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, count: validEvents.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

if (import.meta.main) {
  serve(handler);
}
