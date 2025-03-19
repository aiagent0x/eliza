import mongoose, { Model } from "mongoose";
interface IAccount {
    id: String,
    name: String,
    username: String,
    email: String,
    details: Object,
    created_at: Number,
    updated_at: Number,
}

interface AccountModel extends Model<IAccount> {
    // getUserInfoById(id: string): any;
}
const accountSchema = new mongoose.Schema({
    id: {
        type: String,
        unique: true
    },
    name: {
        type: String,
        unique: true
    },
    username: {
        type: String,
    },
    email: {
        type: String,
    },
    details: {
        type: Object,
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
})

//     accountSchema.static("getUserInfoById",
//     async (id: string) => {
//         return User.findOne({ _id: id }).select(["_id", "name"]);
//     }
// )
const Account = mongoose.model<IAccount, AccountModel>('Account', accountSchema);

export { Account as AccountSchema }