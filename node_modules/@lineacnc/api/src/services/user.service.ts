import { z } from 'zod';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { imageService } from './image.service.js';

// Validation schemas
export const updateProfileSchema = z.object({
  displayName: z.string().optional(),
  preferredLanguage: z.enum(['fr', 'en', 'de']).optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères')
});

export class UserService {
  async updateProfile(userId: string, data: z.infer<typeof updateProfileSchema>) {
    // Validate input
    const validatedData = updateProfileSchema.parse(data);

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(validatedData.displayName !== undefined && { displayName: validatedData.displayName }),
        ...(validatedData.preferredLanguage && { preferredLanguage: validatedData.preferredLanguage })
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

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    return user;
  }

  async changePassword(userId: string, data: z.infer<typeof changePasswordSchema>) {
    // Validate input
    const validatedData = changePasswordSchema.parse(data);

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true
      }
    });

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(validatedData.currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Mot de passe actuel incorrect', 401);
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(validatedData.newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    return { success: true };
  }

  async updateProfilePicture(userId: string, file: Express.Multer.File) {
    // Get current user to check if they have an existing profile picture
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePicture: true }
    });

    if (!currentUser) {
      throw new AppError('Utilisateur non trouvé', 404);
    }

    // Delete old profile picture if exists
    if (currentUser.profilePicture) {
      await imageService.deleteProfilePicture(currentUser.profilePicture);
    }

    // Optimize and save new picture
    const profilePicturePath = await imageService.optimizeAndSaveProfilePicture(
      file.buffer,
      file.originalname
    );

    // Update user with new profile picture
    const user = await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: profilePicturePath },
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
}

export const userService = new UserService();
