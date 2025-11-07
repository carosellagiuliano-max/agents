export type LogContext = {
  requestId: string;
  scope?: string;
  userId?: string;
  role?: string;
};

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogPayload = Record<string, unknown>;

function emit(level: LogLevel, message: string, context: LogContext, payload?: LogPayload) {
  const entry = {
    level,
    message,
    ...context,
    payload: payload ?? null,
    timestamp: new Date().toISOString(),
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));
}

export function createRequestLogger(context: LogContext) {
  return {
    debug(message: string, payload?: LogPayload) {
      emit('debug', message, context, payload);
    },
    info(message: string, payload?: LogPayload) {
      emit('info', message, context, payload);
    },
    warn(message: string, payload?: LogPayload) {
      emit('warn', message, context, payload);
    },
    error(message: string, payload?: LogPayload) {
      emit('error', message, context, payload);
    },
  };
}
