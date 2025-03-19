import mongoose, { Model } from "mongoose";
interface IHubAgent {
    // username: String,
    // password: String,
    // role: mongoose.Schema.Types.ObjectId,
    // name: String,
    created_at: Number,
    updated_at: Number,
}
interface HubAgentModel extends Model<IHubAgent> {
    // getDataByMessage(text: string): any;
    // createData(input: any): any;
    // updateData(input: any): any;
}
const hubAgentSchema = new mongoose.Schema({
    message: {
        type: String,
        require: true,
        unique: true
    },
    data: {
        action: {
            type: String
        },
        data_extract: {
            type: Object,
        },
        type: {
            type: String,
            default: "toggle_faster"
        }
    },
    type: {
        type: String,
        default: "rockee",
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
// hubAgentSchema.static("getDataByMessage",
//     async (text: string) => {
//         return Rockee.findOne({ message: text }).select(["data"]);
//     }
// )
// hubAgentSchema.static("createData",
//     async (input: any) => {
//         const rs = await Rockee.create({
//             message: input.message,
//             data: input.data,
//         });
//         return rs;
//     }
// )
// hubAgentSchema.static("updateData",
//     async (input: any) => {
//         const rs = await Rockee.updateOne(
//             { message: input.message },
//             { $set: { data: input.data } }
//         );
//         return rs
//     }
// )
const HubAgent = mongoose.model<IHubAgent, HubAgentModel>('HubAgent', hubAgentSchema);

export { HubAgent as HubAgent }