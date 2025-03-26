
import { ParticipantSchema } from "../../models/Participant"; // Import Participant

async function getBucketMessageByRoomIdUserId(roomId: string, userId:string) {
    try {
        const data = await ParticipantSchema.getBucketMessageByRoomIdUserId(roomId, userId);
        return data;
    } catch (error) {
        console.log("getBucketMessageByRoomIdUserId -> error", error);
        return;
    }
    
}
export default { getBucketMessageByRoomIdUserId };