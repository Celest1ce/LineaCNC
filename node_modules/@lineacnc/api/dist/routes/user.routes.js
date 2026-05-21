import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authGuard } from '../middlewares/authGuard.js';
import { csrfProtection } from '../middlewares/csrf.js';
import { upload } from '../middlewares/upload.js';
const router = Router();
// All user routes require authentication
router.use(authGuard);
// Protected routes
router.put('/profile', csrfProtection, userController.updateProfile.bind(userController));
router.post('/change-password', csrfProtection, userController.changePassword.bind(userController));
router.post('/profile-picture', csrfProtection, upload.single('profilePicture'), userController.uploadProfilePicture.bind(userController));
export default router;
//# sourceMappingURL=user.routes.js.map