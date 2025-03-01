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
import { searchPoolInFileJson } from "../providers/searchPoolInFile";
import {getPoolInfo, pool} from "navi-sdk";
// // import { RedisClient } from "@elizaos/adapter-redis";
const unstakeTokenTemplate = `
Recent messages: {{recentMessages}}
Extract the swap parameters from the conversation and wallet context above, follows these rules:
Sample Pool Names in NAVI: SUI, USDT, WETH, CETUS, VoloSui, HaedalSui, NAVX, WBTC, AUSD, wUSDC, nUSDC, ETH, USDY, NS, stBTC, DEEP, FDUSD, BLUE, BUCK, suiUSDT, stSUI, suiBTC.
    - Return only a JSON object with the specified fields in thise format:
        {
            "pool_name": string | NAVX,
        }
    - Use null for any values that cannot be determined.
    - All property names must use double quotes
    - Null values should not use quotes
    - No trailing commas allowed
    - No single quotes anywhere in the JSON
`;
export const unstakeTokenPoolsNavi: Action = {
    name: "UNSTAKE_TOKEN",
    similes: [
        "UNTOKEN_STAKE",
        "UNSTAKE_{INPUT}",
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "unStake by token",
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
        
                const stakeTokenContext = composeContext({
                    state,
                    template: unstakeTokenTemplate,
                });
        
                const content = await generateObjectDeprecated({
                    runtime,
                    context: stakeTokenContext,
                    modelClass: ModelClass.SMALL,
                });
                elizaLogger.info("content:",content)
                if(content.pool_name ==="null" || content.pool_name) content.pool_name = "SUI";
                let responseData = await searchPoolInFileJson(content.pool_name);
                elizaLogger.info(responseData)
                let symbolOnPoolNavi;
                
                for (let key in pool) {
                    if (content.pool_name.toLowerCase() === key.toLowerCase()) {
                        
                        symbolOnPoolNavi = key;
                    }
        
                }
                elizaLogger.info(symbolOnPoolNavi)
                let poolInfo = await getPoolInfo({
                    symbol: symbolOnPoolNavi,
                    address: responseData.type,
                    decimal:responseData.decimal
                });
                // elizaLogger.info(poolInfo)
                responseData.name = symbolOnPoolNavi;
                responseData.total_supply = poolInfo.total_supply;
                responseData.total_borrow = poolInfo.total_borrow;
                responseData.base_supply_rate = poolInfo.base_supply_rate;
                responseData.base_borrow_rate = poolInfo.base_borrow_rate;
                responseData.boosted_supply_rate = poolInfo.boosted_supply_rate;
                responseData.boosted_borrow_rate = poolInfo.boosted_borrow_rate;
                responseData.amount = content.amount
                try {
                    callback({
                       text: "Please ensure all details are correct before proceeding with the swap to prevent any losses:",
                       action:"UNSTAKE_TOKEN",
                       result: {
                        type: "unstake_token",
                        data:responseData,
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
                    text: "UnStake USDC",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "UnStake USDC",
                    action: "UNSTAKE_TOKEN",

                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "UnStake {TOKEN_SYMBOL}",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "UnStake {TOKEN_SYMBOL}",
                    action: "UNSTAKE_TOKEN",

                },
            },
        ]
    ] as ActionExample[][],
} as Action;
