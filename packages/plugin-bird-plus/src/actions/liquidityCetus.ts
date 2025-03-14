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

import { RedisClient } from "@elizaos/adapter-redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const redis = new RedisClient(REDIS_URL);
import { CetusProvider } from "../providers/fetchCetus/fetchListLiquidityPools";
import { findByVerifiedAndSymbol } from "../providers/searchCoinInAggre";
import getActionHint from "../utils/action_hint";
const topLiquidityPoolTemplate = `Recent messages: {{recentMessages}}  
Extract the liquidity pool parameters from the conversation above, following these rules:  

- Sample Pair Names: SUI-USDC, USDC-suiUSDT, DEEP-SUI, USDC-SUI, CETUS-SUI, HIPPO-SUI, USDC-ETH, LOFI-SUI, NS-SUI, USDC-USDY, USDC-BUCK, BUCK-SUI, wUSDC-SUI, haSUI-SUI, USDC-CETUS, afSUI-SUI, USDC-wUSDT, BLUE-SUI, ETH-WETH, USDC-WSOL, USDC-AUSD , stSUI-SUI, BUT-SUI, Sonic-SUI, AXOL-SUI, SEND-SUI, WSOL-SUI, etc. 
- **Extract data only from the latest message** and discard any previous messages.
- Return only a JSON object with the specified fields in this format:  
    \`\`\`json
        {  
            "type_action": "show_list" | "add",  
            "pair_name": string | SUI-USDC,  
            "amount_token_a": number | 0,  //is size list or amount token a
            "amount_token_b": number | 0, 
        }  
    \`\`\`
- Use '"type_action": "show_list"' when the request is about listing liquidity pools (e.g., "liquidity pools", "top 5 liquidity pools").  
- Use '"type_action": "add"' when the request specifies adding liquidity (e.g., "add liquidity SUI-USDC").  
- Set '"pair_name"' to null if no specific pair is mentioned.  
- If a specific token and amount are provided, assign it to the corresponding field ('amount_token_a' or 'amount_token_b').  
- If both tokens have amounts, only assign 'amount_token_a' and set 'amount_token_b' to '0'.  
- Use 'null' for any values that cannot be determined.  
- All property names must use double quotes.  
- Null values should not use quotes.  
- No trailing commas allowed.  
- No single quotes anywhere in the JSON.  
`;
export const liquidityCetus: Action = {
    name: "LIQUIDITY",
    similes: [
        "POOLS_LIQUIDITY",
        "ADD_LIQUIDITY",
        "FARM_LIQUIDITY",
        "FARM_{PAIR_NAME}",
        "FARMING_{PAIR_NAME}",
        "FARMING_LIQUIDITY",
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "liquidity cetus",
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
        elizaLogger.info("content:", content);

        if (content.type_action === "show_list") {
            if(parseInt(content.amount_token_a) === 0)content.amount_token_a = 5;
            let responseData = await redis.getValue({ key: "liquidity_pools" })
            if (responseData !== undefined) {
                callback({
                    user: await runtime.character.name,
                    text: "Here’s a lineup of liquidity pools for you!",
                    action: "LIQUIDITY_POOLS",
                    result: {
                        type: "liquidity_pools",
                        data: JSON.parse(responseData).slice(0, parseInt(content.amount_token_a )),
                    }
                })
                return true;
            }
            let cetusProvider = new CetusProvider();
            let result: any = await cetusProvider.fetchLiquidityPools();
            result.data.lp_list.sort((a: any, b: any) => {
                a.apr.fee_apr_24h = a.apr.fee_apr_24h.replace('%', '');
                b.apr.fee_apr_24h = b.apr.fee_apr_24h.replace('%', '');
                if (parseFloat(a.apr.fee_apr_24h) > parseFloat(b.apr.fee_apr_24h)) return -1;
                if (parseFloat(a.apr.fee_apr_24h) < parseFloat(b.apr.fee_apr_24h)) return 1;
                return 0;
            });
            try {
                callback({
                    user: await runtime.character.name,
                    text: "Here’s a lineup of liquidity pools for you!",
                    action: "LIQUIDITY",
                    result: {
                        type: "liquidity_pools",
                        data: result.data.lp_list.slice(0, parseInt(content.amount_token_a)),
                    }
                })
                return true;
            } catch (error) {
                console.error("Error during token swap:", error);
                return false;
            }
        }
        else{
            
            let cetusProvider = new CetusProvider();
            let coinA = content.pair_name.split("-")[0];
            let coinB = content.pair_name.split("-")[1];
            let coinInfoA = await findByVerifiedAndSymbol(coinA);
            let coinInfoB = await findByVerifiedAndSymbol(coinB);
            if(!coinInfoA){
                callback({
                    user: await runtime.character.name,
                    text: `Could not find the symbol for ${coinA}`,
                    action: "LIQUIDITY_POOLS",
                    action_hint: getActionHint(
                        "navi pools",
                        "button_generate_text",
                        "navi",
                        "liquidity"
                    )
                })
                return true;
            }
            if(!coinInfoB){
                callback({
                    user: await runtime.character.name,
                    text: `Could not find the symbol for ${coinB}`,
                    action: "LIQUIDITY_POOLS",
                    action_hint: getActionHint(
                        "navi pools",
                        "button_generate_text",
                        "navi",
                        "liquidity"
                    )
                })
                return true;
            }
            let result = await cetusProvider.fetchLiquidityPoolsByCoinType(`${coinInfoA.type},${coinInfoB.type}`);
            
            try {
                callback({
                    user: await runtime.character.name,
                    text: "Please ensure all details are correct before proceeding with the swap to prevent any losses:",
                    action: "LIQUIDITY",
                    result: {
                        type: "add_liquidity",
                        data: result.data.lp_list[0],
                    }
                })
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
                    text: "Liquidity pools",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Liquidity pools",
                    action: "LIQUIDITY",

                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "add liquidity",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "add liquidity",
                    action: "LIQUIDITY",

                },
            },
        ],
    ] as ActionExample[][],
} as Action;


