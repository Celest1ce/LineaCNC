import { AppError } from './errorHandler.js';
export function authGuard(req, res, next) {
    if (!req.session?.userId) {
        throw new AppError('Non authentifié', 401);
    }
    next();
}
//# sourceMappingURL=authGuard.js.map