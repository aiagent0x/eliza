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
import getTransactionInfo from "../providers/checkTxHash";
import { hashUserMsg } from "../utils/format";
const checkTxHashTemplate = `Please extract the following swap details for SUI network:
{
    "txHash": string  | null,                // txHash is transaction block on sui network
    
}
Recent messages: {{recentMessages}}
Retrieve and return the transaction details using the given txHash. The response should be a JSON object with the specified field. If the txHash is unavailable or invalid, return null.
All property names must use double quotes
All string values must use double quotes
null values should not use quotes
No trailing commas allowed
No single quotes anywhere in the JSON
`;
export const checkTxhashOnSui: Action = {
    name: "CHECK_TXHASH_SUI_NETWORK",
    similes: [
        "SUI_VERIFY_TXHASH",
        "SUI_GET_TRANSACTION_DETAILS",
        "SUI_LOOKUP_TXHASH",
        "SUI_FETCH_TXHASH_INFO",
        "SUI_QUERY_TRANSACTION",
        "SUI_CHECK_TX_STATUS",
        "SUI_INSPECT_TXHASH",
        "SUI_RETRIEVE_TXHASH_DATA",
        "SUI_ANALYZE_TRANSACTION",
        "SUI_SCAN_TXHASH"
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        // Check if the necessary parameters are provided in the message
        // console.log("Message:", message);
        return true;
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
        const msgHash = hashUserMsg(message, "check_info_txhash");
        let content: any = await runtime.cacheManager.get(msgHash);
        elizaLogger.info("---- cache info: ", msgHash, "--->", content);
        if (!content) {
            const checkTxHashContext = composeContext({
                state,
                template: checkTxHashTemplate,
            });
            content = await generateObjectDeprecated({
                runtime,
                context: checkTxHashContext,
                modelClass: ModelClass.SMALL,
            });
            await runtime.cacheManager.set(msgHash, content, { expires: Date.now() + 300000 });
        }
        console.log("content:", content);
        try {
            const checkInfoTxHash = await getTransactionInfo(content.txHash);
            callback({
                user: await runtime.character.name,
                text: `🦅 Your transaction with hash ${content.txHash} is currently ${checkInfoTxHash.effects.status.status}. Stay soaring high! 🚀💸`,
                action: "CHECK_TXHASH_SUI_NETWORK",
                result: {
                    type: "info_txhash",
                    data: checkInfoTxHash

                }
            })
            return true;
        } catch (error) {
            callback({
                user: await runtime.character.name,
                text: `Your transaction status for txhash ${content.txHash} is fail`,
                action: "CHECK_TXHASH_SUI_NETWORK",
            })
            console.error("Error during token swap:", error);
            return false;
        }
    },
    examples: [
        [
            {
                "user": "{{user1}}",
                "content": {
                    "text": "check txhash 9XbGmKRrX2cYeHiY4LJDdHNY77c3MzBrMKpxz3F5BV2E"
                }
            },
            {
                "user": "{{user2}}",
                "content": {
                    "text": "Fetching transaction details for txHash: 9XbGmKRrX2cYeHiY4LJDdHNY77c3MzBrMKpxz3F5BV2E...",
                    "action": "SUI_CHECK_TXHASH",
                    "params": {
                        "txHash": "9XbGmKRrX2cYeHiY4LJDdHNY77c3MzBrMKpxz3F5BV2E"
                    }
                }
            }
        ],
        [
            {
                "user": "{{user1}}",
                "content": {
                    "txHash": "9XbGmKRrX2cYeHiY4LJDdHNY77c3MzBrMKpxz3F5BV2E"
                }
            },
            {
                "user": "{{user2}}",
                "content": {
                    "text": "check txhash 3LvEnUFK7qxTU4Wh3CwgUhJJowiuMAiyNhyMDpteAknC",
                    "action": "SUI_CHECK_TXHASH",
                    "params": {
                        "txHash": "3LvEnUFK7qxTU4Wh3CwgUhJJowiuMAiyNhyMDpteAknC"
                    }
                }
            }
        ]
    ] as ActionExample[][],
} as Action;
