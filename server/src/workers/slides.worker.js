import { Worker } from "bullmq";
import connection from "../config/redis.js";
import { generateSlides } from "../jobs/slides.job.js";

const worker = new Worker(
    "slides-generation",

    async job => {
        console.log(`[SlidesWorker] Processing job ${job.id} for project ${job.data.projectId}`);
        await generateSlides(job.data);
    },

    {
        connection,
        concurrency: 3,
    }
);

worker.on("completed", job => {
    console.log(`[SlidesWorker] Completed job ${job.id}`);
});

worker.on("failed", (job, err) => {
    console.error(`[SlidesWorker] Job ${job?.id} failed:`, err.message);
});

console.log("[SlidesWorker] Started");