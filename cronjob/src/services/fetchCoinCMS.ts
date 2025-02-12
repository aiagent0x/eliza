import axios from 'axios';
import {RedisClient} from "@elizaos/adapter-redis";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL)
const api = axios.create({
  baseURL: "https://cms.rockee.ai/api/coin",
  timeout: 5000,
});


const getCoinAll = async (job: any) => {
  const url = '/get-coins';
  try {
    const categories = ["all", "trending", "gainers", "losers", "defi", "ai", "meme", "new", "others"];
    await Promise.all(categories.map(category => 
      api.get(url, { params: { category } }).then(response => {
      redis.hSet('coins_info', category, JSON.stringify(response.data), 3600);
      // redis.expire('coins_info', 3600); // Set TTL to 1 hour
      })
    ));
    return;
  } catch (error) {
    console.error(`Error fetching coin data:`, error.message);
    return null;
  }
};



export { getCoinAll};
