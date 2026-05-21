import { LogEntry } from '../types/printer';
import { apiService } from './api.service';

/**
 * LogBuffer Service
 *
 * Manages in-memory buffering of logs to reduce database queries.
 * Logs are stored in memory and flushed in batches when:
 * - User leaves the page (beforeunload)
 * - User changes tab (visibilitychange)
 * - Buffer reaches a certain size
 * - Manual flush is triggered
 */
class LogBufferService {
  private buffer: LogEntry[] = [];
  private maxBufferSize = 100; // Flush after 100 logs
  private flushInterval = 5000; // Auto-flush every 5 seconds if buffer not empty
  private flushTimer: number | null = null;
  private isFlushing = false;
  private isInitialized = false;

  constructor() {
    this.setupEventListeners();
    this.startAutoFlush();
  }

  /**
   * Initialize event listeners for automatic flushing
   */
  private setupEventListeners(): void {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    // Flush when user leaves the page
    window.addEventListener('beforeunload', () => {
      this.flushSync();
    });

    // Flush when tab becomes hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flush();
      }
    });

    // Flush when user navigates away
    window.addEventListener('pagehide', () => {
      this.flushSync();
    });

    this.isInitialized = true;
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    if (this.flushTimer !== null) {
      window.clearInterval(this.flushTimer);
    }

    this.flushTimer = window.setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  /**
   * Add a log entry to the buffer
   */
  addLog(log: LogEntry): void {
    this.buffer.push(log);

    // Auto-flush if buffer is full
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * Add multiple log entries to the buffer
   */
  addLogs(logs: LogEntry[]): void {
    this.buffer.push(...logs);

    // Auto-flush if buffer is full
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * Get all logs in the buffer (for display purposes)
   */
  getBufferedLogs(): LogEntry[] {
    return [...this.buffer];
  }

  /**
   * Get count of buffered logs
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * Flush logs to the server asynchronously
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) {
      return;
    }

    this.isFlushing = true;
    const logsToFlush = [...this.buffer];
    this.buffer = []; // Clear buffer immediately to prevent duplicates

    try {
      await apiService.addLogsBatch(logsToFlush);
    } catch (error) {
      console.error('Failed to flush logs to server:', error);
      // Re-add failed logs to buffer for retry
      this.buffer.unshift(...logsToFlush);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Synchronous flush using sendBeacon for page unload events
   * Falls back to regular fetch if sendBeacon is not available
   */
  flushSync(): void {
    if (this.buffer.length === 0) {
      return;
    }

    const logsToFlush = [...this.buffer];
    this.buffer = [];

    const endpoint = `${apiService.getBaseUrl()}/logs/batch`;
    const payload = JSON.stringify(logsToFlush);

    try {
      // Try sendBeacon first (more reliable for page unload)
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        const sent = navigator.sendBeacon(endpoint, blob);
        if (sent) {
          return;
        }
      }

      // Fallback to synchronous XHR (not ideal but works)
      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint, false); // synchronous
      xhr.setRequestHeader('Content-Type', 'application/json');

      // Add authorization header if available
      const token = localStorage.getItem('auth_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(payload);
    } catch (error) {
      console.error('Failed to flush logs synchronously:', error);
      // Can't recover from this, logs will be lost
    }
  }

  /**
   * Clear the buffer without flushing
   */
  clear(): void {
    this.buffer = [];
  }

  /**
   * Destroy the service (cleanup)
   */
  destroy(): void {
    if (this.flushTimer !== null) {
      window.clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush(); // Final flush
  }

  /**
   * Configure buffer settings
   */
  configure(options: {
    maxBufferSize?: number;
    flushInterval?: number;
  }): void {
    if (options.maxBufferSize !== undefined) {
      this.maxBufferSize = options.maxBufferSize;
    }
    if (options.flushInterval !== undefined) {
      this.flushInterval = options.flushInterval;
      this.startAutoFlush(); // Restart timer with new interval
    }
  }
}

// Export singleton instance
export const logBuffer = new LogBufferService();
