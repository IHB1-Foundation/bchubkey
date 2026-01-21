/**
 * Chain module exports
 *
 * Provides ChainAdapter singleton for BCH chain interactions
 */

import { createFulcrumAdapter, FulcrumAdapter } from './fulcrum.js';
import { createChildLogger } from '../util/logger.js';
import type { ChainAdapter } from './types.js';

export * from './types.js';
export { FulcrumAdapter } from './fulcrum.js';
export { TTLCache } from './cache.js';

const logger = createChildLogger('chain');

// Singleton adapter instance
let adapter: FulcrumAdapter | null = null;

/**
 * Get or create the chain adapter singleton
 */
export function getChainAdapter(): ChainAdapter {
  if (!adapter) {
    adapter = createFulcrumAdapter();
  }
  return adapter;
}

/**
 * Initialize and connect the chain adapter
 * Call this during bot startup
 */
export async function initChainAdapter(): Promise<ChainAdapter> {
  const chainAdapter = getChainAdapter();

  try {
    await chainAdapter.connect();
    logger.info('Chain adapter initialized and connected');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize chain adapter');
    throw error;
  }

  return chainAdapter;
}

/**
 * Disconnect and cleanup the chain adapter
 * Call this during bot shutdown
 */
export async function shutdownChainAdapter(): Promise<void> {
  if (adapter) {
    await adapter.disconnect();
    adapter = null;
    logger.info('Chain adapter shutdown complete');
  }
}
