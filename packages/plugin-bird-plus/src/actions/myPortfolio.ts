import {
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    type Action,
} from "@elizaos/core";


export const myPortfolio: Action = {
    name: "PORTFOLIO",
    similes: [
        "SHOW_PORTFOLIO",
        "MY_PORTFOLIO"
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "my portfolio",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {

        callback({
            text: "Here’s a snapshot of your portfolio for you!",
            action: "PORTFOLIO",
            result: {
                type: "my_portfolio",
            }
        })

        return true;


    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "My portfolio",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "PORTFOLIO",
                    action: "PORTFOLIO",

                },
            },
        ],
    ]
} as Action;
