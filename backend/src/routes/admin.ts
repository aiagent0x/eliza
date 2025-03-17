import express from 'express';
const router: express.Router = express.Router();
import mongoose from "mongoose";
import path from 'path'
import { UserSchema } from '../models/User.ts';
import { RoleSchema } from '../models/Role.ts';
import { PageSchema } from '../models/Page.ts';
import { Middleware } from '../middleware/middleware.ts';
import { promises as fs } from 'fs';
import { ImageSchema } from '../models/Image.ts';

import { uploadFile, uploadImage } from '../middleware/uploadMiddleware.ts';

router.get('/api/admin/list', Middleware, async (req, res) => {
    const inputs: any = req.query.params;

    const limit = Number(inputs.limit) || 10;
    const page: number = Number(inputs.page) || 0;
    const model: string = String(inputs.model) || "";
    const query = JSON.parse(inputs.query as string)
    const fields: any = JSON.parse(inputs.fields as string);
    let Infos: any;
    let count: number;
    Object.keys(query).map(key => {
        if (query[key].length == 0) delete query[key]
    })
    if (!SCHEMAS[model]) {
        return res.send({
            code: 0,
            message: "Not exist model"
        })
    }

    if (!mongoose.models[model]) {

        Infos = await mongoose.model(model, SCHEMAS[model]).find(query).select(fields).skip((page) * limit).limit(limit);

    }
    else {
        Infos = await mongoose.models[model].find(query).select(fields).skip((page) * limit).limit(limit);

    }
    count = await mongoose.models[model].countDocuments();

    return res.send({
        data: Infos,
        totalPageCount: Math.ceil(count / limit) - 1,
        totalCount: count,
        pageSize: limit,
        currentPage: page,
        code: 1,
        message: "oke"
    })
})
router.post('/api/admin/create', Middleware, async (req, res) => {
    const inputs = req.body;
    const model = inputs.model;
    const data: any = inputs.data;
    let newDocuments;
    let Schema;
    if (!SCHEMAS[model]) {
        return res.send({
            code: 0,
            message: "Not exist model"
        })
    }

    if (!mongoose.models[model]) {

        Schema = mongoose.model(model, new mongoose.Schema(SCHEMAS[model], {
            timestamps: {
                currentTime: () => Date.now(),
                createdAt: 'created_at',
                updatedAt: 'updated_at'
            }
        }));

        newDocuments = new Schema(data)
    }
    else {

        newDocuments = new mongoose.models[model](data).set({
            timestamps: {
                currentTime: () => Date.now(),
                createdAt: 'created_at',
                updatedAt: 'updated_at'
            }
        });

    }

    let rs = await newDocuments.save();
    return res.send({
        rs,
        code: 1,
        message: "oke"
    })
})
router.post('/api/admin/update', Middleware, async (req, res) => {
    const inputs = req.body;
    const model = inputs.model;
    const id: string = inputs.id;
    const data: any = inputs.data;
    delete data._id;
    try {
        if (!SCHEMAS[model]) {
            return res.send({
                code: 0,
                message: "Not exist model"
            })
        }
        if (!mongoose.models[model]) {
            let documentInfo = await mongoose.model(model, SCHEMAS[model]).findOne({ _id: new mongoose.Types.ObjectId(id) });
            if (!documentInfo) {
                return res.send({
                    code: 0,
                    message: "Not exist collection"
                })
            }
            await mongoose.model(model, new mongoose.Schema(SCHEMAS[model], {
                timestamps: {
                    currentTime: () => Date.now(),
                    createdAt: 'created_at',
                    updatedAt: 'updated_at'
                }
            })).findOneAndUpdate({ _id: new mongoose.Types.ObjectId(id) }, data);
        }
        else {
            let documentInfo = await mongoose.models[model].findOne({ _id: new mongoose.Types.ObjectId(id) });
            if (!documentInfo) {
                return res.send({
                    code: 0,
                    message: "Not exist collection"
                })
            }
            await mongoose.models[model].findOneAndUpdate({ _id: new mongoose.Types.ObjectId(id) }, data).set({
                timestamps: {
                    currentTime: () => Date.now(),
                    createdAt: 'created_at',
                    updatedAt: 'updated_at'
                }
            });
        }
        return res.send({
            code: 1,
            message: "oke"
        })
    } catch (error) {
        return res.send({
            code: 0,
            message: error
        })
    }

})
router.post('/api/admin/delete', Middleware, async (req, res) => {
    const inputs = req.body;

    const model = inputs.model;
    const id: string = inputs.id;
    if (!SCHEMAS[model]) {
        return res.send({
            code: 0,
            message: "Not exist model"
        })
    }
    if (!mongoose.models[model]) {
        await mongoose.model(model, SCHEMAS[model]).findOneAndDelete({ _id: new mongoose.Types.ObjectId(id) });
    }
    else {
        await mongoose.models[model].findOneAndDelete({ _id: new mongoose.Types.ObjectId(id) });
    }
    return res.send({
        code: 1,
        message: "oke"
    })
})
router.get('/api/admin/detail', Middleware, async (req, res) => {
    const inputs: any = req.query.params;
    const model = inputs.model as string;
    const id: string = inputs.id as string;
    const fields: any = JSON.parse(inputs.fields as string);
    let Info;
    if (!SCHEMAS[model]) {
        return res.send({
            code: 0,
            message: "Not exist model"
        })
    }
    if (!mongoose.models[model]) {
        Info = await mongoose.model(model, SCHEMAS[model]).findOne({ _id: new mongoose.Types.ObjectId(id) }).select(fields);
    }
    else {
        Info = await mongoose.models[model].findOne({ _id: new mongoose.Types.ObjectId(id) }).select(fields);
    }
    return res.send({
        data: Info,
        code: 1,
        message: "oke"
    })
})

router.post('/api/admin/pages', Middleware, async (req: any, res: any) => {


    const userID: string = req.user.id;
    let userInfo: any = await UserSchema.findOne({ _id: new mongoose.Types.ObjectId(userID) });
    if (!userInfo) {
        return res.send({
            code: 0,
            message: "Not exist user"
        })
    }
    let data: any = [];

    let roleInfo: any = await RoleSchema.findOne({ _id: userInfo.role });

    if (roleInfo.is_active !== true) {
        return res.send({
            data: data,
            code: 0,
            message: "role is not active"
        })
    }
    let pageInfos: any = await PageSchema.find({ _id: { "$in": roleInfo.pages } });

    for (let i = 0; i < pageInfos.length; i++) {
        if (pageInfos[i].is_parent && pageInfos[i].is_active) {
            data.push(pageInfos[i])

        }
    }
    for (let i = 0; i < data.length; i++) {
        let subPages: any = [];
        for (let j = 0; j < pageInfos.length; j++) {
            if (data[i].sub_pages_id.includes(pageInfos[j]._id)) {
                subPages.push(pageInfos[j])
            }
        }
        data[i].sub_pages = subPages
    }
    return res.send({
        data: data,
        code: 1,
        message: "Oke"
    })
})
router.post('/api/admin/user/info', Middleware, async (req: any, res: any) => {
    // const inputs = req.body;
    const userId = req.user.id;
    let userInfo = await UserSchema.getUserInfoById(userId);
    return res.send({
        code: 1,
        data: userInfo
    })
})
router.post('/api/admin/duplicate-page', Middleware, async (req: any, res: any) => {
    const inputs = req.body;
    const pageId = inputs._id;
    await PageSchema.duplicatePage(pageId);
    return res.send({
        code: 1,
        message: "oke"
    })
})
//upload image
//upload single file
router.post('/api/upload-file', Middleware, uploadFile.single('myFile'), async (req: any, res: any) => {
    const file = req.file
    if (!file) {
        const error = new Error('Please upload a file')
        // error.httpStatusCode = 400
        return next(error)
    }
    res.send(file)
})
router.post('/api/upload-multiple-file', Middleware, uploadFile.array('myFiles', 12), async (req: any, res: any) => {
    const file = req.file
    if (!file) {
        const error = new Error('Please upload a file')
        return next(error)
    }
    res.send(file)
})
router.post('/api/upload-photo', Middleware, uploadImage.single('picture'), async (req: any, res: any) => {
    var finalImg = {
        contentType: req.file.mimetype,
        image_name: req.file.filename,
    };
    let newImage = new ImageSchema(finalImg);
    let newImageInfo = await newImage.save()
    return res.send({
        code: 1,
        message: "oke",
        data: {
            image_name: newImageInfo.image_name
        }
    })
})
router.get('/api/photo/:id', async (req: any, res: any) => {

    const { id } = req.params;
    try {
        const imageInfo = await ImageSchema.findOne({ _id: id });
        const imageUrl = `http://localhost:5000/images/${imageInfo!.image_name}`;
        res.json({ imageUrl });
    } catch (error) {
        console.error('Error fetching image:', error);
        res.status(500).send({
            code: 0,
            message: "Error fetching image"
        });
    }
})
router.post('/api/photos', async (req: any, res: any) => {
    let inputs = req.body;
    var ids = inputs.ids;

    let ImageInfo: any = await ImageSchema.find({ _id: ids })



    res.send(`data:image/jpeg;base64,${ImageInfo.image}`)
})
export { router as AdminRouters }
const SCHEMAS: any = {
    "Test": {
        string: {
            type: String,
            require: true
        },
        image: {
            type: String,
            require: true
        },
        status: {
            type: String,
            require: true
        },
        number: {
            type: Number,
            require: true
        },
        money: {
            type: Number,
            require: true
        },
        is_active:
        {
            type: Boolean,
            require: true
        },
        page_id: {
            type: mongoose.Schema.Types.ObjectId
        },
        enum_drop_down: {
            type: Object
        },
        time_test: {
            type: Number
        },
        time_ranger_picker_test: {
            type: Object
        },
        page_ids: {
            type: [mongoose.Schema.Types.ObjectId]
        },
        created_at: Number,
        updated_at: Number,
    },
    "User": {
        username: {
            type: String,
            require: true
        },
        password: {
            type: String,
            require: true
        },
        role: {
            type: mongoose.Schema.Types.ObjectId,
            default: 0
        },
        name: {
            type: String,
            require: true
        },
        created_at: Number,
        updated_at: Number,
    },
    "Post": {
        title: {
            type: String,
            require: true
        },
        content: {
            type: String,
            require: true
        },
        tag: {
            type: String,
            require: true
        },
        created_at: Number,
        updated_at: Number,
    },
    "Role": {
        name: {
            type: String,
            require: true
        },
        is_active: { type: Boolean, default: false },
        pages: { type: [mongoose.Schema.Types.ObjectId], default: [""] },
        created_at: Number,
        updated_at: Number,
    },
    "Page": {
        name: {
            type: String,
            require: true
        },
        is_parent: {
            type: Boolean,
            default: false,

        },
        type: { type: String },
        icon: { type: String, default: "" },
        is_active: { type: Boolean, default: false },
        fields: { type: Array, default: [] }, //{name: String, style:ddd, is_copy=true, type:{number,status, string, image}}
        actions: { type: Array, default: [] },//{ "name": "Tạo", "type": "create", "update", "delete"}
        apis: { type: Array, default: [] },//{id:1;method:post, get, update,...; url:......... ; name:.....; },
        api_list: { type: Object, default: {} },
        sub_pages_id: { type: [mongoose.Schema.Types.ObjectId], default: [] },
        sub_pages: { type: Array, default: [] },
        model: { type: String, default: "" },
        note: { type: String, default: "" },
        created_at: Number,
        updated_at: Number,
    }
}

function next(error: Error): void | PromiseLike<void> {
    throw new Error('Function not implemented.');
}

