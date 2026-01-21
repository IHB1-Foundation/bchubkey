import pino from 'pino';

const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: LOG_LEVEL,
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    service: 'bchubkey',
  },
});

export function createChildLogger(name: string) {
  return logger.child({ module: name });
}
