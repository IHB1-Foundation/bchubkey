/**
 * ChainAdapter interface for BCH chain interactions
 *
 * Provides minimal methods needed for:
 * - Micro-tx ownership verification
 * - CashToken balance checking (FT/NFT)
 */

export interface TxInput {
  txid: string;
  vout: number;
  scriptSig: string; // hex
  address?: string; // derived address if P2PKH
}

export interface TxOutput {
  value: number; // satoshis
  scriptPubKey: string; // hex
  address?: string;
  tokenData?: TokenData;
}

export interface TokenData {
  category: string; // 64-char hex (genesis txid)
  amount?: string; // FT amount as string (bigint-safe)
  nft?: {
    capability: 'none' | 'mutable' | 'minting';
    commitment?: string; // hex
  };
}

export interface ParsedTx {
  txid: string;
  inputs: TxInput[];
  outputs: TxOutput[];
  confirmations: number;
  blockHeight?: number;
  time?: number;
}

export interface AddressHistory {
  txid: string;
  height: number; // 0 or -1 for unconfirmed
}

export interface UTXO {
  txid: string;
  vout: number;
  value: number; // satoshis
  height: number;
  tokenData?: TokenData;
}

export interface ChainAdapter {
  /**
   * Get raw transaction hex by txid
   */
  getRawTx(txid: string): Promise<string>;

  /**
   * Get parsed transaction by txid
   */
  getTx(txid: string): Promise<ParsedTx>;

  /**
   * Get address transaction history (most recent first)
   * Includes both confirmed and mempool transactions
   */
  getAddressHistory(address: string): Promise<AddressHistory[]>;

  /**
   * Get UTXOs for an address (including token metadata)
   */
  getAddressUtxos(address: string): Promise<UTXO[]>;

  /**
   * Get FT token balance for address
   * Returns base units as bigint
   */
  getTokenBalanceFT(address: string, tokenCategory: string): Promise<bigint>;

  /**
   * Get NFT count for address with specific category
   */
  getTokenBalanceNFTCount(address: string, tokenCategory: string): Promise<number>;

  /**
   * Scan incoming transactions to an address
   * Returns txids that have outputs paying to the address
   */
  scanIncomingTxs(address: string): Promise<string[]>;

  /**
   * Connect to the chain provider
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the chain provider
   */
  disconnect(): Promise<void>;

  /**
   * Check if connected
   */
  isConnected(): boolean;
}

export interface ChainConfig {
  provider: 'FULCRUM';
  url: string;
  timeout: number; // ms
  retries: number;
  cacheTtlMs: number;
}
