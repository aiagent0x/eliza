import { Request, Response, NextFunction } from 'express';
import { RedisClient } from "@elizaos/adapter-redis";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL);
export default async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    let url = req.url;
    console.log("url:", url);
    const key = `rate_limit_api_${url}`;
    const listAPIRateLimit = [
        {
            "api": "/swarm-tranning/start",
            "max-request": "1",
            "time": "3600"
        },
    ];
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
        const apiRateLimit = listAPIRateLimit.find((item) => item.api === url);
        if (!apiRateLimit) {
            return next(); // Skip rate limiting if no matching API is found
        }
        const currentRequests = await redis.eval({
            script: script,
            keys: [key],
            args: [apiRateLimit.time, apiRateLimit['max-request']]
        });
        console.log("currentRequests:", currentRequests)
        if (currentRequests === 0) {
            return res.status(429).json({ message: "You can only call this function once per hour." });
        }
        next();
    } catch (error) {
        console.error("Redis error:", error);
        res.status(500).json({ message: "Server Error!" });
    }

};

