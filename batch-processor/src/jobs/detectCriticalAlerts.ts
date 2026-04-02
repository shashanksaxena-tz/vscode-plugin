import { createClient } from "../utils/supabase";
import { subHours } from "date-fns";

export async function detectCriticalAlerts() {
  console.log("Running critical alerts detection...");
  const supabase = createClient();
  const oneHourAgo = subHours(new Date(), 1);

  // Fetch events from the last hour
  const { data: events, error } = await supabase
    .from("events")
    .select("user_id, metadata")
    .gte("timestamp", oneHourAgo.toISOString());

  if (error) {
    console.error("Error fetching events for critical alerts:", error);
    return;
  }

  if (!events || events.length === 0) return;

  // Track users who triggered critical alerts this run so we don't spam them
  const alertedUsers = new Set<string>();

  for (const event of events) {
    if (alertedUsers.has(event.user_id)) continue;

    // The design document specifically says: "Harmful patterns detected (e.g., 5+ retries on same prompt)"
    const metadata = event.metadata as any;
    if (metadata && typeof metadata.retry_count === 'number' && metadata.retry_count >= 5) {
      alertedUsers.add(event.user_id);

      const message = `Critical Alert: You have reached ${metadata.retry_count} retries on a single prompt. Consider breaking down your complex task or providing more context.`;

      const { error: insertError } = await supabase.from("notifications").insert({
        user_id: event.user_id,
        message,
        type: "critical_alert",
      });

      if (insertError) {
        console.error(`Failed to insert notification for ${event.user_id}:`, insertError);
      } else {
        console.log(`Created critical alert notification for ${event.user_id}`);
      }
    }
  }
}
