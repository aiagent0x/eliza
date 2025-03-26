import express from 'express';
import MessageControllers from '../controllers/Message';
const router: express.Router = express.Router();

router.post('/api/message', async (req, res) => {
    try {
        const { agentId, roomId, userId, text } = req.body;
        // await MessageControllers.sendMessage(agentId, userId, roomId, text);
        return res.send({
            code: 1,
            message: "success"
        })
    } catch (error) {
        console.log("/api/message -> error", error);
        return res.send({
            code: 0,
            message: "error"
        })
    }
})

export { router as MessageRouters }