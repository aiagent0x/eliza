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
import { GeckoTerminalProvider } from "../providers/coingeckoTerminalProvider";
import getActionHint from "../utils/action_hint";
import { RedisClient } from "@elizaos/adapter-redis";
import CmsProvider from "../providers/fetchCMS/cmsProvider";
import BlockBerryProvider from "../providers/fetchBlockBerry/blockBerryProvider";
import { fetchTopDexByNetwork } from "../providers/topDex";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL)
const topTemplate = `
Recent messages: {{recentMessages}}  
Extract the ranking parameters from the conversation above, following these rules:  

- Return only a JSON object with the specified fields in this format: 
- **Extract data only from the latest message** and discard any previous messages.
        \`\`\`json
            {
                "type_action": "TOKEN" | "POTENTIAL",
                "type": "MEME" | "NEW" | "NFT" | "TRENDING" | "DEFI" | "TGE" | "RELEASE_TOKEN" | "LISTING" | "GAINERS" | "LOSERS" | "STABLECOIN" | "AI" | "GAME" | "DEX",
                "sortBy": "MCAP" | "24VOL" | "PRICE_INCREASE" | "PRICE_DECREASE" | "HOLDERS" | "MARKET_CAP" | "24HVOLUME",
                "size": number | 3
            }
         \`\`\`
       - Use "type_action": Otherwise, set "TOKEN".
       - Use "type_action": "POTENTIAL" if the message includes words or phrases like "potential", "hidden gem", "underrated", "next big", "high growth", "future top", or similar expressions.
       - Use "type_action": "TOKEN" when the request is about top DEX tokens (e.g., "top dex token").
       - Use "type": "MEME" for meme token rankings.
       - Use "type": "NEW" for new token rankings.
       - Use "type": "DEFI" for DeFi token rankings.
       - Use "type": "NFT" for NFT rankings.
       - Use "type": "TRENDING" for trending token.
       - Use "type": "TGE" for TGE token.
       - Use "type": "RELEASE_TOKEN" for release token.
       - Use "type": "LISTING" for listing token.
       - Use "type": "GAINERS" for tokens with the highest gains.
       - Use "type": "LOSERS" for tokens with the highest losses.
       - Use "type": "STABLECOIN" for stablecoin rankings.
       - Use "type": "AI" for AI-related token rankings.
       - Use "type": "GAME" for gaming token rankings.
       - Use "type": "DEX" for dex token rankings.
       - Ensure that "sortBy" is one of the following: "MCAP", "24VOL", "PRICE_INCREASE", "PRICE_DECREASE", "HOLDERS", "MARKET_CAP", "24HVOLUME".
       - "size" should default to 3.
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
        "LIST_TOKEN"
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "List top token",
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
        elizaLogger.info("content:", content);
        let size = parseInt(content.size || content.size !== "null" ? content.size : "5");
        if (content.type_action === "TOKEN") {
            let responseData;
            let cmsProvider = new CmsProvider();
            switch (content.type) {
                case "MEME":
                    let memes = await redis.hGet("coins_info", "meme");
                    console.log("memes:", memes);
                    let memeCoins;
                    if (memes !== null) {
                        memeCoins = JSON.parse(memes).data
                    }
                    else {
                        memeCoins = await cmsProvider.getTokens("meme");
                        memeCoins = memeCoins.data;
                    }
                    responseData = memeCoins.map((token: any) => ({
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
                            text: `Below are Meme tokens we have collected:`,
                            action: 'TOP_TỌKEN',
                            result: {
                                type: "top_token",
                                data: responseData.slice(0, size)
                            }
                        });
                    }

                    return true;
                    break;
                case "NFT":
                    // const nft = new SuiOnChainProvider()
                    const nft = new BlockBerryProvider(process.env.BLOCKBERRY_API_KEY || "defaultApiKey");
                    responseData = await nft.fetchCollectionNft(0, 10, "VOLUME", "DESC", "DAY");
                    callback({
                        user: await runtime.character.name,
                        text: `The top NFT on ${content.network_blockchain}`,
                        action: "TOP_TOKEN",
                        result: {
                            type: "top_nft",
                            data: responseData.slice(0, size),
                        },
                        action_hint: getActionHint()
                    });
                    break;
                case "TRENDING":
                    let result = await redis.hGet("coins_info", "trending");
                    let trendingCoins;
                    if (result !== null) {
                        trendingCoins = JSON.parse(result).data
                    }
                    else {
                        trendingCoins = await cmsProvider.getTokens("trending");
                        trendingCoins = trendingCoins.data;
                    }
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
                            text: `Below are trending tokens we have collected:`,
                            action: 'TOP_TỌKEN',
                            result: {
                                type: "top_token",
                                data: responseData.slice(0, size)
                            }
                        });
                    }

                    return true;
                    break;
                case "DEFI":
                    let defis = await redis.hGet("coins_info", "defi");
                    let defiCoins;
                    if (defis !== null) {
                        defiCoins = JSON.parse(defis).data
                    }
                    else {
                        defiCoins = await cmsProvider.getTokens("defi");
                        defiCoins = defiCoins.data;
                    }
                    responseData = defiCoins.map((token: any) => ({
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
                            text: `Below are Defi tokens we have collected:`,
                            action: 'TOP_TOKEN',
                            result: {
                                type: "top_token",
                                data: responseData.slice(0, size)
                            }
                        });
                    }

                    return true;
                    break;
                case "GAINERS":
                    let gainers = await redis.hGet("coins_info", "gainers");
                    let gainerCoins;
                    if (gainers !== null) {
                        gainerCoins = JSON.parse(gainers).data
                    }
                    else {
                        gainerCoins = await cmsProvider.getTokens("gainers");
                        gainerCoins = gainerCoins.data;
                    }
                    responseData = gainerCoins.map((token: any) => ({
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
                            text: `Below are Gainers tokens we have collected:`,
                            action: 'TOP_TOKEN',
                            result: {
                                type: "top_token",
                                data: responseData.slice(0, size)
                            }
                        });
                    }

                    return true;
                case "LOSERS":
                    let losers = await redis.hGet("coins_info", "losers");
                    let loserCoins;
                    if (losers !== null) {
                        loserCoins = JSON.parse(losers).data
                    }
                    else {
                        loserCoins = await cmsProvider.getTokens("losers");
                        loserCoins = loserCoins.data;
                    }
                    responseData = loserCoins.map((token: any) => ({
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
                            text: `Below are Losers tokens we have collected:`,
                            action: 'TOP_TOKEN',
                            result: {
                                type: "top_token",
                                data: responseData.slice(0, size)
                            }
                        });
                    }

                    return true;
                case "STABLECOIN":
                    let stables = await redis.hGet("coins_info", "stablecoin");
                    // let stableCoins = JSON.parse(stables).data
                    let stableCoins;
                    if (stables !== null) {
                        stableCoins = JSON.parse(stables).data
                    }
                    else {
                        stableCoins = await cmsProvider.getTokens("stablecoin");
                        stableCoins = stableCoins.data;
                    }
                    responseData = stableCoins.map((token: any) => ({
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
                            text: `Below are Stable coins we have collected:`,
                            action: 'TOP_TOKEN',
                            result: {
                                type: "top_token",
                                data: responseData.slice(0, size)
                            }
                        });
                    }

                    return true;
                case "AI":
                    let ais = await redis.hGet("coins_info", "ai");
                    // let aiCoins = JSON.parse(ais).data
                    let aiCoins;
                    if (ais !== null) {
                        aiCoins = JSON.parse(ais).data
                    }
                    else {
                        aiCoins = await cmsProvider.getTokens("ai");
                        aiCoins = aiCoins.data;
                    }
                    responseData = aiCoins.map((token: any) => ({
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
                            text: `Below are AI tokens we have collected:`,
                            action: 'TOP_TOKEN',
                            result: {
                                type: "top_token",
                                data: responseData.slice(0, size)
                            }
                        });
                    }

                    return true;
                case "GAME":
                    let games = await redis.hGet("coins_info", "game");
                    // let gameCoins = JSON.parse(games).data
                    let gameCoins;
                    if (games !== null) {
                        gameCoins = JSON.parse(games).data
                    }
                    else {
                        gameCoins = await cmsProvider.getTokens("game");
                        gameCoins = gameCoins.data;
                    }
                    responseData = gameCoins.map((token: any) => ({
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
                            text: `Below are Game tokens we have collected:`,
                            action: 'TOP_TOKEN',
                            result: {
                                type: "top_token",
                                data: responseData.slice(0, size)
                            }
                        });
                    }

                    return true;
                case "DEX":
                    let dexs = await redis.hGet("coins_info", "dex");
                    // let gameCoins = JSON.parse(games).data
                    let dexCoins;
                    if (dexs !== null) {
                        dexCoins = JSON.parse(dexs).data
                    }
                    else {
                        dexCoins = await cmsProvider.getTokens("dex");
                        dexCoins = dexCoins.data;
                    }
                    responseData = dexCoins.map((token: any) => ({
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
                            text: `Below are Dex tokens we have collected:`,
                            action: 'TOP_TOKEN',
                            result: {
                                type: "top_token",
                                data: responseData.slice(0, size)
                            }
                        });
                    }

                    return true;
                case "NEW":
                    let news = await redis.hGet("coins_info", "new");
                    // let gameCoins = JSON.parse(games).data
                    let newCoins;
                    if (news !== null) {
                        dexCoins = JSON.parse(news).data
                    }
                    else {
                        newCoins = await cmsProvider.getTokens("new");
                        newCoins = newCoins.data;
                    }
                    responseData = newCoins.map((token: any) => ({
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
                            text: `Below are New tokens we have collected:`,
                            action: 'TOP_TOKEN',
                            result: {
                                type: "top_token",
                                data: responseData.slice(0, size)
                            }
                        });
                    }

                    return true;
                case "TGE":
                case "RELEASE_TOKEN":
                case "LISTING":
                    callback({
                        user: await runtime.character.name,
                        text: `Top tokens that are about to have their TGE, token release, or exchange listing: BIRDS, SEED, FANTV, Walrus, Wave, Haedal, 7K`,
                    })
                    return true;
                    break;
            }
        }
        else if (content.type_action === "POTENTIAL") {
            const coinGeckoProvider = new GeckoTerminalProvider();
            let tokens = [
                "0x2::sui::SUI",
                "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
                "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
                "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX",
                "0xb45fcfcc2cc07ce0702cc2d229621e046c906ef14d9b25e8e4d25f6e8763fef7::send::SEND",
                "0xe1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE",
                "0xb4bc93ad1a07fe47943fc4d776fed31ce31923acb5bc9f92d2cab14d01fc06a4::ROCK::ROCK"
            ];
            switch (content.type) {
                case "MEME":
                    tokens = [
                        "0x8993129d72e733985f7f1a00396cbd055bad6f817fee36576ce483c8bbb8b87b::sudeng::SUDENG",
                        "0xf22da9a24ad027cccb5f2d496cbe91de953d363513db08a3a734d361c7c17503::LOFI::LOFI",
                        "0xfa7ac3951fdca92c5200d468d31a365eb03b2be9936fde615e69f0c1274ad3a0::BLUB::BLUB",
                        "0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5e631c26f1::fud::FUD",
                        "0xd976fda9a9786cda1a36dee360013d775a5e5f206f8e20f84fad3385e99eeb2d::aaa::AAA"
                    ];
                    break;
                case "AI":
                    tokens = [
                        "0xb4bc93ad1a07fe47943fc4d776fed31ce31923acb5bc9f92d2cab14d01fc06a4::ROCK::ROCK",
                        "0xbc732bc5f1e9a9f4bdf4c0672ee538dbf56c161afe04ff1de2176efabdf41f92::suai::SUAI",
                        "0xea65bb5a79ff34ca83e2995f9ff6edd0887b08da9b45bf2e31f930d3efb82866::s::S",

                    ];
                    break;
                case "DEFI":
                    tokens = [
                        "0xb45fcfcc2cc07ce0702cc2d229621e046c906ef14d9b25e8e4d25f6e8763fef7::send::SEND",
                        "0x7016aae72cfc67f2fadf55769c0a7dd54291a583b63051a5ed71081cce836ac6::sca::SCA",
                        "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX",
                        "0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI"
                    ];

                    break;
            }
            const tokenData = await coinGeckoProvider.fetchMultipleTokenOnNetwork("sui-network", tokens)
            let responseData = tokenData.data.map((token: any, index: number) => {
                return {
                    name: token.attributes.name,
                    symbol: token.attributes.symbol,
                    price: token.attributes.price_usd,
                    price_change_24h: tokenData.included[index]?.attributes.price_change_percentage?.h24 ?? 0,
                    type: token.attributes.address,
                    iconUrl: token.attributes.image_url
                };
            });
            callback({
                user: await runtime.character.name,
                text: `Top potential token on Sui`,
                action: "TOP_TOKEN",
                result: {
                    type: "top_token",
                    data: responseData.slice(0, size),
                },
            });
            return true;
        }
        else {
            const redis = new RedisClient(process.env.REDIS_URL)
            let topDexOnCoinGecko: any = await redis.getValue({ key: "TOP_DEX_COIN_GECKO" });

            if (topDexOnCoinGecko) {
                topDexOnCoinGecko = JSON.parse(topDexOnCoinGecko);
            } else {
                topDexOnCoinGecko = await fetchTopDexByNetwork(content.network_blockchain);
            }
            let topDexOnSuiScan: any = await redis.getValue({ key: "TOP_DEX_BLOCK_BERRY" });
            if (topDexOnSuiScan) {
                topDexOnSuiScan = JSON.parse(topDexOnSuiScan);
            } else {
                const blockBerryProvider = new BlockBerryProvider(process.env.BLOCKBERRY_API);
                topDexOnSuiScan = await blockBerryProvider.fetchDex(0, 20, "CURRENT_TVL", "DESC", "DAY")
                const responseData = topDexOnCoinGecko.data.map(dex => {
                    elizaLogger.info(dex)
                    const dexMetricId = dex.relationships.dex_metric.data.id;
                    const metric = topDexOnCoinGecko.included.find(item => item.id === dexMetricId);
                    const project = topDexOnSuiScan.find(item =>
                        dex.attributes.name.toLowerCase().includes(item.projectName.toLowerCase().trim())
                    );
                    if (!project) return null;
                    return {
                        swap_volume_usd_24h: metric?.attributes.swap_volume_usd_24h || null,
                        swap_count_24h: metric?.attributes.swap_count_24h || null,
                        swap_volume_usd_48h_24h: metric?.attributes.swap_volume_usd_48h_24h || null,
                        swap_volume_percent_change_24h: metric?.attributes.swap_volume_percent_change_24h || null,
                        name: dex.attributes.name,
                        identifier: dex.attributes.identifier,
                        url: dex.attributes.url,
                        analytics_pool_page_url: dex.attributes.analytics_pool_page_url,
                        analytics_token_page_url: dex.attributes.analytics_token_page_url,
                        img_icon: dex.attributes.image_url,
                        website: project?.socialWebsite || null,
                        discord: project?.socialDiscord || null,
                        twitter: project?.socialTwitter || null,
                        telegram: project?.socialTelegram || null,
                        currentTvl: project?.currTvl || null,
                        volume: project?.volume || null,
                        volumeChange: project?.volumeChange || null,
                        txBlocks: project?.txsCount || null,
                        pools: project?.pools || null,
                        poolsCount: project?.poolsCount || null,
                        packages: project?.packages || []
                    };
                });
                const filteredResponseData = responseData.filter(dex => dex !== null);
                callback({
                    user: await runtime.character.name,
                    text: `The top DEX on ${content.network_blockchain}`,
                    action: "TOP_DEX",
                    result: {
                        type: "top_dex",
                        data: filteredResponseData,
                    },
                });
                return true;
            }


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
                    text: "Top NFT ",
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
                    text: "show me top 10 trending",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Top meme",
                    action: "TOP_TOKEN",
                    content: {
                        "size": 10,  // Number of records
                        "sortBy": null,
                        "type": "TRENDING"
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "show me top 7 DeFi",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Top defi",
                    action: "TOP_TOKEN",
                    content: {
                        "size": 5,  // Number of records
                        "sortBy": null,
                        "type": "DEFI"
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "show me top 7 loser",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Top loser",
                    action: "TOP_TOKEN",
                    content: {
                        "size": 10,  // Number of records
                        "sortBy": null,
                        "type": "LOSERS"
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "show me top 3 ai",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Top ai ",
                    action: "TOP_TOKEN",
                    content: {
                        "size": 3,  // Number of records
                        "sortBy": null,
                        "type": "AI"
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "show me top 3 game tokens",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Top game",
                    action: "TOP_TOKEN",
                    content: {
                        "size": 3,  // Number of records
                        "sortBy": null,
                        "type": "GAME"
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "show me top 3 stable coin",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Top stablecoin token",
                    action: "TOP_TOKEN",
                    content: {
                        "size": 3,  // Number of records
                        "sortBy": null,
                        "type": "STABLECOIN"
                    },
                },
            },
        ],
    ],
} as Action;


