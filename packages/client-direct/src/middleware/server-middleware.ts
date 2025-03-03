import { Request, Response, NextFunction } from 'express';

const serverMiddleware = (req: Request, res: Response, next: NextFunction) => {
    console.log(`Request Method: ${req.method}, Request URL: ${req.url}`);
    
    // Add custom headers or perform other middleware tasks here
    res.setHeader('Authorization', '73947db7-8515-4191-bf0d-64fdd8c5b902');

    // Call the next middleware in the stack
    next();
};

export default serverMiddleware;