import express from "express";
import type { Application, Request, Response } from "express"
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import { Server, Socket } from "socket.io";
import mongoose from 'mongoose';
import connectDB from "./config/database.js";
import { errorHandler, notFound } from './middleware/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patient.routes.js';
import sessionRoutes from './routes/session.routes.js';
import audioRoutes from './routes/audio.routes.js';
import noteRoutes from './routes/note.routes.js';
import prescriptionRoutes from './routes/prescription.routes.js';
import labReportRoutes from './routes/labReport.routes.js';
import User from './models/user.model.js';
import ConsultationSession from './models/consultationSession.model.js';
import { verifyToken } from './security/jwt-util.js';
import { buildSessionRoom } from './utils/socket.util.js';


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
app.use('/uploads', express.static('uploads'));

app.set("io", io);

// Basic request logger with duration + request id
app.use((req: Request, res: Response, next) => {
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  (req as Request & { requestId?: string }).requestId = requestId;
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(`[${requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`);
  });
  next();
});

// Simple test route
app.get('/', (req: Request, res: Response) => {
  res.send("API is running");
});


app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/lab-reports', labReportRoutes);

type SessionJoinAck = (payload: { ok: boolean; message?: string; room?: string }) => void;

io.use(async (socket, next) => {
  try {
    const authToken = typeof socket.handshake.auth.token === 'string' ? socket.handshake.auth.token : '';
    const bearerHeader = socket.handshake.headers.authorization;
    const bearerToken =
      typeof bearerHeader === 'string' && bearerHeader.startsWith('Bearer ')
        ? bearerHeader.slice(7)
        : '';
    const rawToken = authToken || bearerToken;

    if (!rawToken) {
      next(new Error('Unauthorized socket connection'));
      return;
    }

    const decoded = verifyToken(rawToken);
    const user = await User.findById(decoded.id).select('_id hospitalId status isDeleted');
    if (!user || user.isDeleted || user.status !== 'ACTIVE') {
      next(new Error('Unauthorized socket connection'));
      return;
    }

    socket.data.userId = String(user._id);
    socket.data.hospitalId = String(user.hospitalId);
    next();
  } catch (error) {
    next(new Error('Unauthorized socket connection'));
  }
});

io.on('connection', (socket: Socket) => {
  socket.on('session:join', async (sessionId: string, ack?: SessionJoinAck) => {
    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      ack?.({ ok: false, message: 'Invalid session id' });
      return;
    }

    const session = await ConsultationSession.findOne({
      _id: sessionId,
      hospitalId: socket.data.hospitalId,
      doctorId: socket.data.userId,
      isDeleted: false,
    }).select('_id');

    if (!session) {
      ack?.({ ok: false, message: 'Session not found or not authorized' });
      return;
    }

    const room = buildSessionRoom(sessionId);
    socket.join(room);
    ack?.({ ok: true, room });

    io.to(room).emit('session.user.joined', {
      sessionId,
      userId: socket.data.userId,
      socketId: socket.id,
    });
  });

  socket.on('session:leave', (sessionId: string, ack?: SessionJoinAck) => {
    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      ack?.({ ok: false, message: 'Invalid session id' });
      return;
    }

    const room = buildSessionRoom(sessionId);
    socket.leave(room);
    ack?.({ ok: true, room });

    io.to(room).emit('session.user.left', {
      sessionId,
      userId: socket.data.userId,
      socketId: socket.id,
    });
  });
});


app.use(notFound);
app.use(errorHandler);

// Define the port – from environment or default to 5000
const PORT: number = parseInt(process.env.PORT as string, 10) || 5000;

// Start the server
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
