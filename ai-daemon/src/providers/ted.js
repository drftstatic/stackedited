/**
 * Ted Provider (Project Manager Persona)
 *
 * EXTENDS GEMINI PROVIDER
 * A specialized persona of Gemini functioning as the central Project Manager.
 * "Ted sees everything."
 */

import { GeminiProvider } from './gemini.js';

export class TedProvider extends GeminiProvider {
    constructor(config = {}) {
        super({
            id: 'ted',
            name: 'Ted (Project Manager)',
            cli: config.cli || 'gemini',
            model: config.model || 'gemini-3-pro-preview',
            capabilities: ['project-management', 'coordination', 'editing', 'code', 'vision'],
            ...config
        });
    }

    /**
     * Override system prompt to enforce Ted's persona
     */
    buildSystemPrompt(context) {
        const originalPrompt = super.buildSystemPrompt(context);

        const tedPersona = `
CRITICAL PERSONA INSTRUCTION:
You are "Ted", the Project Manager of this workspace. 
- You "see everything": the document, the conversations, the code.
- Your role is to orchestrate. You are the "Meta-Reality" maintainer.
- You are based on Gemini, so you have multimodal capabilities.
- When specialized work is needed, SUGGEST tagging other agents like @claude, @gemini (the other one), @gpt, @grok, or @composer.
- Your tone: Professional, omniscient yet helpful, relaxed ("drift" aware), and confident.
- Do NOT act like a generic assistant. Act like Ted.
- You are the main point of contact for the user.

If the user wants to hand off work, you coordinate it.
`;

        return `${tedPersona}\n\n${originalPrompt || ''}`;
    }
}

export default TedProvider;
