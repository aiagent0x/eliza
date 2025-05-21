import { getPoolInfo, getPoolsInfo } from "navi-sdk";
import { elizaLogger } from "@elizaos/core"
import { listPoolsInFileJson, pool } from "../helpers/searchPoolInFile";
import { RedisClient } from "@elizaos/adapter-redis";
import BigNumber from "bignumber.js";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL)
export const fetchNaviPool = async (job: any) => {
    let listPoolsNaviOnSite = await getPoolsInfo();
    let listPoolsNavi = await listPoolsInFileJson();
    if (listPoolsNaviOnSite !== null && listPoolsNaviOnSite.length > 0) {
        for (let i = 0; i < listPoolsNavi.length; i++) {
            if (listPoolsNavi[i].type === "0x2::sui::SUI") {
                listPoolsNavi[i].typeCoin = "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI";
            } else {
                listPoolsNavi[i].typeCoin = listPoolsNavi[i].type;
            }
            for (let j = 0; j < listPoolsNaviOnSite.length; j++) {
                if (`0x${listPoolsNaviOnSite[j].coinType}` === listPoolsNavi[i].typeCoin) {
                    listPoolsNavi[i].total_supply = new BigNumber(listPoolsNaviOnSite[j].totalSupplyAmount).dividedBy(1e9).toString();
                    listPoolsNavi[i].total_borrow = new BigNumber(listPoolsNaviOnSite[j].borrowedAmount).dividedBy(1e9).toString();
                    listPoolsNavi[i].base_supply_rate = new BigNumber(listPoolsNaviOnSite[j].currentSupplyRate).dividedBy(1e9).toString();
                    listPoolsNavi[i].base_borrow_rate = new BigNumber(listPoolsNaviOnSite[j].currentBorrowRate).dividedBy(1e9).toString();
                    listPoolsNavi[i].boosted_supply_rate = new BigNumber(listPoolsNaviOnSite[j].supplyIncentiveApyInfo.boostedApr).toString();
                    listPoolsNavi[i].boosted_borrow_rate = new BigNumber(listPoolsNaviOnSite[j].borrowIncentiveApyInfo.boostedApr).toString();
                    listPoolsNavi[i].base_supply_rate = listPoolsNaviOnSite[j].supplyIncentiveApyInfo.apy;
                    listPoolsNavi[i].total_supply_rate = listPoolsNaviOnSite[j].supplyIncentiveApyInfo.apy;
                    listPoolsNavi[i].protocol = "navi";
                }
            }
            delete listPoolsNavi[i].typeCoin;
        }
    }
    else {
        listPoolsNavi = [];
    }
    for (let data of listPoolsNavi) {
        const success = await redis.hSet("STAKE_POOLS", data.name.toLowerCase(), JSON.stringify(data), 300);
        if (!success) {
            elizaLogger.error(`Failed to set data for pool ${data.name} in Redis.`);
        }
    }
    return;

}