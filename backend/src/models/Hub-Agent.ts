import mongoose, { Model } from "mongoose";
interface IHubAgent {
    name: String,
    type: String,
    agentAId: String,
    agentBId: String,
    roomId: String,
    created_at: Number,
    updated_at: Number,
}
interface HubAgentModel extends Model<IHubAgent> {
    createHubAgent(input: any): any;
    updateHubAgent(input: any, id: string): any;
}
const hubAgentSchema = new mongoose.Schema({
    name: {
        type: String,
        default: "swarm-tranning",
        required: true
    },
    agentAId: {
        type: String
    },
    agentBId: {
        type: String
    },
    roomId: {
        type: String
    },
    type: {
        type: String,
        default: "swarm-tranning",
        require: true
    },
    created_at: Number,
    updated_at: Number,
}
    ,
    {
        timestamps: {
            currentTime: () => Date.now(),
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
)
hubAgentSchema.static("createHubAgent",
    async (input: any) => {
        await HubAgent.create({
            name: input.name,
            agentAId: input.agentAId,
            agentBId: input.agentBId,
            roomId: input.roomId,
            type: input.type
        });
        return;
    }
)
hubAgentSchema.static("updateHubAgent",
    async (input: any, id: string) => {
        await HubAgent.updateOne({ _id: id }, {
            $set:{
                name: input.name,
                agentAId: input.agentAId,
                agentBId: input.agentBId,
                roomId: input.roomId,
                type: input.type
            }
        });
        return;
    }
);
const HubAgent = mongoose.model<IHubAgent, HubAgentModel>('HubAgent', hubAgentSchema);

export { HubAgent as HubAgentSchema }