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