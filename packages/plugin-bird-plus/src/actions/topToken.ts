import {
    // ActionExample,
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
import { searchCategoriesInFileJson } from "../providers/searchProjectInFileJson";
import { findTypesBySymbols } from "../providers/searchCoinInAggre";
import { GeckoTerminalProvider } from "../providers/coingeckoTerminalProvider";
import getActionHint from "../utils/action_hint";
import SuiOnChainProvider from "../providers/fetchSuiChain/suiOnChainProvider";
import { CoingeckoProvider } from "../providers/coingeckoProvider";
import { RedisClient } from "@elizaos/adapter-redis";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL)
const topTemplate = `
Recent messages: {{recentMessages}}  
Extract the ranking parameters from the conversation above, following these rules:  

- Return only a JSON object with the specified fields in this format: 
    - Return only a JSON object with the specified fields in thise format:
        \`\`\`json
            {
                "type": "MEME" | "NEW_MEME" | "NFT" | "TRENDING" | "DEFI",
                "sortBy": "MCAP" | "24VOL" | "PRICE_INCREASE" | "PRICE_DECREASE" | "HOLDERS" | "MARKET_CAP" | "24HVOLUME",
                "size": number | 5
            }
         \`\`\`
       - Use "type": "MEME" for meme token rankings.
       - Use "type": "NEW_MEME" for new meme token rankings.
       - Use "type": "DEFI" for DeFi token rankings.
       - Use "type": "NFT" for NFT rankings.
       - Use "type": "TRENDING" for trending token.
       - Ensure that "sortBy" is one of the following: "MCAP", "24VOL", "PRICE_INCREASE", "PRICE_DECREASE", "HOLDERS", "MARKET_CAP", "24HVOLUME".
       - "size" should default to 5.
       - Use null for any values that cannot be determined.
       - All property names must use double quotes.
       - No trailing commas or single quotes.
`
export const topToken: Action = {
    name: "TOP_TOKEN",
    similes: [
        "TOP_MEME_TOKEN",
        "FIND_TOP_NFT",
        "SHOW_TOP_NFT",
        "TOP_NEW_MEME_TOKEN",
        "TOP_DEFI_TOKEN",
        "TOP_TRENDING_TOKENS",
        "SHOW_TRENDING_COINS",
        "GET_HOT_TOKENS",
        "FETCH_TRENDING_CRYPTO",
        "DISPLAY_POPULAR_TOKENS",
        "SHOW_WHATS_TRENDING",
        "GET_MOST_SEARCHED_TOKENS",
        "LIST_VIRAL_CRYPTOCURRENCIES",

    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        // Check if the necessary parameters are provided in the message

        // console.log("Message:", _message);
        return true;
    },
    description: "List top meme token",
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
        const topContext = composeContext({
            state,
            template: topTemplate,
        });
        const content = await generateObjectDeprecated({
            runtime,
            context: topContext,
            modelClass: ModelClass.SMALL,
        });
        console.log("content:", content);
        let responseData;
        switch (content.type) {
            case "MEME":
                if (content.sortBy !== "HOLDERS") {
                    const projectInfos = await searchCategoriesInFileJson("Meme");
                    const projectType = await findTypesBySymbols(projectInfos);
                    const GeckoTerminal = new GeckoTerminalProvider();
                    const tokenInfo = await GeckoTerminal.fetchMultipleTokenOnNetwork("sui-network", projectType);
                    responseData = tokenInfo.data.map((data) => ({
                        volume_usd: data.attributes.volume_usd?.h24 || 0,
                        symbol: data.attributes.symbol,
                        price: data.attributes.price_usd,
                        icon_url: data.attributes.image_url,
                        name: data.attributes.name ? data.attributes.name.split(" / ")[0] : "N/A",
                        market_cap: data.attributes.market_cap_usd || 0,
                        price_change_percentage: "N/A",
                    }));

                    tokenInfo.included.forEach((includedData) => {
                        const name = includedData.attributes.name.split(" / ")[0];
                        const price_change = includedData.attributes.price_change_percentage.h24 || "N/A";
                        const matchedToken = responseData.find((token) => token.symbol === name);
                        if (matchedToken) {
                            matchedToken.price_change_percentage = price_change;
                        }
                    });
                    try {

                        callback({
                            user: await runtime.character.name,
                            text: `Here are the top Meme tokens:`,
                            action: "TOP_MEME",
                            result: {
                                type: "top_token",
                                data: responseData.slice(0, 5),
                                action_hint: getActionHint()
                            }
                        })

                        return true;
                    } catch (error) {
                        elizaLogger.info("Error top meme token:", error);
                        return false;
                    }
                }
                else {
                    try {
                        const projectInfos = await searchCategoriesInFileJson("Meme");
                        const projectType = await findTypesBySymbols(projectInfos);
                        const suiOnChainProvider = new SuiOnChainProvider()
                        const responseData = await suiOnChainProvider.fetchHolders(projectType.slice(0, content.size));
                        callback({
                            user: await runtime.character.name,
                            text: `Here are the top Meme tokens by holders:`,
                            action: "TOP_MEME_BY_HOLDERS",
                            result: {
                                type: "top_token_meme_by_holders",
                                data: responseData.slice(0, content.size),
                                action_hint: getActionHint()
                            }
                        })
                        return true;
                    }
                    catch (error) {
                        elizaLogger.info("Error top meme token:", error);
                        return false;
                    }
                }
                break;
            case "NEW_MEME":
                const coinGecko = new CoingeckoProvider();
                const info = await coinGecko.topNewMeMeCoin();
                if (callback) {
                    callback({
                        user: await runtime.character.name,
                        text: `Below are ${content.size} trending coins we have collected:`,
                        action: 'TOP_TRENDING_TOKENS',
                        result: {
                            type: "sui_new_meme_coin",
                            data: info.slice(0, content.size)
                        }
                    });
                }

                return true;
                break;
            case "NFT":
                const nft = new SuiOnChainProvider()
                responseData = await nft.fetchCollectionNft()
                callback({
                    user: await runtime.character.name,
                    text: `The top DEX on ${content.network_blockchain}`,
                    action: "TOP_NFT",
                    result: {
                        type: "top_nft",
                        data: responseData.content,
                    },
                    action_hint: getActionHint()
                });
                break;
            case "TRENDING":
                let result = await redis.hGet("coins_info", "trending");
                let trendingCoins = JSON.parse(result).data

                responseData = trendingCoins.map((token: any) => ({
                    name: token.name,
                    symbol: token.symbol.toUpperCase(),
                    price: token.price,
                    market_cap: token.cap,
                    price_change_24h: token.change24h,
                    type: token.address,
                    iconUrl: token.logo

                }));


                if (callback) {
                    callback({
                        user: await runtime.character.name,
                        text: `Below are trending coins we have collected:`,
                        action: 'TOP_TRENDING_TOKENS',
                        result: {
                            type: "top_token",
                            data: responseData
                        }
                    });
                }

                return true;
                break;
            case "DEFI":
                const projectInfos = await searchCategoriesInFileJson("Defi");
                const projectType = await findTypesBySymbols(projectInfos);
                const GeckoTerminal = new GeckoTerminalProvider();

                const tokenInfo = await GeckoTerminal.fetchMultipleTokenOnNetwork("sui-network", projectType);
                let dataResponse = tokenInfo.data.map((data) => ({
                    volume_usd: data.attributes.volume_usd?.h24 || 0,
                    symbol: data.attributes.symbol,
                    price: data.attributes.price_usd,
                    icon_url: data.attributes.image_url,
                    name: data.attributes.name ? data.attributes.name.split(" / ")[0] : "N/A",
                    market_cap: data.attributes.market_cap_usd || 0,
                    price_change_percentage: "N/A",
                }));

                tokenInfo.included.forEach((includedData) => {
                    const name = includedData.attributes.name.split(" / ")[0];
                    const price_change = includedData.attributes.price_change_percentage.h24 || "N/A";
                    const matchedToken = dataResponse.find((token) => token.symbol === name);
                    if (matchedToken) {
                        matchedToken.price_change_percentage = price_change;
                    }
                });
                try {

                    callback({
                        user: await runtime.character.name,
                        text: `Here are the top DeFi tokens:`,
                        action: "TOP_DEFI",
                        result: {
                            type: "top_token",
                            data: dataResponse.slice(0, content.size)
                        }
                    })

                    return true;
                } catch (error) {
                    console.error("Error during token swap:", error);
                    return false;
                }
                break;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "show me top 5 meme token by holders",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Top meme token",
                    action: "TOP_TOKEN",
                    content: {
                        "size": 5,  // Number of records
                        "sortBy": "HOLDERS",
                        "type": "MEME"
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "show me top 3 new meme token by holders",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Top meme token",
                    action: "TOP_TOKEN",
                    content: {
                        "size": 3,  // Number of records
                        "sortBy": "HOLDERS",
                        "type": "NEW_MEME"
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "show me top 3 NFT",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Top meme token",
                    action: "TOP_TOKEN",
                    content: {
                        "size": 5,  // Number of records
                        "sortBy": null,
                        "type": "NFT"
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "show me top 10 trending tokens",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Top meme token",
                    action: "TOP_TOKEN",
                    content: {
                        "size": 10,  // Number of records
                        "sortBy": null,
                        "type": "TRENDING"
                    },
                },
            },
        ],
    ],
} as Action;


