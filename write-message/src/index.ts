import { RabbitMQ } from "@elizaos/adapter-rabbitmq";
import dotenv from "dotenv";
import { MongoDBDatabaseAdapter } from "@elizaos/adapter-mongodb"
import {
    elizaLogger
} from "@elizaos/core"
import { MongoClient } from "mongodb";
const rabbitMQ = new RabbitMQ("amqp://localhost", ["default_queue"], 10000);
dotenv.config();
const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING, {
    maxPoolSize: 100,
    minPoolSize: 5,
    maxIdleTimeMS: 60000,
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    compressors: ["zlib"],
    retryWrites: true,
    retryReads: true,
});

const dbName = process.env.MONGODB_DATABASE || "elizaAgent";
const db = new MongoDBDatabaseAdapter(client, dbName);

db.init()
    .then(() => {
        elizaLogger.info("Successfully connected to MongoDB Atlas");
    })
    .catch((error) => {
        elizaLogger.info("Failed to connect to MongoDB Atlas:", error);
        throw error;
    });


async function main() {
    rabbitMQ.consume("default_queue", (msg) => {
        // console.log("msg:", msg);
        // const originalMessage = msg.toString();
        const buffer = Buffer.from(msg, 'base64');
        const utf8Message = buffer.toString('utf-8');
        const data = JSON.parse(utf8Message)
        console.log("data:", data)

        // db.createMemory()
    })
}

await main();