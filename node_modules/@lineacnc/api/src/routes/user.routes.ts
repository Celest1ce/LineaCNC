import { Router, IRouter } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authGuard } from '../middlewares/authGuard.js';
import { csrfProtection } from '../middlewares/csrf.js';
import { upload } from '../middlewares/upload.js';

const router: IRouter = Router();

// All user routes require authentication
router.use(authGuard);

// Protected routes
router.put('/profile', csrfProtection as any, userController.updateProfile.bind(userController));
router.post('/change-password', csrfProtection as any, userController.changePassword.bind(userController));
router.post('/profile-picture', csrfProtection as any, upload.single('profilePicture'), userController.uploadProfilePicture.bind(userController));

export default router;
