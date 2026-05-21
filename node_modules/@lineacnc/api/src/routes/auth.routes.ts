import { Router, IRouter } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authGuard } from '../middlewares/authGuard.js';
import { authRateLimiter } from '../middlewares/rateLimit.js';
import { csrfProtection } from '../middlewares/csrf.js';

const router: IRouter = Router();

// Apply rate limiting to all auth routes
router.use(authRateLimiter);

// Public routes (with CSRF protection)
router.post('/register', csrfProtection as any, authController.register.bind(authController));
router.post('/login', csrfProtection as any, authController.login.bind(authController));
router.post('/logout', csrfProtection as any, authController.logout.bind(authController));

// Protected routes
router.get('/me', authGuard, authController.me.bind(authController));

export default router;
