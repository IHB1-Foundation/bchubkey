#!/usr/bin/env npx tsx
/**
 * Chain Adapter Smoke Test
 *
 * Tests the Fulcrum chain adapter methods with real data
 *
 * Usage: npx tsx scripts/chain-smoke.ts
 */

import 'dotenv/config';
import { createFulcrumAdapter } from '../src/chain/fulcrum.js';

// Testnet defaults (override via env vars if needed)
const TEST_ADDRESS =
  process.env.CHAIN_SMOKE_ADDRESS ?? 'bchtest:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy';
const TEST_TXID = process.env.CHAIN_SMOKE_TXID;

async function main() {
  console.log('=== Chain Adapter Smoke Test ===\n');

  const adapter = createFulcrumAdapter();

  try {
    // 1. Test connection
    console.log('1. Testing connection...');
    await adapter.connect();
    console.log('   ✓ Connected to Fulcrum\n');

    // 2. Test getAddressHistory
    console.log('2. Testing getAddressHistory...');
    let txidForTxTests: string | undefined = TEST_TXID;
    try {
      const history = await adapter.getAddressHistory(TEST_ADDRESS);
      console.log(`   ✓ Got ${history.length} transactions for address`);
      if (history.length > 0) {
        console.log(`     Most recent: ${history[0].txid.substring(0, 16)}... (height: ${history[0].height})`);
        txidForTxTests = txidForTxTests ?? history[0].txid;
      }
      console.log();
    } catch (error) {
      console.log(`   ✗ getAddressHistory failed: ${error}\n`);
    }

    // 3. Test getRawTx + getTx (parsed)
    if (txidForTxTests) {
      console.log('3. Testing getRawTx + getTx...');
      try {
        const rawTx = await adapter.getRawTx(txidForTxTests);
        console.log(`   ✓ Got raw tx (${rawTx.length} chars)`);
        console.log(`   First 80 chars: ${rawTx.substring(0, 80)}...`);

        const tx = await adapter.getTx(txidForTxTests);
        console.log(`   ✓ Parsed transaction:`);
        console.log(`     - txid: ${tx.txid}`);
        console.log(`     - inputs: ${tx.inputs.length}`);
        console.log(`     - outputs: ${tx.outputs.length}`);
        if (tx.outputs[0]) {
          console.log(`     - output[0] value: ${tx.outputs[0].value} sats`);
          console.log(`     - output[0] address: ${tx.outputs[0].address ?? 'N/A'}`);
        }
        console.log();
      } catch (error) {
        console.log(`   ✗ getRawTx/getTx failed: ${error}\n`);
      }
    } else {
      console.log('3. Skipping getRawTx/getTx (no txid available)\n');
    }

    // 4. Test getAddressUtxos
    console.log('4. Testing getAddressUtxos...');
    try {
      const utxos = await adapter.getAddressUtxos(TEST_ADDRESS);
      console.log(`   ✓ Got ${utxos.length} UTXOs for address`);
      if (utxos.length > 0) {
        console.log(`     First UTXO: ${utxos[0].value} sats`);
        if (utxos[0].tokenData) {
          console.log(`     Token data: category=${utxos[0].tokenData.category.substring(0, 16)}...`);
        }
      }
      console.log();
    } catch (error) {
      console.log(`   ✗ getAddressUtxos failed: ${error}\n`);
    }

    // 5. Test getTokenBalanceFT
    console.log('5. Testing getTokenBalanceFT (dummy category)...');
    try {
      const dummyCategory = '0000000000000000000000000000000000000000000000000000000000000000';
      const ftBalance = await adapter.getTokenBalanceFT(TEST_ADDRESS, dummyCategory);
      console.log(`   ✓ FT balance for dummy category: ${ftBalance}\n`);
    } catch (error) {
      console.log(`   ✗ getTokenBalanceFT failed: ${error}\n`);
    }

    // 6. Test getTokenBalanceNFTCount
    console.log('6. Testing getTokenBalanceNFTCount (dummy category)...');
    try {
      const dummyCategory = '0000000000000000000000000000000000000000000000000000000000000000';
      const nftCount = await adapter.getTokenBalanceNFTCount(TEST_ADDRESS, dummyCategory);
      console.log(`   ✓ NFT count for dummy category: ${nftCount}\n`);
    } catch (error) {
      console.log(`   ✗ getTokenBalanceNFTCount failed: ${error}\n`);
    }

    // 7. Test scanIncomingTxs
    console.log('7. Testing scanIncomingTxs...');
    try {
      const incomingTxs = await adapter.scanIncomingTxs(TEST_ADDRESS);
      console.log(`   ✓ Found ${incomingTxs.length} incoming transactions\n`);
    } catch (error) {
      console.log(`   ✗ scanIncomingTxs failed: ${error}\n`);
    }

    // 8. Test cache (second call should be faster)
    console.log('8. Testing cache (second history call)...');
    const startTime = Date.now();
    await adapter.getAddressHistory(TEST_ADDRESS);
    const elapsed = Date.now() - startTime;
    console.log(`   ✓ Cached call took ${elapsed}ms\n`);

    console.log('=== Smoke Test Complete ===');
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await adapter.disconnect();
    console.log('Disconnected from Fulcrum');
  }
}

main().catch(console.error);
