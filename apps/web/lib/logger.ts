import pino from 'pino';
import { randomUUID } from 'crypto';

// Create base logger with structured JSON output
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Creates a child logger with a correlation ID for request tracing
 */
export function createRequestLogger(requestId?: string) {
  const id = requestId || randomUUID();
  return logger.child({ request_id: id });
}

/**
 * Extracts or generates a request ID from headers
 */
export function getRequestId(headers: Headers): string {
  return headers.get('x-request-id') || randomUUID();
}
