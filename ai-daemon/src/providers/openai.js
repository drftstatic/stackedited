/**
 * OpenAI Provider
 *
 * Adapter for OpenAI's Codex CLI tool.
 * Uses `codex exec` for non-interactive mode.
 */

import { spawn } from 'child_process';
import { BaseProvider } from './base.js';

export class OpenAIProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'openai',
      name: 'OpenAI Codex',
      cli: config.cli || 'codex',
      model: config.model || 'o3',
      capabilities: ['editing', 'code', 'reasoning', 'analysis'],
      ...config
    });
  }

  /**
   * Check if Codex CLI is available
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
   * Send message to Codex CLI using exec mode
   */
  async sendMessage(message, context, onChunk) {
    console.log('[OpenAI] sendMessage called');
    const systemPrompt = this.buildSystemPrompt(context);
    console.log(`[OpenAI] System prompt length: ${systemPrompt?.length || 0}`);

    return new Promise((resolve, reject) => {
      // Build the full prompt with conversation history and system context
      let fullPrompt = '';

      // Add system context
      if (systemPrompt) {
        fullPrompt += `Context:\n${systemPrompt}\n\n`;
      }

      // Add conversation history
      if (context.history?.length) {
        const historyText = context.history
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n\n');
        fullPrompt += `Previous conversation:\n${historyText}\n\n`;
      }

      fullPrompt += `Request: ${message}`;

      // Build CLI arguments for codex exec
      const args = [
        'exec',
        '--json',  // Output JSONL for parsing
        '-m', this.model,
        '--skip-git-repo-check',  // Don't require git repo
        fullPrompt
      ];

      console.log(`[OpenAI] Spawning CLI: ${this.cli} exec with model ${this.model}`);
      console.log(`[OpenAI] Prompt length: ${fullPrompt.length}`);

      const codex = spawn(this.cli, args, {
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

      console.log(`[OpenAI] Process spawned with PID: ${codex.pid}`);

      let output = '';
      let errorOutput = '';

      codex.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;

        // Try to parse JSONL and stream text chunks
        const lines = chunk.split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            // Look for agent_message in item.completed events
            if (event.type === 'item.completed' && event.item?.type === 'agent_message' && event.item?.text) {
              if (onChunk) {
                onChunk(event.item.text);
              }
            }
          } catch (e) {
            // Not valid JSON, skip
          }
        }
      });

      codex.stderr.on('data', (data) => {
        const stderr = data.toString();
        console.log(`[OpenAI] stderr: ${stderr}`);
        errorOutput += stderr;
      });

      codex.on('close', (code) => {
        console.log(`[OpenAI] Process closed with code: ${code}`);
        console.log(`[OpenAI] Output length: ${output.length}, Error length: ${errorOutput.length}`);

        if (code !== 0 && errorOutput && !output) {
          reject(new Error(`Codex CLI error (code ${code}): ${errorOutput}`));
        } else {
          const result = this.parseOutput(output);
          console.log(`[OpenAI] Parsed result: text length=${result.text?.length}`);
          resolve(result);
        }
      });

      codex.on('error', (err) => {
        console.log(`[OpenAI] Spawn error: ${err.message}`);
        reject(new Error(`Failed to spawn Codex CLI: ${err.message}`));
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        codex.kill();
        reject(new Error('Codex CLI timeout after 5 minutes'));
      }, 300000);
    });
  }

  /**
   * Extract text from message content array
   */
  extractTextFromContent(content) {
    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .filter(c => c.type === 'text' || c.type === 'output_text')
        .map(c => c.text)
        .join('');
    }
    return '';
  }

  /**
   * Parse Codex CLI JSONL output
   */
  parseOutput(output) {
    const result = {
      text: '',
      functionCalls: []
    };

    const lines = output.split('\n').filter(l => l.trim());
    const textParts = [];

    for (const line of lines) {
      try {
        const event = JSON.parse(line);

        // Extract text from item.completed events with agent_message
        if (event.type === 'item.completed' && event.item?.type === 'agent_message' && event.item?.text) {
          textParts.push(event.item.text);
        }

        // Also check for reasoning items (optional, for transparency)
        // if (event.type === 'item.completed' && event.item?.type === 'reasoning' && event.item?.text) {
        //   textParts.push(`[Thinking: ${event.item.text}]`);
        // }

        // Look for function/tool calls
        if (event.type === 'function_call' || event.type === 'tool_call') {
          result.functionCalls.push({
            name: event.name || event.function?.name,
            arguments: event.arguments || event.function?.arguments || {}
          });
        }
      } catch (e) {
        // Not valid JSON line, could be plain text output
        if (line.trim() && !line.startsWith('{')) {
          textParts.push(line);
        }
      }
    }

    result.text = textParts.join('\n').trim();

    // If no text was extracted from JSON, use raw output
    if (!result.text && output.trim()) {
      result.text = output.trim();
    }

    // Also look for <tool_use> XML blocks in the text (same format as Claude)
    const toolUseRegex = /<tool_use>([\s\S]*?)<\/tool_use>/g;
    let match;
    while ((match = toolUseRegex.exec(result.text)) !== null) {
      try {
        const toolCall = JSON.parse(match[1].trim());
        result.functionCalls.push({
          name: toolCall.name,
          arguments: toolCall.parameters || toolCall.arguments || {}
        });
        // Remove the tool_use block from the text
        result.text = result.text.replace(match[0], '').trim();
      } catch (e) {
        console.warn(`[OpenAI] Failed to parse tool_use block: ${e.message}`);
      }
    }

    return result;
  }
}

export default OpenAIProvider;
