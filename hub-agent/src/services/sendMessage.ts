import axios, { AxiosInstance } from "axios";
import { RedisClient } from "@elizaos/adapter-redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL);

const axiosInstance: AxiosInstance = axios.create({
    baseURL: "http://localhost:3002/",
    timeout: 5000,
});

export async function sendMessage(
    job: any
) {
    try {
        const response = await axiosInstance.post(`/${job.agentA}/message`, {
            text: job.text,
            userId: job.agentB,
            roomId: job.roomId
        });
        
        return 
    } catch (error) {
        console.error("Error fetching market data:", error);
        throw new Error("Failed to fetch market data");
    }
}
