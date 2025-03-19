import { RockeeSchema } from "../../models/Rockee";

async function getDataByMessage(text: string) {
    text = text.trim().toLowerCase();
    text = text.replace(/\s+/g, '_');
    const data = await RockeeSchema.getDataByMessage(text);
    return data;
}


export default { getDataByMessage };