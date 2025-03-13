import {
    ActionExample,
    // CacheOptions,
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
import { findByVerifiedAndSymbol } from "../providers/searchCoinInAggre";
import { hashUserMsg } from "../utils/format";
import GeckoTerminalProvider2 from "../providers/coingeckoTerminalProvider2";
import getInfoTokenOnSui from "../providers/coinMetaDataSui";
const swapTemplate = `
Recent messages: {{recentMessages}}  
Extract the token swap parameters from the conversation above, following these rules:  
- Return only a JSON object in the exact format below: 
Example response:
\`\`\`json
{
    "from_token_symbol": "token symbol" | null,
    "destination_token_symbol": "token symbol" | null,
    "from_token_address": "Sui token address (e.g., 0x...::module::SYMBOL)" | null,
    "destination_token_address": "Sui token address (e.g., 0x...::module::SYMBOL)" | null,
    "amount": number | null
}
\`\`\`

Given the recent messages, extract the following information about the requested token swap:
    - The amount of the token being swapped, identified by its symbol (e.g., USDC) or Sui address (e.g., 0x...::usdc::USDC).
    - Use null for any values that cannot be determined.
    - All property names must use double quotes.
    - Null values should not use quotes.
    - No trailing commas allowed.
    - No single quotes anywhere in the JSON.
Respond with a JSON markdown block containing only the extracted values.
`;

export const swapSui: Action = {
    name: "SWAP_AND_BUY_AND_SELL_TOKEN",
    similes: [
        "SWAP_TOKENS",
        "SWAP_SUI",
        "SWAP_TOKENS",
        "TRADE_TOKENS",
        "EXCHANGE_TOKENS",
        "BUY_TOKEN",
        "SELL_TOKEN",
        
    ],
    validate: async (_runtime: IAgentRuntime, message: Memory) => {
        const content = typeof message.content === 'string'
            ? message.content
            : message.content?.text;

        if (!content) return false;

        const hasPriceKeyword = /\b(swap|buy|sell|transfer)\b/i.test(content.toLowerCase());
        return hasPriceKeyword;
    },
    description: "Perform a token swap or buy token or sell token.",
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
        const msgHash = hashUserMsg(message, "swap");
        let content: any = await runtime.cacheManager.get(msgHash);
        elizaLogger.info("---- cache info: ", msgHash, "--->", content);
        if (!content) {
            const swapContext = composeContext({
                state,
                template: swapTemplate,
            });
            content = await generateObjectDeprecated({
                runtime,
                context: swapContext,
                modelClass: ModelClass.SMALL,
            });
            await runtime.cacheManager.set(msgHash, content, { expires: Date.now() + 300000 });
        }

        elizaLogger.info("content:", content);
        if (content.from_token_address !== "null" && content.destination_token_address !== "null") {
            const inputTokenObject = await getInfoTokenOnSui(content.from_token_address);

            if (inputTokenObject === "ADDRESS_NOT_EXIST") {
                callback({
                    user: await runtime.character.name,
                    text: `We haven’t onboarded the ${content.inputTokenAddress} token on the SUI network yet. For now, you can only swap token symbols to token symbols or token addresses to token addresses!`,
                })
                return false
            }
            const outputTokenObject = await getInfoTokenOnSui(content.destination_token_address);
            if (outputTokenObject === "ADDRESS_NOT_EXIST") {
                callback({
                    user: await runtime.character.name,
                    text: `We haven’t onboarded the ${content.outputTokenAddress} token on the SUI network yet. For now, you can only swap token symbols to token symbols or token addresses to token addresses!`,
                })
                return false
            }
            // const coninGeckoTeminal = new GeckoTerminalProvider2();


            let amount = content.amount;
            if (!content.from_token_address || content.from_token_address === "null") {
                const coinGecko = new GeckoTerminalProvider2();
                let tokenDetail = await coinGecko.getTokenDetails('sui-network', content.destination_token_address);
                let number: number = parseFloat(amount) * parseFloat(tokenDetail.price_usd);
                amount = number;
            }
            const responseData = {
                amount: amount,
                fromToken: {
                    ...inputTokenObject,
                    type: content.from_token_address,
                },
                toToken: {
                    ...outputTokenObject,
                    type: content.destination_token_address,
                }

            }

            try {

                callback({
                    user: await runtime.character.name,
                    text: "Double-check all the details before takeoff to dodge any turbulence!",
                    action: "SWAP_TOKEN",
                    result: {
                        type: "swap",
                        data: responseData,


                    }
                })

                return true;
            } catch (error) {
                console.error("Error during token swap:", error);
                return false;
            }
        }

        const inputTokenObject = await findByVerifiedAndSymbol(content.from_token_symbol && content.from_token_symbol !== "null" ? content.from_token_symbol : "USDC");
        if (!inputTokenObject) {
            callback({
                user: await runtime.character.name,
               
                text: `We haven’t onboarded the ${content.from_token_symbol} token on the SUI network yet. For now, you can only swap token symbols to token symbols or token addresses to token addresses!`,
            })
            return false
        }
        const outputTokenObject = await findByVerifiedAndSymbol(content.destination_token_symbol && content.destination_token_symbol !== "null" ? content.destination_token_symbol : "USDC");
        if (!outputTokenObject) {
            callback({
                user: await runtime.character.name,
                text: `We haven’t onboarded the ${content.destination_token_symbol} token on the SUI network yet. For now, you can only swap token symbols to token symbols or token addresses to token addresses!`,
            })
            return false
        }
        let amount = content.amount;
        if (!content.from_token_symbol || content.from_token_symbol === "null") {
            const coinGecko = new GeckoTerminalProvider2();
            let tokenDetail = await coinGecko.getTokenDetails('sui-network', outputTokenObject.type);
            let number: number = parseFloat(amount) * parseFloat(tokenDetail.price_usd)
            amount = number
        }

        const responseData = {
            amount: amount === "null" ? 0 : parseFloat(amount),
            fromToken: inputTokenObject,
            toToken: outputTokenObject

        }
        try {
            await callback({
                user: await runtime.character.name,
                text: `Double-check all the details before takeoff to dodge any turbulence!`,
                action: "SWAP_TOKEN",
                result: {
                    type: "swap",
                    data: responseData,
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
                    text: "Swap 10 SUI to USDC"
                }
            },
            {
                user: "{{Agent}}",
                content: {
                    text: "Initiating swap of 10 SUI for USDT on SUI network...",
                    action: "SWAP_TOKEN",
                    params: {
                        "from_token_symbol": "SUI",
                        "destination_token_symbol": "USDC",
                        "from_token_address": null,
                        "destination_token_address": null,
                        "amount": 10
                    }
                }
            }
        ],
        [
            {
                "user": "{{user1}}",
                "content": {
                    text: "Swap SUI to USDC"
                }
            },
            {
                "user": "{{Agent}}",
                "content": {
                    "text": "Initiating swap CeTUS for deep on SUI network...",
                    "action": "SWAP_TOKEN",
                    "params": {
                        "from_token_symbol": "SUI",
                        "destination_token_symbol": "USDC",
                        "from_token_address": null,
                        "destination_token_address": null,
                        "amount": 0
                    }
                }
            }
        ],
        [
            {
                "user": "{{user1}}",
                "content": {
                    text: "Buy 100 {TOKEN_SYMBOL}"
                }
            },
            {
                "user": "{{Agent}}",
                "content": {
                    "text": "Buy 100 {TOKEN_SYMBOL}",
                    "action": "SWAP_TOKEN",
                    "params": {
                        "from_token_symbol": "USDC",
                        "destination_token_symbol": "{TOKEN_SYMBOL}",
                        "from_token_address": null,
                        "destination_token_address": null,
                        "amount": 0
                    }
                }
            }
        ],
        [
            {
                "user": "{{user1}}",
                "content": {
                    text: "SELL 100 {TOKEN_SYMBOL}"
                }
            },
            {
                "user": "{{Agent}}",
                "content": {
                    "text": "Initiating swap CeTUS for deep on SUI network...",
                    "action": "SWAP_TOKEN",
                    "params": {
                        "from_token_symbol": "{TOKEN_SYMBOL}",
                        "destination_token_symbol": "USDC",
                        "from_token_address": null,
                        "destination_token_address": null,
                        "amount": 0
                    }
                }
            }
        ],
        [
            {
                "user": "{{user1}}",
                "content": {
                    text: "i wanna sell {TOKEN_SYMBOL}"
                }
            },
            {
                "user": "{{Agent}}",
                "content": {
                    "text": "How much {TOKEN_SYMBOL} would you like to sell?",
                    
                }
            },
            {
                "user": "{{user1}}",
                "content": {
                    "text": "10",
                    
                }
            },
            {
                "user": "{{Agent}}",
                "content": {
                    "text": "Initiating sell {TOKEN_SYMBOL} on SUI network...",
                    "action": "SWAP_TOKEN",
                    "params": {
                        "from_token_symbol": "{TOKEN_SYMBOL}",
                        "destination_token_symbol": "USDC",
                        "from_token_address": null,
                        "destination_token_address": null,
                        "amount": 10
                    }
                }
            }
        ],
        [
            {
                "user": "{{user1}}",
                "content": {
                    text: "i wanna buy {TOKEN_SYMBOL}"
                }
            },
            {
                "user": "{{Agent}}",
                "content": {
                    "text": "How much {TOKEN_SYMBOL} would you like to buy?",
                    
                }
            },
            {
                "user": "{{user1}}",
                "content": {
                    "text": "5",
                    
                }
            },
            {
                "user": "{{Agent}}",
                "content": {
                    "text": "Initiating sell {TOKEN_SYMBOL} on SUI network...",
                    "action": "SWAP_TOKEN",
                    "params": {
                        "from_token_symbol": "USDC",
                        "destination_token_symbol": "{TOKEN_SYMBOL}",
                        "from_token_address": null,
                        "destination_token_address": null,
                        "amount": 5
                    }
                }
            }
        ]
        
    ] as ActionExample[][],
} as Action;