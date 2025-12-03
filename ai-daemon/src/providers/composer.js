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
        try {
            console.log(`[Composer] Checking availability of ${this.cli}`);
            const process = spawn(this.cli, ['--help']);
            return new Promise((resolve) => {
                process.on('error', (err) => {
                    console.error(`[Composer] Availability check failed: ${err.message}`);
                    resolve(false);
                });
                process.on('close', (code) => {
                    console.log(`[Composer] Availability check exited with code ${code}`);
                    resolve(code === 0);
                });
            });
        } catch (e) {
            console.error(`[Composer] Availability check exception: ${e.message}`);
            return false;
        }
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
                if (code !== 0) {
                    if (fullText) {
                        console.warn(`[Composer] Process exited with code ${code} but returned text.`);
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
                console.log(`[Composer] Extracted tool call: ${toolCall.name}`);
            } catch (e) {
                console.warn(`[Composer] Failed to parse tool call: ${e.message}`);
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

export default ComposerProvider;
