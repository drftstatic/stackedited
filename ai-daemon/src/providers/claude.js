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
      model: config.model || 'opus',
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
    console.log('[Claude] sendMessage called');
    const systemPrompt = this.buildSystemPrompt(context);
    console.log(`[Claude] System prompt length: ${systemPrompt?.length || 0}`);

    return new Promise((resolve, reject) => {
      // Build the full prompt with conversation history
      // Note: Don't use "Human:" prefix as Claude CLI can misinterpret it as a path
      let fullPrompt = message;
      if (context.history?.length) {
        const historyText = context.history
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n\n');
        fullPrompt = `Previous conversation:\n${historyText}\n\nCurrent request: ${message}`;
      }

      // Build CLI arguments
      const args = [
        '-p',  // Print mode - output response to stdout and exit
        '--model', this.model  // Specify the model to use
      ];

      // Add system prompt if provided
      if (systemPrompt) {
        args.push('--system-prompt', systemPrompt);
      }

      // Add web search if needed (detected by query intent)
      if (this.shouldUseWebSearch(message)) {
        args.push('--web-search');
      }

      // Add the message as the final argument
      args.push(fullPrompt);

      console.log(`[Claude] Spawning CLI: ${this.cli} with ${args.length} args`);
      console.log(`[Claude] Full command: ${this.cli} ${args.slice(0, 3).join(' ')} ... "${fullPrompt.slice(0, 30)}..."`);
      console.log(`[Claude] Working directory: ${process.cwd()}`);

      const claude = spawn(this.cli, args, {
        // Use 'ignore' for stdin since we pass everything via args
        // This prevents CLI from waiting for stdin input
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Ensure we have proper PATH including homebrew
          PATH: process.env.PATH || '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin',
          // Disable TTY detection which can cause hangs
          TERM: 'dumb',
          CI: 'true',
          // Force non-interactive mode
          FORCE_COLOR: '0',
          NO_COLOR: '1'
        },
        // Don't use shell - pass args directly
        shell: false,
        // Set working directory to a trusted location
        cwd: process.cwd(),
        // Ensure stdio is separate from parent
        detached: false
      });

      console.log(`[Claude] Process spawned with PID: ${claude.pid}`);

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
        const stderr = data.toString();
        console.log(`[Claude] stderr: ${stderr}`);
        errorOutput += stderr;
      });

      claude.on('close', (code) => {
        console.log(`[Claude] Process closed with code: ${code}`);
        console.log(`[Claude] Output length: ${output.length}, Error length: ${errorOutput.length}`);
        if (code !== 0 && errorOutput && !output) {
          reject(new Error(`Claude CLI error (code ${code}): ${errorOutput}`));
        } else {
          const result = this.parseOutput(output);
          console.log(`[Claude] Parsed result: text length=${result.text?.length}, functionCalls=${result.functionCalls?.length}`);
          resolve(result);
        }
      });

      claude.on('error', (err) => {
        console.log(`[Claude] Spawn error: ${err.message}`);
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

    // Look for tool_use blocks - improved regex to handle attributes and whitespace variations
    // Matches: <tool_use>, <tool_use name="foo">, <tool_use  >, etc.
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
        console.log(`[Claude] Extracted tool call: ${toolCall.name}`);
      } catch (e) {
        // If JSON parsing fails, try to extract function name and args manually
        const nameMatch = match[1].match(/"name"\s*:\s*"(\w+)"/);
        if (nameMatch) {
          console.warn(`[Claude] Partial tool call parse for: ${nameMatch[1]}`);
        }
      }
    }

    if (toolCallCount > 0) {
      console.log(`[Claude] Total tool_use blocks found and removed: ${toolCallCount}`);
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
