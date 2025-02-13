import { JobQueue, JobWorker } from "@elizaos/adapter-bullmq"; // Đảm bảo rằng bạn có file JobWorker.ts
import { elizaLogger } from "@elizaos/core";
import dotenv from "dotenv";
import { fetchTopDexByNetwork } from "./services/fetchTopDex";
import { fetchNaviPool } from "./services/fetchNaviPool";
import { getCoinAll } from "./services/fetchCoinCMS";
import { fetchLiquidityPools } from "./services/fetchCetus";
dotenv.config();

const QUEUE_NAME = process.env.QUEUE_NAME || "cronjob";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const jobQueue = new JobQueue(QUEUE_NAME, REDIS_URL);

const scheduledJobs = [
    { jobName: "fetchSuiDex", data: {}, cron: "*/5 * * * *" }, // run every 5 minutes
    { jobName: "fetchNaviPool", data: {}, cron: "*/5 * * * *" }, // run every 5 minutes
    { jobName: "fetchCoinCMS", data: {}, cron: "*/5 * * * *" },  // run every 5 minutes
    { jobName: "fetchLiquidityPoolsCetus", data: {}, cron: "*/5 * * * *" },  // run every 5 minute
];

(async () => {
    for (const job of scheduledJobs) {
        await jobQueue.addJob(job.jobName, job.data, { repeat: { cron: job.cron } });
    }
})();

const startWorker = () => {
    const worker = new JobWorker(QUEUE_NAME, REDIS_URL);

    worker.registerJob("fetchSuiDex", fetchTopDexByNetwork);
    worker.registerJob("fetchNaviPool", fetchNaviPool);
    worker.registerJob("fetchCoinCMS", getCoinAll);
    worker.registerJob("fetchLiquidityPoolsCetus", fetchLiquidityPools);
    elizaLogger.info("🚀 Worker & Scheduler running...");
};

startWorker();
