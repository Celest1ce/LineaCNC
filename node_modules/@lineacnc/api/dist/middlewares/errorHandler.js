import { logger } from '../lib/logger.js';
export class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
export function errorHandler(err, req, res, next) {
    if ('statusCode' in err) {
        const { statusCode, message } = err;
        logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method}`);
        return res.status(statusCode).json({
            success: false,
            error: message
        });
    }
    // Unexpected errors
    logger.error(`500 - ${err.message} - ${req.originalUrl} - ${req.method}`, { stack: err.stack });
    return res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
}
//# sourceMappingURL=errorHandler.js.map