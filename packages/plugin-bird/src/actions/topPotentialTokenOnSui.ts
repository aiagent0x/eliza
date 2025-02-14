import {
    // ActionExample,
    Content,
    elizaLogger,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    type Action,
} from "@elizaos/core";
import CoingeckoProvider from "../providers/coingeckoProvider";
import GeckoTerminalProvider from "../providers/coingeckoTerminalProvider";
export interface InfoContent extends Content {
    coin_symbol: string;
    coin_name: string;
}
export const topPotentialTokenOnSui: Action = {
    name: "TOP_POTENTIAL_TOKEN",
    description: "Top potential token on Sui",
    similes: [
        "TOP_POTENTIAL_TOKEN",
    ],

    examples: [

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
        const tokens = [
            "0x2::sui::SUI",
            "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
            "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
            "0x09b1537c042ad9b82e66eb763a4e3b27b03b20563e47b9c062fb4e3e80d34832::navx::NAVX",
            "0xb45fcfcc2cc07ce0702cc2d229621e046c906ef14d9b25e8e4d25f6e8763fef7::send::SEND",
            "0xe1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE",
            "0xb4bc93ad1a07fe47943fc4d776fed31ce31923acb5bc9f92d2cab14d01fc06a4::ROCK::ROCK"
        ];
        const coinGeckoProvider = new GeckoTerminalProvider()
        const responseData = await coinGeckoProvider.fetchMultipleTokenOnNetwork("sui-network", tokens)

        const tokenData = responseData.data.map((token: any, index: number) => {
            return {
                name: token.attributes.name,
                symbol: token.attributes.symbol,
                price: token.attributes.price_usd,
                price_change_24h: responseData.included[index]?.attributes.price_change_percentage?.h24 ?? 0,
                type: token.attributes.address,
                iconUrl: token.attributes.image_url
            };
        });
        callback({
            user: await runtime.character.name,
            text: `Top potential token on Sui`,
            action: "TOP_POTENTIAL_TOKEN",
            result: {
                type: "top_potential_token",
                data: tokenData,
            },
        });


        return true;
    }
}

