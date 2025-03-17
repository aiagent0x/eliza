import mongoose from "mongoose";
const testSchema = new mongoose.Schema({
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
        type: String,
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
    {

        timestamps: {
            currentTime: () => Date.now(),
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    })

const Test = mongoose.model('Test', testSchema);
export { Test as TestSchema }