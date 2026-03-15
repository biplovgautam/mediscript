import type { Request, Response, NextFunction } from "express"


const notFound = (  req: Request, res: Response, next: NextFunction) => {
    const error = new Error(`Not found - ${req.originalUrl}`); 
    res.status(404); 
    next(error); 
}

const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) =>{
    const statusCode = res.statusCode===200?500: res.statusCode; 
    res.status(statusCode); 
    res.json({
        message: error.message, 
        stack: process.env.NODE_ENV ==="development"? error.stack:""
    })
}

export {notFound, errorHandler}; 