import {
    ActionExample,
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
} from "@elizaos/core";
import { hashUserMsg } from "../utils/format";
import { searchPoolInFileJson, listPoolsInFileJson, pool } from "../providers/searchPoolInFile";
import { getPoolInfo, getAddressPortfolio, getPoolsInfo } from "navi-sdk";
import { SuiClient } from "@mysten/sui/client";
import { RedisClient } from "@elizaos/adapter-redis";
import { ScallopProvider } from "../providers/fetchScallop/scallopProvider";
import { getDetail } from "../providers/fetchSuilend/getDetail";
import { listPool } from "../providers/fetchSuilend/listPools";
import getActionHint from "../utils/action_hint";
import MessageService from "../services/messageService";
// import { listPool } from "../providers/fetchSuilend/listPools";
const suiClient = new SuiClient({
    url: "https://fullnode.mainnet.sui.io"
});

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL);

const stakeTokenTemplate = `
Recent messages: {{recentMessages}}  
Extract the staking parameters from the latest message only, following these rules:  

- Sample Pool Names Navi: SUI, USDT, WETH, CETUS, VoloSui, HaedalSui, NAVX, WBTC, AUSD, wUSDC, nUSDC, ETH, USDY, NS, stBTC, DEEP, FDUSD, BLUE, BUCK, suiUSDT, stSUI.  
- Sample Pool Name Scallop: "usdc", "sbeth", "sbusdt", "sbwbtc", "weth", "wbtc", "wusdc", "wusdt", "sui", "wapt", "wsol", "cetus", "afsui", "hasui", "vsui", "sca", "fud", "deep", "fdusd", "blub", "musd"
- **Extract data only from the latest message** and discard any previous messages.  
- Return only a **single JSON object** with the specified fields in this format:  
    \`\`\`json
    {  
         "type_action": "stake" | "unstake",  
         "type": "list" | "pool_name" | "my_stake",  
         "pool_name": string | null ,
         "amount": number | 0,
         "protocol": "navi" | "scallop"  | "suilend" | "all"
    }  
    \`\`\`
- If multiple staking requests are detected, return only the **first valid** request found in the conversation.  
- If the message mentions anything related to "my stake", "show me my stake", or similar phrases, set '"type"' to '"my_stake"', '"type_action"' to '"stake"', '"pool_name"' to 'null', and '"amount"' to '0'. The '"protocol"' should default to '"all"'.  
- Use '"type": "list"' when the request is about listing pools (e.g., "stake pools", "top 10 stake pools", "staking pools").  
- Use '"type": "pool_name"' when the request specifies a pool name (e.g., "stake 10 SUI", "unstake 5 NAVX").  
- Use '"type_action": "stake"' when the request involves staking tokens.  
- Use '"type_action": "unstake"' when the request involves unstaking tokens.  
- **If the message explicitly mentions "Navi" or "Scallop" or "Suilend" or "navi" or "scallop" or "suilend" , set '"protocol"'accordingly. Otherwise, set '"protocol": "all"'**.  
- **Ensure '"pool_name"' is always a valid pool name or token symbol from the sample lists above. If an invalid name is detected, set it to 'null'.**  
- Use 'null' for any values that cannot be determined.  
- **Only return one JSON object, not an array.**  
- All property names must use double quotes.  
- Null values should not use quotes.  
- No trailing commas allowed.  
- No single quotes anywhere in the JSON. 
`;

export const stake: Action = {
    name: "STAKE_TOKEN",
    similes: ["TOKEN_STAKE", "STAKE_{INPUT}", "STAKE_TOKEN", "STAKE_POOLS", "MY_STAKE", "SUPPLY_POOLS", "SUPPLY_{INPUT}"],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "Stake token and stake pool",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.info("---- STAKE_TOKEN ----");
        let content: any = _options.data_extract;
        if (_options.type !== "toggle_faster") {
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }
            const msgHash = hashUserMsg(message, "stake");
            content = await runtime.cacheManager.get(msgHash);
            elizaLogger.info("---- cache info: ", msgHash, "--->", content);

            if (!content) {
                const stakeContext = composeContext({
                    state,
                    template: stakeTokenTemplate,
                });
                content = await generateObjectDeprecated({
                    runtime,
                    context: stakeContext,
                    modelClass: ModelClass.SMALL,
                });
                await runtime.cacheManager.set(msgHash, content, { expires: Date.now() + 300000 });
            }
        }

        elizaLogger.info("content:", content)
        // const scallopProvider = new ScallopProvider();
        let listPoolsNaviOnSite = await getPoolsInfo()
        // console.log("listPoolsNaviOnSite:", listPoolsNaviOnSite) 
        if (content.type === "list") {
            if (typeof content.amount === "string") content.amount = parseInt(content.amount, 5);
            if (content.amount === 0) content.amount = 5;
            let responseData = [];
            let data;
            let dataScallop;
            let dataSuilend;
            let listPoolsNavi;
            let index;
            let listPoolsScallop;
            let listPoolSuilend;
            switch (content.protocol) {
                case "navi":
                    data = await redis.hGetAll("STAKE_POOLS");
                    if (data && Object.keys(data).length > 0) {
                        let parsedData: { [key: string]: string }[] = [];
                        for (let key in data) {
                            parsedData.push(JSON.parse(data[key]));
                        }
                        parsedData.sort(
                            (a: any, b: any) =>
                                b.total_supply_rate - a.total_supply_rate
                        );
                        if (_options.type !== "toggle_faster") {
                            let messageService = new MessageService()
                            await messageService.createMessage(
                                message.content.text,
                                {
                                    action: "STAKE_POOLS",
                                    data_extract: content
                                })

                        }
                        callback({
                            user: await runtime.character.name,
                            text: "Here’s a lineup of Navi staking pools for you!",
                            action: "STAKE_POOLS",
                            result: {
                                type: "stake_pools",
                                data: parsedData.slice(0, content.amount),
                            },
                        });
                        return true;
                    }

                    if (listPoolsNaviOnSite !== null && listPoolsNaviOnSite.length > 0) {
                        listPoolsNavi = await listPoolsInFileJson();
                        index = 0;
                        for (let key in pool) {
                            if (pool.hasOwnProperty(key)) {
                                let poolInfo;
                                if (pool[key]) {
                                    poolInfo = await getPoolInfo({
                                        symbol: key,
                                        address: pool[key].type,
                                        decimal: listPoolsNavi[index].decimal,
                                    });
                                    listPoolsNavi[index].name = key;
                                    listPoolsNavi[index].total_supply = poolInfo.total_supply;
                                    listPoolsNavi[index].token_price = poolInfo.tokenPrice;
                                    listPoolsNavi[index].total_borrow = poolInfo.total_borrow;
                                    listPoolsNavi[index].base_supply_rate = poolInfo.base_supply_rate;
                                    listPoolsNavi[index].base_borrow_rate = poolInfo.base_borrow_rate;
                                    listPoolsNavi[index].boosted_supply_rate = poolInfo.boosted_supply_rate;
                                    listPoolsNavi[index].boosted_borrow_rate = poolInfo.boosted_borrow_rate;
                                    listPoolsNavi[index].total_supply_rate = parseFloat(poolInfo.base_supply_rate) + parseFloat(poolInfo.boosted_supply_rate);
                                    listPoolsNavi[index].protocol = "navi";
                                } else {
                                    elizaLogger.error(`Pool information for key ${key} is undefined.`);
                                }
                            }
                            index++;
                        }

                        for (let i = 0; i < listPoolsNavi.length; i++) {
                            if (listPoolsNavi[i].type === "0x2::sui::SUI") {
                                listPoolsNavi[i].typeCoin = "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI";
                            } else {
                                listPoolsNavi[i].typeCoin = listPoolsNavi[i].type;
                            }

                            for (let j = 0; j < listPoolsNaviOnSite.length; j++) {
                                if (`0x${listPoolsNaviOnSite[j].coinType}` === listPoolsNavi[i].typeCoin) {
                                    delete listPoolsNavi[i].base_supply_rate;
                                    delete listPoolsNavi[i].total_supply_rate;
                                    listPoolsNavi[i].base_supply_rate = listPoolsNaviOnSite[j].supplyIncentiveApyInfo.apy;
                                    listPoolsNavi[i].total_supply_rate = listPoolsNaviOnSite[j].supplyIncentiveApyInfo.apy;
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
                        if (_options.type !== "toggle_faster") {
                            let messageService = new MessageService()
                            await messageService.createMessage(
                                message.content.text,
                                {
                                    action: "STAKE_POOLS",
                                    data_extract: content
                                })

                        }
                        callback({
                            user: await runtime.character.name,
                            text: "Here’s a lineup of Navi staking pools for you!",
                            action: "STAKE_POOLS",
                            result: {
                                type: "stake_pools",
                                data: listPoolsNavi.slice(0, content.amount),
                            },
                        });
                        return true;
                    } catch (error) {
                        console.error("Error during token swap:", error);
                        return false;
                    }
                    break;
                // case "scallop":
                //     dataScallop = await redis.hGetAll("STAKE_POOLS_SCALLOP");
                //     if (dataScallop && Object.keys(dataScallop).length > 0) {

                //         let poolsScallopData: { [key: string]: string }[] = [];
                //         for (let key in dataScallop) {
                //             poolsScallopData.push(JSON.parse(dataScallop[key]));
                //         }

                //         poolsScallopData.sort(
                //             (a: any, b: any) =>
                //                 b.total_supply_rate - a.total_supply_rate
                //         );
                //         callback({
                //             user: await runtime.character.name,
                //             text: "Here’s a lineup of Scallop staking pools for you!",
                //             action: "STAKE_POOLS",
                //             result: {
                //                 type: "stake_pools",
                //                 data: poolsScallopData.slice(0, content.amount),
                //             },
                //         });
                //         return true;
                //     }
                //     listPoolsScallop = await scallopProvider.listPools();
                //     listPoolsScallop.sort(
                //         (a, b) =>
                //             b.total_supply_rate - a.total_supply_rate
                //     );
                //     try {
                //         callback({
                //             user: await runtime.character.name,
                //             text: "Here’s a lineup of Scallop staking pools for you!",
                //             action: "STAKE_POOLS",
                //             result: {
                //                 type: "stake_pools",
                //                 data: listPoolsScallop.slice(0, content.amount),
                //             },
                //         });
                //         return true;
                //     } catch (error) {
                //         console.error("Error during token swap:", error);
                //         return false;
                //     }
                //     break;
                // case "suilend":
                //     dataSuilend = await redis.hGetAll("STAKE_POOLS_SUILEND");
                //     if (dataSuilend && Object.keys(dataSuilend).length > 0) {
                //         let poolsSuilendData: { [key: string]: string }[] = [];
                //         for (let key in dataSuilend) {
                //             poolsSuilendData.push(JSON.parse(dataSuilend[key]));
                //         }
                //         poolsSuilendData.sort(
                //             (a: any, b: any) =>
                //                 b.total_supply_rate - a.total_supply_rate
                //         );
                //         callback({
                //             user: await runtime.character.name,
                //             text: "Here’s a lineup of Suilend staking pools for you!",
                //             action: "STAKE_POOLS",
                //             result: {
                //                 type: "stake_pools",
                //                 data: poolsSuilendData.slice(0, content.amount),
                //             },
                //         });
                //         return true;
                //     }
                //     listPoolSuilend = await listPool();

                //     listPoolSuilend.sort(
                //         (a, b) =>
                //             b.total_supply_rate - a.total_supply_rate
                //     );
                //     try {
                //         callback({
                //             user: await runtime.character.name,
                //             text: "Here’s a lineup of Suilend staking pools for you!",
                //             action: "STAKE_POOLS",
                //             result: {
                //                 type: "stake_pools",
                //                 data: listPoolSuilend.slice(0, content.amount),
                //             },
                //         });
                //         return true;
                //     } catch (error) {
                //         console.error("Error during token swap:", error);
                //         return false;
                //     }
                //     break;
                default:
                    let parsedData: { [key: string]: string }[] = [];
                    // let poolsScallopData: { [key: string]: string }[] = [];
                    // let poolsSuilendData: { [key: string]: string }[] = [];
                    data = await redis.hGetAll("STAKE_POOLS");
                    // dataScallop = await redis.hGetAll("STAKE_POOLS_SCALLOP");
                    // dataSuilend = await redis.hGetAll("STAKE_POOLS_SUILEND");
                    if (data && Object.keys(data).length > 0) {
                        for (let key in data) {
                            parsedData.push(JSON.parse(data[key]));
                        }
                    }
                    // if (dataScallop && Object.keys(dataScallop).length > 0) {
                    //     for (let key in dataScallop) {
                    //         poolsScallopData.push(JSON.parse(dataScallop[key]));
                    //     }
                    // }
                    // if (dataSuilend && Object.keys(dataSuilend).length > 0) {
                    //     for (let key in dataSuilend) {
                    //         poolsSuilendData.push(JSON.parse(dataSuilend[key]));
                    //     }
                    // }
                    // if ((parsedData && parsedData.length > 0) || (poolsScallopData && poolsScallopData.length > 0) || (poolsSuilendData && poolsSuilendData.length > 0)) {
                    if ((parsedData && parsedData.length > 0)) {
                        // parsedData = parsedData.concat(poolsScallopData, poolsSuilendData);
                        parsedData.sort(
                            (a: any, b: any) =>
                                b.total_supply_rate - a.total_supply_rate
                        );
                        if (_options.type !== "toggle_faster") {
                            let messageService = new MessageService()
                            await messageService.createMessage(
                                message.content.text,
                                {
                                    action: "STAKE_POOLS",
                                    data_extract: content
                                })

                        }
                        callback({
                            user: await runtime.character.name,
                            text: "Here’s a lineup of staking pools for you!",
                            action: "STAKE_POOLS",
                            result: {
                                type: "stake_pools",
                                data: parsedData.slice(0, content.amount),
                            },
                        });
                        return true;
                    }

                    // listPoolSuilend = await listPool();
                    // listPoolsScallop = await scallopProvider.listPools();

                    listPoolsNavi = await listPoolsInFileJson();
                    if (listPoolsNaviOnSite !== null && listPoolsNaviOnSite.length > 0) {
                        index = 0;
                        for (let key in pool) {
                            if (pool.hasOwnProperty(key)) {
                                let poolInfo;
                                if (pool[key]) {
                                    poolInfo = await getPoolInfo({
                                        symbol: key,
                                        address: pool[key].type,
                                        decimal: listPoolsNavi[index].decimal,
                                    });
                                    listPoolsNavi[index].name = key;
                                    listPoolsNavi[index].total_supply = poolInfo.total_supply;
                                    listPoolsNavi[index].token_price = poolInfo.tokenPrice;
                                    listPoolsNavi[index].total_borrow = poolInfo.total_borrow;
                                    listPoolsNavi[index].base_supply_rate = poolInfo.base_supply_rate;
                                    listPoolsNavi[index].base_borrow_rate = poolInfo.base_borrow_rate;
                                    listPoolsNavi[index].boosted_supply_rate = poolInfo.boosted_supply_rate;
                                    listPoolsNavi[index].boosted_borrow_rate = poolInfo.boosted_borrow_rate;
                                    listPoolsNavi[index].total_supply_rate = parseFloat(poolInfo.base_supply_rate) + parseFloat(poolInfo.boosted_supply_rate);
                                    listPoolsNavi[index].protocol = "navi";
                                } else {
                                    elizaLogger.error(`Pool information for key ${key} is undefined.`);
                                }
                            }
                            index++;
                        }
                        for (let i = 0; i < listPoolsNavi.length; i++) {
                            if (listPoolsNavi[i].type === "0x2::sui::SUI") {
                                listPoolsNavi[i].typeCoin = "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI";
                            } else {
                                listPoolsNavi[i].typeCoin = listPoolsNavi[i].type;
                            }

                            for (let j = 0; j < listPoolsNaviOnSite.length; j++) {
                                if (`0x${listPoolsNaviOnSite[j].coinType}` === listPoolsNavi[i].typeCoin) {
                                    delete listPoolsNavi[i].base_supply_rate;
                                    delete listPoolsNavi[i].total_supply_rate;
                                    listPoolsNavi[i].base_supply_rate = listPoolsNaviOnSite[j].supplyIncentiveApyInfo.apy;
                                    listPoolsNavi[i].total_supply_rate = listPoolsNaviOnSite[j].supplyIncentiveApyInfo.apy;
                                }
                            }
                            delete listPoolsNavi[i].typeCoin;
                        }

                    }
                    else {
                        listPoolsNavi = [];
                    }
                    // responseData = responseData.concat(listPoolsScallop, listPoolSuilend, listPoolsNavi)
                    listPoolsNavi.sort(
                        (a, b) =>
                            b.total_supply_rate - a.total_supply_rate
                    );
                    try {
                        if (_options.type !== "toggle_faster") {
                            let messageService = new MessageService()
                            await messageService.createMessage(
                                message.content.text,
                                {
                                    action: "STAKE_POOLS",
                                    data_extract: content
                                })

                        }
                        callback({
                            user: await runtime.character.name,
                            text: "Here’s a lineup of staking pools for you!",
                            action: "STAKE_POOLS",
                            result: {
                                type: "stake_pools",
                                data: listPoolsNavi.slice(0, content.amount),
                            },
                        });
                        return true;
                    } catch (error) {
                        console.error("Error during token swap:", error);
                        return false;
                    }
                    break;
            }
        }
        if (content.type === "pool_name") {
            let type_action;
            let responseData;
            let data;
            let poolInfo;
            let dataScallop;
            let poolScallopInfo;
            let symbolOnPoolNavi;
            let dataSuilend;
            let poolSuilendInfo
            switch (content.protocol) {
                case "navi":
                    type_action = content.type_action;
                    if (content.pool_name === null || content.pool_name === "null") {
                        content.pool_name = "Sui"
                    }
                    responseData = await searchPoolInFileJson(content.pool_name ? content.pool_name : "Sui");
                    if (!responseData) {
                        callback({
                            user: await runtime.character.name,
                            text: "We couldn’t spot any staking pools in Navi. Try scanning the list of Navi’s staking pools!",
                            action: "STAKE_TOKEN",
                            action_hint: getActionHint(
                                "navi pools",
                                "button_generate_text",
                                "navi",
                                "stake"
                            )
                        });
                        return true
                    }

                    for (let key in pool) {
                        if (responseData.name.toLowerCase() === key.toLowerCase() || responseData.symbol.toLowerCase() === key.toLowerCase()) {
                            symbolOnPoolNavi = key;
                        }
                    }
                    data = await redis.hGet("STAKE_POOLS", symbolOnPoolNavi);
                    if (data && typeof data === "string" && data !== null) {
                        if (_options.type !== "toggle_faster") {
                            let messageService = new MessageService()
                            await messageService.createMessage(
                                message.content.text,
                                {
                                    action: "STAKE_POOLS",
                                    data_extract: content
                                })

                        }
                        callback({
                            user: await runtime.character.name,
                            text: "Double-check all the details before takeoff to dodge any turbulence!",
                            action: "STAKE_TOKEN",
                            result: {
                                type: type_action === "stake" ? "stake_token" : "unstake_token",
                                data: { ...JSON.parse(data), amount: content.amount, protocol: "navi" },
                            },
                        });
                        return true;
                    }
                    if (symbolOnPoolNavi) {
                        poolInfo = await getPoolInfo({
                            symbol: symbolOnPoolNavi,
                            address: responseData.type,
                            decimal: responseData.decimal,
                        });
                        responseData.name = symbolOnPoolNavi;
                        responseData.total_supply = poolInfo.total_supply;
                        responseData.total_borrow = poolInfo.total_borrow;
                        responseData.base_supply_rate = poolInfo.base_supply_rate;
                        responseData.base_borrow_rate = poolInfo.base_borrow_rate;
                        responseData.boosted_supply_rate = poolInfo.boosted_supply_rate;
                        responseData.boosted_borrow_rate = poolInfo.boosted_borrow_rate;
                        responseData.total_supply_rate = 0;
                        responseData.protocol = "navi";
                        responseData.amount = content.amount;
                        if (responseData.type === "0x2::sui::SUI") {
                            responseData.typeCoin = "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI";
                        } else {
                            responseData.typeCoin = responseData.type;
                        }
                        for (let j = 0; j < listPoolsNaviOnSite.length; j++) {
                            if (`0x${listPoolsNaviOnSite[j].coinType}` === responseData.typeCoin) {
                                delete responseData.base_supply_rate;
                                delete responseData.total_supply_rate;
                                responseData.base_supply_rate = listPoolsNaviOnSite[j].supplyIncentiveApyInfo.apy;
                                responseData.total_supply_rate = listPoolsNaviOnSite[j].supplyIncentiveApyInfo.apy;
                            }
                        }
                        delete responseData.typeCoin;
                    }
                    try {
                        if (_options.type !== "toggle_faster") {
                            let messageService = new MessageService()
                            await messageService.createMessage(
                                message.content.text,
                                {
                                    action: "STAKE_POOLS",
                                    data_extract: content
                                })

                        }
                        callback({
                            user: await runtime.character.name,
                            text: "Double-check all the details before takeoff to dodge any turbulence!",
                            action: "STAKE_TOKEN",
                            result: {
                                type: type_action === "stake" ? "stake_token" : "unstake_token",
                                data: responseData,
                            },
                        });
                        return true;
                    } catch (error) {
                        console.error("Error during token swap:", error);
                        return false;
                    }
                    break;
                // case "scallop":
                //     type_action = content.type_action;
                //     if (content.pool_name === null || content.pool_name === "null") {
                //         content.pool_name = "sui"
                //     }
                //     dataScallop = await redis.hGet("STAKE_POOLS_SCALLOP", content.pool_name.toLowerCase());
                //     if (dataScallop && typeof dataScallop === "string" && dataScallop !== null) {
                //         callback({
                //             user: await runtime.character.name,
                //             text: "Double-check all the details before takeoff to dodge any turbulence!",
                //             action: "STAKE_TOKEN",
                //             result: {
                //                 type: type_action === "stake" ? "stake_token" : "unstake_token",
                //                 data: { ...JSON.parse(dataScallop), amount: content.amount, protocol: "scallop" },
                //             },
                //         });
                //         return true;
                //     }

                //     poolScallopInfo = await scallopProvider.getDetail(content.pool_name.toLowerCase());
                //     try {
                //         if (!poolScallopInfo) {
                //             callback({
                //                 user: await runtime.character.name,
                //                 text: "We couldn't find staking pools in Scallop. You can search in list staking pools of Scallop:",
                //                 action: "STAKE_TOKEN",
                //                 action_hint: getActionHint(
                //                     "scallop pools",
                //                     "button_generate_text",
                //                     "scallop",
                //                     "stake"
                //                 )
                //             });
                //         }
                //         callback({
                //             user: await runtime.character.name,
                //             text: "Double-check all the details before takeoff to dodge any turbulence!",
                //             action: "STAKE_TOKEN",
                //             result: {
                //                 type: type_action === "stake" ? "stake_token" : "unstake_token",
                //                 data: poolScallopInfo,
                //             },
                //         });
                //         return true

                //     } catch (error) {
                //         console.error("Error during token swap:", error);
                //         return false;
                //     }
                //     break;
                // case "suilend":
                //     type_action = content.type_action;
                //     if (content.pool_name === null || content.pool_name === "null") {
                //         content.pool_name = "sui"
                //     }
                //     dataSuilend = await redis.hGet("STAKE_POOLS_SUILEND", content.pool_name.toLowerCase());
                //     if (dataSuilend && typeof dataSuilend === "string" && dataSuilend !== null) {
                //         callback({
                //             user: await runtime.character.name,
                //             text: "Double-check all the details before takeoff to dodge any turbulence",
                //             action: "STAKE_TOKEN",
                //             result: {
                //                 type: type_action === "stake" ? "stake_token" : "unstake_token",
                //                 data: { ...JSON.parse(dataSuilend), amount: content.amount, protocol: "suilend" },
                //             },
                //         });
                //         return true;
                //     }
                //     poolSuilendInfo = await getDetail(content.pool_name);
                //     try {
                //         if (!poolSuilendInfo || poolSuilendInfo.length === 0) {
                //             callback({
                //                 user: await runtime.character.name,
                //                 text: "We couldn’t spot any staking pools in Suilend. Try scanning the list of Suilend’s staking pools!",
                //                 action: "STAKE_TOKEN",
                //                 action_hint: getActionHint(
                //                     "suilend pools",
                //                     "button_generate_text",
                //                     "suilend",
                //                     "stake"
                //                 )
                //             });
                //             return true
                //         }
                //         callback({
                //             user: await runtime.character.name,
                //             text: "Double-check all the details before takeoff to dodge any turbulence",
                //             action: "STAKE_TOKEN",
                //             result: {
                //                 type: type_action === "stake" ? "stake_token" : "unstake_token",
                //                 data: poolSuilendInfo[0],
                //             },
                //         });
                //         return true

                //     } catch (error) {
                //         console.error("Error during token swap:", error);
                //         return false;
                //     }
                //     break;
                default:
                    type_action = content.type_action;
                    if (content.pool_name === null || content.pool_name === "null") {
                        content.pool_name = "Sui"
                    }
                    //Navi
                    responseData = await searchPoolInFileJson(content.pool_name ? content.pool_name : "Sui");
                    if (responseData) {
                        for (let key in pool) {
                            if (responseData.name.toLowerCase() === key.toLowerCase() || responseData.symbol.toLowerCase() === key.toLowerCase()) {
                                symbolOnPoolNavi = key;
                            }
                        }
                        data = await redis.hGet("STAKE_POOLS", symbolOnPoolNavi);
                        if (data && typeof data === "string" && data !== null) {
                            data = { ...JSON.parse(data), amount: content.amount, protocol: "navi" }
                        }
                        if (symbolOnPoolNavi) {
                            poolInfo = await getPoolInfo({
                                symbol: symbolOnPoolNavi,
                                address: responseData.type,
                                decimal: responseData.decimal,
                            });

                            responseData.name = symbolOnPoolNavi;
                            responseData.total_supply = poolInfo.total_supply;
                            responseData.total_borrow = poolInfo.total_borrow;
                            responseData.base_supply_rate = poolInfo.base_supply_rate;
                            responseData.base_borrow_rate = poolInfo.base_borrow_rate;
                            responseData.boosted_supply_rate = poolInfo.boosted_supply_rate;
                            responseData.boosted_borrow_rate = poolInfo.boosted_borrow_rate;
                            responseData.total_supply_rate = parseFloat(poolInfo.base_supply_rate) + parseFloat(poolInfo.boosted_supply_rate);
                            responseData.protocol = "navi";
                            responseData.amount = content.amount;
                            if (responseData.type === "0x2::sui::SUI") {
                                responseData.typeCoin = "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI";
                            } else {
                                responseData.typeCoin = responseData.type;
                            }
                            for (let j = 0; j < listPoolsNaviOnSite.length; j++) {
                                if (`0x${listPoolsNaviOnSite[j].coinType}` === responseData.typeCoin) {
                                    delete responseData.base_supply_rate;
                                    delete responseData.total_supply_rate;
                                    responseData.base_supply_rate = listPoolsNaviOnSite[j].supplyIncentiveApyInfo.apy;
                                    responseData.total_supply_rate = listPoolsNaviOnSite[j].supplyIncentiveApyInfo.apy;
                                }
                            }
                            delete responseData.typeCoin;
                            data = responseData;
                        }
                    }
                    //Scallop 
                    // dataScallop = await redis.hGet("STAKE_POOLS", content.pool_name.toLowerCase());
                    // if (dataScallop && typeof dataScallop === "string" && dataScallop !== null) {
                    //     dataScallop = { ...JSON.parse(dataScallop), amount: content.amount, protocol: "scallop" }
                    // }
                    // poolScallopInfo = await scallopProvider.getDetail(content.pool_name.toLowerCase());
                    // dataScallop = poolScallopInfo;
                    //Suilend
                    // dataSuilend = await redis.hGet("STAKE_POOLS_SUILEND", content.pool_name.toLowerCase());
                    // if (dataSuilend && typeof dataSuilend === "string" && dataSuilend !== null) {
                    //     dataSuilend = { ...JSON.parse(dataSuilend), amount: content.amount, protocol: "suilend" };
                    // }
                    // else {
                    //     poolSuilendInfo = await getDetail(content.pool_name);
                    //     dataSuilend = poolSuilendInfo;
                    // }
                    //Map
                    // const arrayMap = [data, dataScallop];
                    // if (Array.isArray(dataSuilend)) {
                    //     arrayMap.push(...dataSuilend);
                    // } else {
                    //     arrayMap.push(dataSuilend);
                    // }
                    // if (arrayMap.every(item => item === undefined || item === null) || arrayMap.every(item => item === undefined)) {
                    //     callback({
                    //         user: await runtime.character.name,
                    //         text: "We couldn’t spot any staking pools. Try scanning the list of staking pools!",
                    //         action: "STAKE_TOKEN",
                    //         action_hint: getActionHint(
                    //             "all stake pools",
                    //             "button_generate_text",
                    //             "all",
                    //             "stake"
                    //         )
                    //     });
                    //     return true;
                    // }
                    console.log("responseData:", responseData);
                    const arrayMap = [responseData];
                    console.log("arrayMap:", arrayMap);
                    arrayMap.sort(
                        (a, b) =>
                            b.total_supply_rate - a.total_supply_rate
                    );
                    try {
                        if (_options.type !== "toggle_faster") {
                            let messageService = new MessageService()
                            await messageService.createMessage(
                                message.content.text,
                                {
                                    action: "STAKE_POOLS",
                                    data_extract: content
                                })

                        }
                        callback({
                            user: await runtime.character.name,
                            text: "Double-check all the details before takeoff to dodge any turbulence!",
                            action: "STAKE_TOKEN",
                            result: {
                                type: type_action === "stake" ? "stake_token" : "unstake_token",
                                data: arrayMap[0],
                            },
                        });
                        return true;
                    } catch (error) {
                        console.error("Error during token swap:", error);
                        return false;
                    }
                    break;
            }

        }
        if (content.type === "my_stake") {
            try {

                // const portfolio = await getAddressPortfolio(message.userId, false, suiClient);
                // // Convert the Map to an object
                // const portfolioObject = Object.fromEntries(portfolio);
                // const scallopPortfolio = await scallopProvider.myStake(message.userId);
                if (_options.type !== "toggle_faster") {
                    let messageService = new MessageService()
                    await messageService.createMessage(
                        message.content.text,
                        {
                            action: "STAKE_POOLS",
                            data_extract: content
                        })

                }
                callback({
                    user: await runtime.character.name,
                    text: "Here’s your staking portfolio, all set and ready!",
                    action: "STAKE_TOKEN",
                    result: {
                        type: "my_stake",
                        // data: {
                        //     navi: portfolioObject,
                        //     scallop: scallopPortfolio
                        // },
                    },
                });
                return true;
            } catch (error) {
                console.error("Error fetching staking portfolio:", error);
                return false;
            }
        }

    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Stake USDC",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Stake USDC",
                    action: "STAKE_TOKEN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Stake {TOKEN_SYMBOL}",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Stake {TOKEN_SYMBOL}",
                    action: "STAKE_TOKEN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "My stake",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "My stake",
                    action: "STAKE_TOKEN",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
