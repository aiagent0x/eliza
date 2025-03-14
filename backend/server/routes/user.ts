import express from 'express';
const router = express.Router();
import UserControllers from '../controllers/users/list';

router.post('/api/users', async (req, res) => {
    const inputs = req.body;

    const limit = inputs.limit;
    const page: number = inputs.page;
    const rs = await UserControllers.listUser(limit, page);
    return res.send({
        data: rs.userInfos,
        totalPageCount: Math.ceil(rs.count / limit),
        totalCount: rs.count,
        pageSize: limit,
        currentPage: page,
        code: 1,
        message: "oke"
    })
})

export { router as UserRouters }