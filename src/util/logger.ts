import pino from 'pino';

const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';
const isDev = process.env.NODE_ENV !== 'production';

/**
 * Check if the application is running in demo mode.
 * Demo mode enables fast intervals and visual indicators for live demonstrations.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true';
}

export const logger = pino({
  level: LOG_LEVEL,
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          messageFormat: isDemoMode() ? '[DEMO] {msg}' : '{msg}',
        },
      }
    : undefined,
  base: {
    service: 'bchubkey',
    ...(isDemoMode() ? { mode: 'DEMO' } : {}),
  },
});

export function createChildLogger(name: string) {
  return logger.child({ module: name });
}

/**
 * Log an error with remediation hints for demo-critical failures.
 * Use this for errors that could break a live demo.
 */
export function logDemoError(
  childLogger: pino.Logger,
  error: unknown,
  context: string,
  remediation: string
): void {
  const errorObj = error instanceof Error ? error : { message: String(error) };
  childLogger.error(
    {
      error: errorObj,
      context,
      remediation: isDemoMode() ? `[FIX] ${remediation}` : remediation,
      demoMode: isDemoMode(),
    },
    `${context}: ${errorObj.message || 'Unknown error'}`
  );
}
