import {
    elizaLogger,
    type IAgentRuntime,
    type Memory,
    type Provider,
    type State,
} from "@elizaos/core";
import NodeCache from "node-cache";
import { AlloraAPIClient, type AlloraTopic, type ChainSlug, PriceInferenceToken, PriceInferenceTimeframe } from "@alloralabs/allora-sdk";

export class TopicsProvider implements Provider {
    private cache: NodeCache;

    constructor() {
        this.cache = new NodeCache({ stdTTL: 30 * 60 }); // Cache TTL set to 30 minutes
    }

    async get(
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string | null> {
        const alloraTopics = await this.getAlloraTopics(runtime);

        // Format the topics into a string to be added to the prompt context
        let output = 'Allora Network Topics: \n';
        for (const topic of alloraTopics) {
            output += `Topic Name: ${topic.topic_name}\n`;
            // output += `Topic Description: ${topic.description}\n`;
            output += `Topic ID: ${topic.topic_id}\n`;
            // output += `Topic is Active: ${topic.is_active}\n`;
            // output += `Topic Updated At: ${topic.updated_at}\n`;
            output += '\n';
        }

        return output;
    }

    private async getAlloraTopics(
        runtime: IAgentRuntime
    ) {
        const cacheKey = "allora-topics";
        const cachedValue = this.cache.get<AlloraTopic[]>(cacheKey);

        // // If the topics are aready cached, return them
        // if (cachedValue) {
        //     elizaLogger.info("Retrieving Allora topics from cache");
        //     return cachedValue;
        // }

        // If the topics are not cached, retrieve them from the Allora API
        // const alloraApiKey = runtime.getSetting("ALLORA_API_KEY");
        // const alloraChainSlug = runtime.getSetting("ALLORA_CHAIN_SLUG");

        // const alloraApiClient = new AlloraAPIClient({
        //     chainSlug: alloraChainSlug as ChainSlug,
        //     apiKey: alloraApiKey as string,
        // });


        const alloraTopics = [
            {
                topic_id: 1,
                topic_name: "ETH 10min Prediction",
                default_arg: "ETH"
            },
            {
                topic_id: 2,
                topic_name: "ETH 24h Prediction",
                default_arg: "ETH"
            },
            {
                topic_id: 3,
                topic_name: "BTC 10min Prediction",
                default_arg: "BTC"
            },
            {
                topic_id: 4,
                topic_name: "BTC 24h Prediction",
                default_arg: "BTC"
            },
            {
                topic_id: 5,
                topic_name: "SOL 10min Prediction",
                default_arg: "SOL"
            },
            {
                topic_id: 6,
                topic_name: "SOL 24h Prediction",
                default_arg: "SOL"
            },
            {
                topic_id: 7,
                topic_name: "ETH 20min Prediction",
                default_arg: "ETH"
            },
            {
                topic_id: 8,
                topic_name: "BNB 20min Prediction",
                default_arg: "BNB"
            },
            {
                topic_id: 9,
                topic_name: "ARB 20min Prediction",
                default_arg: "ARB"
            },
            {
                topic_id: 10,
                topic_name: "Memecoin 1h Prediction",
                default_arg: "TOKEN_FROM_API"
            },
            {
                topic_id: 11,
                topic_name: "US Presidential Election 2024 - Winning Party",
                default_arg: "R"
            },
            {
                topic_id: 13,
                topic_name: "ETH 5min Prediction",
                default_arg: "ETH"
            },
            {
                topic_id: 14,
                topic_name: "BTC 5min Prediction",
                default_arg: "BTC"
            },
            {
                topic_id: 15,
                topic_name: "ETH 5min Volatility Prediction",
                default_arg: "ETH"
            },
            {
                topic_id: 16,
                topic_name: "BTC 5min Volatility Prediction",
                default_arg: "BTC"
            },
        ]
        // const alloraTopics = await alloraApiClient.getAllTopics();
        // const btc8h = await alloraApiClient.getPriceInference(
        //     PriceInferenceToken.BTC,
        //     PriceInferenceTimeframe.EIGHT_HOURS
        // );
        // const getInference1 = await alloraApiClient.getInferenceByTopicID(
        //     1
        // );
        // const getInference2 = await alloraApiClient.getInferenceByTopicID(
        //     2
        // );
        // const getInference3 = await alloraApiClient.getInferenceByTopicID(
        //     3
        // );
        // console.log("getInference1:", getInference1)
        // console.log("getInference2:", getInference2)
        // console.log("getInference3:", getInference3)
        // console.log("btc8h:", btc8h)
        // console.log("alloraTopics:", alloraTopics)
        // Cache the retrieved topics
        this.cache.set(cacheKey, alloraTopics);

        return alloraTopics;
    }
}

export const topicsProvider = new TopicsProvider();
