import mongoose, { Model } from "mongoose";
interface IParticipant {
    userId: String,
    roomId: String,
    content: Array<any>, 
    created_at: Number,
    updated_at: Number,
}
interface ParticipantModel extends Model<IParticipant> {
    getBucketMessageByRoomIdUserId(roomId: string, userId:string): any;
}
const participantSchema = new mongoose.Schema({
    userId: {
        type: String
    },
    roomId: {
        type: String
    },
    content: {
        type: Array,
        default: []
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
participantSchema.static("getBucketMessageByRoomIdUserId",
    async (roomId: string, userId: string) => {
        console.log("roomId:",roomId);
        console.log("userId:",userId);
        return Participant.findOne({ roomId: roomId, userId: userId }).select(["content"]);
    }
)

const Participant = mongoose.model<IParticipant, ParticipantModel>('Participant', participantSchema);

export { Participant as ParticipantSchema }