/**
 * Fulcrum Electrum Cash Protocol client
 *
 * Implements ChainAdapter using WebSocket JSON-RPC
 */

import WebSocket from 'ws';
import {
  decodeTransaction,
  decodeCashAddress,
  sha256,
  ripemd160,
  encodeCashAddress,
  CashAddressType,
  hexToBin,
  binToHex,
} from '@bitauth/libauth';
import { createChildLogger, logDemoError } from '../util/logger.js';
import {
  BCH_DEFAULT_TESTNET_FULCRUM_URL,
  BCH_TESTNET_CASHADDR_PREFIX,
  BCH_TESTNET_GENESIS_HASH,
} from '../util/bch-network.js';
import { TTLCache } from './cache.js';
import type {
  ChainAdapter,
  ChainConfig,
  ParsedTx,
  TxInput,
  TxOutput,
  TokenData,
  AddressHistory,
  UTXO,
} from './types.js';

const logger = createChildLogger('chain:fulcrum');

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

interface RpcResponse {
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

interface ServerFeatures {
  genesis_hash?: string;
}

// Fulcrum UTXO response structure
interface FulcrumUtxo {
  tx_hash: string;
  tx_pos: number;
  height: number;
  value: number;
  token_data?: {
    category: string;
    amount?: string;
    nft?: {
      capability: string;
      commitment?: string;
    };
  };
}

export class FulcrumAdapter implements ChainAdapter {
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, PendingRequest>();
  private connected = false;
  private connecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectDisabled = false;

  private readonly config: ChainConfig;

  // Caches
  private txCache: TTLCache<string>; // txid -> raw hex
  private utxoCache: TTLCache<UTXO[]>; // address -> UTXOs
  private historyCache: TTLCache<AddressHistory[]>; // address -> history

  constructor(config: ChainConfig) {
    this.config = config;
    this.txCache = new TTLCache(config.cacheTtlMs);
    this.utxoCache = new TTLCache(config.cacheTtlMs);
    this.historyCache = new TTLCache(config.cacheTtlMs);
  }

  async connect(): Promise<void> {
    if (this.connected || this.connecting) {
      return;
    }

    this.connecting = true;

    return new Promise((resolve, reject) => {
      logger.info({ url: this.config.url }, 'Connecting to Fulcrum');

      this.ws = new WebSocket(this.config.url);

      const connectionTimeout = setTimeout(() => {
        this.connecting = false;
        this.ws?.close();
        reject(new Error('Connection timeout'));
      }, this.config.timeout);

      this.ws.on('open', () => {
        clearTimeout(connectionTimeout);

        void (async () => {
          try {
            await this.verifyTestnetNetwork();
            this.connected = true;
            this.connecting = false;
            this.reconnectDisabled = false;
            this.reconnectAttempts = 0;
            logger.info('Connected to Fulcrum (testnet verified)');
            resolve();
          } catch (error) {
            this.connecting = false;
            this.reconnectDisabled = true;
            this.ws?.close();
            reject(
              error instanceof Error ? error : new Error('Failed to verify Fulcrum network')
            );
          }
        })();
      });

      this.ws.on('message', (data: Buffer) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('error', (error) => {
        logDemoError(
          logger,
          error,
          'WebSocket connection error',
          'Check Fulcrum testnet server. Try: 1) Verify FULCRUM_URL in .env, 2) Try alternate server: wss://blackie.c3-soft.com:60004, 3) Check network connection'
        );
        if (this.connecting) {
          clearTimeout(connectionTimeout);
          this.connecting = false;
          reject(error);
        }
      });

      this.ws.on('close', () => {
        this.connected = false;
        this.connecting = false;
        logger.warn('WebSocket closed');
        this.rejectAllPending(new Error('Connection closed'));
        this.attemptReconnect();
      });
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectDisabled) {
      logger.error('Reconnection disabled due to failed testnet verification');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logDemoError(
        logger,
        new Error('Max reconnection attempts reached'),
        'Chain adapter connection failed permanently',
        'Fulcrum server unreachable. Try: 1) Restart the app, 2) Change FULCRUM_URL in .env to a testnet endpoint, 3) Check provider status'
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    logger.info({ attempt: this.reconnectAttempts, delay }, 'Scheduling reconnection');

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        logDemoError(
          logger,
          error,
          'Reconnection attempt failed',
          'Will retry automatically. If persistent, check FULCRUM_URL and network connectivity'
        );
      }
    }, delay);
  }

  private async verifyTestnetNetwork(): Promise<void> {
    const features = await this.callOnce<ServerFeatures>('server.features', []);
    const genesis = features.genesis_hash?.toLowerCase();

    if (!genesis) {
      throw new Error(
        'Unable to verify chain network (server.features missing genesis_hash). Use a BCH testnet Fulcrum endpoint.'
      );
    }

    if (genesis !== BCH_TESTNET_GENESIS_HASH) {
      throw new Error(
        `Unsupported network: expected BCH testnet genesis ${BCH_TESTNET_GENESIS_HASH}, got ${genesis}`
      );
    }
  }

  private handleMessage(data: string): void {
    try {
      const response: RpcResponse = JSON.parse(data);

      const pending = this.pendingRequests.get(response.id);
      if (!pending) {
        logger.warn({ id: response.id }, 'Received response for unknown request');
        return;
      }

      clearTimeout(pending.timeout);
      this.pendingRequests.delete(response.id);

      if (response.error) {
        pending.reject(new Error(`RPC error ${response.error.code}: ${response.error.message}`));
      } else {
        pending.resolve(response.result);
      }
    } catch (error) {
      logger.error({ error, data }, 'Failed to parse message');
    }
  }

  private rejectAllPending(error: Error): void {
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
      this.pendingRequests.delete(id);
    }
  }

  async disconnect(): Promise<void> {
    this.rejectAllPending(new Error('Disconnecting'));
    this.ws?.close();
    this.ws = null;
    this.connected = false;
    this.txCache.destroy();
    this.utxoCache.destroy();
    this.historyCache.destroy();
    logger.info('Disconnected from Fulcrum');
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async call<T>(method: string, params: unknown[] = []): Promise<T> {
    if (!this.connected) {
      await this.connect();
    }

    return this.callWithRetry<T>(method, params, this.config.retries);
  }

  private async callWithRetry<T>(
    method: string,
    params: unknown[],
    retriesLeft: number
  ): Promise<T> {
    try {
      return await this.callOnce<T>(method, params);
    } catch (error) {
      if (retriesLeft > 0 && this.shouldRetry(error)) {
        logger.warn({ method, retriesLeft, error }, 'Retrying RPC call');
        await this.delay(500);
        return this.callWithRetry<T>(method, params, retriesLeft - 1);
      }
      throw error;
    }
  }

  private shouldRetry(error: unknown): boolean {
    if (error instanceof Error) {
      // Retry on connection errors or timeouts
      return (
        error.message.includes('timeout') ||
        error.message.includes('Connection') ||
        error.message.includes('closed')
      );
    }
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async callOnce<T>(method: string, params: unknown[]): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const id = ++this.requestId;

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout for ${method}`));
      }, this.config.timeout);

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });

      const request = JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      });

      logger.debug({ method, params, id }, 'Sending RPC request');

      this.ws.send(request, (error) => {
        if (error) {
          clearTimeout(timeout);
          this.pendingRequests.delete(id);
          reject(error);
        }
      });
    });
  }

  async getRawTx(txid: string): Promise<string> {
    const cached = this.txCache.get(txid);
    if (cached) {
      logger.debug({ txid }, 'TX cache hit');
      return cached;
    }

    const rawHex = await this.call<string>('blockchain.transaction.get', [txid, false]);
    this.txCache.set(txid, rawHex);
    return rawHex;
  }

  async getTx(txid: string): Promise<ParsedTx> {
    const rawHex = await this.getRawTx(txid);
    return this.parseTransaction(txid, rawHex);
  }

  private parseTransaction(txid: string, rawHex: string): ParsedTx {
    const txBin = hexToBin(rawHex);
    const decoded = decodeTransaction(txBin);

    if (typeof decoded === 'string') {
      throw new Error(`Failed to decode transaction: ${decoded}`);
    }

    const inputs: TxInput[] = decoded.inputs.map((input) => {
      const prevTxid = binToHex(input.outpointTransactionHash.slice().reverse());
      const scriptSigHex = binToHex(input.unlockingBytecode);

      // Try to extract address from P2PKH scriptSig
      const address = this.extractAddressFromScriptSig(input.unlockingBytecode);

      return {
        txid: prevTxid,
        vout: input.outpointIndex,
        scriptSig: scriptSigHex,
        address,
      };
    });

    const outputs: TxOutput[] = decoded.outputs.map((output) => {
      const scriptPubKeyHex = binToHex(output.lockingBytecode);
      const address = this.extractAddressFromScriptPubKey(output.lockingBytecode);

      // Extract token data if present
      const tokenData = this.extractTokenData(output);

      return {
        value: Number(output.valueSatoshis),
        scriptPubKey: scriptPubKeyHex,
        address,
        tokenData,
      };
    });

    return {
      txid,
      inputs,
      outputs,
      confirmations: 0, // Would need additional call to get this
    };
  }

  private extractAddressFromScriptSig(scriptSig: Uint8Array): string | undefined {
    // P2PKH scriptSig format: <sig> <pubkey>
    // sig is typically 71-73 bytes, pubkey is 33 (compressed) or 65 (uncompressed)

    if (scriptSig.length < 34) {
      return undefined;
    }

    // Find the pubkey at the end
    // The last push should be the pubkey
    let offset = 0;

    while (offset < scriptSig.length) {
      const opcode = scriptSig[offset];

      if (opcode >= 1 && opcode <= 75) {
        // Direct push of n bytes
        const pushLen = opcode;
        const data = scriptSig.slice(offset + 1, offset + 1 + pushLen);

        // Check if this looks like a pubkey (33 or 65 bytes)
        if ((pushLen === 33 || pushLen === 65) && offset + 1 + pushLen >= scriptSig.length - 5) {
          // Likely the pubkey - derive address
          return this.pubkeyToAddress(data);
        }

        offset += 1 + pushLen;
      } else if (opcode === 0x4c) {
        // OP_PUSHDATA1
        const pushLen = scriptSig[offset + 1];
        offset += 2 + pushLen;
      } else if (opcode === 0x4d) {
        // OP_PUSHDATA2
        const pushLen = scriptSig[offset + 1] | (scriptSig[offset + 2] << 8);
        offset += 3 + pushLen;
      } else {
        offset++;
      }
    }

    return undefined;
  }

  private pubkeyToAddress(pubkey: Uint8Array): string | undefined {
    try {
      // Hash160: SHA256 then RIPEMD160
      const sha256Hash = sha256.hash(pubkey);
      if (typeof sha256Hash === 'string') return undefined;

      const hash160 = ripemd160.hash(sha256Hash);
      if (typeof hash160 === 'string') return undefined;

      // Encode as cashaddr
      const result = encodeCashAddress({
        prefix: BCH_TESTNET_CASHADDR_PREFIX,
        type: CashAddressType.p2pkh,
        payload: hash160,
      });

      if (typeof result === 'string') {
        return undefined;
      }

      return `${BCH_TESTNET_CASHADDR_PREFIX}:${result}`;
    } catch {
      return undefined;
    }
  }

  private extractAddressFromScriptPubKey(scriptPubKey: Uint8Array): string | undefined {
    // P2PKH: OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG
    // Hex:   76     a9        14 <hash>   88             ac
    if (
      scriptPubKey.length === 25 &&
      scriptPubKey[0] === 0x76 &&
      scriptPubKey[1] === 0xa9 &&
      scriptPubKey[2] === 0x14 &&
      scriptPubKey[23] === 0x88 &&
      scriptPubKey[24] === 0xac
    ) {
      const hash160 = scriptPubKey.slice(3, 23);
      const result = encodeCashAddress({
        prefix: BCH_TESTNET_CASHADDR_PREFIX,
        type: CashAddressType.p2pkh,
        payload: hash160,
      });

      if (typeof result !== 'string') {
        return `${BCH_TESTNET_CASHADDR_PREFIX}:${result}`;
      }
    }

    // P2SH: OP_HASH160 <20 bytes> OP_EQUAL
    // Hex:  a9        14 <hash>   87
    if (
      scriptPubKey.length === 23 &&
      scriptPubKey[0] === 0xa9 &&
      scriptPubKey[1] === 0x14 &&
      scriptPubKey[22] === 0x87
    ) {
      const hash160 = scriptPubKey.slice(2, 22);
      const result = encodeCashAddress({
        prefix: BCH_TESTNET_CASHADDR_PREFIX,
        type: CashAddressType.p2sh,
        payload: hash160,
      });

      if (typeof result !== 'string') {
        return `${BCH_TESTNET_CASHADDR_PREFIX}:${result}`;
      }
    }

    return undefined;
  }

  private extractTokenData(output: { token?: unknown }): TokenData | undefined {
    // libauth decodes token data into the output
    // Check if token field exists
    const token = output.token as
      | {
          category: Uint8Array;
          amount?: bigint;
          nft?: {
            capability: string;
            commitment?: Uint8Array;
          };
        }
      | undefined;

    if (!token) {
      return undefined;
    }

    const category = binToHex(token.category.slice().reverse());

    return {
      category,
      amount: token.amount?.toString(),
      nft: token.nft
        ? {
            capability: token.nft.capability as 'none' | 'mutable' | 'minting',
            commitment: token.nft.commitment ? binToHex(token.nft.commitment) : undefined,
          }
        : undefined,
    };
  }

  async getAddressHistory(address: string): Promise<AddressHistory[]> {
    const cached = this.historyCache.get(address);
    if (cached) {
      logger.debug({ address }, 'History cache hit');
      return cached;
    }

    // Convert cashaddr to scripthash for Electrum protocol
    const scripthash = this.addressToScripthash(address);

    const history = await this.call<{ tx_hash: string; height: number }[]>(
      'blockchain.scripthash.get_history',
      [scripthash]
    );

    const result: AddressHistory[] = history.map((h) => ({
      txid: h.tx_hash,
      height: h.height,
    }));

    // Sort by height descending (most recent first), mempool (height <= 0) at top
    result.sort((a, b) => {
      if (a.height <= 0 && b.height > 0) return -1;
      if (b.height <= 0 && a.height > 0) return 1;
      return b.height - a.height;
    });

    this.historyCache.set(address, result);
    return result;
  }

  async getAddressUtxos(address: string): Promise<UTXO[]> {
    const cached = this.utxoCache.get(address);
    if (cached) {
      logger.debug({ address }, 'UTXO cache hit');
      return cached;
    }

    const scripthash = this.addressToScripthash(address);

    const utxos = await this.call<FulcrumUtxo[]>('blockchain.scripthash.listunspent', [scripthash]);

    const result: UTXO[] = utxos.map((u) => ({
      txid: u.tx_hash,
      vout: u.tx_pos,
      value: u.value,
      height: u.height,
      tokenData: u.token_data
        ? {
            category: u.token_data.category,
            amount: u.token_data.amount,
            nft: u.token_data.nft
              ? {
                  capability: u.token_data.nft.capability as 'none' | 'mutable' | 'minting',
                  commitment: u.token_data.nft.commitment,
                }
              : undefined,
          }
        : undefined,
    }));

    this.utxoCache.set(address, result);
    return result;
  }

  private addressToScripthash(address: string): string {
    // Extract hash160 from address and compute scripthash
    // scripthash = sha256(scriptPubKey), reversed

    const decoded = decodeCashAddress(address);
    if (typeof decoded === 'string') {
      throw new Error(`Invalid address: ${decoded}`);
    }
    if (decoded.prefix !== BCH_TESTNET_CASHADDR_PREFIX) {
      throw new Error(`Only ${BCH_TESTNET_CASHADDR_PREFIX}: addresses are supported`);
    }

    // Build scriptPubKey based on address type
    let scriptPubKey: Uint8Array;

    if (decoded.type === CashAddressType.p2pkh) {
      // P2PKH: OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG
      scriptPubKey = new Uint8Array(25);
      scriptPubKey[0] = 0x76; // OP_DUP
      scriptPubKey[1] = 0xa9; // OP_HASH160
      scriptPubKey[2] = 0x14; // Push 20 bytes
      scriptPubKey.set(decoded.payload, 3);
      scriptPubKey[23] = 0x88; // OP_EQUALVERIFY
      scriptPubKey[24] = 0xac; // OP_CHECKSIG
    } else if (decoded.type === CashAddressType.p2sh) {
      // P2SH: OP_HASH160 <20 bytes> OP_EQUAL
      scriptPubKey = new Uint8Array(23);
      scriptPubKey[0] = 0xa9; // OP_HASH160
      scriptPubKey[1] = 0x14; // Push 20 bytes
      scriptPubKey.set(decoded.payload, 2);
      scriptPubKey[22] = 0x87; // OP_EQUAL
    } else {
      throw new Error(`Unsupported address type: ${decoded.type}`);
    }

    // SHA256 of scriptPubKey
    const hash = sha256.hash(scriptPubKey);
    if (typeof hash === 'string') {
      throw new Error('SHA256 failed');
    }

    // Reverse for Electrum protocol
    const reversed = hash.slice().reverse();
    return binToHex(reversed);
  }

  async getTokenBalanceFT(address: string, tokenCategory: string): Promise<bigint> {
    const utxos = await this.getAddressUtxos(address);

    let total = BigInt(0);

    for (const utxo of utxos) {
      if (utxo.tokenData?.category === tokenCategory && utxo.tokenData.amount) {
        total += BigInt(utxo.tokenData.amount);
      }
    }

    logger.debug({ address, tokenCategory, balance: total.toString() }, 'FT balance computed');
    return total;
  }

  async getTokenBalanceNFTCount(address: string, tokenCategory: string): Promise<number> {
    const utxos = await this.getAddressUtxos(address);

    let count = 0;

    for (const utxo of utxos) {
      if (utxo.tokenData?.category === tokenCategory && utxo.tokenData.nft) {
        count++;
      }
    }

    logger.debug({ address, tokenCategory, count }, 'NFT count computed');
    return count;
  }

  async scanIncomingTxs(address: string): Promise<string[]> {
    const history = await this.getAddressHistory(address);
    return history.map((h) => h.txid);
  }
}

// Factory function to create adapter from environment
export function createFulcrumAdapter(): FulcrumAdapter {
  const config: ChainConfig = {
    provider: 'FULCRUM',
    url: process.env.FULCRUM_URL ?? BCH_DEFAULT_TESTNET_FULCRUM_URL,
    timeout: 30_000, // 30 seconds
    retries: 3,
    cacheTtlMs: 60_000, // 1 minute cache
  };

  return new FulcrumAdapter(config);
}
