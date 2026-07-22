import { Queue } from "bullmq";
import connection from "../config/redis.js";

const designQueue = new Queue("design-plan", {
    connection,
});

export default designQueue;