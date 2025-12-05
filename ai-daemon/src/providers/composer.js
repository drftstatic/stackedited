/**
 * Composer Provider
 *
 * Adapter for Cursor's Composer model (composer-1).
 * Uses cursor-agent CLI, same as Grok but with composer model.
 */

import { spawn } from 'child_process';
import { BaseProvider } from './base.js';

export class ComposerProvider extends BaseProvider {
    constructor(config = {}) {
        super({
            id: 'composer',
            name: 'Composer',
            cli: config.cli || 'cursor-agent',
            model: config.model || 'composer-1',
            capabilities: ['editing', 'code', 'reasoning', 'composition'],
            ...config
        });
        this.apiKey = config.apiKey;
    }

    /**
     * Check if Cursor CLI is available
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
     * Send message via Cursor CLI with composer-1 model
     */
    async sendMessage(message, context, onChunk) {
        console.log(`[Composer] Sending message to ${this.model}`);

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

            console.log(`[Composer] Executing: ${this.cli} ${args.slice(0, -1).join(' ')} "<prompt ${fullPrompt.length} chars>"`);
            const child = spawn(this.cli, args, {
                stdio: ['ignore', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    TERM: 'dumb',
                    CI: 'true',
                    FORCE_COLOR: '0',
                    NO_COLOR: '1'
                }
            });

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
                console.log(`[Composer] stderr: ${data}`);
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
                console.log(`[Composer] Process exited with code: ${code}`);
                console.log(`[Composer] Output length: ${fullText.length}`);
                console.log(`[Composer] Error output: ${errorText}`);

                if (code !== 0) {
                    if (fullText) {
                        console.warn(`[Composer] Exited with code ${code} but has output`);
                    } else {
                        reject(new Error(`cursor-agent exited with code ${code}: ${errorText}`));
                        return;
                    }
                }

                resolve(this.parseOutput(fullText));
            });
        });
    }

    /**
     * Parse Composer CLI output (same format as Gemini - looks for <tool_use> blocks)
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
                console.log(`[Composer] Extracted tool call: ${toolCall.name}`);
            } catch (e) {
                console.warn(`[Composer] Failed to parse tool call: ${e.message}`);
            }
        }

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
                        console.log(`[Composer] Extracted tool call from markdown: ${parsed.name}`);
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

export default ComposerProvider;
