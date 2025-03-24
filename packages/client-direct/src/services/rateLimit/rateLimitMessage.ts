

import {
    type AgentRuntime,
    elizaLogger,
} from "@elizaos/core";
import { RedisClient } from "@elizaos/adapter-redis";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL);
export default async function rateLimitMessage(
    userId: string,
    roomId: string
) {
    const key = `rate_limit_api_message_${userId}_${roomId}`;
    let script = `
  local current = redis.call("INCR", KEYS[1])
  if current == 1 then
    redis.call("EXPIRE", KEYS[1], ARGV[1])
  end
  if current > tonumber(ARGV[2]) then
    return 0
  end
  return current
`
    try {
        const currentRequests = await redis.eval({
            script: script,
            keys: [key],
            args: ["86400", "10"]
        });
        console.log("key:",key);
        console.log("currentRequests:",currentRequests);
        if (currentRequests === 0) {
            return "too_many_request"
        }
        return true
    } catch (error) {
        console.error("Redis error:", error);
        return false;
    }
}