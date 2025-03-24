import { RedisClient } from "@elizaos/adapter-redis";

const redis = new RedisClient(process.env.REDIS_URL);

export async function saveMessage(agentId: string, roomId: string, message) {
    const key = `chat:${roomId}`;
    let bucketIndex = parseInt((await redis.hget({ agentId, key, field: "bucketCount" })) || "0");
    let bucketKey = bucketIndex.toString();
    let bucketData = await redis.hget({ agentId, key, field: bucketKey });
    let bucket = bucketData ? JSON.parse(bucketData) : [];
    if (bucket.length >= 20) {
        bucketIndex += 1;
        bucketKey = bucketIndex.toString();
        bucket = [];
        await redis.hset({ agentId, key, field: "bucketCount", value: bucketIndex.toString() });
    }
    bucket.push(message);
    await redis.hset({ agentId, key, field: bucketKey, value: JSON.stringify(bucket) });
    await expire(agentId, roomId)
    return;
}
export async function getMessages(agentId: string, roomId: string, bucketIndex: number) {
    const key = `chat:${roomId}`;
    const bucketData = await redis.hget({ agentId, key, field: bucketIndex.toString() });
    return bucketData ? JSON.parse(bucketData) : [];
}
export async function expire(agentId: string, roomId: string) {
    const key = `chat:${roomId}`;
    let seconds = 86400;
    await redis.expire({ agentId, key, seconds })
    return;
}