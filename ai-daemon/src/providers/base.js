/**
 * Base AI Provider - Abstract interface for AI CLI adapters
 *
 * All providers (Claude, Gemini, Codex) implement this interface
 * to enable unified routing and smart selection.
 */

export class BaseProvider {
  constructor(config = {}) {
    this.id = config.id || 'base';
    this.name = config.name || 'Base Provider';
    this.cli = config.cli || null;
    this.model = config.model || null;
    this.capabilities = config.capabilities || [];
    this.enabled = config.enabled !== false;

    // Function declarations for AI tool use
    this.functions = [
      {
        name: 'updateNotepad',
        description: 'Replace the entire document content. Use for major rewrites or restructuring.',
        parameters: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The complete new content for the document'
            }
          },
          required: ['content']
        }
      },
      {
        name: 'suggestEdit',
        description: 'Make a targeted edit to a specific section. Preferred for small, focused changes.',
        parameters: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'The exact text to find and replace (must exist in document)'
            },
            replace: {
              type: 'string',
              description: 'The new text to replace the search text with'
            },
            explanation: {
              type: 'string',
              description: 'Brief explanation of why this change improves the document'
            }
          },
          required: ['search', 'replace', 'explanation']
        }
      },
      {
        name: 'searchVault',
        description: 'Search across all documents in the workspace for relevant content.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to find in documents'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'readDocument',
        description: 'Read a specific document from the vault by its path.',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Document path (e.g., "folder/document.md")'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'webSearch',
        description: 'Search the web for current information. Use for research and grounding.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for web research'
            }
          },
          required: ['query']
        }
      }
    ];
  }

  /**
   * Build system prompt with document context
   */
  buildSystemPrompt(context) {
    const today = new Date().toISOString().split('T')[0];

    let prompt = `You are an AI writing assistant integrated into stackediTED - a collaborative markdown editor where multiple AI agents and humans work together on documents.

IMPORTANT: This is NOT regular StackEdit. This is stackediTED - a multi-agent collaborative workspace where:
- Multiple AI providers (Claude, Gemini, GPT, Z.AI, Grok, Composer) can work on the same document
- Humans collaborate with AI agents in real-time
- Every edit is tracked with authorship (who wrote what, when)
- Agents can communicate with each other using @mentions
- Visual color-coding shows which parts were written by which agent or human

Today's date: ${today}

## 🤝 Multi-Agent Collaboration (IMPORTANT!)

**You can @mention other AI agents in YOUR responses to automatically hand off the conversation to them.** When you include an @mention in your response, that agent will immediately receive the full conversation context and continue from where you left off.

**Available agents to collaborate with:**
- **@claude** - Best for creative writing, editing prose, and nuanced communication
- **@gemini** - Best for technical accuracy, code review, and structured analysis
- **@gpt** - Best for detailed examples, code generation, and expanding ideas
- **@grok** - Best for quick insights and alternative perspectives
- **@composer** - Best for composing longer content and synthesizing information
- **@human** - Request human approval or clarification (pauses in non-trust mode)

**When to use agent collaboration:**
1. **Get a second opinion**: "@gemini can you verify the technical accuracy of this code?"
2. **Leverage specialization**: "@claude please improve the writing style of this section"
3. **Expand on work**: "@gpt can you add 3 more examples to illustrate this concept?"
4. **Complex tasks**: Break down work across agents - one drafts, another reviews, another expands
5. **Human checkpoints**: "@human does this approach look good before I continue?"

**Examples of agent handoffs:**

*Example 1 - Technical Review:*
"I've drafted the authentication logic above. @gemini can you review this for security vulnerabilities and best practices?"

*Example 2 - Writing Improvement:*
"Here's the technical documentation. @claude please make the tone more conversational and add examples to make it easier to understand."

*Example 3 - Code Expansion:*
"I've created the basic function structure. @gpt please add comprehensive error handling and edge cases."

*Example 4 - Human Approval:*
"I'm about to refactor the entire database schema. @human should I proceed with this approach, or would you prefer a different strategy?"

**Remember:** When you @mention an agent, they see everything in this conversation - the document, the history, and your message. Use @mentions naturally in your responses to create a collaborative workflow!

## Current Document
Name: "${context.currentFile?.name || 'Untitled'}"
Path: ${context.currentFile?.path || '(unsaved)'}

### Content
${context.currentContent ? `\`\`\`markdown
${context.currentContent}
\`\`\`` : '(The document is currently empty or not yet loaded. If the user asks about content you cannot see, politely explain that you need them to open/create a document with content first.)'}

NOTE: You can ONLY edit the "Current Document" shown above. If you don't see document content, you cannot make edits - explain this to the user.

## Available Actions
You can respond conversationally OR use function calls to edit the document:

1. **suggestEdit** - For targeted changes to specific sections. Provide exact text to find and replacement.
2. **updateNotepad** - For major rewrites when the document needs significant restructuring.
3. **searchVault** - To find related content across all user documents.
4. **readDocument** - To read a specific document for context.
5. **webSearch** - To research current information from the web.

## Guidelines
- Prefer suggestEdit for small, focused changes (most common)
- Use updateNotepad only when significant restructuring is needed
- Always explain your edits conversationally
- Ask clarifying questions when the request is ambiguous
- Maintain the user's voice and style when editing
- When researching, cite your sources

## CRITICAL: How to Make Edits
When the user asks you to edit, fix, change, or update the document, you MUST use tool calls. DO NOT just describe what changes should be made - actually make them using the exact XML format below.

For targeted edits (preferred for most changes):
<tool_use>{"name": "suggestEdit", "parameters": {"search": "exact text to find", "replace": "new text", "explanation": "why this change"}}</tool_use>

For full document replacement (only when major restructuring needed):
<tool_use>{"name": "updateNotepad", "parameters": {"content": "full new document content"}}</tool_use>

IMPORTANT:
- You can include conversational text BEFORE or AFTER the <tool_use> block
- The user will see your explanation AND the edit will be applied automatically
- If you just describe changes without using <tool_use> tags, nothing will happen
- For search parameter: copy the EXACT text from the document (case-sensitive, including whitespace)

Example of correct response:
"I'll fix that typo for you.

<tool_use>{"name": "suggestEdit", "parameters": {"search": "teh", "replace": "the", "explanation": "Fixed typo"}}</tool_use>

Done!"`;

    // Add vault context if available
    if (context.vault?.length) {
      prompt += `\n\n## Workspace Overview
The user has ${context.vault.length} documents in their workspace:`;

      // List first 20 documents
      const docs = context.vault.slice(0, 20);
      for (const doc of docs) {
        prompt += `\n- ${doc.path || doc.name}`;
      }
      if (context.vault.length > 20) {
        prompt += `\n- ... and ${context.vault.length - 20} more`;
      }
    }

    return prompt;
  }

  /**
   * Check if CLI tool is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    throw new Error('isAvailable() must be implemented by subclass');
  }

  /**
   * Send message to AI and get response
   * @param {string} message - User message
   * @param {object} context - Document and vault context
   * @param {function} onChunk - Callback for streaming chunks
   * @returns {Promise<{text: string, functionCalls: array}>}
   */
  async sendMessage(message, context, onChunk) {
    throw new Error('sendMessage() must be implemented by subclass');
  }

  /**
   * Parse CLI output into standardized format
   * @param {string} output - Raw CLI output
   * @returns {{text: string, functionCalls: array}}
   */
  parseOutput(output) {
    // Default implementation - override in subclass for provider-specific parsing
    return {
      text: output,
      functionCalls: []
    };
  }

  /**
   * Get provider info for status reporting
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      model: this.model,
      capabilities: this.capabilities,
      enabled: this.enabled
    };
  }
}

export default BaseProvider;
