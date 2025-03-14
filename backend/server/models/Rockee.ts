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
    updateData(input: any, id: string): any;
}
const rockeeSchema = new mongoose.Schema({
    message: {
        type: String,
        require: true,
        unique: true
    },
    data: {
        type: Object,
        require: true
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
    async (input: any, id: string) => {
        const rs = await Rockee.updateOne({
            message: input.message,
            data: input.data,
        }, {
            $set: {
                _id: id
            }
        });
        return rs
    }
)
const Rockee = mongoose.model<IRockee, RockeeModel>('Rockee', rockeeSchema);

export { Rockee as RockeeSchema }