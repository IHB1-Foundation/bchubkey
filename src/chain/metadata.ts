/**
 * Token Metadata Lookup via BCMR (Bitcoin Cash Metadata Registry)
 *
 * Provides optional display info (name, symbol, decimals) for CashTokens
 * during setup wizard. Failures are graceful and do not block setup.
 */

import { createChildLogger } from '../util/logger.js';

const logger = createChildLogger('chain:metadata');

export interface TokenMetadata {
  category: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  description?: string;
  iconUrl?: string;
}

export interface MetadataConfig {
  provider: 'PAYTACA_BCMR' | 'NONE';
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
}

const DEFAULT_CONFIG: MetadataConfig = {
  provider: 'NONE',
  baseUrl: 'https://bcmr.paytaca.com/api',
  timeoutMs: 5000,
  maxRetries: 2,
};

let config: MetadataConfig = { ...DEFAULT_CONFIG };

export function configureMetadataProvider(options: Partial<MetadataConfig>): void {
  config = { ...DEFAULT_CONFIG, ...options };
  logger.info({ provider: config.provider, baseUrl: config.baseUrl }, 'Metadata provider configured');
}

export function getMetadataConfig(): MetadataConfig {
  return { ...config };
}

/**
 * Fetch token metadata by category ID
 *
 * @param tokenCategory - 64-char hex token category ID
 * @returns TokenMetadata or null if lookup fails/disabled
 */
export async function fetchTokenMetadata(tokenCategory: string): Promise<TokenMetadata | null> {
  if (config.provider === 'NONE') {
    logger.debug({ tokenCategory }, 'Metadata lookup disabled');
    return null;
  }

  if (!/^[0-9a-f]{64}$/i.test(tokenCategory)) {
    logger.warn({ tokenCategory }, 'Invalid token category format');
    return null;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await fetchWithTimeout(tokenCategory, attempt);
      if (result) {
        logger.info({ tokenCategory, name: result.name, symbol: result.symbol }, 'Token metadata fetched');
        return result;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(
        { tokenCategory, attempt, error: lastError.message },
        'Metadata fetch attempt failed'
      );

      // Exponential backoff before retry
      if (attempt < config.maxRetries) {
        const delay = Math.pow(2, attempt) * 500; // 500ms, 1000ms, 2000ms
        await sleep(delay);
      }
    }
  }

  logger.error(
    { tokenCategory, error: lastError?.message },
    'Token metadata lookup failed after retries'
  );
  return null;
}

async function fetchWithTimeout(tokenCategory: string, attempt: number): Promise<TokenMetadata | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const url = `${config.baseUrl}/tokens/${tokenCategory}/`;
    logger.debug({ url, attempt }, 'Fetching token metadata');

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BCHubKey/1.0',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        logger.debug({ tokenCategory }, 'Token not found in BCMR');
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as PaytacaTokenResponse;
    return parsePaytacaResponse(tokenCategory, data);
  } finally {
    clearTimeout(timeoutId);
  }
}

interface PaytacaTokenResponse {
  name?: string;
  symbol?: string;
  decimals?: number;
  description?: string;
  uris?: {
    icon?: string;
  };
  token?: {
    name?: string;
    symbol?: string;
    decimals?: number;
    description?: string;
    category?: string;
  };
}

function parsePaytacaResponse(tokenCategory: string, data: PaytacaTokenResponse): TokenMetadata | null {
  // Paytaca API structure:
  // - name, description at top level
  // - symbol, decimals in nested 'token' object
  // - icon in uris.icon
  const metadata: TokenMetadata = {
    category: tokenCategory,
    name: data.name ?? data.token?.name ?? undefined,
    symbol: data.token?.symbol ?? data.symbol ?? undefined,
    decimals: typeof data.token?.decimals === 'number'
      ? data.token.decimals
      : typeof data.decimals === 'number'
        ? data.decimals
        : undefined,
    description: data.description ?? data.token?.description ?? undefined,
    iconUrl: data.uris?.icon ?? undefined,
  };

  // Return null if no useful data was extracted
  if (!metadata.name && !metadata.symbol && metadata.decimals === undefined) {
    return null;
  }

  return metadata;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format token metadata for display in Telegram
 */
export function formatTokenMetadataDisplay(metadata: TokenMetadata | null): string {
  if (!metadata) {
    return '_Token metadata not available_';
  }

  const parts: string[] = [];

  if (metadata.name) {
    parts.push(`*Name:* ${escapeMarkdown(metadata.name)}`);
  }
  if (metadata.symbol) {
    parts.push(`*Symbol:* ${escapeMarkdown(metadata.symbol)}`);
  }
  if (metadata.decimals !== undefined) {
    parts.push(`*Decimals:* ${metadata.decimals}`);
  }

  if (parts.length === 0) {
    return '_Token metadata not available_';
  }

  return parts.join('\n');
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
