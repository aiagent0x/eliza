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
import { RedisClient } from "@elizaos/adapter-redis";
import { ScallopProvider } from "../providers/fetchScallop/scallopProvider";
import { listPool } from "../providers/fetchSuilend/listPools";
import { getDetail } from "../providers/fetchSuilend/getDetail";
import getActionHint from "../utils/action_hint";
import MessageService from "../services/messageService";
import BigNumber from "bignumber.js";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL);

const stakeTokenTemplate = `
Recent messages: {{recentMessages}}  

Extract the staking parameters from the latest message only, following these rules:  

- Sample Pool Names Navi: SUI, USDT, WETH, CETUS, VoloSui, HaedalSui, **NAVX**, WBTC, AUSD, wUSDC, nUSDC, ETH, USDY, NS, stBTC, DEEP, FDUSD, BLUE, BUCK, suiUSDT, stSUI, **WAL**.  
- Sample Pool Names Scallop: usdc, sbeth, sbusdt, sbwbtc, weth, wbtc, wusdc, wusdt, sui, wapt, wsol, cetus, afsui, hasui, vsui, sca, fud, deep, fdusd, blub, "musd, **WAL**.
- Sample Pool Names Suilend: SUI, **SEND**, **WAL**, DEEP, mUSD, suiUSDT, wBTC, AUSD, trevinSUI, LBTC, sSUI, USDC, BUCK, SOL, upSUI, fudSUI, mSUI, kSUI, suiETH, wUSDT, HIPPO, HIPPO, wUSDC, WETH, NS, BLUE, FUD, yapSUI, iSUI, KOBAN.
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
Rules:
- NAVX is always treated as a token symbol, not a protocol.
- Navi is always treated as a protocol, not a token symbol.
- If multiple protocols ("Navi", "Scallop", "Suilend") appear together, determine the correct protocol as follows:
  - If the message contains "on", "of", or "in", assign the protocol that appears after these words.
  - If no such word exists, assign "protocol": "all".
- If the token or pool name appears in the sample list above, use it as pool_name.
- If the token or pool name does not appear in the sample list but is clearly mentioned (e.g., “stake SEED”, “stake BTC”, "stake [POOL_NAME]", “unstake SEED”, “unstake [POOL_NAME]”, "list of [POOL_NAME] staking pools", "[POOL_NAME] pools please", "[POOL_NAME] staking pools", "[POOL_NAME] lending pools"), treat the word after "stake" or "unstake" as the pool_name and set it as-is, even if it's not in the sample list.
- If the name is unknown but present, assign it directly as pool_name.
- If the message mentions anything related to "my stake", "show me my stake", or similar phrases, set "type" to "my_stake", "type_action" to "stake", "pool_name" to null, "amount" to 0, and "protocol" to "all".
- Use "type": "list" when the request is about listing pools (e.g., "stake pools", "top 10 stake pools", "staking pools").
- Use "type": "pool_name" when the request specifies a pool name (e.g., "stake 10 SUI", "unstake 5 NAVX", "stake 1 WAL").
- Use "type_action": "stake" when the request involves staking tokens.
- Use "type_action": "unstake" when the request involves unstaking tokens.
- If the message explicitly mentions "Navi", "Scallop", or "Suilend", set "protocol" accordingly. Otherwise, set "protocol": "all".

Special Rules:
- If the message is about listing pools generally without mentioning a specific token or pool (e.g., "list of staking pools", "show me staking pools"), then:
  - Set "type_action": "stake"
  - Set "type": "list"
  - Set "pool_name": null
  - Set "amount": 0
  - Set "protocol": "all"
- If the message mentions a list related to a specific token or pool name (e.g., "list of WAL token staking pools", "list of NAVX staking pools", "list of WETH staking pools", "deep pools please", "sui pools please", "Sca staking pools", "list of [token_name] token staking pools", "list of [pool_name] token staking pools", "list of [pool_name] token lending pools", "list of [token_name] token lending pools", etc.), then:
  - Set "type_action": "stake"
  - Set "type": "list"
  - Set "pool_name" : "[pool_name]"
  - Set "amount": 0
  - Set "protocol": "all"

Other notes:
- Ensure "pool_name" is always a valid pool name or token symbol from the sample lists above. If an invalid name is detected, set it to null.
- Use null for any values that cannot be determined.
- Only return one JSON object, not an array.
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
    description: "Stake token, stake pool, unstake token, withdraw token, lending pools",
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
                    modelClass: ModelClass.MEDIUM,
                });
                await runtime.cacheManager.set(msgHash, content, { expires: Date.now() + 300000 });
            }
        }
        elizaLogger.info("content:", content)
        if (content.pool_name !== "null" && content.type === "list") {
            delete content.protocol;
            content.protocol = "all";
        }
        const scallopProvider = new ScallopProvider();
        let listPoolsNaviOnSite = await getPoolsInfo();
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
                        // if (_options.type !== "toggle_faster") {
                        //     let messageService = new MessageService()
                        //     await messageService.createMessage(
                        //         message.content.text,
                        //         {
                        //             action: "STAKE_TOKEN",
                        //             data_extract: content
                        //         })

                        // }
                        callback({
                            user: await runtime.character.name,
                            text: "Here are the available Navi staking pools",
                            action: "STAKE_POOLS",
                            result: {
                                type: "stake_pools",
                                data: parsedData.slice(0, content.amount),
                            },
                        });
                        return true;
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
                        // if (_options.type !== "toggle_faster") {
                        //     let messageService = new MessageService()
                        //     await messageService.createMessage(
                        //         message.content.text,
                        //         {
                        //             action: "STAKE_TOKEN",
                        //             data_extract: content
                        //         })

                        // }
                        callback({
                            user: await runtime.character.name,
                            text: "Here are the available Navi staking pools",
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
                case "scallop":
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
                        // if (_options.type !== "toggle_faster") {
                        //     let messageService = new MessageService()
                        //     await messageService.createMessage(
                        //         message.content.text,
                        //         {
                        //             action: "STAKE_TOKEN",
                        //             data_extract: content
                        //         })

                        // }
                        callback({
                            user: await runtime.character.name,
                            text: "Here are the available Scallop staking pools",
                            action: "STAKE_POOLS",
                            result: {
                                type: "stake_pools",
                                data: poolsScallopData.slice(0, content.amount),
                            },
                        });
                        return true;
                    }
                    listPoolsScallop = await scallopProvider.listPools();
                    listPoolsScallop.sort(
                        (a, b) =>
                            b.total_supply_rate - a.total_supply_rate
                    );
                    try {
                        // if (_options.type !== "toggle_faster") {
                        //     let messageService = new MessageService()
                        //     await messageService.createMessage(
                        //         message.content.text,
                        //         {
                        //             action: "STAKE_TOKEN",
                        //             data_extract: content
                        //         })

                        // }
                        callback({
                            user: await runtime.character.name,
                            text: "Here are the available Scallop staking pools:",
                            action: "STAKE_POOLS",
                            result: {
                                type: "stake_pools",
                                data: listPoolsScallop.slice(0, content.amount),
                            },
                        });
                        return true;
                    } catch (error) {
                        console.error("Error during token swap:", error);
                        return false;
                    }
                    break;
                case "suilend":
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
                        // if (_options.type !== "toggle_faster") {
                        //     let messageService = new MessageService()
                        //     await messageService.createMessage(
                        //         message.content.text,
                        //         {
                        //             action: "STAKE_TOKEN",
                        //             data_extract: content
                        //         })

                        // }
                        callback({
                            user: await runtime.character.name,
                            text: "Here are the available Suilend staking pools:",
                            action: "STAKE_POOLS",
                            result: {
                                type: "stake_pools",
                                data: poolsSuilendData.slice(0, content.amount),
                            },
                        });
                        return true;
                    }
                    listPoolSuilend = await listPool(message.userId);

                    listPoolSuilend.sort(
                        (a, b) =>
                            b.total_supply_rate - a.total_supply_rate
                    );
                    try {
                        // if (_options.type !== "toggle_faster") {
                        //     let messageService = new MessageService()
                        //     await messageService.createMessage(
                        //         message.content.text,
                        //         {
                        //             action: "STAKE_TOKEN",
                        //             data_extract: content
                        //         })

                        // }
                        callback({
                            user: await runtime.character.name,
                            text: "Below is a list of Suilend staking pools:",
                            action: "STAKE_POOLS",
                            result: {
                                type: "stake_pools",
                                data: listPoolSuilend.slice(0, content.amount),
                            },
                        });
                        return true;
                    } catch (error) {
                        console.error("Error during token swap:", error);
                        return false;
                    }
                    break;
                default:
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
                        if (content.pool_name !== "null") {
                            parsedData = parsedData.filter(
                                (pool) =>
                                    pool.symbol.toLowerCase() === content.pool_name.toLowerCase()
                            );
                        }
                        parsedData.sort(
                            (a: any, b: any) =>
                                b.total_supply_rate - a.total_supply_rate
                        );

                        // if (_options.type !== "toggle_faster") {
                        //     let messageService = new MessageService()
                        //     await messageService.createMessage(
                        //         message.content.text,
                        //         {
                        //             action: "STAKE_TOKEN",
                        //             data_extract: content
                        //         })

                        // }
                        callback({
                            user: await runtime.character.name,
                            text: parsedData.length !== 1 ? "Here are the available Suilend staking pools:" : "",
                            action: "STAKE_POOLS",
                            result: {
                                type: "stake_pools",
                                data: parsedData.slice(0, content.amount),
                            },
                        });
                        return true;
                    }

                    listPoolSuilend = await listPool(message.userId);
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
                    if (content.pool_name !== "null") {
                        responseData = responseData.filter(
                            (pool) =>
                                pool.symbol.toLowerCase() === content.pool_name.toLowerCase()
                        );
                    }
                    responseData.sort(
                        (a, b) =>
                            b.total_supply_rate - a.total_supply_rate
                    );
                    try {
                        // if (_options.type !== "toggle_faster") {
                        //     let messageService = new MessageService()
                        //     await messageService.createMessage(
                        //         message.content.text,
                        //         {
                        //             action: "STAKE_TOKEN",
                        //             data_extract: content
                        //         })

                        // }
                        callback({
                            user: await runtime.character.name,
                            text: responseData.length !== 1 ? "Here are the available Suilend staking pools" : "",
                            action: "STAKE_POOLS",
                            result: {
                                type: "stake_pools",
                                data: responseData.slice(0, content.amount),
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
            let dataNavi;
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
                    dataNavi = await searchPoolInFileJson(content.pool_name ? content.pool_name : "Sui");
                    if (!dataNavi) {
                        callback({
                            user: await runtime.character.name,
                            text: "We couldn't find staking pools in Navi.",
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

                    let resultNavi = await redis.hGet("STAKE_NAVI_POOLS", dataNavi.name);
                    if (resultNavi && typeof resultNavi === "string" && resultNavi !== null) {
                        // if (_options.type !== "toggle_faster") {
                        //     let messageService = new MessageService()
                        //     await messageService.createMessage(
                        //         message.content.text,
                        //         {
                        //             action: "STAKE_TOKEN",
                        //             data_extract: content
                        //         })

                        // }
                        callback({
                            user: await runtime.character.name,
                            text: "Please ensure all details are correct before proceeding with the swap to prevent any losses",
                            action: "STAKE_TOKEN",
                            result: {
                                type: type_action === "stake" ? "stake_token" : "unstake_token",
                                data: { ...JSON.parse(resultNavi), amount: content.amount, protocol: "navi" },
                            },
                        });
                        return true;
                    }
                    if (listPoolsNaviOnSite !== null && listPoolsNaviOnSite.length > 0) {
                        if (dataNavi.type === "0x2::sui::SUI") {
                            dataNavi.typeCoin = "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI";
                        } else {
                            dataNavi.typeCoin = dataNavi.type;
                        }
                        for (let j = 0; j < listPoolsNaviOnSite.length; j++) {
                            if (`0x${listPoolsNaviOnSite[j].coinType}` === dataNavi.typeCoin) {
                                dataNavi.total_supply = new BigNumber(listPoolsNaviOnSite[j].totalSupplyAmount).dividedBy(1e9).toString();
                                dataNavi.total_borrow = new BigNumber(listPoolsNaviOnSite[j].borrowedAmount).dividedBy(1e9).toString();
                                dataNavi.base_supply_rate = new BigNumber(listPoolsNaviOnSite[j].currentSupplyRate).dividedBy(1e9).toString();
                                dataNavi.base_borrow_rate = new BigNumber(listPoolsNaviOnSite[j].currentBorrowRate).dividedBy(1e9).toString();
                                dataNavi.boosted_supply_rate = new BigNumber(listPoolsNaviOnSite[j].supplyIncentiveApyInfo.boostedApr).toString();
                                dataNavi.boosted_borrow_rate = new BigNumber(listPoolsNaviOnSite[j].borrowIncentiveApyInfo.boostedApr).toString();
                                dataNavi.base_supply_rate = listPoolsNaviOnSite[j].supplyIncentiveApyInfo.apy;
                                dataNavi.total_supply_rate = listPoolsNaviOnSite[j].supplyIncentiveApyInfo.apy;
                                dataNavi.protocol = "navi";
                            }
                        }
                    }
                    else {
                        dataNavi = {};
                    }

                    try {
                        // if (_options.type !== "toggle_faster") {
                        //     let messageService = new MessageService()
                        //     await messageService.createMessage(
                        //         message.content.text,
                        //         {
                        //             action: "STAKE_TOKEN",
                        //             data_extract: content
                        //         })

                        // }
                        callback({
                            user: await runtime.character.name,
                            text: "Please ensure all details are correct before proceeding with the swap to prevent any losses",
                            action: "STAKE_TOKEN",
                            result: {
                                type: type_action === "stake" ? "stake_token" : "unstake_token",
                                data: dataNavi,
                            },
                        });
                        return true;
                    } catch (error) {
                        console.error("Error during token swap:", error);
                        return false;
                    }
                    break;
                case "scallop":
                    type_action = content.type_action;
                    if (content.pool_name === null || content.pool_name === "null") {
                        content.pool_name = "sui"
                    }
                    dataScallop = await redis.hGet("STAKE_POOLS_SCALLOP", content.pool_name.toLowerCase());
                    if (dataScallop && typeof dataScallop === "string" && dataScallop !== null) {
                        // if (_options.type !== "toggle_faster") {
                        //     let messageService = new MessageService()
                        //     await messageService.createMessage(
                        //         message.content.text,
                        //         {
                        //             action: "STAKE_TOKEN",
                        //             data_extract: content
                        //         })

                        // }
                        callback({
                            user: await runtime.character.name,
                            text: "Please ensure all details are correct before proceeding with the swap to prevent any losses",
                            action: "STAKE_TOKEN",
                            result: {
                                type: type_action === "stake" ? "stake_token" : "unstake_token",
                                data: { ...JSON.parse(dataScallop), amount: content.amount, protocol: "scallop" },
                            },
                        });
                        return true;
                    }
                    poolScallopInfo = await scallopProvider.getDetail(content.pool_name.toLowerCase());
                    try {
                        if (!poolScallopInfo) {
                            callback({
                                user: await runtime.character.name,
                                // text: "We couldn't find staking pools in Scallop. You can search in list staking pools of Scallop:",
                                text: "We couldn't find staking pools in Scallop.",
                                action: "STAKE_TOKEN",
                                action_hint: getActionHint(
                                    "scallop pools",
                                    "button_generate_text",
                                    "scallop",
                                    "stake"
                                )
                            });
                            return true
                        }
                        // if (_options.type !== "toggle_faster") {
                        //     let messageService = new MessageService()
                        //     await messageService.createMessage(
                        //         message.content.text,
                        //         {
                        //             action: "STAKE_TOKEN",
                        //             data_extract: content
                        //         })

                        // }
                        callback({
                            user: await runtime.character.name,
                            text: "Please ensure all details are correct before proceeding with the swap to prevent any losses",
                            action: "STAKE_TOKEN",
                            result: {
                                type: type_action === "stake" ? "stake_token" : "unstake_token",
                                data: poolScallopInfo,

                            },
                        });
                        return true

                    } catch (error) {
                        console.error("Error during token swap:", error);
                        return false;
                    }
                    break;
                case "suilend":
                    type_action = content.type_action;
                    if (content.pool_name === null || content.pool_name === "null") {
                        content.pool_name = "sui"
                    }
                    dataSuilend = await redis.hGet("STAKE_POOLS_SUILEND", content.pool_name.toLowerCase());
                    if (dataSuilend && typeof dataSuilend === "string" && dataSuilend !== null) {
                        // if (_options.type !== "toggle_faster") {
                        //     let messageService = new MessageService()
                        //     await messageService.createMessage(
                        //         message.content.text,
                        //         {
                        //             action: "STAKE_TOKEN",
                        //             data_extract: content
                        //         })

                        // }
                        callback({
                            user: await runtime.character.name,
                            text: "Please ensure all details are correct before proceeding with the swap to prevent any losses",
                            action: "STAKE_TOKEN",
                            result: {
                                type: type_action === "stake" ? "stake_token" : "unstake_token",
                                data: { ...JSON.parse(dataSuilend), amount: content.amount, protocol: "suilend" },
                            },
                        });
                        return true;
                    }
                    poolSuilendInfo = await getDetail(content.pool_name);

                    try {
                        if (!poolSuilendInfo || poolSuilendInfo.length === 0) {
                            callback({
                                user: await runtime.character.name,
                                text: "We couldn't find staking pools in Suilend",
                                action: "STAKE_TOKEN",
                                action_hint: getActionHint(
                                    "suilend pools",
                                    "button_generate_text",
                                    "suilend",
                                    "stake"
                                )

                            });
                            return true
                        }
                        // if (_options.type !== "toggle_faster") {
                        //     let messageService = new MessageService()
                        //     await messageService.createMessage(
                        //         message.content.text,
                        //         {
                        //             action: "STAKE_TOKEN",
                        //             data_extract: content
                        //         })

                        // }
                        callback({
                            user: await runtime.character.name,
                            text: "Please ensure all details are correct before proceeding with the swap to prevent any losses",
                            action: "STAKE_TOKEN",
                            result: {
                                type: type_action === "stake" ? "stake_token" : "unstake_token",
                                data: poolSuilendInfo[0],
                            },
                        });
                        return true
                    } catch (error) {
                        console.error("Error during token swap:", error);
                        return false;
                    }
                    break;
                default:
                    type_action = content.type_action;
                    if (content.pool_name === null || content.pool_name === "null") {
                        content.pool_name = "Sui"
                    }
                    //Navi
                    dataNavi = await searchPoolInFileJson(content.pool_name ? content.pool_name : "Sui");
                    if (dataNavi) {

                        let resultNavi = await redis.hGet("STAKE_NAVI_POOLS", symbolOnPoolNavi);
                        if (resultNavi && typeof resultNavi === "string" && resultNavi !== null) {
                            callback({
                                user: await runtime.character.name,
                                text: "Please ensure all details are correct before proceeding with the swap to prevent any losses",
                                action: "STAKE_TOKEN",
                                result: {
                                    type: type_action === "stake" ? "stake_token" : "unstake_token",
                                    data: { ...JSON.parse(resultNavi), amount: content.amount, protocol: "navi" },
                                },
                            });
                            return true;
                        }

                        if (listPoolsNaviOnSite !== null && listPoolsNaviOnSite.length > 0) {
                            if (dataNavi.type === "0x2::sui::SUI") {
                                dataNavi.typeCoin = "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI";
                            } else {
                                dataNavi.typeCoin = dataNavi.type;
                            }
                            for (let j = 0; j < listPoolsNaviOnSite.length; j++) {
                                if (`0x${listPoolsNaviOnSite[j].coinType}` === dataNavi.typeCoin) {
                                    dataNavi.total_supply = new BigNumber(listPoolsNaviOnSite[j].totalSupplyAmount).dividedBy(1e9).toString();
                                    dataNavi.total_borrow = new BigNumber(listPoolsNaviOnSite[j].borrowedAmount).dividedBy(1e9).toString();
                                    dataNavi.base_supply_rate = new BigNumber(listPoolsNaviOnSite[j].currentSupplyRate).dividedBy(1e9).toString();
                                    dataNavi.base_borrow_rate = new BigNumber(listPoolsNaviOnSite[j].currentBorrowRate).dividedBy(1e9).toString();
                                    dataNavi.boosted_supply_rate = new BigNumber(listPoolsNaviOnSite[j].supplyIncentiveApyInfo.boostedApr).toString();
                                    dataNavi.boosted_borrow_rate = new BigNumber(listPoolsNaviOnSite[j].borrowIncentiveApyInfo.boostedApr).toString();
                                    dataNavi.base_supply_rate = listPoolsNaviOnSite[j].supplyIncentiveApyInfo.apy;
                                    dataNavi.total_supply_rate = listPoolsNaviOnSite[j].supplyIncentiveApyInfo.apy;
                                    dataNavi.protocol = "navi";
                                }
                            }
                        }
                        else {
                            dataNavi = {};
                        }

                    }
                    //Scallop 
                    dataScallop = await redis.hGet("STAKE_POOLS_SCALLOP", content.pool_name.toLowerCase());
                    if (dataScallop && typeof dataScallop === "string" && dataScallop !== null) {
                        dataScallop = { ...JSON.parse(dataScallop), amount: content.amount, protocol: "scallop" }
                    }
                    else {
                        poolScallopInfo = await scallopProvider.getDetail(content.pool_name.toLowerCase());
                        dataScallop = poolScallopInfo;
                    }
                    //Suilend
                    dataSuilend = await redis.hGet("STAKE_POOLS_SUILEND", content.pool_name.toLowerCase());
                    if (dataSuilend && typeof dataSuilend === "string" && dataSuilend !== null) {
                        dataSuilend = { ...JSON.parse(dataSuilend), amount: content.amount, protocol: "suilend" };
                    }
                    else {
                        poolSuilendInfo = await getDetail(content.pool_name);
                        dataSuilend = poolSuilendInfo;
                    }
                    //Map
                    const arrayMap = [dataNavi, dataScallop];
                    if (Array.isArray(dataSuilend)) {
                        arrayMap.push(...dataSuilend);
                    } else {
                        arrayMap.push(dataSuilend);
                    }
                    if (arrayMap.every(item => item === undefined || item === null) || arrayMap.every(item => item === undefined)) {
                        callback({
                            user: await runtime.character.name,
                            // text: "We couldn't find staking pools. You can search in the list of staking pools:",
                            text: "We couldn't find staking pools.",
                            action: "STAKE_TOKEN",
                            action_hint: getActionHint(
                                "all stake pools",
                                "button_generate_text",
                                "all",
                                "stake"
                            )
                        });
                        return true;
                    }
                    arrayMap.sort(
                        (a, b) =>
                            b.total_supply_rate - a.total_supply_rate
                    );
                    try {
                        // if (_options.type !== "toggle_faster") {
                        //     let messageService = new MessageService()
                        //     await messageService.createMessage(
                        //         message.content.text,
                        //         {
                        //             action: "STAKE_TOKEN",
                        //             data_extract: content
                        //         })

                        // }
                        callback({
                            user: await runtime.character.name,
                            text: "Please ensure all details are correct before proceeding with the swap to prevent any losses",
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
                // const portfolioObject = Object.fromEntries(portfolio);
                // const scallopPortfolio = await scallopProvider.myStake(message.userId);
                // if (_options.type !== "toggle_faster") {
                //     let messageService = new MessageService()
                //     await messageService.createMessage(
                //         message.content.text,
                //         {
                //             action: "STAKE_POOLS",
                //             data_extract: content
                //         })

                // }
                callback({
                    user: await runtime.character.name,
                    text: "Here is your staking portfolio:",
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
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Navi staking pools",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    action: "STAKE_TOKEN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Suilend staking pools",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    action: "STAKE_TOKEN",
                },
            },
        ]
        ,
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Scallop staking pools",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    action: "STAKE_TOKEN",
                },
            },
        ]
    ] as ActionExample[][],
} as Action;
