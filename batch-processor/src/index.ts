import cron from "node-cron";
import { aggregateMetrics } from "./jobs/aggregateMetrics";
import { ruleBasedScoring } from "./jobs/ruleBasedScoring";
import { llmAnalysis } from "./jobs/llmAnalysis";
import { cohortDetection } from "./jobs/cohortDetection";

console.log("Batch processor started");

// Hourly: Aggregate metrics
cron.schedule("0 * * * *", async () => {
  console.log("Running hourly metrics aggregation...");
  await aggregateMetrics();
});

// Daily at 2 AM: Rule-based scoring
cron.schedule("0 2 * * *", async () => {
  console.log("Running daily rule-based scoring...");
  await ruleBasedScoring();
});

// Weekly on Monday at 3 AM: LLM analysis
cron.schedule("0 3 * * 1", async () => {
  console.log("Running weekly LLM analysis...");
  await llmAnalysis();
});

// Weekly on Monday at 5 AM: Cohort detection
cron.schedule("0 5 * * 1", async () => {
  console.log("Running weekly cohort detection...");
  await cohortDetection();
});

// Keep process running
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down...");
  process.exit(0);
});
