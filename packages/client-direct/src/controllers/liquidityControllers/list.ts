


import { RedisClient } from "@elizaos/adapter-redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL);
import { Request, Response } from "express";
import CetusProvider from "../../services/liquidityService/liquidityCetus";

export default async function listLiquidityPools(req: Request, res: Response) {

    let responseData = await redis.getValue({ key: "liquidity_pools" })
    if (responseData !== undefined) {
        res.status(200).json({
            code: "success",
            data: JSON.parse(responseData)
        });
        return;
    }
    let cetusProvider = new CetusProvider();
    let result: any = await cetusProvider.fetchLiquidityPools();
    res.status(200).json({
        code: "success",
        data: result.data.lp_list
    });
    return;

}
