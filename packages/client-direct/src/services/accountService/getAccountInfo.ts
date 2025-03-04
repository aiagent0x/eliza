
import {
    type AgentRuntime,
    elizaLogger,
} from "@elizaos/core";
export default async function getAccountInfo(
    runtime: AgentRuntime,
    accountId: string) {
    try {
        console.log("runtime", runtime)
        // const accountInfo = await runtime.databaseAdapter.db.collection("accounts").findOne({ _id: accountId });
        return accountInfo;
    } catch (error) {
        elizaLogger.error("getAccountInfo-Mongo", error);
    }
}