import multer from 'multer';
// Maximum file size from environment variable (default 5MB)
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10); // 5MB in bytes
// Configure multer storage
const storage = multer.memoryStorage();
// File filter to accept only images
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Type de fichier non autorisé. Seuls les fichiers JPEG, PNG et WebP sont acceptés.'));
    }
};
// Configure multer
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1
    }
});
//# sourceMappingURL=upload.js.map