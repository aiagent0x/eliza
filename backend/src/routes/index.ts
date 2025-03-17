import express from 'express';
import { PostRouters } from './post';
import { UserRouters } from './user';
import { AdminRouters } from './admin';
import { LoginRouter } from './login';
import { RockeeRouters } from './rockee';

const router: express.Router = express.Router();

router.use(PostRouters);
router.use(UserRouters);
router.use(AdminRouters);
router.use(LoginRouter);
router.use(RockeeRouters);

export { router as MainRouters };