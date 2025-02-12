import { JobQueue, JobWorker } from "@elizaos/adapter-bullmq"; // Đảm bảo rằng bạn có file JobWorker.ts
import { elizaLogger } from "@elizaos/core";
import dotenv from "dotenv";
import {fetchTopDexByNetwork} from "./services/fetchTopDex"
import { fetchNaviPool } from "./services/fetchNaviPool";
import {getCoinAll} from "./services/fetchCoinCMS"
dotenv.config();
const QUEUE_NAME = process.env.QUEUE_NAME || "cronjob";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const jobQueue = new JobQueue(QUEUE_NAME, REDIS_URL);

const scheduledJobs = [
    { jobName: "fetchSuiDex", data: {}, cron: "*/15 * * * *" }, // run every 15 minutes
    { jobName: "fetchNaviPool", data: {}, cron: "0 * * * *" }, // run every hour
    { jobName: "fetchCoinCMS", data: {}, cron: "* * * * *" }, // run every minute
];
(async () => {
    for (const job of scheduledJobs) {
        await jobQueue.addJob(job.jobName, job.data, { repeat: { cron: job.cron } });
    }
})();
const worker = new JobWorker(QUEUE_NAME, REDIS_URL);

worker.registerJob("fetchSuiDex", fetchTopDexByNetwork);
worker.registerJob("fetchNaviPool", fetchNaviPool);
worker.registerJob("fetchCoinCMS", getCoinAll);
elizaLogger.info("🚀 Worker & Scheduler running...");
