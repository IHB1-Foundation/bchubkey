import QRCode from 'qrcode';
import { createChildLogger } from './logger.js';

const logger = createChildLogger('util:qr');

/**
 * Generate a QR code as a PNG buffer.
 * Returns null on failure (graceful fallback).
 */
export async function generateQRCodeBuffer(data: string): Promise<Buffer | null> {
  try {
    const buffer = await QRCode.toBuffer(data, {
      errorCorrectionLevel: 'M',
      type: 'png',
      margin: 2,
      width: 300,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff',
      },
    });
    return buffer;
  } catch (error) {
    logger.warn({ error, dataLength: data.length }, 'QR code generation failed');
    return null;
  }
}

/**
 * Generate a BIP21-style BCH payment URI for QR code.
 * Format: bitcoincash:<address>?amount=<bch_amount>
 */
export function generatePaymentURI(address: string, amountSats: number): string {
  // Convert sats to BCH (8 decimals)
  const amountBCH = amountSats / 100_000_000;

  // Normalize address (remove prefix if already has one, then add it)
  let cleanAddress = address;
  if (address.startsWith('bitcoincash:')) {
    cleanAddress = address.slice('bitcoincash:'.length);
  } else if (address.startsWith('bchtest:')) {
    // Testnet address - return as-is for testnet
    return `${address}?amount=${amountBCH.toFixed(8)}`;
  }

  return `bitcoincash:${cleanAddress}?amount=${amountBCH.toFixed(8)}`;
}
