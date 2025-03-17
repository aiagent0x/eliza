import {
    ActionExample,
    composeContext,
    generateObjectDeprecated,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    elizaLogger,
    State,
    type Action,
} from "@elizaos/core";
import { findByVerifiedAndSymbol } from "../providers/searchCoinInAggre";
import { hashUserMsg } from "../utils/format";
import { isValidSuiAddress } from "@mysten/sui/utils";
import MessageService from "../services/messageService";
const sendTokenTemplate = `Please extract the following swap details for SUI network:
{
    "amount": number | 0,               // Amount of tokens to transfer
    "tokenSymbol": string | SUI,          // Token symbol on the SUI network (e.g., "SUI", "UNI")
    "destinationAddress": string | null,    // Recipient's wallet address
}
Recent messages: {{recentMessages}}
Extract the token transfer parameters from the conversation and wallet context above. Return only a JSON object with the specified fields. Use null for any values that cannot be determined.
All property names must use double quotes
All string values must use double quotes
null values should not use quotes
No trailing commas allowed
No single quotes anywhere in the JSON
`;



export const sendTokenBySymbol: Action = {
    name: "TRANSFER_TOKENS",
    similes: [
        "TRANSFER_TOKENS",
        "TOKENS_SEND",
        "ASSET_SEND",
        "TOKENS_TRANSFER",
        "SEND_ASSETS",
        "TOKENS_TRANSFER",
        "ASSET_TRANSFER",
        "TOKENS_DISPATCH",
        "SEND_ASSETS",
        "TOKENS_SHIP",
        "TOKENS_DELIVER",
        "ASSET_SHIP",
        "TOKENS_SEND_OUT",
        "ASSET_DISPATCH",
        "ASSET_TRANSFER_OUT",
        "TOKENS_SEND_OUT",
        "ASSETS_DELIVER",


    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        // Check if the necessary parameters are provided in the message
        // console.log("Message:", message);
        return true;
    },
    description: "transfer",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        // composeState
        let content: any = _options.data_extract;
        if (_options.type !== "toggle_faster") {
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }

            const msgHash = hashUserMsg(message, "send-token");
            content = await runtime.cacheManager.get(msgHash);
            elizaLogger.info("---- cache info: ", msgHash, "--->", content);
            if (!content) {
                const suiTokenInfoContext = composeContext({
                    state,
                    template: sendTokenTemplate,
                });
                content = await generateObjectDeprecated({
                    runtime,
                    context: suiTokenInfoContext,
                    modelClass: ModelClass.SMALL,
                });
                await runtime.cacheManager.set(msgHash, content, { expires: Date.now() + 300000 });
            }
        }
        console.log("content:", content);

        const tokenObject = await findByVerifiedAndSymbol(content.tokenSymbol);
        if (!tokenObject) {
            callback({
                text: `We do not support ${content.inputTokenSymbol} token in SUI network yet. However, if your token is supported, we can proceed with sending tokens using the token's address `,
            })
            return false
        }

        const responseData = {
            amount: content.amount,
            token_info: tokenObject,
            destinationAddress: content.destinationAddress !== null || content.destinationAddress !== "null" ? content.destinationAddress : ""
        }
        try {
            if (_options.type !== "toggle_faster") {
                let messageService = new MessageService()
                await messageService.createMessage(
                    message.content.text,
                    {
                        action: "TRANSFER_TOKENS",
                        data_extract: content
                    })
            }
            callback({
                user: await runtime.character.name,
                text: content.responseMessage,
                action: "TRANSFER_TOKENS",
                result: {
                    type: "send_sui_chain",
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
                    text: "Send 10 UNI to 0xa3b1c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "send token",
                    action: "SEND_TOKEN",
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send token"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Send token",
                    action: "SEND_TOKEN",
                }
            }
        ]
    ] as ActionExample[][],
} as Action;
