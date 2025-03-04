

import {
    type AgentRuntime,
    elizaLogger,
} from "@elizaos/core";
export default async function getMemoriesByAgentIdRoomIDUserId(
    runtime: AgentRuntime,
    agentId: string,
    roomId: string,
    userId: string,
    limit: number,
    skip: number
) {
    try {
        console.log(runtime)
        const accountInfo = await runtime.databaseAdapter.db.collection("memories")
            .find({ userId: userId, roomId: roomId, agentId: agentId })
            .sort({ createdAt: -1 })
            .skip((skip - 1) * limit)
            .limit(limit || 0)
            .toArray();
        ;
        return accountInfo;
    } catch (error) {
        elizaLogger.error("getAccountInfo-Mongo", error);
    }
}