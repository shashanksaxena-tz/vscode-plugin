import { createClient } from "../utils/supabase";

export async function aggregateMetrics() {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];

  console.log(`Aggregating metrics for ${today}...`);

  const { error } = await supabase.rpc("aggregate_daily_metrics", {
    target_date: today,
  });

  if (error) {
    console.error("Failed to aggregate metrics:", error);
  } else {
    console.log("Metrics aggregation complete.");
  }
}
