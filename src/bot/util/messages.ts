/**
 * Telegram message formatting utilities
 *
 * Provides consistent message structure per Brand Kit terminology:
 * - Ownership Proof (address verification via micro-tx)
 * - Gate Check (token balance evaluation)
 * - Enforcement (restrict/remove actions)
 */

/**
 * Escapes Markdown special characters for safe inclusion in messages.
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

/**
 * Truncates a string and adds ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Formats a token ID for display (first 16 chars + ellipsis).
 */
export function formatTokenId(tokenId: string): string {
  if (tokenId.length <= 20) return tokenId;
  return `${tokenId.slice(0, 16)}...`;
}

/**
 * Formats an address for display (first 24 chars + ellipsis).
 */
export function formatAddress(address: string): string {
  if (address.length <= 28) return address;
  return `${address.slice(0, 24)}...`;
}

/**
 * Message builder for consistent Telegram message formatting.
 *
 * Usage:
 *   const msg = new MessageBuilder()
 *     .title('Verification Complete')
 *     .text('Your address has been verified.')
 *     .section('Next Steps', ['Token balance check will run automatically'])
 *     .build();
 */
export class MessageBuilder {
  private parts: string[] = [];

  /**
   * Adds a bold title line.
   */
  title(text: string): this {
    this.parts.push(`*${escapeMarkdown(text)}*`);
    return this;
  }

  /**
   * Adds a step indicator (e.g., "Step 2 of 4: Ownership Proof").
   */
  step(current: number, total: number, label: string): this {
    this.parts.push(`*Step ${current} of ${total}: ${escapeMarkdown(label)}*`);
    return this;
  }

  /**
   * Adds a blank line.
   */
  blank(): this {
    this.parts.push('');
    return this;
  }

  /**
   * Adds a plain text paragraph.
   */
  text(content: string): this {
    this.parts.push(content);
    return this;
  }

  /**
   * Adds a bold label with a value.
   */
  field(label: string, value: string): this {
    this.parts.push(`*${escapeMarkdown(label)}:* ${value}`);
    return this;
  }

  /**
   * Adds a section with header and bullet points.
   */
  section(header: string, bullets: string[]): this {
    this.parts.push(`*${escapeMarkdown(header)}:*`);
    for (const bullet of bullets) {
      this.parts.push(`• ${bullet}`);
    }
    return this;
  }

  /**
   * Adds a numbered list.
   */
  numberedList(items: string[]): this {
    items.forEach((item, i) => {
      this.parts.push(`${i + 1}. ${item}`);
    });
    return this;
  }

  /**
   * Adds an inline code block.
   */
  code(text: string): this {
    this.parts.push(`\`${text}\``);
    return this;
  }

  /**
   * Adds a multi-line code block.
   */
  codeBlock(text: string): this {
    this.parts.push('```');
    this.parts.push(text);
    this.parts.push('```');
    return this;
  }

  /**
   * Adds a warning/note in italic.
   */
  note(text: string): this {
    this.parts.push(`_${text}_`);
    return this;
  }

  /**
   * Adds an action prompt (what the user should do next).
   */
  action(text: string): this {
    this.parts.push(`*Next:* ${text}`);
    return this;
  }

  /**
   * Adds a status line (bold text).
   */
  status(text: string): this {
    this.parts.push(`*${text}*`);
    return this;
  }

  /**
   * Builds the final message string.
   */
  build(): string {
    return this.parts.join('\n');
  }
}

/**
 * Standard button labels per Brand Kit.
 */
export const ButtonLabels = {
  NEXT: 'Next',
  BACK: 'Back',
  REFRESH: 'Refresh',
  CANCEL: 'Cancel',
  HELP: 'Help',
  SENT_IT: "I've Sent It",
  CHANGE_ADDRESS: 'Change Address',
  TRY_AGAIN: 'Try Again',
  START_OVER: 'Start Over',
} as const;

/**
 * Standard callback action prefixes.
 */
export const CallbackActions = {
  VERIFY_PROCEED: 'verify_proceed',
  VERIFY_SENT: 'verify_sent',
  VERIFY_REFRESH: 'verify_refresh',
  VERIFY_CANCEL: 'verify_cancel',
  VERIFY_CHANGE_ADDRESS: 'verify_change_address',
  WIZARD_CANCEL: 'wizard_cancel',
} as const;

/**
 * Pre-built message templates for common scenarios.
 */
export const Messages = {
  sessionExpired: () =>
    new MessageBuilder()
      .title('Session Expired')
      .blank()
      .text('Your verification session has expired.')
      .blank()
      .action('Use the group link to start again.')
      .build(),

  verificationSuccess: (txid?: string) =>
    new MessageBuilder()
      .title('Ownership Proof Complete')
      .blank()
      .text('Your address ownership has been verified.')
      .blank()
      .field('Transaction', txid ? `\`${truncate(txid, 20)}\`` : 'confirmed')
      .blank()
      .text('Gate Check will run automatically.')
      .build(),

  verificationFailed: () =>
    new MessageBuilder()
      .title('Ownership Proof Failed')
      .blank()
      .text("We couldn't verify your address ownership.")
      .text('The transaction inputs did not match your claimed address.')
      .blank()
      .section('What to do', [
        'Use a standard P2PKH wallet (e.g., Electron Cash)',
        'Ensure you send *from* the address you submitted',
        'Avoid multi-sig or smart contract wallets',
      ])
      .build(),

  verificationCancelled: () =>
    new MessageBuilder()
      .text('Verification cancelled.')
      .blank()
      .text('Use the group link to start again when ready.')
      .build(),

  invalidLink: () =>
    new MessageBuilder()
      .title('Invalid Link')
      .blank()
      .text('This verification link is invalid or has expired.')
      .blank()
      .action('Request a new link from the group admin.')
      .build(),

  groupPaused: () =>
    new MessageBuilder()
      .title('Verification Paused')
      .blank()
      .text('Verification is currently paused for this group.')
      .blank()
      .action('Try again later or contact the group admin.')
      .build(),
};
