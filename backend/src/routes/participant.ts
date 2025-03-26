import express from 'express';
import ParticipantControllers from '../controllers/Participant';
const router: express.Router = express.Router();

router.post('/api/messages', async (req, res) => {
    const inputs = req.body;
    console.log("inputs:",inputs);
    const roomId = inputs.roomId;
    const userId = inputs.userId;
    const bucketMessage =  await ParticipantControllers.getBucketMessageByRoomIdUserId(roomId, userId);
    // console.log("bucketMessage:",bucketMessage);
    return res.send({
        data: bucketMessage.content,
        code: 1,
        message: "sucess"
    })
})

export { router as ParticipantRouters }