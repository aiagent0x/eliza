import { PostSchema } from "@/models/Post";
async function listPost( limit :number, page: number) {
    let postInfos: any = await PostSchema.find().skip((page)*limit).limit(limit);
    let count: number = await PostSchema.countDocuments();
    return {postInfos,count};
}
export default {listPost };