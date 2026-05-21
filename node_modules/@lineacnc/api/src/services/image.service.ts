import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export class ImageService {
  private uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');

  async ensureUploadDirectory() {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    }
  }

  async optimizeAndSaveProfilePicture(buffer: Buffer, originalFilename: string): Promise<string> {
    await this.ensureUploadDirectory();

    // Generate unique filename
    const ext = '.webp'; // Always convert to WebP for better compression
    const filename = `${uuidv4()}${ext}`;
    const filepath = path.join(this.uploadsDir, filename);

    // Optimize image
    await sharp(buffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 85 })
      .toFile(filepath);

    // Return relative path for database storage
    return `/uploads/profiles/${filename}`;
  }

  async deleteProfilePicture(picturePath: string): Promise<void> {
    if (!picturePath) return;

    try {
      // Convert URL path to filesystem path
      const filename = path.basename(picturePath);
      const filepath = path.join(this.uploadsDir, filename);
      await fs.unlink(filepath);
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      // Don't throw error if file doesn't exist
    }
  }
}

export const imageService = new ImageService();
