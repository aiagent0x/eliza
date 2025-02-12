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
import getActionHint from "../utils/action_hint";
import { searchPoolInFileJson, listPoolsInFileJson, pool } from "../providers/searchPoolInFile";
import { getPoolInfo } from "navi-sdk";
import { RedisClient } from "@elizaos/adapter-redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL);

const stakeTokenTemplate = `
Recent messages: {{recentMessages}}  
Extract the staking parameters from the conversation above, following these rules:  
- Sample Pool Names: SUI, USDT, WETH, CETUS, VoloSui, HaedalSui, NAVX, WBTC, AUSD, wUSDC, nUSDC, ETH, USDY, NS, stBTC, DEEP, FDUSD, BLUE, BUCK, suiUSDT, stSUI, suiBTC.  
- Return only a JSON object with the specified fields in this format:  

    {  
         "type": "list" | "pool_name",  
         "pool_name": string | SUI,  
         "amount": number | 0  
    }  

- Use '"type": "list"' when the request is about listing pools (e.g., "stake pools", "top 10 stake pools").  
- Use '"type": "pool_name"' when the request specifies a pool name (e.g., "stake 10 SUI").  
- Set '"pool_name"' to null if no specific pool is mentioned.  
- Use 'null' for any values that cannot be determined.  
- All property names must use double quotes.  
- Null values should not use quotes.  
- No trailing commas allowed.  
- No single quotes anywhere in the JSON.  
`;

export const stakeNavi: Action = {
    name: "STAKE_TOKEN",
    similes: ["TOKEN_STAKE", "STAKE_{INPUT}", "STAKE_TOKEN", "STAKE_POOL"],
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
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const stakeTokenContext = composeContext({
            state,
            template: stakeTokenTemplate,
        });

        const content = await generateObjectDeprecated({
            runtime,
            context: stakeTokenContext,
            modelClass: ModelClass.SMALL,
        });
        elizaLogger.info("content:", content);

        if (content.type === "list") {
            if (typeof content.amount === "string") content.amount = parseInt(content.amount, 5);
            if (content.amount === 0) content.amount = 5;
            let data = await redis.getValue({ key: "STAKE_POOLS" });
            if (data !== undefined) {
                callback({
                    text: "Below is a list of stake pools:",
                    action: "STAKE_POOLS",
                    result: {
                        type: "stake_pools",
                        data: JSON.parse(data).slice(0, content.amount),
                    },
                });
                return true;
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
            try {
                callback({
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
            let responseData = await searchPoolInFileJson(content.pool_name);
            let symbolOnPoolNavi;
            for (let key in pool) {
                if (content.pool_name.toLowerCase() === key.toLowerCase()) {
                    symbolOnPoolNavi = key;
                }
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
                    text: "Please ensure all details are correct before proceeding with the swap to prevent any losses:",
                    action: "STAKE_TOKEN",
                    result: {
                        type: "stake_token",
                        data: responseData,
                    },
                });
                return true;
            } catch (error) {
                console.error("Error during token swap:", error);
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
    ] as ActionExample[][],
} as Action;
