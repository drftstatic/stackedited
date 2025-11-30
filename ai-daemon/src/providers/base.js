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

    let prompt = `You are an AI writing assistant integrated into StackEdit, a markdown editor.
Today's date: ${today}

## Current Document
Name: "${context.currentFile?.name || 'Untitled'}"
Path: ${context.currentFile?.path || '(unsaved)'}

### Content
\`\`\`markdown
${context.currentContent || '(empty document)'}
\`\`\`

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

## IMPORTANT: How to Make Edits
When you want to edit the document, you MUST output your function call in this exact XML format:

<tool_use>{"name": "suggestEdit", "parameters": {"search": "exact text to find", "replace": "new text", "explanation": "why this change"}}</tool_use>

Or for full document replacement:
<tool_use>{"name": "updateNotepad", "parameters": {"content": "full new document content"}}</tool_use>

Always include explanation text BEFORE or AFTER your tool_use blocks. The user sees your conversational response AND the edit will be applied.`;

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
