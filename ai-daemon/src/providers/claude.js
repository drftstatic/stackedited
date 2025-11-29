/**
 * Claude CLI Provider
 *
 * Adapter for Anthropic's Claude CLI tool.
 * Uses claude command with tool/function support.
 */

import { spawn } from 'child_process';
import { BaseProvider } from './base.js';

export class ClaudeProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'claude',
      name: 'Claude Opus 4.5',
      cli: config.cli || 'claude',
      model: config.model || 'claude-opus-4-5-20251101',
      capabilities: ['editing', 'code', 'nuance', 'review', 'research'],
      ...config
    });
  }

  /**
   * Check if Claude CLI is available
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
   * Send message to Claude CLI
   */
  async sendMessage(message, context, onChunk) {
    const systemPrompt = this.buildSystemPrompt(context);

    return new Promise((resolve, reject) => {
      // Build the full prompt with conversation history
      let fullPrompt = message;
      if (context.history?.length) {
        const historyText = context.history
          .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
          .join('\n\n');
        fullPrompt = `${historyText}\n\nHuman: ${message}`;
      }

      // Build CLI arguments
      const args = [
        '--print',  // Output response to stdout
        '--system-prompt', systemPrompt
      ];

      // Add web search if needed (detected by query intent)
      if (this.shouldUseWebSearch(message)) {
        args.push('--web-search');
      }

      // Add the message as the final argument
      args.push(fullPrompt);

      const claude = spawn(this.cli, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      let output = '';
      let errorOutput = '';

      claude.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        if (onChunk) {
          onChunk(chunk);
        }
      });

      claude.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      claude.on('close', (code) => {
        if (code !== 0 && errorOutput && !output) {
          reject(new Error(`Claude CLI error (code ${code}): ${errorOutput}`));
        } else {
          resolve(this.parseOutput(output));
        }
      });

      claude.on('error', (err) => {
        reject(new Error(`Failed to spawn Claude CLI: ${err.message}`));
      });

      // Timeout after 5 minutes for long responses
      setTimeout(() => {
        claude.kill();
        reject(new Error('Claude CLI timeout after 5 minutes'));
      }, 300000);
    });
  }

  /**
   * Detect if message likely needs web search
   */
  shouldUseWebSearch(message) {
    const searchIndicators = [
      'search',
      'look up',
      'find out',
      'research',
      'what is the latest',
      'current',
      'today',
      'recent',
      'news',
      '2025',
      '2024'
    ];

    const lowerMessage = message.toLowerCase();
    return searchIndicators.some(indicator => lowerMessage.includes(indicator));
  }

  /**
   * Parse Claude CLI output
   *
   * Claude CLI outputs tool calls in XML-like format:
   * <tool_use>{"name": "suggestEdit", "parameters": {...}}</tool_use>
   */
  parseOutput(output) {
    const result = {
      text: '',
      functionCalls: []
    };

    // Look for tool_use blocks
    const toolUseRegex = /<tool_use>([\s\S]*?)<\/tool_use>/g;
    let match;
    let lastIndex = 0;
    let textParts = [];

    while ((match = toolUseRegex.exec(output)) !== null) {
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
      } catch (e) {
        // If JSON parsing fails, try to extract function name and args manually
        const nameMatch = match[1].match(/"name"\s*:\s*"(\w+)"/);
        if (nameMatch) {
          console.warn(`Partial tool call parse for: ${nameMatch[1]}`);
        }
      }
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

export default ClaudeProvider;
