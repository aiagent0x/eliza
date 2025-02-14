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

const swapTemplate = `
Recent messages: {{recentMessages}}  
Detect the user's language and extract swap parameters:  

- Return a JSON object:  
  {  
      "inputTokenSymbol": string | null,  
      "outputTokenSymbol": string | null,  
      "amount": number | 0,  
      "responseMessage": string  
  }  

  - Convert token symbols to uppercase.  
  - Detect the user's language and return '"responseMessage"' in the same language.  
  - '"responseMessage"' **must** convey:  
  **"Please ensure all details are correct before proceeding with the swap to prevent any losses."**  
  - Use **variations** in wording while keeping the same meaning.  
  - Examples:  
    - "Make sure all details are correct before confirming the swap to avoid losses."  
    - "Please verify all details before proceeding to prevent any mistakes."  
    - "Double-check everything before swapping to avoid potential losses."  
  - **Must always match the user's language**.  
  - Do **not** auto-translate if the input is already in English.  

### Formatting Rules:  
- Use double quotes for property names.  
- Null values must not be quoted.  
- No trailing commas or single quotes.  

`;

export const executeSwap: Action = {
    name: "SUI_EXECUTE_SWAP_BY_SYMBOL",
    similes: ["SUI_SWAP_TOKENS_BY_SYMBOL",
        "SUI_TOKEN_SWAP_BY_SYMBOL",
        "SUI_TRADE_TOKENS_BY_SYMBOL",
        "SUI_EXCHANGE_TOKENS_BY_SYMBOL",
        "SUI_BUY_TOKENS_BY_SYMBOL",
        "SUI_SELL_TOKENS_BY_SYMBOL",
    ],
    validate: async (_runtime: IAgentRuntime, message: Memory) => {
        const content = typeof message.content === 'string'
            ? message.content
            : message.content?.text;

        if (!content) return false;

        const hasPriceKeyword = /\b(swap|buy|sell|transfer)\b/i.test(content.toLowerCase());
        return hasPriceKeyword;
    },
    description: "Perform a token swap.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.info("compose history...");
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }
        const msgHash = hashUserMsg(message, "swap_symbol");
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
        elizaLogger.info("content:", content)
        const inputTokenObject = await findByVerifiedAndSymbol(content.inputTokenSymbol && content.inputTokenSymbol !== "null" ? content.inputTokenSymbol : "USDC");
        if (!inputTokenObject) {
            callback({
                user: await runtime.character.name,
                text: `We do not support ${content.inputTokenSymbol} token in SUI network yet, We only support swapping token symbol to token symbol or token address to token address.`,
            })
            return false
        }
        const outputTokenObject = await findByVerifiedAndSymbol(content.outputTokenSymbol && content.outputTokenSymbol !== "null" ? content.outputTokenSymbol : "USDC");
        if (!outputTokenObject) {
            callback({
                user: await runtime.character.name,
                text: `We do not support ${content.outputTokenSymbol} token in SUI network yet, We only support swapping token symbol to token symbol or token address to token address. `,
            })
            return false
        }
        let amount = content.amount;
        if (!content.inputTokenSymbol || content.inputTokenSymbol === "null") {
            const coinGecko = new GeckoTerminalProvider2();
            let tokenDetail = await coinGecko.getTokenDetails('sui-network', outputTokenObject.type);
            let number: number = parseFloat(amount) * parseFloat(tokenDetail.price_usd)
            amount = number
        }

        const responseData = {
            amount: amount,
            fromToken: inputTokenObject,
            toToken: outputTokenObject

        }
        try {
            await callback({
                user: await runtime.character.name,
                text: content.responseMessage,
                action: "SUI_EXECUTE_SWAP_BY_SYMBOL",
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
                user: "{{user2}}",
                content: {
                    text: "Initiating swap of 10 SUI for USDT on SUI network...",
                    action: "SUI_EXECUTE_SWAP_BY_SYMBOL",
                    params: {
                        inputTokenSymbol: "SUI",
                        outputTokenSymbol: "USDT",
                        amount: "10"
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
                "user": "{{user2}}",
                "content": {
                    "text": "Initiating swap CeTUS for deep on SUI network...",
                    "action": "SUI_EXECUTE_SWAP_BY_SYMBOL",
                    "params": {
                        "inputTokenSymbol": "SUI",
                        "outputTokenSymbol": "USDC",
                        "amount": "0"
                    }
                }
            }
        ]
        ,
        [
            {
                "user": "{{user1}}",
                "content": {
                    text: "Buy 100 {TOKEN_SYMBOL}"
                }
            },
            {
                "user": "{{user2}}",
                "content": {
                    "text": "Initiating swap CeTUS for deep on SUI network...",
                    "action": "SUI_EXECUTE_SWAP_BY_SYMBOL",
                    "params": {
                        "inputTokenSymbol": "USDC",
                        "outputTokenSymbol": "{TOKEN_SYMBOL}",
                        "amount": "100"
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
                "user": "{{user2}}",
                "content": {
                    "text": "Initiating swap CeTUS for deep on SUI network...",
                    "action": "SUI_EXECUTE_SWAP_BY_SYMBOL",
                    "params": {
                        "inputTokenSymbol": "{TOKEN_SYMBOL}",
                        "outputTokenSymbol": "USDC",
                        "amount": "100"
                    }
                }
            }
        ]
    ] as ActionExample[][],
} as Action;