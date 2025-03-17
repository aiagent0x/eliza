import express from 'express';
const router: express.Router = express.Router();
import RockeeControllers from "../controllers/Rockee/index.ts"
import { RockeeSchema } from '../models/Rockee.ts';

router.post('/api/rockee/search', async (req, res) => {
    const inputs = req.body;
    try {
        const text = inputs.text;
        const rs = await RockeeControllers.getDataByMessage(text)
        return res.send({
            data: rs.data,
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
        let text = inputs.text
        text = text.trim().toLowerCase();
        text = text.replace(/\s+/g, '_');
        delete inputs.text;
        inputs.message = text;
        const rs = await RockeeControllers.getDataByMessage(text);
        if (rs) {
            return res.status(400).send({
                code: 0,
                message: "Message is existed"
            })
        }
        await RockeeSchema.createData(inputs);
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
    const inputs = req.body;
    try {
        let text = inputs.text
        text = text.trim().toLowerCase();
        text = text.replace(/\s+/g, '_');
        delete inputs.text;
        inputs.message = text;
        await RockeeSchema.updateData(inputs);
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