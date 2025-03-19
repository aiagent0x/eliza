import jwt from "jsonwebtoken";
const privateKey = "domaybiet dc day"
function sign(data: any) {
    let expireTime = Math.floor(Date.now() / 1000) + (60 * 6000)
    let token = jwt.sign({
        exp: expireTime,
        data: data
    }, privateKey);
    return { token, expireTime };
}
function verify(token: any) {
    try {
        return jwt.verify(token, privateKey, function (err: any, decoded: any) {
        
            return decoded
        })
    } catch (err) {
        return err;
    }

}
export { sign as signJwt, verify as verifyJwt }