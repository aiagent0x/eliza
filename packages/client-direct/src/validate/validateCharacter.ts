import { z } from "zod";

const schema = z.object({
    name: z.string().min(3, "Name must have at least 3 characters"),
    clients: z.array(z.unknown()),
    modelProvider: z.string(),
    settings: z.object({
        anyKey: z.unknown()
    }),
    plugins: z.array(z.unknown()),
    bio: z.array(z.string()),
    lore: z.array(z.string()),
    knowledge: z.array(z.string()),
    messageExamples: z.unknown(),
    postExamples: z.array(z.string()),
    topics: z.array(z.string()),
    style: z.object({
        all: z.array(z.string()),
        chat: z.array(z.string()),
        post: z.array(z.string()),
    }),
    adjectives: z.array(z.string()),
});

export default async function (input) {
    const result = schema.safeParse(input);
    if (!result.success) {
        return result.success
    } else {
        return result.success
    }
}