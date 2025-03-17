import mongoose from "mongoose";
const postSchema = new mongoose.Schema({
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
    {

        timestamps: {
            currentTime: () => Date.now(),
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    })

const Post = mongoose.model('Post', postSchema);
export { Post as PostSchema }