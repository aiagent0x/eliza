


import { RedisClient } from "@elizaos/adapter-redis";
import {
    elizaLogger,
} from "@elizaos/core";
import { listPoolsInFileJson, pool } from "../../services/stakeService/searchPoolInFile";
import { getPoolInfo, getPoolsInfo, getPoolApy } from "navi-sdk";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL);
import { Request, Response } from "express";
import ScallopProvider from "../../services/stakeService/stakeScallop";
import { listPool } from "../../services/stakeService/fetchSuilend/listPools";
import BigNumber from "bignumber.js";
export default async function listStakes(req: Request, res: Response) {
    let parsedData: { [key: string]: string }[] = [];
    let poolsScallopData: { [key: string]: string }[] = [];
    let poolsSuilendData: { [key: string]: string }[] = [];
    let data = await redis.hGetAll("STAKE_NAVI_POOLS");
    let dataScallop = await redis.hGetAll("STAKE_POOLS_SCALLOP");
    let dataSuilend = await redis.hGetAll("STAKE_POOLS_SUILEND")
    if (data && Object.keys(data).length > 0) {
        for (let key in data) {
            parsedData.push(JSON.parse(data[key]));
        }
    }
    if (dataScallop && Object.keys(dataScallop).length > 0) {
        for (let key in dataScallop) {
            poolsScallopData.push(JSON.parse(dataScallop[key]));
        }
    }
    if (dataSuilend && Object.keys(dataSuilend).length > 0) {
        for (let key in dataSuilend) {
            poolsSuilendData.push(JSON.parse(dataSuilend[key]));
        }
    }
    if ((parsedData && parsedData.length > 0) || (poolsScallopData && poolsScallopData.length > 0) || (poolsSuilendData && poolsSuilendData.length > 0)) {
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
    let responseData = [];
    const listSuilendPools = await listPool()
    const scallopProvider = new ScallopProvider();
    const listScallopPools = await scallopProvider.listPools();
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
    responseData = responseData.concat(listScallopPools, listSuilendPools, listPoolsNavi);
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
