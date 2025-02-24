import { RedisClient } from "@elizaos/adapter-redis";
import { CmsProvider } from "../services/CMS/cmsProvider";
import ScallopProvider from "../services/stakeService/stakeScallop";
import { listPoolsInFileJson, pool } from "../services/stakeService/searchPoolInFile";
import { getPoolInfo } from "navi-sdk";
import {
    elizaLogger,
} from "@elizaos/core";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let redis = new RedisClient(REDIS_URL)

const tagging = ["swap_1_sui_to_usdc", "send_1_sui_to_address", "trending_tokens", "stake_pools"]

export async function filterByTagging(tag: string, agentName: string) {
    console.log(agentName)
    tag = tag.trim().toLowerCase();
    const text = tagging.find(t => t.replace(/\s+/g, '_') === tag.replace(/\s+/g, '_'));
    let responseData;
    let result;
    if (!text) return null;
    switch (text) {
        case "swap_1_sui_to_usdc":
            responseData = {
                user: agentName,
                "text": agentName === "BIRDS DEFAI Platfrom" ? "Double-check all the details before takeoff to dodge any turbulence!" : "Please ensure all details are correct before proceeding with the swap to prevent any losses.",
                "result": {
                    "type": "swap",
                    "data": {
                        "amount": "0",
                        "fromToken": {
                            "objectId": "0x9258181f5ceac8dbffb7030890243caed69a9599d2886d957a9cb7656af3bdb3",
                            "type": "0x2::sui::SUI",
                            "decimals": 9,
                            "symbol": "SUI",
                            "name": "Sui",
                            "iconUrl": "https://strapi-dev.scand.app/uploads/sui_c07df05f00.png",
                            "verified": true
                        },
                        "toToken": {
                            "objectId": "0x8a775c4bbc9639c88e86fdc624bb30d0bfd22a1597b03da29198de214ddaa126",
                            "type": "0x909cba62ce96d54de25bec9502de5ca7b4f28901747bbf96b76c2e63ec5f1cba::coin::COIN",
                            "decimals": 8,
                            "symbol": "USDC",
                            "name": "USD Coin (Portal from BSC)",
                            "iconUrl": "https://co3xbx3vz2ww7tcs2tp4p36hdnkz677tuvqt6wgyfyoeefj6or6a.arweave.net/E7dw33XOrW_MUtTfx-_HG1Wff_OlYT9Y2C4cQhU-dHw",
                            "verified": true,
                            "bridgeProject": "Wormhole",
                            "tags": [
                                "Bridged"
                            ]
                        }
                    }
                }
            }
            break;
        case "send_1_sui_to_address":
            responseData = {
                user: agentName,
                "text": agentName === "BIRDS DEFAI Platfrom" ? "Double-check all the details before takeoff to dodge any turbulence!" : "Please ensure all details are correct before proceeding with the swap to prevent any losses.",
                "result": {
                    "type": "send_sui_chain",
                    "data": {
                        "amount": "0",
                        "token_info": {
                            "objectId": "0x9258181f5ceac8dbffb7030890243caed69a9599d2886d957a9cb7656af3bdb3",
                            "type": "0x2::sui::SUI",
                            "decimals": 9,
                            "symbol": "SUI",
                            "name": "Sui",
                            "iconUrl": "https://strapi-dev.scand.app/uploads/sui_c07df05f00.png",
                            "verified": true
                        },
                        "destinationAddress": "0x00000"
                    }
                }
            }
            break;
        case "trending_tokens":
            let cmsProvider = new CmsProvider()
            let result = await redis.hGet("coins_info", "trending");
            let trendingCoins;
            if (result !== null) {
                trendingCoins = result ? JSON.parse(result).data : []
            }
            else {
                trendingCoins = await cmsProvider.getTokens("trending");
                trendingCoins = trendingCoins.data;
            }
            responseData = {
                "user": agentName,
                "text": "Below are trending coins we have collected:",
                "action": "TOP_TRENDING_TOKENS",
                "result": {
                    "type": "sui_trending_tokens",
                    "data": trendingCoins.map((token: any) => ({
                        name: token.name,
                        symbol: token.symbol.toUpperCase(),
                        price: token.price,
                        market_cap: token.cap,
                        price_change_24h: token.change24h,
                        type: token.address,
                        iconUrl: token.logo

                    }))
                }
            }
            break;
        case "stake_pools":
            let data = await redis.hGetAll("STAKE_POOLS");
            let dataScallop = await redis.hGetAll("STAKE_POOLS_SCALLOP");
            if (data && Object.keys(data).length > 0 && dataScallop && Object.keys(dataScallop).length > 0) {
                let parsedData: { [key: string]: string }[] = [];
                for (let key in data) {
                    parsedData.push(JSON.parse(data[key]));
                }
                let poolsScallopData: { [key: string]: string }[] = [];
                for (let key in dataScallop) {
                    poolsScallopData.push(JSON.parse(dataScallop[key]));
                }
                parsedData = parsedData.concat(poolsScallopData);
                parsedData.sort(
                    (a: any, b: any) =>
                        b.total_supply_rate - a.total_supply_rate
                );
                return responseData = {
                    user: agentName,
                    text: "Below is a list of stake pools:",
                    action: "STAKE_POOLS",
                    result: {
                        type: "stake_pools",
                        data: parsedData.slice(0, 6),
                    },
                };
            }
            const scallopProvider = new ScallopProvider();
            const listPoolsScallop = await scallopProvider.listPools();

            responseData = await listPoolsInFileJson();

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
            responseData = responseData.concat(listPoolsScallop);
            responseData.sort(
                (a, b) =>
                    b.total_supply_rate - a.total_supply_rate
            );
            return {
                user: agentName,
                text: "Below is a list of stake pools:",
                action: "STAKE_POOLS",
                result: {
                    type: "stake_pools",
                    data: responseData.slice(0, 6),
                },
            };
            break;
        default:
            responseData = null;
    }
    return responseData;
}
