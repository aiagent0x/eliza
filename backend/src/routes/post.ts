import express from 'express';
const router: express.Router = express.Router();
import PostControllers from '../controllers/posts/list.ts';

router.post('/api/posts', async (req, res) => {
    const inputs = req.body;
 
    const limit = inputs.limit;
    const page: number = inputs.page;
    const rs = await PostControllers.listPost(limit, page);
    return res.send({
        data: rs.postInfos,
        totalPageCount: Math.ceil(rs.count / limit),
        totalCount: rs.count,
        pageSize: limit,
        currentPage: page,
        code: 1,
        message: "oke"
    })
})


export { router as PostRouters }