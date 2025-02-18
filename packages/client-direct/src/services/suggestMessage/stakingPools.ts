import { RedisClient } from "@elizaos/adapter-redis";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL)
export async function getStakingPools(agentName: string) {
    let data = await redis.hGetAll("STAKE_POOLS");
    let responseData;

    if (data && Object.keys(data).length > 0) {
        let parsedData: { [key: string]: string }[] = [];
        for (let key in data) {
            parsedData.push(JSON.parse(data[key]));
        }
        parsedData.sort((a, b) => {
            const aSupplyRate = parseFloat(a.base_supply_rate) + parseFloat(a.boosted_supply_rate);
            const bSupplyRate = parseFloat(b.base_supply_rate) + parseFloat(b.boosted_supply_rate);
            return bSupplyRate - aSupplyRate;
        });
        responseData = {
            user: agentName,
            text: "Below is a list of stake pools:",
            action: "STAKE_POOLS",
            result: {
                type: "stake_pools",
                data: parsedData.slice(0, 6),
            },
        };
    }

    return responseData;
}