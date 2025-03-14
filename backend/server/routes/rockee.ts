import express from 'express';
const router = express.Router();
import RockeeControllers from "../controllers/Rockee"

router.get('/api/rockee/search', async (req, res) => {
    const inputs = req.body;
    const text = inputs.text;
    const rs = await RockeeControllers.getDataByMessage(text)
    return res.send({
        data: rs,
        code: 1,
        message: "oke"
    })
})


export { router as RockeeRouters }