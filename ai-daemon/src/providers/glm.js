/**
 * GLM Provider (via Z.AI DevPack)
 *
 * Uses Claude CLI but routes through Z.AI DevPack proxy to access GLM-4.6 models.
 * This leverages the DevPack subscription ($3/month) instead of Claude API credits.
 *
 * Technical approach:
 * - Uses same Claude CLI tool
 * - Sets ANTHROPIC_BASE_URL to Z.AI's proxy endpoint
 * - Sets ANTHROPIC_AUTH_TOKEN to Z.AI API key
 * - 100% API compatible with Claude (same tool format, parsing, etc.)
 */

import { spawn } from 'child_process';
import { BaseProvider } from './base.js';

export class GLMProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'glm',
      name: 'GLM-4.6 (Z.AI)',
      cli: config.cli || 'claude',
      model: config.model || 'opus', // Use 'opus' which DevPack maps to GLM-4.6
      capabilities: ['editing', 'code', 'reasoning', 'analysis'],
      ...config
    });
    this.apiKey = config.apiKey;
  }

  /**
   * Check if Claude CLI is available (required for DevPack)
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
   * Send message to GLM via Z.AI DevPack proxy
   */
  async sendMessage(message, context, onChunk) {
    console.log('[GLM] sendMessage called');
    const systemPrompt = this.buildSystemPrompt(context);
    console.log(`[GLM] System prompt length: ${systemPrompt?.length || 0}`);

    return new Promise((resolve, reject) => {
      // Build the full prompt with conversation history
      let fullPrompt = message;
      if (context.history?.length) {
        const historyText = context.history
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n\n');
        fullPrompt = `Previous conversation:\n${historyText}\n\nCurrent request: ${message}`;
      }

      // Build CLI arguments (same as Claude)
      const args = [
        '-p',  // Print mode - output response to stdout and exit
        '--model', this.model  // Use 'opus' which DevPack maps to GLM-4.6
      ];

      // Add system prompt if provided
      if (systemPrompt) {
        args.push('--system-prompt', systemPrompt);
      }

      // Add the message as the final argument
      args.push(fullPrompt);

      console.log(`[GLM] Spawning CLI: ${this.cli} with ${args.length} args`);
      console.log(`[GLM] Using Z.AI DevPack proxy at https://api.z.ai/api/anthropic`);
      console.log(`[GLM] Full command: ${this.cli} ${args.slice(0, 3).join(' ')} ... "${fullPrompt.slice(0, 30)}..."`);

      const glm = spawn(this.cli, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Z.AI DevPack proxy configuration
          ANTHROPIC_BASE_URL: 'https://api.z.ai/api/anthropic',
          ANTHROPIC_AUTH_TOKEN: this.apiKey || process.env.GLM_API_KEY,
          // Standard environment
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

      console.log(`[GLM] Process spawned with PID: ${glm.pid}`);

      let output = '';
      let errorOutput = '';

      glm.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        if (onChunk) {
          onChunk(chunk);
        }
      });

      glm.stderr.on('data', (data) => {
        const stderr = data.toString();
        console.log(`[GLM] stderr: ${stderr}`);
        errorOutput += stderr;
      });

      glm.on('close', (code) => {
        console.log(`[GLM] Process closed with code: ${code}`);
        console.log(`[GLM] Output length: ${output.length}, Error length: ${errorOutput.length}`);
        if (code !== 0 && errorOutput && !output) {
          reject(new Error(`GLM CLI error (code ${code}): ${errorOutput}`));
        } else {
          const result = this.parseOutput(output);
          console.log(`[GLM] Parsed result: text length=${result.text?.length}, functionCalls=${result.functionCalls?.length}`);
          resolve(result);
        }
      });

      glm.on('error', (err) => {
        console.log(`[GLM] Spawn error: ${err.message}`);
        reject(new Error(`Failed to spawn Claude CLI for GLM: ${err.message}`));
      });

      // Timeout after 5 minutes for long responses
      setTimeout(() => {
        glm.kill();
        reject(new Error('GLM CLI timeout after 5 minutes'));
      }, 300000);
    });
  }

  /**
   * Parse GLM CLI output
   *
   * Since GLM uses the same Claude CLI and Z.AI provides Anthropic-compatible responses,
   * the output format is identical to Claude's <tool_use> format.
   */
  parseOutput(output) {
    const result = {
      text: '',
      functionCalls: []
    };

    // Look for tool_use blocks (same format as Claude)
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
        console.log(`[GLM] Extracted tool call: ${toolCall.name}`);
      } catch (e) {
        // If JSON parsing fails, try to extract function name manually
        const nameMatch = match[1].match(/"name"\s*:\s*"(\w+)"/);
        if (nameMatch) {
          console.warn(`[GLM] Partial tool call parse for: ${nameMatch[1]}`);
        }
      }
    }

    if (toolCallCount > 0) {
      console.log(`[GLM] Total tool_use blocks found and removed: ${toolCallCount}`);
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

    // Also check for markdown code block function calls (alternative format)
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
            // Remove this block from text
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

export default GLMProvider;
