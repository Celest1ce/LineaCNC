import { Request, Response } from 'express';
import { userService } from '../services/user.service.js';

export class UserController {
  async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Non authentifié'
        });
      }

      const updatedUser = await userService.updateProfile(userId, req.body);

      res.json({
        success: true,
        data: { user: updatedUser }
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message
      });
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Non authentifié'
        });
      }

      await userService.changePassword(userId, req.body);

      res.json({
        success: true,
        message: 'Mot de passe mis à jour avec succès'
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message
      });
    }
  }

  async uploadProfilePicture(req: Request, res: Response) {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Non authentifié'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Aucune image fournie'
        });
      }

      const updatedUser = await userService.updateProfilePicture(userId, req.file);

      res.json({
        success: true,
        data: { user: updatedUser }
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const userController = new UserController();
