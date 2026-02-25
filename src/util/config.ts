// Startup configuration validation

import { createChildLogger } from './logger.js';
import { BCH_DEFAULT_TESTNET_FULCRUM_URL } from './bch-network.js';

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
      errors.push(
        'DATABASE_URL must be a PostgreSQL connection string (postgresql:// or postgres://)'
      );
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
    if (!url) {
      warnings.push(
        `FULCRUM_URL not set; using default testnet endpoint (${BCH_DEFAULT_TESTNET_FULCRUM_URL})`
      );
    }

    if (url && !url.startsWith('wss://') && !url.startsWith('ws://') && !url.startsWith('tcp://')) {
      warnings.push(
        `FULCRUM_URL "${url}" has unexpected protocol; expected wss://, ws://, or tcp://`
      );
    }
  }

  // Admin API (ADMIN_PORT has priority, fallback to platform PORT)
  const adminPortRaw = process.env.ADMIN_PORT ?? process.env.PORT;
  if (adminPortRaw) {
    const port = parseInt(adminPortRaw, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push(`ADMIN_PORT/PORT "${adminPortRaw}" is not a valid port number`);
    }
  }

  if (process.env.ADMIN_CORS_ORIGIN && !adminPortRaw) {
    warnings.push(
      'ADMIN_CORS_ORIGIN is set but no ADMIN_PORT/PORT is available; CORS config will have no effect'
    );
  }

  // Admin auth (secure-by-default: enabled unless explicitly set to false)
  const adminAuthEnabled = process.env.ADMIN_AUTH_ENABLED !== 'false';
  if (adminAuthEnabled) {
    if (!process.env.ADMIN_JWT_SECRET) {
      errors.push(
        'ADMIN_JWT_SECRET is required (admin auth is enabled by default; set ADMIN_AUTH_ENABLED=false only for emergency rollback)'
      );
    } else if (process.env.ADMIN_JWT_SECRET.length < 32) {
      warnings.push('ADMIN_JWT_SECRET should be at least 32 characters for adequate security');
    }
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
