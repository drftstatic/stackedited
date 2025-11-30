/**
 * X.AI Provider
 *
 * Adapter for X.AI's API (Grok).
 * Uses direct API calls since no CLI is standard yet.
 */

import { BaseProvider } from './base.js';

export class XAIProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'xai',
      name: 'X.AI',
      model: config.model || 'grok-beta',
      apiKey: config.apiKey || process.env.XAI_API_KEY,
      capabilities: ['editing', 'code', 'reasoning'],
      ...config
    });
  }

  /**
   * Check if X.AI API key is available
   */
  async isAvailable() {
    return !!this.config.apiKey;
  }

  /**
   * Send message to X.AI API
   */
  async sendMessage(message, context, onChunk) {
    if (!this.config.apiKey) {
      throw new Error('X.AI API key not configured');
    }

    console.log(`[X.AI] Sending message to ${this.config.model}`);

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
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
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
        throw new Error(`X.AI API error (${response.status}): ${errorText}`);
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
              console.warn('[X.AI] Error parsing chunk:', e.message);
            }
          }
        }
      }

      return {
        text: fullText,
        functionCalls: [] // Function calling not yet implemented for X.AI
      };

    } catch (error) {
      console.error('[X.AI] Request failed:', error);
      throw error;
    }
  }
}

export default XAIProvider;
