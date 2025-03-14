import express from 'express';
const router = express.Router();
import RockeeControllers from "../controllers/Rockee"
import { RockeeSchema } from '@/models/Rockee';

router.post('/api/rockee/search', async (req, res) => {
    const inputs = req.body;
    try {
        const text = inputs.text;
        const rs = await RockeeControllers.getDataByMessage(text)
        return res.send({
            data: rs,
            code: 1,
            message: "success"
        })
    } catch (error) {
        console.log("error-api-/api/rockee/search:", error);
        return res.send({
            code: 0,
            message: "fail"
        })
    }
})
router.post('/api/rockee/create', async (req, res) => {
    const inputs = req.body;
    try {
        await RockeeSchema.createData(inputs)
        return res.send({
            code: 1,
            message: "sucess"
        })
    } catch (error) {
        console.log("error-api-/api/rockee/search:", error);
        return res.send({
            code: 0,
            message: "fail"
        })
    }
})
router.post('/api/rockee/update', async (req, res) => {
    const { id, data } = req.body;
    try {
        await RockeeSchema.updateData(data, id);
        return res.send({
            code: 1,
            message: "success"
        })
    } catch (error) {
        console.log("error-api-/api/rockee/search", error);
        return res.send({
            code: 0,
            message: "fail"
        })
    }
})
export { router as RockeeRouters }