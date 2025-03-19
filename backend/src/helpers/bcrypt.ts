import bcrypt = require("bcrypt");
const saltRounds = 10;

async function hash(password: string) {
    try {
        let rs = await bcrypt.hash(password, saltRounds)
        return rs
    } catch (error) {
        return error;
    }
}
async function compare(password: string, hash: string) {
    try {
        let rs = await bcrypt.compare(password, hash)
        return rs
    } catch (error) {
        return error;
    }
}
export {
    hash as hashBcrypt,
    compare as compareBcrypt
}