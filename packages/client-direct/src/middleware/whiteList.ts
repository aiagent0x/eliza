import { Request, Response, NextFunction } from 'express';

const whiteList = ["13.251.248.206", "123.25.21.181", "127.0.0.1", "http://localhost:3003","171.224.179.110","116.99.34.73"]
export default function  whiteListMiddleware (req: Request, res: Response, next: NextFunction) {
    const clientIp = req.ip;
    console.log(req.ip)
    const normalizedIp = clientIp.split(":").pop();
    if (!whiteList.includes(normalizedIp)) {
        res.status(403).json({ message: "Forbidden: IP not allowed" });
        return;
    }
    next();
};
 
