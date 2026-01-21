import { decodeCashAddress, CashAddressType, encodeCashAddress } from '@bitauth/libauth';
import type { AddressType } from '../generated/prisma/client.js';

export interface CashAddrValidationResult {
  valid: boolean;
  address?: string; // Normalized address with prefix
  type?: AddressType;
  error?: string;
}

export function validateCashAddress(input: string): CashAddrValidationResult {
  const trimmed = input.trim();

  // Add prefix if missing
  let addressWithPrefix = trimmed;
  if (!trimmed.includes(':')) {
    // Assume mainnet if no prefix
    addressWithPrefix = `bitcoincash:${trimmed}`;
  }

  try {
    const decoded = decodeCashAddress(addressWithPrefix);

    if (typeof decoded === 'string') {
      // Error string returned
      return {
        valid: false,
        error: `Invalid address: ${decoded}`,
      };
    }

    // Determine address type
    let addressType: AddressType = 'UNKNOWN';
    if (decoded.type === CashAddressType.p2pkh) {
      addressType = 'P2PKH';
    } else if (decoded.type === CashAddressType.p2sh) {
      addressType = 'P2SH';
    }

    // Re-encode to normalize (ensures correct prefix and checksum)
    const normalized = encodeCashAddress({
      prefix: decoded.prefix,
      type: decoded.type,
      payload: decoded.payload,
    });

    if (typeof normalized === 'string') {
      // encodeCashAddress returns string on error
      return {
        valid: false,
        error: 'Failed to normalize address',
      };
    }

    return {
      valid: true,
      address: `${decoded.prefix}:${normalized}`,
      type: addressType,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid address format',
    };
  }
}

export function isMainnetAddress(address: string): boolean {
  return address.startsWith('bitcoincash:');
}

export function isTestnetAddress(address: string): boolean {
  return address.startsWith('bchtest:');
}

export function shortenAddress(address: string, chars = 8): string {
  if (address.length <= chars * 2 + 3) {
    return address;
  }
  const prefix = address.includes(':') ? address.split(':')[0] + ':' : '';
  const addr = address.includes(':') ? address.split(':')[1] : address;
  return `${prefix}${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}
