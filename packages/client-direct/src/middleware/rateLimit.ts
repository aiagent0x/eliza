import { Request, Response, NextFunction } from 'express';
import { RedisClient } from "@elizaos/adapter-redis";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL);
const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // console.log("Oke vô middleware");
    let url = req.url;
    console.log("url", url);
    let parts = url.split("/");
    console.log("parts", parts);
    const key = `rate_limit:${parts.join(":")}`;
    // const current = await redis.hget(HASH_KEY, field);
    // const requestCount = current ? parseInt(current) : 0;

    // if (requestCount >= RATE_LIMIT) {
    //     return res.status(429).json({ message: "Too many requests. Please try again later." });
    // }

    // // Tăng số lượng request lên 1
    // const pipeline = redis.pipeline();
    // pipeline.hincrby(HASH_KEY, field, 1);

    // // Nếu lần đầu tiên truy cập, đặt thời gian hết hạn cho toàn bộ Hash Key
    // if (requestCount === 0) {
    //     pipeline.expire(HASH_KEY, WINDOW);
    // }

    // await pipeline.exec();
    next();
};

export default rateLimitMiddleware;