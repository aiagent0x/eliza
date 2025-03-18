import axios, { AxiosInstance } from "axios";
import {
    type AgentRuntime,
    elizaLogger,
    messageCompletionFooter,
    generateCaption,
    generateImage,
    type Media,
    getEmbeddingZeroVector,
    composeContext,
    generateMessageResponse,
    generateObject,
    type Content,
    type Memory,
    ModelClass,
    type Client,
    stringToUuid,
    settings,
    type IAgentRuntime,
} from "@elizaos/core";
import { suggestMessage } from "../suggestMessage";
export class MessageService {
    private axiosInstance: AxiosInstance;

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: "http://localhost:5000/api",
            timeout: 5000,
        });
    }

    async getDataByMessage(
        message: string
    ) {
        try {
            const response = await this.axiosInstance.post("/rockee/search", {
                text: message
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching market data:", error.message);
            return null
        }
    }
    async toggleChooseActionFaster(messageId, type, dataTagging, userMessage, memory, runtime: AgentRuntime) {
        await runtime.messageManager.createMemory(memory);
        let state = await runtime.composeState(userMessage, {
            agentName: runtime.character.name,
        });
        if (type === "suggest_message") {
            return [await suggestMessage(runtime, memory, state)]
        }

        const responseMessage: Memory = {
            id: stringToUuid(messageId + "-" + runtime.agentId),
            ...userMessage,
            userId: runtime.agentId,
            content: dataTagging,
            embedding: getEmbeddingZeroVector(),
            createdAt: Date.now(),
        };
        await runtime.messageManager.createMemory(responseMessage);
        let message = null as Content | null;
        
        await runtime.processActions(
            memory,
            [responseMessage],
            state,
            async (newMessages) => {
                message = newMessages;
                return [memory];
            }
        );
        const action = runtime.actions.find(
            (a) => a.name === dataTagging.action
        );
        const shouldSuppressInitialMessage =
            action?.suppressInitialMessage;
        if (!shouldSuppressInitialMessage) {
            if (message) {
                return [dataTagging, message];
            } else {
                return [dataTagging];
            }
        } else {
            if (message) {
                return [message];
            } else {
                return [];
            }
        }
    }

}

export default MessageService;