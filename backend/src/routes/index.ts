import express from 'express';
import { PostRouters } from './post.ts';
import { UserRouters } from './user.ts';
import { AdminRouters } from './admin.ts';
import { LoginRouter } from './login.ts';
import { RockeeRouters } from './rockee.ts';

const router: express.Router = express.Router();

router.use(PostRouters);
router.use(UserRouters);
router.use(AdminRouters);
router.use(LoginRouter);
router.use(RockeeRouters);

export { router as MainRouters };