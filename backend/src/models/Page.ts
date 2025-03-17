import mongoose, { Model } from "mongoose";

interface IPage {
    name: String,

    is_parent: Boolean,
    type: String,
    icon: String,
    is_active: Boolean,
    fields: mongoose.Schema.Types.Array,
    actions: mongoose.Schema.Types.Array,
    apis: mongoose.Schema.Types.Array,
    api_list: Object,
    sub_pages_id: [mongoose.Schema.Types.ObjectId],
    sub_pages: mongoose.Schema.Types.Array,
    model: String,
    note: String,

    created_at: Number,
    updated_at: Number,
}

interface PageModel extends Model<IPage> {
    duplicatePage(id: string): any;
}

const pageSchema = new mongoose.Schema({
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
},
    {

        timestamps: {
            currentTime: () => Date.now(),
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    })

pageSchema.static("duplicatePage",
    async (id: string) => {
        try {
            let pageInfo: any = await Page.findOne({ _id: id }, { _id: 0, __v: 0 });
            let obj = pageInfo.toObject();
            if (!pageInfo) throw Error("PAGE_NOT_EXISTED");
            let newPage = new Page(obj);
            await newPage.save();
            return;
        } catch (error) {
            console.log(error)
            return error
        }

    }
)
const Page = mongoose.model<IPage, PageModel>('Page', pageSchema);
export { Page as PageSchema }
