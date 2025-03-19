import mongoose, { Model } from "mongoose";
interface IRockee {
    username: String,
    password: String,
    role: mongoose.Schema.Types.ObjectId,
    name: String,
    created_at: Number,
    updated_at: Number,
}
interface RockeeModel extends Model<IRockee> {
    getDataByMessage(text: string): any;
    createData(input: any): any;
    updateData(input: any): any;
}
const rockeeSchema = new mongoose.Schema({
    message: {
        type: String,
        require: true,
        unique: true,
        index: true // Adding index to the message field
    },
    data: {
        action: {
            type: String,
            index: true // Adding index to the data.action field
        },
        data_extract: {
            type: Object,
        },
        type: {
            type: String,
            default: "toggle_faster",
            index: true // Adding index to the data.type field
        }
    },
    type: {
        type: String,
        default: "rockee",
        require: true
    },
    created_at: Number,
    updated_at: Number,
},
    {
        timestamps: {
            currentTime: () => Date.now(),
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
);

// Adding a compound index for message, data.type, data.action, and data.data_extract in reverse order

rockeeSchema.index(
    { "data.data_extract": 1, "data.action": 1, "data.type": 1, message: 1 },
    { name: "reverse_order_index" }
);
rockeeSchema.index(
    { message: 1 },
    { unique: true, name: "unique_message_index" }
);
rockeeSchema.static("getDataByMessage",
    async (text: string) => {
        return Rockee.findOne({ message: text }).select(["data"]);
    }
)
rockeeSchema.static("createData",
    async (input: any) => {
        const rs = await Rockee.create({
            message: input.message,
            data: input.data,
        });
        return rs;
    }
)
rockeeSchema.static("updateData",
    async (input: any) => {
        const rs = await Rockee.updateOne(
            { message: input.message },
            { $set: { data: input.data } }
        );
        return rs
    }
)
const Rockee = mongoose.model<IRockee, RockeeModel>('Rockee', rockeeSchema);

export { Rockee as RockeeSchema }