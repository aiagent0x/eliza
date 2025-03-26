import { HubAgentSchema } from "../../models/Hub-Agent";

async function createHubAgent(input: any) {
    try {
        await HubAgentSchema.createHubAgent({
            name: input.name,
            agentAId: input.agentAId,
            agentBId: input.agentBId,
            roomId: input.roomId,
            type: input.type
        });
        return;
    } catch (error) {
        console.log("Error in createHubAgent controller", error);
        return;
    }
}
async function updateHubAgent(input: any, id: string) {
    try {
        await HubAgentSchema.updateHubAgent(input, id);
        return;
    } catch (error) {
        console.log("Error in updateHubAgent controller", error);
        return;
    }
}
export default { createHubAgent, updateHubAgent };