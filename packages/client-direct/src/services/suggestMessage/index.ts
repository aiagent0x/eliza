import {
    Memory,
    IAgentRuntime,
    State,
    elizaLogger,
} from "@elizaos/core";
import { getTopTrendingTokens } from "./topTrendingToken";
import { getStakingPools } from "./stakingPools";
import { getUserPortofilo } from "./userPortofilo";

export async function suggestMessage(runtime: IAgentRuntime, message: Memory, state: State) {

    const listSuggest = ["staking_pools", "top_trending_token", "user_portofilo"]
    const randomIndex = Math.floor(Math.random() * listSuggest.length);
    const randomSuggestion = listSuggest[randomIndex];
    elizaLogger.info(randomSuggestion);
    switch (randomSuggestion) {
        case "staking_pools":
            return await getStakingPools(await runtime.character.name);
            break;
        case "top_trending_token":
            return await getTopTrendingTokens(await runtime.character.name);
            break;
        case "user_portofilo":
            return await getUserPortofilo(message.userId, await runtime.character.name);
            break;
    }
}