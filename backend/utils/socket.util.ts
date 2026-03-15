import type { Application } from 'express';
import type { Server } from 'socket.io';

export const buildSessionRoom = (sessionId: string): string => `session:${sessionId}`;

export const getSocketServer = (app: Application): Server | null => {
  const io = app.get('io') as Server | undefined;
  return io || null;
};

export const emitToSessionRoom = (
  app: Application,
  sessionId: string,
  eventName: string,
  payload: unknown
): void => {
  const io = getSocketServer(app);
  if (!io) return;

  io.to(buildSessionRoom(sessionId)).emit(eventName, payload);
};
