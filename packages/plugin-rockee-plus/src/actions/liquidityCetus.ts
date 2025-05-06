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
import MessageService from "../services/messageService";
const topLiquidityPoolTemplate = `Recent messages: {{recentMessages}}  
Extract the liquidity pool parameters from the conversation above, following these rules:  

- Sample Token Names: SUI, USDC, DEEP, CETUS, HIPPO, ETH, LOFI, NS, USDY, BUCK, BUCK, wUSDC, haSUI, afSUI, wUSDT, BLUE, WETH, WSOL, AUSD , stSUI, BUT, Sonic, AXOL, SEND, etc. 
- **Extract data only from the latest message** and discard any previous messages.
- Return only a JSON object with the specified fields in this format:  
    \`\`\`json
        {  
            "type_action": "show_list" | "add",
            "token_a": string | null,
            "token_b": string | null,
            "amount_token_a": number | 0,
            "amount_token_b": number | 0
        }  
    \`\`\`
- Use "type_action": "show_list" when the message is about displaying or listing pools (e.g., “liquidity pools”, “8 liquidity USDC pools”).
- Use "type_action": "add" when the message refers to adding liquidity to a pool (e.g., “add liquidity USDC-SUI”).
- Set "token_a" and "token_b" based on the tokens mentioned. If only one token is mentioned, assign it to "token_a" and set "token_b" to null.
- If a number is mentioned without specific token context, treat it as "amount_token_a" indicating the number of pools to list.
- If both token amounts are present, assign the first one to "amount_token_a" and set "amount_token_b" to 0.
- Use null (without quotes) for any values that cannot be determined.
- All property names must use double quotes.
- Do not use single quotes.
- Do not include trailing commas. 
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
        let content: any = _options.data_extract;
        if (_options.type !== "toggle_faster") {
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }

            const topLiquidityPoolContext = composeContext({
                state,
                template: topLiquidityPoolTemplate,
            });

            content = await generateObjectDeprecated({
                runtime,
                context: topLiquidityPoolContext,
                modelClass: ModelClass.SMALL,
            });
        }
        elizaLogger.info("content:", content);

        if (content.type_action === "show_list") {
            if (parseInt(content.amount_token_a) === 0) content.amount_token_a = 5;
            if (content.token_a !== "null") {
                let cetusProvider = new CetusProvider();
                let coinA = content.token_a;
                let coinB = content.token_b;
                let coinInfoA = await findByVerifiedAndSymbol(coinA);
                let coinInfoB;
                if (coinB !== "null") {
                    coinInfoB = await findByVerifiedAndSymbol(coinB);
                }
                if (!coinInfoA) {
                    callback({
                        user: await runtime.character.name,
                        text: `Could not find the symbol for ${coinA}:`,
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
                let coinTypeList;
                if (coinInfoA && coinInfoB) {
                    coinTypeList = `${coinInfoA.type},${coinInfoB.type}`;
                }
                else {
                    coinTypeList = coinInfoA.type;
                }
                let result = await cetusProvider.fetchLiquidityPoolsByCoinType(coinTypeList);
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
                        text: "Below is a list of liquidity pools:",
                        action: "LIQUIDITY_POOLS",
                        result: {
                            type: "liquidity_pools",
                            data: result.data.lp_list.slice(0, parseInt(content.amount_token_a)),
                        }
                    })
                    return true;
                } catch (error) {
                    console.error("Error during token add:", error);
                    return false;
                }
            }
            
            let responseData = await redis.getValue({ key: "liquidity_pools" })
            if (responseData !== undefined) {
                // if (_options.type !== "toggle_faster") {
                //     let messageService = new MessageService()
                //     await messageService.createMessage(
                //         message.content.text,
                //         {
                //             action: "LIQUIDITY",
                //             data_extract: content
                //         })

                // }
                callback({
                    user: await runtime.character.name,
                    text: "Below is a list of liquidity pools:",
                    action: "LIQUIDITY",
                    result: {
                        type: "liquidity_pools",
                        data: JSON.parse(responseData).slice(0, parseInt(content.amount_token_a)),
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
                // if (_options.type !== "toggle_faster") {
                //     let messageService = new MessageService()
                //     await messageService.createMessage(
                //         message.content.text,
                //         {
                //             action: "LIQUIDITY",
                //             data_extract: content
                //         })

                // }
                callback({
                    user: await runtime.character.name,
                    text: "Below is a list of liquidity pools:",
                    action: "LIQUIDITY",
                    result: {
                        type: "liquidity_pools",
                        data: result.data.lp_list.slice(0, content.amount_token_a),
                    }
                })
                return true;
            } catch (error) {
                console.error("Error during token add liquidity:", error);
                return false;
            }
        }
        else {

            let cetusProvider = new CetusProvider();
            let coinA = content.token_a;
            let coinB = content.token_b!;
            let coinInfoA = await findByVerifiedAndSymbol(coinA);
            let coinInfoB = await findByVerifiedAndSymbol(coinB);
            if (!coinInfoA) {
                callback({
                    user: await runtime.character.name,
                    text: `Could not find the symbol for ${coinA}:`,
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
            if (!coinInfoB) {
                callback({
                    user: await runtime.character.name,
                    text: `Could not find the symbol for ${coinB}:`,
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
                // if (_options.type !== "toggle_faster") {
                //     let messageService = new MessageService()
                //     await messageService.createMessage(
                //         message.content.text,
                //         {
                //             action: "LIQUIDITY",
                //             data_extract: content
                //         })
                // }
                callback({
                    user: await runtime.character.name,
                    text: "Please ensure all details are correct before adding liquidity to prevent any potential losses.",
                    action: "LIQUIDITY_POOLS",
                    result: {
                        type: "add_liquidity",
                        data: result.data.lp_list[0],
                    }
                })
                return true;
            } catch (error) {
                console.error("Error during token add:", error);
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


