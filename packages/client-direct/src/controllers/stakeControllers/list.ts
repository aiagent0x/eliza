


import { RedisClient } from "@elizaos/adapter-redis";
import {
    elizaLogger,
} from "@elizaos/core";
import { listPoolsInFileJson, pool } from "../../services/stakeService/searchPoolInFile";
import { getPoolInfo } from "navi-sdk";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL);
import { Request, Response } from "express";

export default async function listStakes(req: Request, res: Response) {
    let data = await redis.hGetAll("STAKE_POOLS");

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
        res.status(200).json({
            code: "success",
            data: parsedData
        });
        return
    }

    let responseData = await listPoolsInFileJson();
    let index = 0;
    for (let key in pool) {
        if (pool.hasOwnProperty(key)) {
            let poolInfo;
            if (pool[key]) {
                poolInfo = await getPoolInfo({
                    symbol: key,
                    address: pool[key].type,
                    decimal: responseData[index].decimal,
                });
                responseData[index].name = key;
                responseData[index].total_supply = poolInfo.total_supply;
                responseData[index].total_borrow = poolInfo.total_borrow;
                responseData[index].base_supply_rate = poolInfo.base_supply_rate;
                responseData[index].base_borrow_rate = poolInfo.base_borrow_rate;
                responseData[index].boosted_supply_rate = poolInfo.boosted_supply_rate;
                responseData[index].boosted_borrow_rate = poolInfo.boosted_borrow_rate;
                responseData[index].type = "navi";
            } else {
                elizaLogger.error(`Pool information for key ${key} is undefined.`);
            }
        }
        index++;
    }
    responseData.sort(
        (a, b) =>
            parseFloat(b.base_supply_rate) + parseFloat(b.boosted_supply_rate) -
            (parseFloat(a.base_supply_rate) + parseFloat(a.boosted_supply_rate))
    );
    res.status(200).json({
        code: "success",
        data: responseData
    });
    return;

}
