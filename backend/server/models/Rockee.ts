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
    // getUserInfoById(id: string): any;
    getDataByMessage(text: string): any;
}
const rockeeSchema = new mongoose.Schema({
    message: {
        type: String,
        require: true,
        unique: true
    },
    data: {
        type: String,
        require: true
    },
    type: {
        type: String,
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
const Rockee = mongoose.model<IRockee, RockeeModel>('Rockee', rockeeSchema);

export { Rockee as RockeeSchema }