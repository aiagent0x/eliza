import axios, { AxiosInstance } from "axios";
import { RedisClient } from "@elizaos/adapter-redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL);

const axiosInstance: AxiosInstance = axios.create({
    baseURL: "https://api-sui.cetus.zone/v2/sui",
    timeout: 5000,
});

export async function fetchLiquidityPools(
    job: any
) {
    try {
        const response = await axiosInstance.get("/stats_pools", {
            params: {
                is_vaults:false,
                display_all_pools:false,
                has_mining:true,
                has_farming:true,
                no_incentives:true,
                order_by:"-tvl",
                limit:30,
                offset:0,
            },
        });
        await redis.setValue({ key: 'liquidity_pools', value: JSON.stringify(response.data.lp_list), ttl: 300 });
       
    } catch (error) {
        console.error("Error fetching market data:", error);
        throw new Error("Failed to fetch market data");
    }
}
