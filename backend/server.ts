import express from "express";
import type { Application, Request, Response } from "express"
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import { Server, Socket } from "socket.io";
import connectDB from "./config/database.js";
// import connectDB from "./config/database.js";
// import { errorHandler, notFound } from "./middleware/error.middleware.js";
// import userRoutes from "./routes/user.routes.js";
// import sessionRoutes from "./routes/session.routes.js";


dotenv.config();

connectDB();

const app: Application = express();

const server: http.Server = http.createServer(app);


const allowOrigin: string[] = [
  'http://localhost:5174',
  'http://localhost:5173',
];


const io: Server = new Server(server, {
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      if (!origin) return callback(null, true);
      
      if (allowOrigin.includes(origin)) {
        callback(null, true);
      } else {
        if (process.env.NODE_ENV === 'production') {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },
});


app.use(
  cors({
    origin: allowOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("io", io);

// Simple test route
app.get('/', (req: Request, res: Response) => {
  res.send("API is running");
});


// app.use('/api/users', userRoutes);
// app.use('/api/sessions', sessionRoutes);

// Handle new Socket.IO connections
// io.on("connection", (socket: Socket) => {
//   console.log(`A user connected ${socket.id}`);

//   const userId: string | undefined = socket.handshake.query.userId as string | undefined;
  
//   if (userId) {
//     socket.join(userId);
//     console.log(`User ${socket.id} joined the room: ${userId}`);
//   }

//   socket.on("disconnect", () => {
//     console.log(`User disconnected ${socket.id}`);
//   });
// });


// app.use(notFound);
// app.use(errorHandler);

// Define the port – from environment or default to 5000
const PORT: number = parseInt(process.env.PORT as string, 10) || 5000;

// Start the server
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});