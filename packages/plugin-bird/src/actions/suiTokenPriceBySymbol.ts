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

// import {  formatObjectToText } from "../utils/format";

// import GeckoTerminalProvider2 from "../providers/coingeckoTerminalProvider2";
import { findByVerifiedAndSymbol } from "../providers/searchCoinInAggre";
import { hashUserMsg } from "../utils/format";
import GeckoTerminalProvider2 from "../providers/coingeckoTerminalProvider2";
import MessageService from "../services/messageService";

const promptSuiTokenInfoTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
    \`\`\`json
    {
        "token_symbol": "CRAFT"
    }
    \`\`\`
{{recentMessages}}

The following are token symbols within the Sui Network: SUI, NS, kSUI, WBNB, USDY, CAPO, SEND, USDT, DEEP, FLX, ALPHA, SPAM, FDUSD, AFSUI, WETH, SPT, SUIP, HOPI, CETUS, MOVE, wUSDC, WFTM, ARTFI, SOL, USDC, haSUI, PIGU, PRH, FUD, AXOL, SCB, KOTO, JWLSUI, BLUB, AUSD, TYPUS, ETH, SCA, vSUI, SSWP, sSUI, stSUI, SUIA, SCUBA, Chad, WMATIC, NAVX, BLUE, PDO, OINK, HSUI, TURBOS, BUCK, WBTC, WAVAX, APT, REAP, PSH, ROCK, Toilet, LBTC, SSUI, LOFI, TOILET, SUIRWAPIN, SUIAGENT, UP, ATTN, AIDA, PCHU, PUMPKIN, Uni, SUIMON, TARDI, ISG, SHRO, SOLA, JAI, OSIRI, NEONET, SAI, BOOM, CITY, BLUEY, NOTS, BOOST, MIU, NAMI, WET, E.D.A.S, OSHI. All token symbols are recognized regardless of case format.

Extract ONLY from the current message (ignore any previous context or messages):

Given the recent messages, extract the following information:

token_symbol: symbol of token

VALIDATION RULES:

All property names must use double quotes
All string values must use double quotes
null values should not use quotes
No trailing commas allowed
No single quotes anywhere in the JSON
Respond with a JSON markdown block containing only the extracted values.`

export const suiTokenPriceBySymbol: Action = {
    name: "TOKEN_PRICE_INFO_BY_SYMBOL",

    description: "price of token",

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
                    text: "SUI price"
                }
            },
            {
                "user": "{{user2}}",
                "content": {
                    "text": "SUI price",
                    "action": "TOKEN_PRICE_INFO_BY_SYMBOL",
                    "params": {
                        "token_symbol": "SUI",
                    }
                }
            }
        ],
        [
            {
                "user": "{{user1}}",
                "content": {
                    text: "price SUI"
                }
            },
            {
                "user": "{{user2}}",
                "content": {
                    "text": "SUI price",
                    "action": "TOKEN_PRICE_INFO_BY_SYMBOL",
                    "params": {
                        "token_symbol": "SUI",
                    }
                }
            }
        ],
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

        const tokenInfo = await findByVerifiedAndSymbol(content.token_symbol);

        const coninGeckoTeminal = new GeckoTerminalProvider2()
        const info = await coninGeckoTeminal.getTokenDetails("sui-network", tokenInfo.type);

        if (callback) {

            // if (_options.type !== "toggle_faster") {
            //     let messageService = new MessageService()
            //     await messageService.createMessage(
            //         message.content.text,
            //         {
            //             action: "TOKEN_PRICE_INFO_BY_SYMBOL",
            //             data_extract: content
            //         })
            // }
            callback({
                user: await runtime.character.name,
                text: `Here are the token prices—let’s lock in the best deal! `,
                action: 'TOKEN_PRICE_INFO_BY_SYMBOL',
                result: {
                    type: "token_price",
                    data: {
                        symbol: info.symbol,
                        name: info.name,
                        market_cap: info.market_cap_usd,
                        price: info.price_usd,
                        icon_url: info.image_url,
                    },
                }
            });
        }

        return true;
    }
}
