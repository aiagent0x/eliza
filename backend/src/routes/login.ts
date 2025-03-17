import express from 'express';
const router: express.Router = express.Router();
import { Middleware } from '../middleware/middleware.ts';
import { UserSchema } from '../models/User.ts';
import { signJwt } from '../helpers/jwt.ts';
import { compareBcrypt, hashBcrypt } from '../helpers/bcrypt.ts';
import { RoleSchema } from '../models/Role.ts';
router.post('/api/admin/login', async (req, res) => {
    let inputs = req.body;

    if (!inputs) {
        return res.send({
            code: 0,
            message: "password or username wrong!"
        })
    }
    let username = inputs.username as string;
    let password = inputs.password as string;

    let userInfo: any = await UserSchema.findOne({ username: username });

    if (userInfo == null || await compareBcrypt(password, userInfo.password) == false) {
        return res.send({
            code: 0,
            message: "password or username wrong!"
        })
    }
    let roleInfo: any = await RoleSchema.findOne({ _id: userInfo.role });
    let rs = signJwt({
        id: userInfo.id,
    });
    return res.send({
        token: rs.token,
        expiredTime: rs.expireTime,
        name: userInfo.name,
        role: roleInfo.name,
        code: 1,
        message: "oke"
    })
})
router.post('/api/admin/register', async (req, res) => {
    let inputs = req.body;
    let username = inputs.username as string;
    let password = inputs.password;
    let role = inputs.role as string;
    let name = inputs.name as string
    let confirm_password = inputs.confirm_password as string;
    let userInfo: any = await UserSchema.findOne({ username: username });
    if (userInfo != null) {
        return res.send({
            code: 0,
            message: "user existed"
        })
    }
    if (password != confirm_password) {
        return res.send({
            code: 0,
            message: "You have not confirmed the password."
        })
    }
    password = await hashBcrypt(password);
    let newUser = new UserSchema({
        username: username,
        password: password,
        role: role,
        name: name
    });
    await newUser.save();

    return res.send({
        code: 1,
        message: "ok"
    })
});
router.post('/api/admin/generate_password', Middleware, async (req: any, res: any) => {
    const inputs = req.body;
    const userId = inputs._id;
   
    const randomstring = Math.random().toString(36).slice(-8);
    let password = await hashBcrypt(randomstring);
    await UserSchema.updateOne({ _id: userId }, { password: password })
    return res.send({
        code: 1,
        message: "oke",
        password: randomstring
    })
})
router.post('/api/admin/change_password', Middleware, async (req: any, res: any) => {
    const inputs = req.body;
    const userId = req.user.id;
    const oldPassword = inputs.old_password;
    const newPassword = inputs.new_password;
    const confirmPassword = inputs.confirm_password;
    try {
        let userInfo: any = await UserSchema.findOne({ _id: userId });
        if (!userInfo && await compareBcrypt(oldPassword, userInfo.password) == false) {
            throw Error("old_password_wrong")
        }
        if (newPassword != confirmPassword) {
            throw Error("password_and_confirmpassword_not_equal")
        }
        let password = await hashBcrypt(newPassword);
        await UserSchema.updateOne({ _id: userId }, { password: password })
        return res.send({
            code: 1,
            message: "oke",
        })
    } catch (error: any) {
        return res.send({
            code: 0,
            message: error.message,

        })
    }


})
router.post('/api/admin/change_info', Middleware, async (req: any, res: any) => {
    const inputs = req.body;
    const userId = req.user.id;
    const name = inputs.name;
    try {
        let userInfo: any = await UserSchema.findOne({ _id: userId });
        if (!userInfo) {
            throw Error("user_not_exist")
        }
        await UserSchema.updateOne({ _id: userId }, { name: name })
        return res.send({
            code: 1,
            message: "oke",
        })
    } catch (error: any) {
        return res.send({
            code: 0,
            message: error.message,

        })
    }
})

export { router as LoginRouter }