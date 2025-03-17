import mongoose from "mongoose";
const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        require: true
    },
    is_active: { type: Boolean, default: false },
    pages: { type: [mongoose.Schema.Types.ObjectId], default: [""] },
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

const Role = mongoose.model('Role', roleSchema);
export { Role as RoleSchema }