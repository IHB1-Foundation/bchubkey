/**
 * Smoke test for token metadata lookup
 *
 * Run with: npx tsx scripts/test-metadata.ts
 */

import { configureMetadataProvider, fetchTokenMetadata, formatTokenMetadataDisplay } from '../src/chain/metadata.js';

async function main() {
  console.log('Testing token metadata lookup...\n');

  // Configure provider
  configureMetadataProvider({
    provider: 'PAYTACA_BCMR',
    baseUrl: 'https://bcmr.paytaca.com/api',
    timeoutMs: 5000,
    maxRetries: 2,
  });

  // Test with known tokens
  const testTokens = [
    // Moria USD (MUSD) - exists in Paytaca BCMR
    'b38a33f750f84c5c169a6f23cb873e6e79605021585d4f3408789689ed87f366',
    // Random invalid token (should return null gracefully)
    '0000000000000000000000000000000000000000000000000000000000000000',
  ];

  for (const tokenId of testTokens) {
    console.log(`\n--- Testing token: ${tokenId.slice(0, 16)}... ---`);

    try {
      const metadata = await fetchTokenMetadata(tokenId);

      if (metadata) {
        console.log('Result:', JSON.stringify(metadata, null, 2));
        console.log('Formatted:');
        console.log(formatTokenMetadataDisplay(metadata).replace(/[_*\\]/g, ''));
      } else {
        console.log('Result: null (token not found or metadata unavailable)');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  // Test with provider disabled
  console.log('\n--- Testing with provider NONE ---');
  configureMetadataProvider({ provider: 'NONE' });
  const result = await fetchTokenMetadata(testTokens[0]);
  console.log('Result with NONE provider:', result);

  console.log('\nDone!');
}

main().catch(console.error);
