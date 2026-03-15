import jwt from 'jsonwebtoken'; 
import type { ObjectId } from 'mongoose';


const generateToken = (id: string)=> {
    return jwt.sign({id}, process.env.JWT_SECRET as string, {
        expiresIn: "1d", 
    })
}

export {generateToken}; 