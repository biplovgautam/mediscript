import jwt from "jsonwebtoken";
import type { Jwt } from "jsonwebtoken";
import asyncHandler from 'express-async-handler'; 
import User, { type IUser } from '../models/user.model.js'
import type { Request, Response, NextFunction } from "express";
import type { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: IUser; 
    }
  }
}

interface DecodedToken extends JwtPayload {
  id?: string;
  [key: string]: unknown;
}

const protect = asyncHandler(async(req: Request, res: Response, next: NextFunction)=> {
    let token: string; 
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        try {
            token = req.headers.authorization.split(' ')[1] as string; 
            if (!token) {
                res.status(401).json({ message: "the token is empty" });
                return;
            }
            const decoded= jwt.verify(token, process.env.JWT_SECRET as string ) as DecodedToken; 
            req.user  = await User.findById(decoded.id).select("-password"); 
            if(!req.user){
                res.status(401); 
                throw new Error("User not found ")
            }
            next(); 
        } catch (error) {
            console.log(error); 
            res.status(401); 
            throw new Error("Not Authorized, token failed "); 
        }
    } else {
        res.status(401);
        throw new Error("Not authorized, no token");
    }
})

export {protect}; 
