import {
    ActionExample,
    composeContext,
    generateObjectDeprecated,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    // settings,
    State,
    type Action,
    elizaLogger
} from "@elizaos/core";
import getInfoTokenOnSui from "../providers/coinMetaDataSui";
import { hashUserMsg } from "../utils/format";
import GeckoTerminalProvider2 from "../providers/coingeckoTerminalProvider2";
// import { RedisClient } from "@elizaos/adapter-redis";
const swapTemplate = `Please extract the following swap details for SUI network:
{
    "inputTokenAddress": string | null,     // Token being sold (e.g. "0xb6a9f896fd6c0f777699b9aa2b1bb745caa5eb1f3978173c1ddffd4bdd3994e9::uni::UNI")
    "outputTokenAddress": string | null,    // Token being bought
    "amount": number | 0,               // Amount to swap
    "responseMessage": string            // Confirmation message in the user's language  

}
Recent messages: {{recentMessages}}
\`\`\`
VALIDATION RULES:
    - Use null for any values that cannot be determined.  
    - Ensure all token symbols are converted to uppercase.  
    - The '"responseMessage"' field should contain a message with a similar meaning to:  
      '"Please verify all details carefully before proceeding with the swap to avoid any potential losses."'  
      translated into the language used by the user.  
    - All property names must use double quotes.  
    - Null values should not use quotes.  
    - No trailing commas allowed.  
    - No single quotes anywhere in the JSON.  
`;



export const executeSwapByAddress: Action = {
    name: "SUI_EXECUTE_SWAP_BY_ADDRESS",
    similes: [
        "SUI_SWAP_TOKENS_BY_ADDRESS",
        "SUI_TOKEN_SWAP_BY_ADDRESS",
        "SUI_TRADE_TOKENS_BY_ADDRESS",
        "SUI_EXCHANGE_TOKENS_BY_ADDRESS",
        "SUI_BUY_TOKENS_BY_ADDRESS",
        "SUI_SELL_TOKENS_BY_ADDRESS",
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
        // composeState
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const msgHash = hashUserMsg(message, "swap_address");
        let content: any = await runtime.cacheManager.get(msgHash);
        elizaLogger.info("---- cache info: ", msgHash, "--->", content);
        if (!content) {
            const checkTxHashContext = composeContext({
                state,
                template: swapTemplate,
            });
            content = await generateObjectDeprecated({
                runtime,
                context: checkTxHashContext,
                modelClass: ModelClass.SMALL,
            });
            await runtime.cacheManager.set(msgHash, content, { expires: Date.now() + 300000 });
        }
        console.log("content:", content);
        const inputTokenObject = await getInfoTokenOnSui(content.inputTokenAddress);

        if (inputTokenObject === "ADDRESS_NOT_EXIST") {
            callback({
                user: await runtime.character.name,
                text: `We do not support ${content.inputTokenAddress} token in SUI network yet, We only support swapping token symbol to token symbol or token address to token address.`,
            })
            return false
        }
        const outputTokenObject = await getInfoTokenOnSui(content.outputTokenAddress);
        if (outputTokenObject === "ADDRESS_NOT_EXIST") {
            callback({
                user: await runtime.character.name,
                text: `We do not support ${content.outputTokenAddress} token in SUI network yet, We only support swapping token symbol to token symbol or token address to token address.`,
            })
            return false
        }
        const coninGeckoTeminal = new GeckoTerminalProvider2()
        const imageFrom = await coninGeckoTeminal.getTokenDetails("sui-network", content.inputTokenAddress);
        const imageTo = await coninGeckoTeminal.getTokenDetails("sui-network", content.inputTokenAddress);

        let amount = content.amount;
        if (!content.inputTokenSymbol || content.inputTokenSymbol === "null") {
            const coinGecko = new GeckoTerminalProvider2();
            let tokenDetail = await coinGecko.getTokenDetails('sui-network', content.outputTokenAddress);
            let number: number = parseFloat(amount) * parseFloat(tokenDetail.price_usd)
            amount = number
        }
        const responseData = {
            amount: amount,
            fromToken: {
                ...inputTokenObject,
                type: content.inputTokenAddress,
                imgUrl: imageFrom.image_url
            },
            toToken: {
                ...outputTokenObject,
                type: content.outputTokenAddress,
                imgUrl: imageTo.image_url
            }

        }

        try {

            callback({
                user: await runtime.character.name,
                text: content.responseMessage,
                action: "SUI_EXECUTE_SWAP_BY_ADDRESS",
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
                    text: "Swap 10 0x2::sui::SUI to 0x4fb3c0f9e62b5d3956e2f0e284f2a5d128954750b109203a0f34c92c6ba21247::coin::USDT"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Initiating swap of 10 0x2::sui::SUI for 0x4fb3c0f9e62b5d3956e2f0e284f2a5d128954750b109203a0f34c92c6ba21247::coin::USDT on SUI network...",
                    action: "SUI_EXECUTE_SWAP_BY_ADDRESS",
                }
            }
        ]
        ,
        [
            {
                "user": "{{user1}}",
                "content": {
                    text: "Buy 100 {TOKEN_ADDRESS}"
                }
            },
            {
                "user": "{{user2}}",
                "content": {
                    "text": "Initiating swap CeTUS for deep on SUI network...",
                    "action": "SUI_EXECUTE_SWAP_BY_ADDRESS",
                    "params": {
                        "inputTokenSymbol": "USDC",
                        "outputTokenSymbol": "{TOKEN_ADDRESS}",
                        "amount": "100"
                    }
                }
            }
        ],
        [
            {
                "user": "{{user1}}",
                "content": {
                    text: "SELL 100 {TOKEN_ADDRESS}"
                }
            },
            {
                "user": "{{user2}}",
                "content": {
                    "text": "Initiating swap CeTUS for deep on SUI network...",
                    "action": "SUI_EXECUTE_SWAP_BY_SYMBOL",
                    "params": {
                        "inputTokenSymbol": "{TOKEN_ADDRESS}",
                        "outputTokenSymbol": "USDC",
                        "amount": "100"
                    }
                }
            }
        ]
    ] as ActionExample[][],
} as Action;
