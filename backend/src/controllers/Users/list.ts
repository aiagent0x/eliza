import { UserSchema } from "../../models/User";

async function listUser( limit :number, page: number){
    let userInfos: any = await UserSchema.find().skip((page)*limit).limit(limit);
    let count: number = await UserSchema.countDocuments();
    return {userInfos,count};
}

export default {listUser};