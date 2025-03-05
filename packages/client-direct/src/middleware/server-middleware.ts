import { Request, Response, NextFunction } from 'express';
const auth_key = "73947db7-8515-4191-bf0d-64fdd8c5b902"
const serverMiddleware = (req: Request, res: Response, next: NextFunction) => {

    let headers = req.headers["authorization"];
    console.log("headers:", headers)
    if (!headers || headers === "") {
        res.status(403).json({
            message: "Unauthorized"
        })
    }
    let auth;
    if (typeof headers === 'string') {
        auth = headers.split(" ");
    }
    if (auth[1] !== auth_key) {
        res.status(403).json({
            message: "Unauthorized"
        })
    }

    next();
};

export default serverMiddleware;