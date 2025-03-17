import mongoose, { Model } from "mongoose";
interface IUser {
    username: String,
    password: String,
    role: mongoose.Schema.Types.ObjectId,
    name: String,
    created_at: Number,
    updated_at: Number,
}

interface UserModel extends Model<IUser> {
    getUserInfoById(id: string): any;
}
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        require: true
    },
    password: {
        type: String,
        require: true
    },
    role: {
        type: mongoose.Schema.Types.ObjectId,
        default: 0
    },
    name: {
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

userSchema.static("getUserInfoById",
    async (id: string) => {
        return User.findOne({ _id: id }).select(["_id","name"]);
    }
)

const User = mongoose.model<IUser, UserModel>('User', userSchema);

export { User as UserSchema }