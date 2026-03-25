import cron from "node-cron";
import http from "http";
import client from "prom-client";
import { aggregateMetrics } from "./jobs/aggregateMetrics";
import { ruleBasedScoring } from "./jobs/ruleBasedScoring";
import { llmAnalysis } from "./jobs/llmAnalysis";
import { cohortDetection } from "./jobs/cohortDetection";
import { weeklyDigest } from "./jobs/weeklyDigest";

console.log("Batch processor started");

// Prometheus Metrics Setup
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const jobDuration = new client.Histogram({
  name: 'batch_job_duration_seconds',
  help: 'Duration of batch jobs in seconds',
  labelNames: ['job_name'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300]
});
register.registerMetric(jobDuration);

const jobErrors = new client.Counter({
  name: 'batch_job_errors_total',
  help: 'Total number of failed batch jobs',
  labelNames: ['job_name']
});
register.registerMetric(jobErrors);

// Helper to wrap jobs with metrics
async function runJob(name: string, jobFn: () => Promise<void>) {
  const end = jobDuration.startTimer({ job_name: name });
  try {
    await jobFn();
  } catch (error) {
    jobErrors.inc({ job_name: name });
    console.error(`Job ${name} failed:`, error);
  } finally {
    end();
  }
}

// Health check and Metrics server
const PORT = process.env.PORT || 8080;
const server = http.createServer(async (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  } else if (req.url === "/metrics") {
    try {
      res.writeHead(200, { "Content-Type": register.contentType });
      res.end(await register.metrics());
    } catch (ex) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(ex instanceof Error ? ex.message : String(ex));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Hourly: Aggregate metrics
cron.schedule("0 * * * *", async () => {
  console.log("Running hourly metrics aggregation...");
  await runJob("aggregateMetrics", aggregateMetrics);
});

// Daily at 2 AM: Rule-based scoring
cron.schedule("0 2 * * *", async () => {
  console.log("Running daily rule-based scoring...");
  await runJob("ruleBasedScoring", ruleBasedScoring);
});

// Weekly on Monday at 3 AM: LLM analysis
cron.schedule("0 3 * * 1", async () => {
  console.log("Running weekly LLM analysis...");
  await runJob("llmAnalysis", llmAnalysis);
});

// Weekly on Monday at 5 AM: Cohort detection
cron.schedule("0 5 * * 1", async () => {
  console.log("Running weekly cohort detection...");
  await runJob("cohortDetection", cohortDetection);
});

// Weekly on Monday at 8 AM: Weekly Email Digest
cron.schedule("0 8 * * 1", async () => {
  console.log("Running weekly email digest...");
  await runJob("weeklyDigest", weeklyDigest);
});

// Keep process running
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
