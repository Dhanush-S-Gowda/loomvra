import { Worker } from "bullmq";
import connection from "../config/redis.js";
import { generateDesignPlan } from "../jobs/design.job.js";
import { transitionStage } from "../storage/db.js";

const worker = new Worker(
  "design-plan",
  async (job) => {
    console.log(`[DesignWorker] Processing job ${job.id} for project ${job.data.projectId}`);
    await generateDesignPlan(job.data);
  },
  {
    connection,
    concurrency: 3,
  }
);

worker.on("completed", (job) => {
  console.log(`[DesignWorker] Completed job ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`[DesignWorker] Job ${job?.id} failed:`, err?.message || err);
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    transitionStage(job.data.projectId, "design", "failed", err?.message || String(err));
  }
});

worker.on("error", (err) => {
  // Prevent unhandled worker errors from terminating the process.
  console.error("[DesignWorker] Worker error:", err?.message || err);
});

console.log("[DesignWorker] Started");
