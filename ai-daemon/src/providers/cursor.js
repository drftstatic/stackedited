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
      // Build args: --print --output-format text --model <model> [--api-key <key>] <prompt>
      const args = ['--print', '--output-format', 'text'];

      // Add model if specified
      if (this.model) {
        args.push('--model', this.model);
      }

      // Add API key if provided
      if (this.apiKey) {
        args.push('--api-key', this.apiKey);
      }

      // Add prompt as positional argument
      args.push(fullPrompt);

      console.log(`[Cursor] Executing: ${this.cli} ${args.slice(0, -1).join(' ')} "<prompt ${fullPrompt.length} chars>"`);
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

      // Timeout after 2 minutes (cursor-agent can take time with long prompts)
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error('Cursor agent timed out after 2 minutes'));
      }, 120000);

      child.on('close', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          if (fullText) {
            console.warn(`[Cursor] Process exited with code ${code} but returned text.`);
          } else {
            reject(new Error(`Cursor agent exited with code ${code}: ${errorText}`));
            return;
          }
        }

        resolve(this.parseOutput(fullText));
      });
    });
  }

  /**
   * Parse Cursor CLI output (same format as Gemini - looks for <tool_use> blocks)
   */
  parseOutput(output) {
    const result = {
      text: '',
      functionCalls: []
    };

    // Look for tool_use blocks
    const toolUseRegex = /<tool_use\b[^>]*>([\s\S]*?)<\/tool_use>/gi;
    let match;
    let lastIndex = 0;
    let textParts = [];

    while ((match = toolUseRegex.exec(output)) !== null) {
      if (match.index > lastIndex) {
        textParts.push(output.slice(lastIndex, match.index));
      }
      lastIndex = match.index + match[0].length;

      try {
        const toolCall = JSON.parse(match[1].trim());
        result.functionCalls.push({
          name: toolCall.name,
          arguments: toolCall.parameters || toolCall.arguments || {}
        });
        console.log(`[Cursor] Extracted tool call: ${toolCall.name}`);
      } catch (e) {
        console.warn(`[Cursor] Failed to parse tool call: ${e.message}`);
      }
    }

    if (lastIndex < output.length) {
      textParts.push(output.slice(lastIndex));
    }

    result.text = result.functionCalls.length === 0
      ? output.trim()
      : textParts.join('').trim();

    return result;
  }
}

export default CursorProvider;
