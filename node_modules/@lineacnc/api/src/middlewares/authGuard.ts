import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

export function authGuard(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    throw new AppError('Non authentifié', 401);
  }
  next();
}
