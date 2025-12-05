#!/usr/bin/env node
/**
 * Z.AI CLI Wrapper
 *
 * A command-line interface for Z.AI's GLM models that follows
 * the same pattern as other AI CLI tools (claude, gemini, cursor-agent).
 *
 * Usage:
 *   zai-cli --print --model glm-4.6 --api-key <key> "Your prompt here"
 *   zai-cli --version
 *   zai-cli --help
 *
 * Environment Variables:
 *   ZAI_API_KEY - API key for Z.AI authentication
 *   ZAI_MODEL - Default model to use (default: glm-4.6)
 */

import { parseArgs } from 'node:util';
import { env, exit, stdout, stderr } from 'node:process';

const VERSION = '1.0.0';
const DEFAULT_MODEL = 'glm-4.6';
const API_ENDPOINT = 'https://api.z.ai/api/paas/v4/chat/completions';

/**
 * Parse command line arguments
 */
function parseArguments() {
  try {
    const { values, positionals } = parseArgs({
      options: {
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
        print: { type: 'boolean', short: 'p' },
        model: { type: 'string', short: 'm' },
        'api-key': { type: 'string' },
        'system-prompt': { type: 'string' },
        temperature: { type: 'string' },
        'max-tokens': { type: 'string' },
      },
      allowPositionals: true,
    });

    return {
      help: values.help,
      version: values.version,
      print: values.print,
      model: values.model || env.ZAI_MODEL || DEFAULT_MODEL,
      apiKey: values['api-key'] || env.ZAI_API_KEY,
      systemPrompt: values['system-prompt'],
      temperature: values.temperature ? parseFloat(values.temperature) : 0.7,
      maxTokens: values['max-tokens'] ? parseInt(values['max-tokens']) : undefined,
      prompt: positionals.join(' '),
    };
  } catch (error) {
    stderr.write(`Error parsing arguments: ${error.message}\n`);
    exit(1);
  }
}

/**
 * Show help message
 */
function showHelp() {
  stdout.write(`Z.AI CLI Wrapper v${VERSION}

Usage:
  zai-cli [options] <prompt>

Options:
  -h, --help              Show this help message
  -v, --version           Show version
  -p, --print             Print mode - output response and exit
  -m, --model <model>     Model to use (default: glm-4.6)
  --api-key <key>         Z.AI API key (or set ZAI_API_KEY env var)
  --system-prompt <text>  System prompt to prepend
  --temperature <num>     Sampling temperature 0-1 (default: 0.7)
  --max-tokens <num>      Maximum tokens to generate

Environment Variables:
  ZAI_API_KEY             Default API key
  ZAI_MODEL               Default model

Examples:
  zai-cli --print "Explain quantum computing"
  zai-cli --model glm-4.6 --system-prompt "You are a helpful assistant" "Write a poem"
  zai-cli --api-key sk-xxx "Hello, how are you?"
`);
}

/**
 * Show version
 */
function showVersion() {
  stdout.write(`zai-cli v${VERSION}\n`);
}

/**
 * Build tools array for function calling
 * These match the stackediTED document editing functions
 */
function buildTools() {
  return [
    {
      type: 'function',
      function: {
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
      }
    },
    {
      type: 'function',
      function: {
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
      }
    },
    {
      type: 'function',
      function: {
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
      }
    },
    {
      type: 'function',
      function: {
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
      }
    },
    {
      type: 'function',
      function: {
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
    }
  ];
}

/**
 * Send request to Z.AI API with streaming
 */
async function sendRequest(args) {
  const { apiKey, model, prompt, systemPrompt, temperature, maxTokens } = args;

  if (!apiKey) {
    stderr.write('Error: API key required. Set ZAI_API_KEY env var or use --api-key\n');
    exit(1);
  }

  if (!prompt) {
    stderr.write('Error: Prompt required\n');
    exit(1);
  }

  // Build messages array
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  // Build request body
  const requestBody = {
    model,
    messages,
    stream: true,
    temperature,
    tools: buildTools(),
    tool_choice: 'auto',
  };

  if (maxTokens) {
    requestBody.max_tokens = maxTokens;
  }

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'en-US,en',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      stderr.write(`API Error (${response.status}): ${errorText}\n`);
      exit(1);
    }

    // Handle streaming response
    const decoder = new TextDecoder();
    let buffer = '';
    let hasToolCalls = false;

    for await (const chunk of response.body) {
      const text = decoder.decode(chunk, { stream: true });
      buffer += text;

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;

        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const delta = data.choices[0]?.delta;

            // Handle text content
            if (delta?.content) {
              stdout.write(delta.content);
            }

            // Handle tool calls
            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                if (toolCall.function) {
                  hasToolCalls = true;

                  // Parse arguments (may be partial during streaming)
                  let args = {};
                  try {
                    if (toolCall.function.arguments) {
                      args = JSON.parse(toolCall.function.arguments);
                    }
                  } catch (e) {
                    // Arguments may be incomplete during streaming
                    continue;
                  }

                  // Output tool call in XML format (matching other providers)
                  const toolUse = {
                    name: toolCall.function.name,
                    parameters: args
                  };
                  stdout.write(`\n<tool_use>${JSON.stringify(toolUse)}</tool_use>\n`);
                }
              }
            }

            // Check for complete tool calls in finish_reason
            if (data.choices[0]?.finish_reason === 'tool_calls') {
              // Tool calls are complete
              hasToolCalls = true;
            }

          } catch (e) {
            stderr.write(`Warning: Failed to parse chunk: ${e.message}\n`);
          }
        }
      }
    }

    // Success
    exit(0);

  } catch (error) {
    stderr.write(`Request failed: ${error.message}\n`);
    exit(1);
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArguments();

  if (args.help) {
    showHelp();
    exit(0);
  }

  if (args.version) {
    showVersion();
    exit(0);
  }

  if (args.print) {
    await sendRequest(args);
  } else {
    stderr.write('Error: Currently only --print mode is supported\n');
    exit(1);
  }
}

// Run
main().catch((error) => {
  stderr.write(`Fatal error: ${error.message}\n`);
  exit(1);
});
