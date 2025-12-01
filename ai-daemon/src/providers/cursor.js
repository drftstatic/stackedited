/**
 * Cursor Provider
 *
 * Adapter for Cursor's Agent CLI tool.
 * Provides access to Grok and other models via Cursor subscription.
 */

import { spawn } from 'child_process';
import { BaseProvider } from './base.js';

export class CursorProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'cursor',
      name: 'Cursor (Grok)',
      cli: config.cli || 'cursor-agent',
      model: config.model || 'grok', // Default to Grok if not specified
      capabilities: ['editing', 'code', 'reasoning'],
      ...config
    });
    this.apiKey = config.apiKey;
  }

  /**
   * Check if Cursor CLI is available
   */
  async isAvailable() {
    try {
      console.log(`[Cursor] Checking availability of ${this.cli}`);
      const process = spawn(this.cli, ['--help']);
      return new Promise((resolve) => {
        process.on('error', (err) => {
          console.error(`[Cursor] Availability check failed: ${err.message}`);
          resolve(false);
        });
        process.on('close', (code) => {
          console.log(`[Cursor] Availability check exited with code ${code}`);
          resolve(code === 0);
        });
      });
    } catch (e) {
      console.error(`[Cursor] Availability check exception: ${e.message}`);
      return false;
    }
  }

  /**
   * Send message via Cursor CLI
   */
  async sendMessage(message, context, onChunk) {
    console.log(`[Cursor] Sending message to ${this.model}`);

    // Build the prompt with context
    const systemPrompt = this.buildSystemPrompt(context);
    const fullPrompt = `${systemPrompt}\n\n${message}`;

    return new Promise((resolve, reject) => {
      const args = ['--model', this.model, '--print', '--output-format', 'text'];

      if (this.apiKey) {
        args.push('--api-key', this.apiKey);
      }

      // Add prompt as positional argument
      args.push(fullPrompt);

      const child = spawn(this.cli, args);

      let fullText = '';
      let errorText = '';

      child.stdout.on('data', (data) => {
        const text = data.toString();
        fullText += text;
        if (onChunk) {
          onChunk(text);
        }
      });

      child.stderr.on('data', (data) => {
        errorText += data.toString();
        // Some tools print progress to stderr, don't treat as fatal error immediately
        console.log(`[Cursor] stderr: ${data}`);
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to start cursor-agent: ${error.message}`));
      });

      child.on('close', (code) => {
        if (code !== 0) {
          // If we got some text, maybe it was partial success?
          // But usually non-zero means failure.
          if (fullText) {
            console.warn(`[Cursor] Process exited with code ${code} but returned text.`);
          } else {
            reject(new Error(`Cursor agent exited with code ${code}: ${errorText}`));
            return;
          }
        }

        resolve({
          text: fullText,
          functionCalls: [] // Function calling not implemented for CLI yet
        });
      });
    });
  }
}

export default CursorProvider;
