import { Queue } from "bullmq";
import connection from "../config/redis.js";

const slidesQueue = new Queue("slides-generation", {
    connection,
});

export default slidesQueue;