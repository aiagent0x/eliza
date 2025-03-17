import { RoleSchema } from "../../models/Role";

async function listRole( ){
    let roleInfos: any = await RoleSchema.find();
    return roleInfos;
}

export default {listRole};