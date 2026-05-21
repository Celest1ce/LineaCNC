/**
 * Extension du type Request d'Express pour express-rate-limit
 */

declare namespace Express {
  export interface Request {
    rateLimit?: {
      limit: number;
      current: number;
      remaining: number;
      resetTime: Date;
    };
  }
}
