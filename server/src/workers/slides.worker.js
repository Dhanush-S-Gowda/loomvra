import { Worker } from "bullmq";
import connection from "../config/redis.js";
import { generateSlides } from "../jobs/slides.job.js";
import { transitionStage } from "../storage/db.js";

const worker = new Worker(
    "slides-generation",
    async (job) => {
        console.log(`[SlidesWorker] Processing job ${job.id} for project ${job.data.projectId}`);
        await generateSlides(job.data);
    },
    {
        connection,
        concurrency: 3,
    }
);

worker.on("completed", (job) => {
    console.log(`[SlidesWorker] Completed job ${job.id}`);
});

worker.on("failed", (job, err) => {
    console.error(`[SlidesWorker] Job ${job?.id} failed:`, err?.message || err);
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
        transitionStage(job.data.projectId, "slides", "failed", err?.message || String(err));
    }
});

worker.on("error", (err) => {
    // Prevent unhandled worker errors from terminating the process.
    console.error("[SlidesWorker] Worker error:", err?.message || err);
});

console.log("[SlidesWorker] Started");
