import jwt, { type JwtPayload } from 'jsonwebtoken'; 


const generateToken = (id: string)=> {
    return jwt.sign({id}, process.env.JWT_SECRET as string, {
        expiresIn: "1d", 
    })
}

const verifyToken = (token: string): JwtPayload & { id: string } => {
    return jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload & { id: string };
}

export {generateToken, verifyToken}; 