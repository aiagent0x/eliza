import {
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
import MessageService from "../services/messageService";




const taskTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.
Example response:
    \`\`\`json
    {
    "project_name": "Sui" | null, // Project crypto  currency name
    "token_symbol": "sui" | null, // token symbol of crypto currency  
}
    \`\`\`
Recent messages:  {{recentMessages}}
The following are project names within the Sui Network: SUI, Cetus, NAVI, DeepBook, Walrus, BIRDS, FanTV, Wave, 7K, Haedal, Aftermath, Bluefin, BlueMove, Turbos, Hop Aggregator, Bucket Protocol, Scallop, Memefi, Tradeport, SuiNS, Suilend, SuiPlay, RaidenX, Typus Finance, Kriya, FlowX, Sudo Finance, AlphaFi, Kai Finance, Strater, Volo, Suiet, Ethos Wallet, Surf Wallet, Nightly, Martian Wallet, Stashed, Suia, SeaPad, DARKTIMES, Cosmocadia, Panzerdogs, MotoDEX, Capybara, Sacabam, SuDeng, Blub, Fud the Pug, Suiman, Suipad, Rockee AI, Sui, Lofi, Sui Agents, SuiAI, AXOL, Agent S, LumiWave, Bucket, Rockee. All project names are recognized regardless of case format.

The following are token symbols within the Sui Network: SUI, NS, kSUI, WBNB, USDY, CAPO, SEND, USDT, DEEP, FLX, ALPHA, SPAM, FDUSD, AFSUI, WETH, SPT, SUIP, HOPI, CETUS, MOVE, wUSDC, WFTM, ARTFI, SOL, USDC, haSUI, PIGU, PRH, FUD, AXOL, SCB, KOTO, JWLSUI, BLUB, AUSD, TYPUS, ETH, SCA, vSUI, SSWP, sSUI, stSUI, SUIA, SCUBA, Chad, WMATIC, NAVX, BLUE, PDO, OINK, HSUI, TURBOS, BUCK, WBTC, WAVAX, APT, REAP, PSH, ROCK. All token symbols are recognized regardless of case format.

VALIDATION RULES:
    All property names must use double quotes
    All string values must use double quotes
    null values should not use quotes
    No trailing commas allowed
    No single quotes anywhere in the JSON
    Respond with a JSON markdown block containing only the extracted values.
`;

export const taskInfo: Action = {
    name: "TASK",
    similes: [
        "SHOW_TASK"
    ],

    examples: [
        [
            {
                "user": "{{user1}}",
                "content": {
                    "text": "Show me task",
                    "action": "TASK",

                }
            },
            {
                "user": "{{user2}}",
                "content": {
                    "text": "TASK",
                    "action": "TASK",

                }
            }
        ],

    ],

    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },

    description: "Get List and detail task",

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.info("[tokenInfo]");
        let content: any = _options.data_extract;
        if (_options.type !== "toggle_faster") {
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }

            const taskInfoContext = composeContext({
                state,
                template: taskTemplate,
            })

            content = await generateObjectDeprecated({
                runtime,
                context: taskInfoContext,
                modelClass: ModelClass.SMALL,
            })
        }
        elizaLogger.info("content:", content)
        if (_options.type !== "toggle_faster") {
            let messageService = new MessageService()
            await messageService.createMessage(
                message.content.text,
                {
                    action: "TASK",
                    data_extract: content
                })
        }
        callback({
            user: await runtime.character.name,
            text: "hello",
            action: 'TASK',
            result: {
                type: "task",
                data: {
                },
                // action_hint: getActionHint()
            }
        });

        // callback({
        //     user: await runtime.character.name,
        //     text: "hello",
        //     action: 'TASK',
        //     result: {
        //         type: "task_detail",
        //         data: {
        //         },
        //         // action_hint: getActionHint()
        //     }
        // });
        return true;



    }
}

