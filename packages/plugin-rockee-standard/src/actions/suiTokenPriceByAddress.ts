import {
    // ActionExample,
    // Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    type Action,
} from "@elizaos/core";

import { hashUserMsg } from "../utils/format";
import GeckoTerminalProvider2 from "../providers/coingeckoTerminalProvider2";
import MessageService from "../services/messageService";
import { taggingProvider } from "../providers/taggingProvider";

const promptSuiTokenInfoTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
    \`\`\`json
    {
        "token_address": "0x7123ef5ec546c363f270ef770472dfad231eeb86469a2d1fba566d6fd74cb9e1::craft::CRAFT",
    }
    \`\`\`
    
{{recentMessages}}

Given the recent messages, extract the following information:

token_address:
    Recognizes that token_address is a unique contract identifier on the blockchain (e.g., 0x...::module::TOKEN_NAME).
    Extract the full contract address of the token.
    Must be a string.
    Include the module and token name if present.
    Default is null if not specified.
`

export const suiTokenPriceByAddress: Action = {
    name: "TOKEN_PRICE_INFO_BY_ADDRESS",

    description: "price of token address",

    similes: [
        "{INPUT}_PRICE",
        "PRICE_{INPUT}",
        "HOW_ABOUT_{INPUT}_PRICE",
        "{INPUT}_COST",
        "COST_OF_{INPUT}",
        "WHAT_IS_{INPUT}_PRICE",
        "CHECK_{INPUT}_PRICE",
        "{INPUT}_MARKET_PRICE",
        "HOW_MUCH_IS_{INPUT}",
        "LATEST_{INPUT}_PRICE",
        "CURRENT_{INPUT}_RATE",
        "VALUE_OF_{INPUT}",
        "{INPUT}_EXCHANGE_RATE",
        "CAN_YOU_TELL_ME_{INPUT}_PRICE",
        "WHAT_ABOUT_{INPUT}_RATE",
        "{INPUT}_WORTH",
    ],

    examples: [
        [
            {
                "user": "{{user1}}",
                "content": {
                    "text": "0x94e7a8e71830d2b34b3edaa195dc24c45d142584f06fa257b73af753d766e690::celer_wbtc_coin::CELER_WBTC_COIN price"
                }
            },
            {
                "user": "{{user2}}",
                "content": {
                    "text": "price",
                    "action": "TOKEN_PRICE_INFO_BY_ADDRESS",
                    "params": {
                        "token_address": "0x94e7a8e71830d2b34b3edaa195dc24c45d142584f06fa257b73af753d766e690::celer_wbtc_coin::CELER_WBTC_COIN"
                    }
                }
            }
        ],
        [
            {
                "user": "{{user1}}",
                "content": {
                    "text": "price 0x94e7a8e71830d2b34b3edaa195dc24c45d142584f06fa257b73af753d766e690::celer_wbtc_coin::CELER_WBTC_COIN"
                }
            },
            {
                "user": "{{user2}}",
                "content": {
                    "text": "price {TOKEN_ADDRESS}",
                    "action": "TOKEN_PRICE_INFO_BY_ADDRESS",
                    "params": {
                        "token_address": "{TOKEN_ADDRESS}"
                    }
                }
            }
        ]


    ],

    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        const contentYouWantToPost = await taggingProvider.get(runtime, message, state);
        
        elizaLogger.info("[suiPools]");
        let content: any = _options.data_extract;
        if (_options.type !== "toggle_faster") {
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }
            const msgHash = hashUserMsg(message, "token-price");
            content = await runtime.cacheManager.get(msgHash);
            elizaLogger.info("---- cache info: ", msgHash, "--->", content);
            if (!content) {
                const suiTokenInfoContext = composeContext({
                    state,
                    template: promptSuiTokenInfoTemplate,
                });
                content = await generateObjectDeprecated({
                    runtime,
                    context: suiTokenInfoContext,
                    modelClass: ModelClass.SMALL,
                });
                await runtime.cacheManager.set(msgHash, content, { expires: Date.now() + 300000 });
            }
        }

        elizaLogger.info("content: ", content);
        const coninGeckoTeminal = new GeckoTerminalProvider2()
        const info = await coninGeckoTeminal.getTokenDetails("sui-network", content.token_address);

        if (callback) {
            // if (_options.type !== "toggle_faster") {
            //     let messageService = new MessageService()
            //     await messageService.createMessage(
            //         message.content.text,
            //         {
            //             action: "TOKEN_PRICE_INFO_BY_ADDRESS",
            //             data_extract: content
            //         })
            // }
            callback({
                user: await runtime.character.name,
                text: `Here are the token prices:`,
                action: 'TOKEN_PRICE_INFO_BY_ADDRESS',
                result: {
                    type: "token_price",
                    data: {
                        symbol: info.symbol,
                        name: info.name,
                        market_cap: info.market_cap_usd,
                        price: info.price_usd,
                        icon_url: info.image_url,
                    },
                    action_hint: {
                        text: contentYouWantToPost.TOKEN_INFO.questions[Math.floor(Math.random() * contentYouWantToPost.TOKEN_INFO.questions.length)]
                    }
                }
            });
        }

        return true;
    }
}
