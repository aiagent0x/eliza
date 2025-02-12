import {
    ActionExample,
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    // settings,
    State,
    type Action,
} from "@elizaos/core";
import getActionHint from "../utils/action_hint";
import { listPoolsInFileJson,pool } from "../providers/searchPoolInFile";
// // import { RedisClient } from "@elizaos/adapter-redis";
// import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import {getPoolInfo} from "navi-sdk";
import {RedisClient} from "@elizaos/adapter-redis";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL)
const topStakePoolTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.
Example response:
\`\`\`json
{
    size:5
}
\`\`\`
{{recentMessages}}
Extract ONLY from the current message (ignore any previous context or messages):
    Given the recent messages, extract the following information:
    size: Number of news items to return: Must be a positive integer Default is 5 if not specified Maximum value is 100 Minimum value is 1 If mentioned in message, use that number If not mentioned, use default value 5
VALIDATION RULES:
    All property names must use double quotes
    All string values must use double quotes
    null values should not use quotes
    No trailing commas allowed
    No single quotes anywhere in the JSON
Respond with a JSON markdown block containing only the extracted values.`;
export const stakePoolsNavi: Action = {
    name: "STAKE_POOLS",
    similes: [
        "POOLS_STAKE"
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "List stake pools",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        // composeState
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const topStakePoolContext = composeContext({
            state,
            template: topStakePoolTemplate,
        });

        const content = await generateObjectDeprecated({
            runtime,
            context: topStakePoolContext,
            modelClass: ModelClass.SMALL,
        });
        elizaLogger.info("content:",content);
        let data = await redis.getValue({key:"STAKE_POOLS"});
        if(data){
            callback({
                text: "Below is a list of stake pools:",
                action:"STAKE_POOLS",
                result: {
                 type: "stake_pools",
                 data:JSON.parse(data).slice(0,content.size),
                 
             }
             })
 
             return true;
        }
        let responseData = await listPoolsInFileJson();
        // let getPools = await getPoolInfo(pool);
        let poolInfoArray = [];
        let index = 0;

        for (let key in pool) {
            if (pool.hasOwnProperty(key)) {
            let poolInfo;
            if (pool[key]) {
            poolInfo = await getPoolInfo({
            symbol: key,
            address: pool[key].type,
            decimal: responseData[index].decimal
            });

            poolInfoArray.push(poolInfo);
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

        // Sort the responseData array by total (base_supply_rate + boosted_supply_rate) in descending order
        responseData.sort((a, b) => (parseFloat(b.base_supply_rate) + parseFloat(b.boosted_supply_rate)) - (parseFloat(a.base_supply_rate) + parseFloat(a.boosted_supply_rate)));
       

        try {
            callback({
               text: "Below is a list of stake pools:",
               action:"STAKE_POOLS",
               result: {
                type: "stake_pools",
                data:responseData.slice(0,content.size),
                
            }
            })

            return true;
        } catch (error) {
            console.error("Error during token swap:", error);
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Stake pools",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Stake pools",
                    action: "STAKE_POOLS",

                },
            },
        ],
    ] as ActionExample[][],
} as Action;
