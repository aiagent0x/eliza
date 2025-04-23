import { elizaLogger, type IAgentRuntime, type Memory, type Provider, type State } from "@elizaos/core";
import { promises as fs } from "fs";
import path from "path";

const taggingProvider: Provider = {
    get: async (_runtime: IAgentRuntime, _message: Memory, _state?: State) => {
        const filePath = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../src/data/tagging.json");
        try {
            const fileContent = await fs.readFile(filePath, "utf-8");
            const tokenInfo = JSON.parse(fileContent);
            return tokenInfo;
        } catch (error) {
            elizaLogger.error("Failed to read or parse tagging.json file", error);
            throw error;
        }
    },
};

export { taggingProvider };
