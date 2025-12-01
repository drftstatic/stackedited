/**
 * Z.AI Provider - CURRENTLY DISABLED
 *
 * Adapter for Z.AI's API (Chinese AI company)
 * Uses direct API calls to https://api.z.ai
 *
 * ⚠️ ARCHITECTURAL ISSUE - NEEDS CLI WRAPPER
 *
 * This provider is currently disabled because it uses direct HTTP API calls
 * instead of the CLI spawning pattern used by all other working providers
 * (Claude, Gemini, OpenAI, Cursor, Composer).
 *
 * Problems with current implementation:
 * 1. No real availability checking (only checks if API key exists)
 * 2. Missing function call support (returns empty array)
 * 3. Incomplete streaming and error handling
 * 4. No timeout or retry logic
 * 5. Doesn't follow the established CLI pattern
 *
 * To fix:
 * 1. Create a CLI wrapper tool (like `zai-cli`) that wraps the Z.AI API
 * 2. Modify this provider to use `spawn(cli, args)` like other providers
 * 3. Implement proper tool call parsing and error handling
 * 4. Test availability by spawning the CLI with --version flag
 *
 * Until fixed, this provider is commented out in server.js
 */

import { BaseProvider } from './base.js';

export class ZAIProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'zai',
      name: 'Z.AI',
      model: config.model || 'glm-4.6',
      capabilities: ['editing', 'code', 'reasoning'],
      ...config
    });
    this.apiKey = config.apiKey || process.env.ZAI_API_KEY;
  }

  /**
   * Check if Z.AI API key is available
   */
  async isAvailable() {
    return !!this.apiKey;
  }

  /**
   * Send message to Z.AI API
   */
  async sendMessage(message, context, onChunk) {
    if (!this.apiKey) {
      throw new Error('Z.AI API key not configured');
    }

    console.log(`[Z.AI] Sending message to ${this.config.model}`);

    const systemPrompt = this.buildSystemPrompt(context);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(context.history || []).map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user', content: message }
    ];

    try {
      const response = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': 'en-US,en',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          stream: true,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Z.AI API error (${response.status}): ${errorText}`);
      }

      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      // Handle streaming response
      for await (const chunk of response.body) {
        const text = decoder.decode(chunk, { stream: true });
        buffer += text;

        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const content = data.choices[0]?.delta?.content || '';

              if (content) {
                fullText += content;
                if (onChunk) {
                  onChunk(content);
                }
              }
            } catch (e) {
              console.warn('[Z.AI] Error parsing chunk:', e.message);
            }
          }
        }
      }

      return {
        text: fullText,
        functionCalls: [] // Function calling not yet implemented for Z.AI
      };

    } catch (error) {
      console.error('[Z.AI] Request failed:', error);
      throw error;
    }
  }
}

export default ZAIProvider;
