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
import { getPoolInfo, getAddressPortfolio } from "navi-sdk";
import { SuiClient } from "@mysten/sui/client";
import { RedisClient } from "@elizaos/adapter-redis";
import { ScallopProvider } from "../providers/fetchScallop/scallopProvider";
// import { listPool } from "../providers/fetchSuilend/listPools";
const suiClient = new SuiClient({
    url: "https://fullnode.mainnet.sui.io"
});

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL);

const stakeTokenTemplate = `
Recent messages: {{recentMessages}}  
Extract the staking parameters from the latest message only, following these rules:  

- Sample Pool Names Navi: SUI, USDT, WETH, CETUS, VoloSui, HaedalSui, NAVX, WBTC, AUSD, wUSDC, nUSDC, ETH, USDY, NS, stBTC, DEEP, FDUSD, BLUE, BUCK, suiUSDT, stSUI, suiBTC.  
- Sample Pool Name Scallop: "usdc", "sbeth", "sbusdt", "sbwbtc", "weth", "wbtc", "wusdc", "wusdt", "sui", "wapt", "wsol", "cetus", "afsui", "hasui", "vsui", "sca", "fud", "deep", "fdusd", "blub", "musd"
- **Extract data only from the latest message** and discard any previous messages.  
- Return only a **single JSON object** with the specified fields in this format:  
    \`\`\`json
    {  
         "type_action": "stake" | "unstake",  
         "type": "list" | "pool_name" | "my_stake",  
         "pool_name": string | null,
         "amount": number | 0,
         "protocol": "navi" | "scallop"
    }  
    \`\`\`
- If multiple staking requests are detected, return only the **first valid** request found in the conversation.  
- If the message mentions anything related to "my stake", "show me my stake", or similar phrases, set '"type"' to '"my_stake"', '"type_action"' to '"stake"', '"pool_name"' to 'null', and '"amount"' to '0'. The '"protocol"' should default to '"navi"'.  
- Use '"type": "list"' when the request is about listing pools (e.g., "stake pools", "top 10 stake pools", "staking pools").  
- Use '"type": "pool_name"' when the request specifies a pool name (e.g., "stake 10 SUI", "unstake 5 NAVX").  
- Use '"type_action": "stake"' when the request involves staking tokens.  
- Use '"type_action": "unstake"' when the request involves unstaking tokens.  
- Set '"protocol"' to '"scallop"' if the request explicitly mentions "Scallop"; otherwise, default to '"navi"'.  
- Use 'null' for any values that cannot be determined.  
- **Only return one JSON object, not an array.**  
- All property names must use double quotes.  
- Null values should not use quotes.  
- No trailing commas allowed.  
- No single quotes anywhere in the JSON.  
`;

export const stake: Action = {
    name: "STAKE_TOKEN",
    similes: ["TOKEN_STAKE", "STAKE_{INPUT}", "STAKE_TOKEN", "STAKE_POOLS", "MY_STAKE"],
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
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }
        const msgHash = hashUserMsg(message, "stake");
        let content: any = await runtime.cacheManager.get(msgHash);
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
        elizaLogger.info("content:", content)
        const scallopProvider = new ScallopProvider();
        if (content.type === "list") {
            if (typeof content.amount === "string") content.amount = parseInt(content.amount, 5);
            if (content.amount === 0) content.amount = 5;


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
                parsedData.sort((a: any, b: any) => {
                    return b.total_supply_rate - a.total_supply_rate;
                });
                callback({
                    user: await runtime.character.name,
                    text: "Below is a list of stake pools:",
                    action: "STAKE_POOLS",
                    result: {
                        type: "stake_pools",
                        data: parsedData.slice(0, content.amount),
                    },
                });
                return true;
            }


            const listPoolsScallop = await scallopProvider.listPools();
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
            responseData = responseData.concat(listPoolsScallop);
            responseData.sort(
                (a, b) =>
                    b.total_supply_rate - a.total_supply_rate
            );
            try {
                callback({
                    user: await runtime.character.name,
                    text: "Below is a list of stake pools:",
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

        }
        if (content.type === "pool_name") {
            switch (content.protocol) {
                case "navi":
                    let type_action = content.type_action;
                    if (content.pool_name === null || content.pool_name === "null") {
                        content.pool_name = "wUSDC"
                    }
                    let responseData = await searchPoolInFileJson(content.pool_name ? content.pool_name : "wUSDC");
                    let symbolOnPoolNavi;
                    for (let key in pool) {

                        if (responseData.name.toLowerCase() === key.toLowerCase() || responseData.symbol.toLowerCase() === key.toLowerCase()) {
                            symbolOnPoolNavi = key;
                        }
                    }
                    let data = await redis.hGet("STAKE_POOLS", symbolOnPoolNavi);
                    if (data && typeof data === "string" && data !== null) {
                        callback({
                            user: await runtime.character.name,
                            text: "Please ensure all details are correct before proceeding with the swap to prevent any losses",
                            action: "STAKE_TOKEN",
                            result: {
                                type: type_action === "stake" ? "stake_token" : "unstake_token",
                                data: { ...JSON.parse(data), amount: content.amount, protocol: "navi" },
                            },
                        });
                        return true;
                    }
                    let poolInfo = await getPoolInfo({
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
                    responseData.amount = content.amount;
                    try {
                        callback({
                            user: await runtime.character.name,
                            text: "Please ensure all details are correct before proceeding with the swap to prevent any losses",
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
                case "scallop":
                    let type_action_scallop = content.type_action;
                    if (content.pool_name === null || content.pool_name === "null") {
                        content.pool_name = "sui"
                    }

                    let dataScallop = await redis.hGet("STAKE_POOLS", content.pool_name.toLowerCase());
                    if (dataScallop && typeof dataScallop === "string" && dataScallop !== null) {
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
                   
                    let poolScallopInfo = await scallopProvider.getDetail(content.pool_name.toLowerCase());
                    
                    try {
                        callback({
                            user: await runtime.character.name,
                            text: "Please ensure all details are correct before proceeding with the swap to prevent any losses",
                            action: "STAKE_TOKEN",
                            result: {
                                type: type_action_scallop === "stake" ? "stake_token" : "unstake_token",
                                data: poolScallopInfo,
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

                const portfolio = await getAddressPortfolio(message.userId, false, suiClient);
                // Convert the Map to an object
                const portfolioObject = Object.fromEntries(portfolio);

                callback({
                    user: await runtime.character.name,
                    text: "Here is your staking portfolio:",
                    action: "STAKE_TOKEN",
                    result: {
                        type: "my_stake",
                        data: portfolioObject,
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
