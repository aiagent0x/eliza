import { verifyJwt, getPayloadJwt } from "../helpers/jwt"
import verifyToken from "../helpers/verifyToken";

async function authenticateToken(req: any, res: any, next: any) {

  const authHeader = req.headers['authorization']

  const token = authHeader && authHeader.split(' ')[1]

  if (token == null) return res.sendStatus(401)
  const payload: any = getPayloadJwt(token);
  let result: any = await verifyToken(token, payload.address);
  if (result.status !== 200) return res.sendStatus(401)
  req.user = result.data
  next();
}
export { authenticateToken as Middleware }