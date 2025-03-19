import mongoose, { Model } from "mongoose";
interface IRoom {
    name:String,
    data_message:Array<Object>,
    created_at: Number,
    updated_at: Number,
}
interface RoomModel extends Model<IRoom> {
    // getUserInfoById(id: string): any;
}
const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        default: "default_room"
    },
    data_message: {
        type: Array,
        default: []
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
});

const Room = mongoose.model<IRoom, RoomModel>('Room', roomSchema);

export { Room as RoomSchema }