


import { RedisClient } from "@elizaos/adapter-redis";
import {
    elizaLogger,
} from "@elizaos/core";
import { listPoolsInFileJson, pool } from "../../services/stakeService/searchPoolInFile";
import { getPoolInfo, getPoolsInfo } from "navi-sdk";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL);
import { Request, Response } from "express";
import ScallopProvider from "../../services/stakeService/stakeScallop";
import { listPool } from "../../services/stakeService/fetchSuilend/listPools";

export default async function listStakes(req: Request, res: Response) {

    let data = await redis.hGetAll("STAKE_POOLS");
    let dataScallop = await redis.hGetAll("STAKE_POOLS_SCALLOP");
    let dataSuilend = await redis.hGetAll("STAKE_POOLS_SUILEND")
    if (data && Object.keys(data).length > 0 && dataScallop && Object.keys(dataScallop).length > 0 && dataSuilend && Object.keys(dataSuilend).length > 0) {
        let parsedData: { [key: string]: string }[] = [];
        for (let key in data) {
            parsedData.push(JSON.parse(data[key]));
        }
        let poolsScallopData: { [key: string]: string }[] = [];
        for (let key in dataScallop) {
            poolsScallopData.push(JSON.parse(dataScallop[key]));
        }
        let poolsSuilendData: { [key: string]: string }[] = [];
        for (let key in dataSuilend) {
            poolsSuilendData.push(JSON.parse(dataSuilend[key]));
        }
        parsedData = parsedData.concat(poolsScallopData, poolsSuilendData);
        parsedData.sort(
            (a: any, b: any) =>
                b.total_supply_rate - a.total_supply_rate
        );
        res.status(200).json({
            code: "success",
            data: parsedData
        });
        return
    }
    const listSuilendPools = await listPool()
    const scallopProvider = new ScallopProvider();
    const listScallopPools = await scallopProvider.listPools();

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
                responseData[index].token_price = poolInfo.tokenPrice;
                responseData[index].total_borrow = poolInfo.total_borrow;
                responseData[index].base_supply_rate = poolInfo.base_supply_rate;
                responseData[index].base_borrow_rate = poolInfo.base_borrow_rate;
                responseData[index].boosted_supply_rate = poolInfo.boosted_supply_rate;
                responseData[index].boosted_borrow_rate = poolInfo.boosted_borrow_rate;
                responseData[index].total_supply_rate = parseFloat(poolInfo.base_supply_rate) + parseFloat(poolInfo.boosted_supply_rate);
                responseData[index].protocol = "navi";
            } else {
                elizaLogger.error(`Pool information for key ${key} is undefined.`);
            }
        }
        index++;
    }
    let listPoolsNaviOnSite = await getPoolsInfo();
    if (listPoolsNaviOnSite.length>0 && listPoolsNaviOnSite) {
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
    }
    responseData = responseData.concat(listScallopPools, listSuilendPools);
    responseData.sort(
        (a, b) =>
            b.total_supply_rate - a.total_supply_rate
    );
    res.status(200).json({
        code: "success",
        data: responseData
    });
    return;

}
