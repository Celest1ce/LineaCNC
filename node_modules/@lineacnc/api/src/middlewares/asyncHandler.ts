import { Request, Response, NextFunction } from 'express';

/**
 * Wrapper pour les routes asynchrones
 * Évite d'avoir à mettre try/catch dans chaque route
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
