/**
 * Logger structuré pour l'application
 * En production, peut être remplacé par Sentry, LogRocket, etc.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

  private log(level: LogLevel, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const logData: Record<string, unknown> = {
      timestamp,
      level,
      message,
    };

    if (data !== undefined) {
      logData.data = data;
    }

    // En production, envoyer à un service de monitoring
    if (!this.isDevelopment && level === 'error') {
      // TODO: Envoyer à Sentry/LogRocket
      console.error('[ERROR]', logData);
      return;
    }

    // En développement, logger dans la console
    switch (level) {
      case 'debug':
        if (this.isDevelopment) {
          console.debug(`[DEBUG] ${message}`, data || '');
        }
        break;
      case 'info':
        console.info(`[INFO] ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`[WARN] ${message}`, data || '');
        break;
      case 'error':
        console.error(`[ERROR] ${message}`, data || '');
        break;
    }
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }
}

export const logger = new Logger();
