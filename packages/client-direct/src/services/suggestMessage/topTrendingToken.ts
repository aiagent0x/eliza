import { RedisClient } from "@elizaos/adapter-redis";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL);

export async function getTopTrendingTokens(agentName: string) {
    const result = await redis.hGet("coins_info", "trending");
    const responseData = {
        user: agentName,
        text: "Below are trending coins we have collected:",
        action: "TOP_TRENDING_TOKENS",
        result: {
            type: "sui_trending_tokens",
            data: JSON.parse(result).data.map((token: any) => ({
                name: token.name,
                symbol: token.symbol.toUpperCase(),
                price: token.price,
                market_cap: token.cap,
                price_change_24h: token.change24h,
                type: token.address,
                iconUrl: token.logo
            }))
        }
    };
    return responseData;
}