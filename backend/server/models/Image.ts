import mongoose from "mongoose";
const postSchema = new mongoose.Schema({
    content_type: {
        type: String,
        require: true
    },

    image_name: {
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

const Image = mongoose.model('Image', postSchema);
export { Image as ImageSchema }