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
            const args = ['--model', this.model, '--print', '--output-format', 'text'];

            if (this.apiKey) {
                args.push('--api-key', this.apiKey);
            }

            // Add prompt as positional argument
            args.push(fullPrompt);

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

            child.on('close', (code) => {
                if (code !== 0) {
                    if (fullText) {
                        console.warn(`[Composer] Process exited with code ${code} but returned text.`);
                    } else {
                        reject(new Error(`Cursor agent exited with code ${code}: ${errorText}`));
                        return;
                    }
                }

                resolve({
                    text: fullText,
                    functionCalls: []
                });
            });
        });
    }
}

export default ComposerProvider;
