import { RabbitMQ } from "@elizaos/adapter-rabbitmq";
import dotenv from "dotenv";

import { sendMessage } from "./helpers/axios";
import { RedisClient } from "@elizaos/adapter-redis"

dotenv.config();
const redisClient = new RedisClient(process.env.REDIS_URL || "redis://localhost:6379");
// console.log(process.env.RABBITMQ_CONNECTION_STRING)
// const rabbitMQ = new RabbitMQ(process.env.RABBITMQ_CONNECTION_STRING, ["input_chat_queue", "agent_swam_traning"], 10);
async function main() {
    // rabbitMQ.consume("agent_swarm_training", async (msg) => {
    // const buffer = Buffer.from(msg, 'base64');
    // const utf8Message = buffer.toString('utf-8');
    // const data = JSON.parse(utf8Message)
    // const { agentA, agentB, countMessage, topic, roomId } = data;
    // let sender = agentA;
    // let receiver = agentB;
    // let message = topic;
    // let index = 0
    // while (index < countMessage) {
    //     console.log(`${sender} -> ${receiver}: ${message}`);
    //     let messages = await sendMessage(sender, receiver, message, roomId);
    //     message = messages.data[0].text;
    //     [sender, receiver] = [receiver, sender];
    //     index++;
    // }
    // })
    await redisClient.subscribe({
        channel: "agent_swarm_training",
        onMessage: async (channel, message) => {

            const inputs = JSON.parse(message);
            const { agentA, agentB, topic, roomId } = inputs;
            const countMessage = inputs.countMessage || 6;
            console.log({ agentA, agentB, countMessage, topic, roomId })
            let sender = agentA;
            let receiver = agentB;
            let messageContent = topic;
            let index = 0;
            while (index < countMessage) {
                console.log(`${sender} -> ${receiver}: ${messageContent}`);
                let messages = await sendMessage(sender, receiver, messageContent, roomId);
                messageContent = messages.data[0].text;
                [sender, receiver] = [receiver, sender];
                index++;
            }
        }
    });

}

await main();