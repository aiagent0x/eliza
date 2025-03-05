import axios, { AxiosInstance } from "axios";
import { RedisClient } from "@elizaos/adapter-redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL);

const axiosInstance = axios.create({
  baseURL: "https://api.blockberry.one/sui/v1",
  timeout: 60000,
  headers: {
      'accept': '*/*',
      'content-type': 'application/json',
      'x-api-key': 'CNuyISwIxwPzvfB5fYsTp2ciJhWB0F' 
  }
});


async function fetchDex(job: any) {
  try {
    let data = await redis.getValue({ key: "TOP_DEX_BLOCK_BERRY" });
    if(data) return;
    const response = await axiosInstance.post(
      `/dex?page=0&size=20&orderBy=DESC&period=DAY&sortBy=CURRENT_TVL`,
      {
          withTvlOnly: false,
      }
  );

    await redis.setValue({ key: "TOP_DEX_BLOCK_BERRY", value: JSON.stringify(response.data.content), ttl: 300 });
    return;
  } catch (error) {
    console.error("Error fetching market data:", error);
    throw new Error("Failed to fetch market data");
  }
}

export { fetchDex };
