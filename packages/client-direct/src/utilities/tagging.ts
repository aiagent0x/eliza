import { RedisClient } from "@elizaos/adapter-redis";
import { CmsProvider } from "../services/CMS/cmsProvider";
import ScallopProvider from "../services/stakeService/stakeScallop";
import { listPoolsInFileJson, pool } from "../services/stakeService/searchPoolInFile";
import { getPoolInfo, getPoolsInfo } from "navi-sdk";
import {
    elizaLogger,
} from "@elizaos/core";
import { listPool } from "../services/stakeService/fetchSuilend/listPools";
import CetusProvider from "../services/liquidityService/liquidityCetus";
import BigNumber from "bignumber.js";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL)
const tagging = ["swap_1_sui_to_usdc", "send_1_sui_to_address", "trending_tokens", "stake_pools", "navi_pools", "scallop_pools", "suilend_pools", "liquidity_pools"]
export async function filterByTagging(tag: string, agentName: string) {
    console.log(agentName)
    tag = tag.trim().toLowerCase();
    const text = tagging.find(t => t.replace(/\s+/g, '_') === tag.replace(/\s+/g, '_'));
    let responseData;
    let data;
    let dataScallop;
    let dataSuilend;
    let listPoolsNavi;
    let index;
    let listPoolsScallop;
    let listPoolSuilend;
    let scallopProvider = new ScallopProvider();
    let listPoolsNaviOnSite = await getPoolsInfo()

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
            console.log("trendingCoins:", trendingCoins);
            responseData = {
                "user": agentName,
                "text": "Below are trending tokens we have collected:",
                "action": "TOP_TRENDING_TOKENS",
                "result": {
                    "type": "sui_trending_tokens",
                    "data": trendingCoins
                        .sort((a: any, b: any) => b.change24h - a.change24h)
                        .map((token: any) => ({
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
            let parsedData: { [key: string]: string }[] = [];
            let poolsScallopData: { [key: string]: string }[] = [];
            let poolsSuilendData: { [key: string]: string }[] = [];
            data = await redis.hGetAll("STAKE_NAVI_POOLS");
            dataScallop = await redis.hGetAll("STAKE_POOLS_SCALLOP");
            dataSuilend = await redis.hGetAll("STAKE_POOLS_SUILEND");
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
                return responseData = {
                    user: agentName,
                    text: "Below is a list of staking pools:",
                    action: "STAKE_POOLS",
                    result: {
                        type: "stake_pools",
                        data: parsedData.slice(0, 6),
                    },
                };
            }
            responseData = [];
            listPoolSuilend = await listPool()
            listPoolsScallop = await scallopProvider.listPools();
            listPoolsNavi = await listPoolsInFileJson();
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

            responseData = responseData.concat(listPoolsScallop, listPoolSuilend, listPoolsNavi)
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
        case "navi_pools":
            data = await redis.hGetAll("STAKE_NAVI_POOLS");
            if (data && Object.keys(data).length > 0) {
                let parsedData: { [key: string]: string }[] = [];
                for (let key in data) {
                    parsedData.push(JSON.parse(data[key]));
                }
                parsedData.sort(
                    (a: any, b: any) =>
                        b.total_supply_rate - a.total_supply_rate
                );
                return responseData = {
                    user: agentName,
                    text: "Below is a list of Navi staking pools:",
                    action: "STAKE_POOLS",
                    result: {
                        type: "stake_pools",
                        data: parsedData.slice(0, 6),
                    },
                };
            }
            listPoolsNavi = await listPoolsInFileJson();
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
            listPoolsNavi.sort(
                (a, b) =>
                    b.total_supply_rate - a.total_supply_rate
            );
            try {
                return responseData = {
                    user: agentName,
                    text: "Below is a list of Navi staking pools:",
                    action: "STAKE_POOLS",
                    result: {
                        type: "stake_pools",
                        data: listPoolsNavi.slice(0, 6),
                    },
                };
            } catch (error) {
                console.error("Error during token swap:", error);
                return false;
            }
            break;
        case "scallop_pools":
            dataScallop = await redis.hGetAll("STAKE_POOLS_SCALLOP");
            if (dataScallop && Object.keys(dataScallop).length > 0) {

                let poolsScallopData: { [key: string]: string }[] = [];
                for (let key in dataScallop) {
                    poolsScallopData.push(JSON.parse(dataScallop[key]));
                }

                poolsScallopData.sort(
                    (a: any, b: any) =>
                        b.total_supply_rate - a.total_supply_rate
                );
                return responseData = {
                    user: agentName,
                    text: "Below is a list of Scallop staking pools:",
                    action: "STAKE_POOLS",
                    result: {
                        type: "stake_pools",
                        data: poolsScallopData.slice(0, 6),
                    },
                };
            }
            listPoolsScallop = await scallopProvider.listPools();
            listPoolsScallop.sort(
                (a, b) =>
                    b.total_supply_rate - a.total_supply_rate
            );
            try {
                return responseData = {
                    user: agentName,
                    text: "Below is a list of Scallop staking pools:",
                    action: "STAKE_POOLS",
                    result: {
                        type: "stake_pools",
                        data: listPoolsScallop.slice(0, 6),
                    },
                };
            } catch (error) {
                console.error("Error during token swap:", error);
                return false;
            }
            break;
        case "suilend_pools":
            dataSuilend = await redis.hGetAll("STAKE_POOLS_SUILEND");
            if (dataSuilend && Object.keys(dataSuilend).length > 0) {
                let poolsSuilendData: { [key: string]: string }[] = [];
                for (let key in dataSuilend) {
                    poolsSuilendData.push(JSON.parse(dataSuilend[key]));
                }
                poolsSuilendData.sort(
                    (a: any, b: any) =>
                        b.total_supply_rate - a.total_supply_rate
                );
                return responseData = {
                    user: agentName,
                    text: "Below is a list of Suilend staking pools:",
                    action: "STAKE_POOLS",
                    result: {
                        type: "stake_pools",
                        data: poolsSuilendData.slice(0, 6),
                    },
                };
            }
            listPoolSuilend = await listPool();
            listPoolSuilend.sort(
                (a, b) =>
                    b.total_supply_rate - a.total_supply_rate
            );
            try {
                return responseData = {
                    user: agentName,
                    text: "Below is a list of Suilend staking pools:",
                    action: "STAKE_POOLS",
                    result: {
                        type: "stake_pools",
                        data: listPoolSuilend.slice(0, 6),
                    },
                };
            } catch (error) {
                console.error("Error during token swap:", error);
                return false;
            }
            break;
        case "liquidity_pools":
            let liquidityCetus: any = await redis.getValue({ key: "liquidity_pools" })
            if (liquidityCetus !== undefined) {
                return responseData = {
                    user: agentName,
                    text: "Below is a list of liquidity pools:",
                    action: "LIQUIDITY_POOLS",
                    result: {
                        type: "liquidity_pools",
                        data: JSON.parse(liquidityCetus).slice(0, 6),
                    },
                };
            }
            let cetusProvider = new CetusProvider();
            liquidityCetus = await cetusProvider.fetchLiquidityPools();

            liquidityCetus.data.lp_list.sort((a: any, b: any) => {
                a.apr.fee_apr_24h = a.apr.fee_apr_24h.replace('%', '');
                b.apr.fee_apr_24h = b.apr.fee_apr_24h.replace('%', '');
                if (parseFloat(a.apr.fee_apr_24h) > parseFloat(b.apr.fee_apr_24h)) return -1;
                if (parseFloat(a.apr.fee_apr_24h) < parseFloat(b.apr.fee_apr_24h)) return 1;
                return 0;
            });
            try {
                return responseData = {
                    user: agentName,
                    text: "Below is a list of liquidity pools:",
                    action: "LIQUIDITY_POOLS",
                    result: {
                        type: "liquidity_pools",
                        data: liquidityCetus.data.lp_list.slice(0, 6),
                    },
                };

            } catch (error) {
                console.error("Error during token swap:", error);
                return false;
            }
            break;
        default:
            responseData = null;
    }
    return responseData;
}
