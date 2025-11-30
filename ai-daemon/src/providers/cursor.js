/**
 * Cursor Provider (Placeholder)
 *
 * Future adapter for Cursor's CLI tool.
 * Will provide access to Grok and other models via Cursor.
 */

import { BaseProvider } from './base.js';

export class CursorProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'cursor',
      name: 'Grok',
      cli: config.cli || 'cursor',
      model: config.model || 'grok',
      capabilities: ['editing', 'code', 'reasoning'],
      ...config
    });
  }

  /**
   * Check if Cursor CLI is available
   */
  async isAvailable() {
    // Placeholder - not yet implemented
    return false;
  }

  /**
   * Send message via Cursor CLI
   */
  async sendMessage(message, context, onChunk) {
    throw new Error('Cursor provider not yet implemented');
  }
}

export default CursorProvider;
