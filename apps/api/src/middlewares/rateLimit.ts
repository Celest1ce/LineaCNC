import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Max 50 login attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
      retryAfter: req.rateLimit?.resetTime ? Math.ceil(req.rateLimit.resetTime.getTime() / 1000) : undefined
    });
  },
  // Note: trustProxy est configuré au niveau de l'app Express (app.ts)
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Max 1000 requests per 15 minutes (increased for normal usage)
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Trop de requêtes. Veuillez réessayer plus tard.',
      retryAfter: req.rateLimit?.resetTime ? Math.ceil(req.rateLimit.resetTime.getTime() / 1000) : undefined
    });
  },
  // Skip rate limiting for certain paths if needed
  skip: (req) => {
    // Skip rate limiting for health check and CSRF token
    return req.path === '/health' || req.path === '/api/csrf-token';
  },
  // Note: trustProxy est configuré au niveau de l'app Express (app.ts)
});
