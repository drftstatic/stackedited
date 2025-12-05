/**
 * Z.AI Provider
 *
 * Adapter for Z.AI's CLI tool (Chinese AI company with GLM models).
 * Uses zai-cli command with tool/function support.
 */

import { spawn } from 'child_process';
import { BaseProvider } from './base.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ZAIProvider extends BaseProvider {
  constructor(config = {}) {
    // Default to the local zai-cli.js we created
    const defaultCli = join(__dirname, '../../bin/zai-cli.js');

    super({
      id: 'zai',
      name: 'Z.AI',
      cli: config.cli || defaultCli,
      model: config.model || 'glm-4.6',
      capabilities: ['editing', 'code', 'reasoning'],
      ...config
    });
    this.apiKey = config.apiKey;
  }

  /**
   * Check if Z.AI CLI is available
   */
  async isAvailable() {
    return new Promise((resolve) => {
      const proc = spawn('node', [this.cli, '--version'], {
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
   * Send message to Z.AI CLI
   */
  async sendMessage(message, context, onChunk) {
    console.log(`[Z.AI] Sending message to ${this.model}`);
    const systemPrompt = this.buildSystemPrompt(context);

    return new Promise((resolve, reject) => {
      // Build the full prompt with conversation history
      let fullPrompt = message;
      if (context.history?.length) {
        const historyText = context.history
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n\n');
        fullPrompt = `Previous conversation:\n${historyText}\n\nCurrent request: ${message}`;
      }

      // Build CLI arguments
      const args = [
        this.cli,  // Path to zai-cli.js
        '--print',
        '--model', this.model
      ];

      // Add API key if provided
      if (this.apiKey) {
        args.push('--api-key', this.apiKey);
      }

      // Add system prompt if provided
      if (systemPrompt) {
        args.push('--system-prompt', systemPrompt);
      }

      // Add the message as the final argument
      args.push(fullPrompt);

      console.log(`[Z.AI] Spawning CLI: node ${args[0]} with ${args.length - 1} additional args`);

      const zai = spawn('node', args, {
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

      console.log(`[Z.AI] Process spawned with PID: ${zai.pid}`);

      let output = '';
      let errorOutput = '';

      zai.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        if (onChunk) {
          onChunk(chunk);
        }
      });

      zai.stderr.on('data', (data) => {
        const stderr = data.toString();
        console.log(`[Z.AI] stderr: ${stderr}`);
        errorOutput += stderr;
      });

      zai.on('close', (code) => {
        console.log(`[Z.AI] Process closed with code: ${code}`);
        console.log(`[Z.AI] Output length: ${output.length}, Error length: ${errorOutput.length}`);

        if (code !== 0 && errorOutput && !output) {
          reject(new Error(`Z.AI CLI error (code ${code}): ${errorOutput}`));
        } else {
          const result = this.parseOutput(output);
          console.log(`[Z.AI] Parsed result: text length=${result.text?.length}, functionCalls=${result.functionCalls?.length}`);
          resolve(result);
        }
      });

      zai.on('error', (err) => {
        console.log(`[Z.AI] Spawn error: ${err.message}`);
        reject(new Error(`Failed to spawn Z.AI CLI: ${err.message}`));
      });

      // Timeout after 5 minutes for long responses
      setTimeout(() => {
        zai.kill();
        reject(new Error('Z.AI CLI timeout after 5 minutes'));
      }, 300000);
    });
  }

  /**
   * Parse Z.AI CLI output
   *
   * Z.AI CLI outputs tool calls in XML-like format (same as Claude):
   * <tool_use>{"name": "suggestEdit", "parameters": {...}}</tool_use>
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
    let toolCallCount = 0;

    while ((match = toolUseRegex.exec(output)) !== null) {
      toolCallCount++;
      // Capture text before this tool call
      if (match.index > lastIndex) {
        textParts.push(output.slice(lastIndex, match.index));
      }
      lastIndex = match.index + match[0].length;

      // Parse the tool call
      try {
        const toolCall = JSON.parse(match[1].trim());
        result.functionCalls.push({
          name: toolCall.name,
          arguments: toolCall.parameters || toolCall.arguments || {}
        });
        console.log(`[Z.AI] Extracted tool call: ${toolCall.name}`);
      } catch (e) {
        console.warn(`[Z.AI] Failed to parse tool call: ${e.message}`);
      }
    }

    if (toolCallCount > 0) {
      console.log(`[Z.AI] Total tool_use blocks found: ${toolCallCount}`);
    }

    // Capture remaining text after last tool call
    if (lastIndex < output.length) {
      textParts.push(output.slice(lastIndex));
    }

    // If no tool calls found, entire output is text
    if (result.functionCalls.length === 0) {
      result.text = output.trim();
    } else {
      result.text = textParts.join('').trim();
    }

    return result;
  }
}

export default ZAIProvider;
