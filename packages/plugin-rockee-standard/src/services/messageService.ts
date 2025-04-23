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
            console.error("Error fetching market data:", error);
            throw new Error("Failed to fetch market data");
        }
    }
    async createMessage(text, data) {
        try {
            const response = await this.axiosInstance.post("/rockee/create", {
                text: text,
                data: data,
            });
            return response.data.data;
        } catch (error) {
            console.error("Error fetching market data:", error);
            throw new Error("Failed to fetch market data");
        }
    }

}

export default MessageService;