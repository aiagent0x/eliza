import mongoose, { Model } from "mongoose";
interface IParticipant {
    userId: String,
    roomId: String,
    created_at: Number,
    updated_at: Number,
}
interface ParticipantModel extends Model<IParticipant> {
    // getUserInfoById(id: string): any;
}
const participantSchema = new mongoose.Schema({
    userId: {
        type: String
    },
    roomId: {
        type: String
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

const Participant = mongoose.model<IParticipant, ParticipantModel>('Participant', participantSchema);

export { Participant as ParticipantSchema }