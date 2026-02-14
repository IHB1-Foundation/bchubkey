// Startup configuration validation

import { createChildLogger } from './logger.js';

const logger = createChildLogger('config');

interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate required environment variables and configuration at startup.
 * Fails fast if critical config is missing or invalid.
 */
export function validateStartupConfig(): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required env vars
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    errors.push('TELEGRAM_BOT_TOKEN is required');
  }

  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  } else {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
      errors.push('DATABASE_URL must be a PostgreSQL connection string (postgresql:// or postgres://)');
    }
  }

  if (!process.env.BOT_PUBLIC_NAME) {
    warnings.push('BOT_PUBLIC_NAME not set; deep link generation may fail');
  }

  // Chain config
  const provider = process.env.CHAIN_PROVIDER || 'FULCRUM';
  if (provider !== 'FULCRUM') {
    errors.push(`Unsupported CHAIN_PROVIDER: ${provider} (only FULCRUM is supported)`);
  }

  if (provider === 'FULCRUM') {
    const url = process.env.FULCRUM_URL;
    if (url && !url.startsWith('wss://') && !url.startsWith('ws://') && !url.startsWith('tcp://')) {
      warnings.push(`FULCRUM_URL "${url}" has unexpected protocol; expected wss://, ws://, or tcp://`);
    }
  }

  // Admin API
  if (process.env.ADMIN_PORT) {
    const port = parseInt(process.env.ADMIN_PORT, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push(`ADMIN_PORT "${process.env.ADMIN_PORT}" is not a valid port number`);
    }
  }

  if (process.env.ADMIN_CORS_ORIGIN && !process.env.ADMIN_PORT) {
    warnings.push('ADMIN_CORS_ORIGIN is set but ADMIN_PORT is not; CORS config will have no effect');
  }

  // Log results
  for (const w of warnings) {
    logger.warn(w);
  }
  for (const e of errors) {
    logger.error(e);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
