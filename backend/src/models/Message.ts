import mongoose, { Model } from "mongoose";
interface IMessage {
    content: Object,
    userId: String,
    roomId: String,
    agentId: String,
    unique: Boolean,
    created_at: Number,
    updated_at: Number,
}
interface MessageModel extends Model<IMessage> {
    // getUserInfoById(id: string): any;
}
const messageSchema = new mongoose.Schema({
    content: {
        type: Object
    },
    userId: {
        type: String
    },
    roomId: {
        type: String
    },
    agentId: {
        type: String
    },
    unique: {
        type: Boolean,
        default: false
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
});

const Message = mongoose.model<IMessage, MessageModel>('Message', messageSchema);

export { Message as MessageSchema }