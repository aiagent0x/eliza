import { getPoolInfo, getPoolsInfo } from "navi-sdk";
import { elizaLogger } from "@elizaos/core"
import { listPoolsInFileJson, pool } from "../helpers/searchPoolInFile";
import { RedisClient } from "@elizaos/adapter-redis";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL)
export const fetchNaviPool = async (job: any) => {
    let responseData = await listPoolsInFileJson();
    let index = 0;
    for (let key in pool) {
        if (pool.hasOwnProperty(key)) {
            let poolInfo;
            if (pool[key]) {
                poolInfo = await getPoolInfo({
                    symbol: key,
                    address: pool[key].type,
                    decimal: responseData[index].decimal
                });
                console.log("poolInfo:", poolInfo)
                responseData[index].name = key;
                responseData[index].total_supply = poolInfo.total_supply;
                responseData[index].token_price = poolInfo.tokenPrice;
                responseData[index].total_borrow = poolInfo.total_borrow;
                responseData[index].base_supply_rate = poolInfo.base_supply_rate;
                responseData[index].base_borrow_rate = poolInfo.base_borrow_rate;
                responseData[index].boosted_supply_rate = poolInfo.boosted_supply_rate;
                responseData[index].boosted_borrow_rate = poolInfo.boosted_borrow_rate;
                responseData[index].total_supply_rate = (poolInfo.boosted_supply_rate && poolInfo.boosted_borrow_rate) ? parseFloat(poolInfo.base_supply_rate) + parseFloat(poolInfo.boosted_supply_rate) : 0
                responseData[index].protocol = "navi";
            } else {
                elizaLogger.error(`Pool information for key ${key} is undefined.`);
            }
        }
        index++;
    }
    let listPoolsNaviOnSite = await getPoolsInfo()
    for (let i = 0; i < responseData.length; i++) {
        if (responseData[i].type === "0x2::sui::SUI") {
            responseData[i].typeCoin = "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI";
        } else {
            responseData[i].typeCoin = responseData[i].type;
        }

        for (let j = 0; j < listPoolsNaviOnSite.length; j++) {
            if (`0x${listPoolsNaviOnSite[j].coinType}` === responseData[i].typeCoin) {
                delete responseData[i].base_supply_rate;
                delete responseData[i].total_supply_rate;
                responseData[i].base_supply_rate = listPoolsNaviOnSite[j].supplyIncentiveApyInfo.apy;
                responseData[i].total_supply_rate = listPoolsNaviOnSite[j].supplyIncentiveApyInfo.apy;
            }
        }
        delete responseData[i].typeCoin;
    }
    for (let data of responseData) {
        const success = await redis.hSet("STAKE_POOLS", data.name.toLowerCase(), JSON.stringify(data), 300);
        if (!success) {
            elizaLogger.error(`Failed to set data for pool ${data.name} in Redis.`);
        }
    }
    return;

}