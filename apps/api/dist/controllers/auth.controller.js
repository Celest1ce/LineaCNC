import { authService } from '../services/auth.service.js';
import { AppError } from '../middlewares/errorHandler.js';
export class AuthController {
    async register(req, res, next) {
        try {
            const user = await authService.register(req.body);
            // Set session
            req.session.userId = user.id;
            res.status(201).json({
                success: true,
                data: { user }
            });
        }
        catch (error) {
            next(error);
        }
    }
    async login(req, res, next) {
        try {
            const user = await authService.login(req.body);
            // Set session
            req.session.userId = user.id;
            res.status(200).json({
                success: true,
                data: { user }
            });
        }
        catch (error) {
            next(error);
        }
    }
    async logout(req, res, next) {
        try {
            req.session.destroy((err) => {
                if (err) {
                    throw new AppError('Erreur lors de la déconnexion', 500);
                }
                res.clearCookie('connect.sid');
                res.status(200).json({
                    success: true,
                    message: 'Déconnexion réussie'
                });
            });
        }
        catch (error) {
            next(error);
        }
    }
    async me(req, res, next) {
        try {
            const userId = req.session.userId;
            if (!userId) {
                throw new AppError('Non authentifié', 401);
            }
            const user = await authService.getUserById(userId);
            res.status(200).json({
                success: true,
                data: { user }
            });
        }
        catch (error) {
            next(error);
        }
    }
}
export const authController = new AuthController();
//# sourceMappingURL=auth.controller.js.map