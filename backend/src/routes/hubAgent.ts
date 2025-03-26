import express from 'express';
import HubAgentControllers from '../controllers/HubAgent';
import { redisClient } from '../';
const router: express.Router = express.Router();

router.post('/api/swarm-tranning/start', async (req, res) => {
    try {
        const { agentA, agentB, roomId, topic } = req.body;
        // console.log({ agentA, agentB, roomId, topic  })
        await HubAgentControllers.createHubAgent({
            agentAId: agentA,
            agentBId: agentB,
            roomId: roomId,
            type: "swarm-tranning"
        });
        await redisClient.publish('agent_swarm_training', JSON.stringify({ agentA, agentB, roomId, topic }));
        return res.send({
            code: 1,
            message: "success"
        });
    } catch (error) {
        console.log("/api/swarm-tranning/start' -> error", error);
        return res.send({
            code: 0,
            message: "error"
        })
    }
})
router.get('/api/topics', async (req, res) => {
    try {
        const listTopic = [
            {
                message: "How are you?"
            },
            {
                message: "What is the weather today?"
            },
            {
                message: "Are you oke?"
            },
            {
                message: "What is your name?",
            }

        ]
        return res.send({
            data: listTopic,
            code: 1,
            message: "success"
        })
    } catch (error) {
        console.log("/api/topics' -> error", error);
        return res.send({
            code: 0,
            message: "error"
        })
    }

})
export { router as HubAgentRouters }