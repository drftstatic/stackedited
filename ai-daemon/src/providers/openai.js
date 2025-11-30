/**
 * OpenAI Provider
 *
 * Adapter for OpenAI's CLI tool (chat.completions API).
 * Uses openai command with GPT-4 models.
 */

import { spawn } from 'child_process';
import { BaseProvider } from './base.js';

export class OpenAIProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'openai',
      name: 'GPT-4o',
      cli: config.cli || 'openai',
      model: config.model || 'gpt-4o',
      capabilities: ['editing', 'code', 'reasoning', 'analysis'],
      ...config
    });
  }

  /**
   * Check if OpenAI CLI is available
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
   * Send message to OpenAI CLI
   */
  async sendMessage(message, context, onChunk) {
    console.log('[OpenAI] sendMessage called');
    const systemPrompt = this.buildSystemPrompt(context);
    console.log(`[OpenAI] System prompt length: ${systemPrompt?.length || 0}`);

    return new Promise((resolve, reject) => {
      // Build the full prompt with conversation history
      let fullPrompt = message;
      if (context.history?.length) {
        const historyText = context.history
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n\n');
        fullPrompt = `Previous conversation:\n${historyText}\n\nCurrent request: ${message}`;
      }

      // Build CLI arguments for openai api chat.completions.create
      const args = [
        'api', 'chat.completions.create',
        '-m', this.model
      ];

      // Add system message if provided
      if (systemPrompt) {
        args.push('-g', 'system', systemPrompt);
      }

      // Add user message
      args.push('-g', 'user', fullPrompt);

      console.log(`[OpenAI] Spawning CLI: ${this.cli} with ${args.length} args`);
      console.log(`[OpenAI] Model: ${this.model}`);
      console.log(`[OpenAI] Working directory: ${process.cwd()}`);

      const openai = spawn(this.cli, args, {
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

      console.log(`[OpenAI] Process spawned with PID: ${openai.pid}`);

      let output = '';
      let errorOutput = '';

      openai.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        // OpenAI CLI outputs JSON, so we don't stream raw chunks
        // We'll extract the message content after completion
      });

      openai.stderr.on('data', (data) => {
        const stderr = data.toString();
        console.log(`[OpenAI] stderr: ${stderr}`);
        errorOutput += stderr;
      });

      openai.on('close', (code) => {
        console.log(`[OpenAI] Process closed with code: ${code}`);
        console.log(`[OpenAI] Output length: ${output.length}, Error length: ${errorOutput.length}`);
        if (code !== 0 && errorOutput && !output) {
          reject(new Error(`OpenAI CLI error (code ${code}): ${errorOutput}`));
        } else {
          const result = this.parseOutput(output);
          console.log(`[OpenAI] Parsed result: text length=${result.text?.length}, functionCalls=${result.functionCalls?.length}`);

          // Send the complete response as a chunk for UI update
          if (onChunk && result.text) {
            onChunk(result.text);
          }

          resolve(result);
        }
      });

      openai.on('error', (err) => {
        console.log(`[OpenAI] Spawn error: ${err.message}`);
        reject(new Error(`Failed to spawn OpenAI CLI: ${err.message}`));
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        openai.kill();
        reject(new Error('OpenAI CLI timeout after 5 minutes'));
      }, 300000);
    });
  }

  /**
   * Parse OpenAI CLI output (JSON response)
   */
  parseOutput(output) {
    const result = {
      text: '',
      functionCalls: []
    };

    try {
      // OpenAI CLI returns JSON response
      const response = JSON.parse(output);

      // Extract message content from choices
      if (response.choices && response.choices.length > 0) {
        const message = response.choices[0].message;
        if (message) {
          result.text = message.content || '';

          // Check for function/tool calls
          if (message.tool_calls) {
            for (const toolCall of message.tool_calls) {
              if (toolCall.function) {
                result.functionCalls.push({
                  name: toolCall.function.name,
                  arguments: JSON.parse(toolCall.function.arguments || '{}')
                });
              }
            }
          }

          // Legacy function_call format
          if (message.function_call) {
            result.functionCalls.push({
              name: message.function_call.name,
              arguments: JSON.parse(message.function_call.arguments || '{}')
            });
          }
        }
      }
    } catch (e) {
      // If JSON parsing fails, treat output as plain text
      console.warn(`[OpenAI] Failed to parse JSON response: ${e.message}`);
      result.text = output.trim();

      // Try to extract function calls from text
      const toolUseRegex = /<tool_use>([\s\S]*?)<\/tool_use>/g;
      let match;
      while ((match = toolUseRegex.exec(output)) !== null) {
        try {
          const toolCall = JSON.parse(match[1].trim());
          result.functionCalls.push({
            name: toolCall.name,
            arguments: toolCall.parameters || toolCall.arguments || {}
          });
          result.text = result.text.replace(match[0], '').trim();
        } catch (e) {
          // Skip invalid tool calls
        }
      }
    }

    return result;
  }
}

export default OpenAIProvider;
