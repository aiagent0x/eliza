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
import { CetusProvider } from "../providers/fetchCetus/fetchListLiquidityPools";
const topLiquidityPoolTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.
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
export const liquidityPoolsCetus: Action = {
    name: "LIQUIDITY_POOLS",
    similes: [
        "POOLS_LIQUIDITY"
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "List liquidity pools",
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

        const topLiquidityPoolContext = composeContext({
            state,
            template: topLiquidityPoolTemplate,
        });

        const content = await generateObjectDeprecated({
            runtime,
            context: topLiquidityPoolContext,
            modelClass: ModelClass.SMALL,
        });
        elizaLogger.info("content:",content);
        // let responseData = await listPoolsInFileJson();
        // let getPools = await getPoolInfo(pool);
        let cetusProvider = new CetusProvider();
        let result:any  = await cetusProvider.fetchLiquidityPools();
        // console.log(responseData);
        // let responseData = 
        try {
            callback({
                user: await runtime.character.name,
               text: "Below is a list of liquidity pools:",
               action:"LIQUIDITY_POOLS",
               result: {
                type: "liquidity_pools",
                data:result.data.lp_list.slice(0,content.size),
                // poolInfoArray:poolInfoArray,
                // action_hint:getActionHint()
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
                    text: "Liquidity pools",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Liquidity pools",
                    action: "LIQUIDITY_POOLS",

                },
            },
        ],
    ] as ActionExample[][],
} as Action;
