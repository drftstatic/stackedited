/**
 * Gemini CLI Provider
 *
 * Adapter for Google's Gemini CLI tool.
 * Uses gemini command with text output mode.
 */

import { spawn } from 'child_process';
import { BaseProvider } from './base.js';

export class GeminiProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'gemini',
      name: 'Gemini 2.0 Flash',
      cli: config.cli || 'gemini',
      model: config.model || 'gemini-2.0-flash',
      capabilities: ['editing', 'code', 'speed', 'multimodal'],
      ...config
    });
  }

  /**
   * Check if Gemini CLI is available
   */
  async isAvailable() {
    return new Promise((resolve) => {
      const proc = spawn(this.cli, ['--version'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      proc.on('close', (code) => resolve(code === 0));
      proc.on('error', () => resolve(false));

      // Timeout after 5 seconds
      setTimeout(() => {
        proc.kill();
        resolve(false);
      }, 5000);
    });
  }

  /**
   * Send message to Gemini CLI
   */
  async sendMessage(message, context, onChunk) {
    console.log('[Gemini] sendMessage called');
    const systemPrompt = this.buildSystemPrompt(context);
    console.log(`[Gemini] System prompt length: ${systemPrompt?.length || 0}`);

    return new Promise((resolve, reject) => {
      // Build the full prompt with conversation history
      let fullPrompt = message;
      if (context.history?.length) {
        const historyText = context.history
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n\n');
        fullPrompt = `Previous conversation:\n${historyText}\n\nCurrent request: ${message}`;
      }

      // Prepend system prompt to the message
      if (systemPrompt) {
        fullPrompt = `${systemPrompt}\n\n---\n\n${fullPrompt}`;
      }

      // Build CLI arguments - Gemini uses positional args for prompt
      const args = [
        '-o', 'text',  // Output format: text (not json or stream-json)
        fullPrompt
      ];

      console.log(`[Gemini] Spawning CLI: ${this.cli} with ${args.length} args`);
      console.log(`[Gemini] Working directory: ${process.cwd()}`);

      const gemini = spawn(this.cli, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PATH: process.env.PATH || '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin',
          TERM: 'dumb',
          CI: 'true',
          FORCE_COLOR: '0',
          NO_COLOR: '1'
        },
        shell: false,
        cwd: process.cwd(),
        detached: false
      });

      console.log(`[Gemini] Process spawned with PID: ${gemini.pid}`);

      let output = '';
      let errorOutput = '';

      gemini.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        if (onChunk) {
          onChunk(chunk);
        }
      });

      gemini.stderr.on('data', (data) => {
        const stderr = data.toString();
        console.log(`[Gemini] stderr: ${stderr}`);
        errorOutput += stderr;
      });

      gemini.on('close', (code) => {
        console.log(`[Gemini] Process closed with code: ${code}`);
        console.log(`[Gemini] Output length: ${output.length}, Error length: ${errorOutput.length}`);
        if (code !== 0 && errorOutput && !output) {
          reject(new Error(`Gemini CLI error (code ${code}): ${errorOutput}`));
        } else {
          const result = this.parseOutput(output);
          console.log(`[Gemini] Parsed result: text length=${result.text?.length}, functionCalls=${result.functionCalls?.length}`);
          resolve(result);
        }
      });

      gemini.on('error', (err) => {
        console.log(`[Gemini] Spawn error: ${err.message}`);
        reject(new Error(`Failed to spawn Gemini CLI: ${err.message}`));
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        gemini.kill();
        reject(new Error('Gemini CLI timeout after 5 minutes'));
      }, 300000);
    });
  }

  /**
   * Parse Gemini CLI output
   */
  parseOutput(output) {
    const result = {
      text: '',
      functionCalls: []
    };

    // Look for tool_use blocks (similar to Claude format)
    const toolUseRegex = /<tool_use>([\s\S]*?)<\/tool_use>/g;
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
      } catch (e) {
        // If JSON parsing fails, log and continue
        console.warn(`[Gemini] Failed to parse tool call: ${e.message}`);
      }
    }

    if (lastIndex < output.length) {
      textParts.push(output.slice(lastIndex));
    }

    if (result.functionCalls.length === 0) {
      result.text = output.trim();
    } else {
      result.text = textParts.join('').trim();
    }

    // Also check for markdown JSON blocks
    if (result.functionCalls.length === 0) {
      const jsonBlockRegex = /```(?:json)?\s*\n(\{[\s\S]*?"(?:name|function)"[\s\S]*?\})\s*\n```/g;
      while ((match = jsonBlockRegex.exec(output)) !== null) {
        try {
          const parsed = JSON.parse(match[1]);
          if (parsed.name && (parsed.parameters || parsed.arguments)) {
            result.functionCalls.push({
              name: parsed.name,
              arguments: parsed.parameters || parsed.arguments || {}
            });
            result.text = result.text.replace(match[0], '').trim();
          }
        } catch (e) {
          // Not a valid function call JSON
        }
      }
    }

    return result;
  }
}

export default GeminiProvider;
