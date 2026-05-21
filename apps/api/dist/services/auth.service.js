import bcrypt from 'bcrypt';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
// Validation schemas
export const registerSchema = z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    displayName: z.string().optional(),
    preferredLanguage: z.string().optional().default('fr')
});
export const loginSchema = z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(1, 'Le mot de passe est requis')
});
export class AuthService {
    async register(data) {
        // Validate input
        const validatedData = registerSchema.parse(data);
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: validatedData.email }
        });
        if (existingUser) {
            throw new AppError('Un utilisateur avec cet email existe déjà', 409);
        }
        // Hash password
        const passwordHash = await bcrypt.hash(validatedData.password, 12);
        // Create user
        const user = await prisma.user.create({
            data: {
                email: validatedData.email,
                passwordHash,
                displayName: validatedData.displayName,
                preferredLanguage: validatedData.preferredLanguage || 'fr'
            },
            select: {
                id: true,
                email: true,
                displayName: true,
                profilePicture: true,
                preferredLanguage: true,
                createdAt: true
            }
        });
        return user;
    }
    async login(data) {
        // Validate input
        const validatedData = loginSchema.parse(data);
        // Find user
        const user = await prisma.user.findUnique({
            where: { email: validatedData.email }
        });
        if (!user) {
            throw new AppError('Email ou mot de passe incorrect', 401);
        }
        // Verify password
        const isValidPassword = await bcrypt.compare(validatedData.password, user.passwordHash);
        if (!isValidPassword) {
            throw new AppError('Email ou mot de passe incorrect', 401);
        }
        return {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            profilePicture: user.profilePicture,
            preferredLanguage: user.preferredLanguage,
            createdAt: user.createdAt
        };
    }
    async getUserById(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                displayName: true,
                profilePicture: true,
                preferredLanguage: true,
                createdAt: true
            }
        });
        if (!user) {
            throw new AppError('Utilisateur non trouvé', 404);
        }
        return user;
    }
}
export const authService = new AuthService();
//# sourceMappingURL=auth.service.js.map