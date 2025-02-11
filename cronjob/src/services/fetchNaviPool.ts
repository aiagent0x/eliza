import {getPoolInfo} from "navi-sdk";
import { elizaLogger } from "@elizaos/core"
import { listPoolsInFileJson ,pool} from "../helpers/searchPoolInFile";

import {RedisClient} from "@elizaos/adapter-redis";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL)
export const fetchNaviPool= async (job:any)  => {

    let responseData = await listPoolsInFileJson();
    // let getPools = await getPoolInfo(pool);
    let poolInfoArray = [];
    let index = 0;
    for (let key in pool) {
        if (pool.hasOwnProperty(key)) {

        let poolInfo
        if (pool[key]) {
            poolInfo = await getPoolInfo({
                symbol: key,
                address: pool[key].type,
                decimal:responseData[index]
            });
            // elizaLogger.info(poolInfo)
            poolInfoArray.push(poolInfo);
            responseData[index].total_supply = poolInfo.total_supply;
            responseData[index].total_borrow = poolInfo.total_borrow;
            responseData[index].base_supply_rate = poolInfo.base_supply_rate;
            responseData[index].base_borrow_rate = poolInfo.base_borrow_rate;
            responseData[index].boosted_supply_rate = poolInfo.boosted_supply_rate;
            responseData[index].boosted_borrow_rate = poolInfo.boosted_borrow_rate;
        } else {
            elizaLogger.error(`Pool information for key ${key} is undefined.`);
        }
        poolInfoArray.push(poolInfo);
        }
        index++;
    }
    redis.setValue({ key: "TOP_DEX", value: JSON.stringify(responseData) });
    return;

}