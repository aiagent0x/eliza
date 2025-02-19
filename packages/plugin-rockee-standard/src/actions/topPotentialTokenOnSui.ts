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
import CoingeckoProvider from "../providers/coingeckoProvider";
import GeckoTerminalProvider from "../providers/coingeckoTerminalProvider";
const topPotentialTemplate = `
Recent messages: {{recentMessages}}  
Extract the category and size parameters from the conversation above, following these rules:  

- Recognized types:  
  - '"MEME"' for meme tokens (e.g., "Top Potential Meme Tokens on Sui")  
  - '"AI"' for AI-related tokens (e.g., "Top Potential AI Tokens on Sui")  
  - '"DEFI"' for DeFi tokens (e.g., "Top Potential DeFi Tokens on Sui")  
  - '"GAME"' for gaming tokens (e.g., "Top Potential Game Tokens on Sui")  
  - '"DEFAULT"' if the type cannot be determined  

- Return only a JSON object with the specified fields in this format:  

    {  
        "type": "MEME" | "AI" | "DEFI" | "GAME" | "DEFAULT",  
        "size": number  
    }  

- Default 'size' is '5' unless a specific number is mentioned (e.g., "Top 2 Potential Game Tokens on Sui" → '"size": 2').  
- If no recognized category is found, set '"type": "DEFAULT"'.  
- Use 'null' for any values that cannot be determined.  
- All property names must use double quotes.  
- Null values should not use quotes.  
- No trailing commas allowed.  
- No single quotes anywhere in the JSON.  

`
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


        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }
        const topPotentialContext = composeContext({
            state,
            template: topPotentialTemplate,
        });
        const content = await generateObjectDeprecated({
            runtime,
            context: topPotentialContext,
            modelClass: ModelClass.SMALL,
        });
        console.log("content:", content);
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
            action: "TOP_POTENTIAL_TOKEN",
            result: {
                type: "top_token",
                data: responseData,
            },
        });
        return true;

    }
}

