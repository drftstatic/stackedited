# Z.AI Integration

This document describes the Z.AI provider integration for stackediTED, including the custom CLI wrapper and provider implementation.

## Overview

Z.AI (Chinese AI company) provides access to GLM models (GLM-4.6 and others). The integration follows the established CLI pattern used by other providers (Claude, Gemini, OpenAI, Cursor).

**Status**: ✅ Complete and ready to use

## Architecture

### Components

1. **`bin/zai-cli.js`** - CLI wrapper for Z.AI API
   - Handles HTTP requests to Z.AI's API
   - Streams responses to stdout
   - Converts function calls to `<tool_use>` XML format
   - Supports all stackediTED document editing functions

2. **`src/providers/zai.js`** - ZAIProvider class
   - Spawns zai-cli process
   - Parses tool calls from XML format
   - Follows BaseProvider interface

3. **`test_zai.js`** - Integration test suite
   - Tests CLI availability
   - Tests basic message sending
   - Tests tool/function calling

## Setup

### 1. Get API Key

1. Visit [Z.AI Platform](https://z.ai)
2. Register and top up credits
3. Generate an API key from the API Keys management page

### 2. Configure Environment

Add to `.env`:

```bash
# Z.AI Configuration
ZAI_API_KEY=your_api_key_here
ZAI_MODEL=glm-4.6
```

Or set environment variable:

```bash
export ZAI_API_KEY=your_api_key_here
```

### 3. Test Integration

```bash
cd ai-daemon
node test_zai.js
```

Expected output:
```
🧪 Testing Z.AI Provider Integration

✓ API key found
✓ Provider initialized: Z.AI
  Model: glm-4.6
  CLI: /path/to/zai-cli.js

📋 Testing CLI availability...
✓ CLI is available

💬 Testing basic message...
[streaming response...]

✅ All tests passed!
```

## CLI Wrapper Usage

### Direct CLI Usage

```bash
# Basic usage
node bin/zai-cli.js --print "Hello, how are you?"

# With model selection
node bin/zai-cli.js --print --model glm-4.6 "Explain quantum computing"

# With system prompt
node bin/zai-cli.js --print --system-prompt "You are a helpful assistant" "Write a poem"

# With API key override
node bin/zai-cli.js --print --api-key sk-xxx "Your prompt here"

# Help
node bin/zai-cli.js --help

# Version
node bin/zai-cli.js --version
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--print`, `-p` | Print mode - output and exit | Required |
| `--model`, `-m` | Model to use | `glm-4.6` or `ZAI_MODEL` |
| `--api-key` | API key | `ZAI_API_KEY` env var |
| `--system-prompt` | System prompt | None |
| `--temperature` | Sampling temperature (0-1) | `0.7` |
| `--max-tokens` | Maximum tokens | None |
| `--help`, `-h` | Show help | - |
| `--version`, `-v` | Show version | - |

## Function Calling

The CLI automatically includes stackediTED's document editing functions:

1. **`updateNotepad`** - Replace entire document content
2. **`suggestEdit`** - Make targeted edit to specific section
3. **`searchVault`** - Search across all documents
4. **`readDocument`** - Read specific document by path
5. **`webSearch`** - Search web for current information

### Tool Call Format

Function calls are output in XML format:

```xml
<tool_use>{"name": "suggestEdit", "parameters": {"search": "old text", "replace": "new text", "explanation": "why"}}</tool_use>
```

This format is parsed by the ZAIProvider and converted to function calls.

## Provider Configuration

### In Code

```javascript
import { ZAIProvider } from './src/providers/zai.js';

const provider = new ZAIProvider({
  apiKey: 'your_api_key',
  model: 'glm-4.6',
  cli: '/path/to/zai-cli.js' // Optional, defaults to bin/zai-cli.js
});
```

### Via Daemon Config

In `index.js`:

```javascript
const config = {
  zai: {
    apiKey: process.env.ZAI_API_KEY,
    model: process.env.ZAI_MODEL || 'glm-4.6'
  }
};
```

## Available Models

Z.AI offers several models:

| Model | Description | Best For |
|-------|-------------|----------|
| `glm-4.6` | Latest flagship model | Agent-oriented applications |
| `glm-4.5` | Previous flagship | General purpose |
| `glm-4-32B-0414-128K` | Large context | Long documents |
| `glm-4.5V` | Visual language model | Images + text |

**Default**: `glm-4.6` (optimized for agents)

## API Details

### Endpoint

```
https://api.z.ai/api/paas/v4/chat/completions
```

### Authentication

```
Authorization: Bearer YOUR_API_KEY
```

### Request Format

```json
{
  "model": "glm-4.6",
  "messages": [
    { "role": "system", "content": "System prompt" },
    { "role": "user", "content": "User message" }
  ],
  "stream": true,
  "temperature": 0.7,
  "tools": [...],
  "tool_choice": "auto"
}
```

### Response Format

Streaming SSE format:

```
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":" world"}}]}
data: [DONE]
```

With tool calls:

```
data: {"choices":[{"delta":{"tool_calls":[{"function":{"name":"suggestEdit","arguments":"{...}"}}]}}]}
```

## Capabilities

The ZAIProvider reports these capabilities:
- `editing` - Document editing and modification
- `code` - Code generation and review
- `reasoning` - Complex reasoning tasks

## Integration with stackediTED

### @mention Support

Users can mention Z.AI in chat:

```
@zai please fix the grammar in this document
```

Mention mapping (in `aiService.js`):
```javascript
zai: 'zai'
```

### Color Coding

Z.AI edits are highlighted in **Indigo** (`#6366F1`) in the editor.

### Provider Selection

Auto mode will select Z.AI for tasks matching its capabilities. Manual mode allows direct selection via the provider selector.

## Troubleshooting

### CLI Not Found

**Error**: `Failed to spawn Z.AI CLI: ENOENT`

**Solution**: Ensure `bin/zai-cli.js` exists and is executable:
```bash
chmod +x ai-daemon/bin/zai-cli.js
```

### API Key Missing

**Error**: `Error: API key required`

**Solution**: Set `ZAI_API_KEY` environment variable:
```bash
export ZAI_API_KEY=your_key_here
```

### Timeout

**Error**: `Z.AI CLI timeout after 5 minutes`

**Solution**: This is normal for very long responses. The timeout can be adjusted in `zai.js`:
```javascript
setTimeout(() => {
  zai.kill();
  reject(new Error('Z.AI CLI timeout after 5 minutes'));
}, 300000); // Adjust this value
```

### API Rate Limits

Z.AI may have rate limits based on your subscription. Check your account dashboard for limits.

### Function Calls Not Working

**Issue**: Tool calls aren't being detected

**Debug steps**:
1. Check CLI output format: `node bin/zai-cli.js --print "test"`
2. Verify `<tool_use>` XML blocks are present
3. Check ZAIProvider parsing logic
4. Enable debug logging in provider

## Development

### Testing CLI Directly

```bash
# Test basic output
echo 'test' | node bin/zai-cli.js --print "Say hello"

# Test with tools (should see <tool_use> blocks)
node bin/zai-cli.js --print --system-prompt "You can use tools to edit documents" "Fix this typo: teh cat"
```

### Debugging Provider

Add logging to `src/providers/zai.js`:

```javascript
console.log('[Z.AI] Full output:', output);
console.log('[Z.AI] Parsed result:', result);
```

### Running Full Integration Test

```bash
cd ai-daemon
ZAI_API_KEY=your_key node test_zai.js
```

## Comparison with Other Providers

| Feature | Claude | Gemini | OpenAI | Z.AI | Cursor | Composer |
|---------|--------|--------|--------|------|--------|----------|
| CLI Pattern | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Streaming | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Function Calls | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Custom CLI | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| API Direct | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

**Note**: Z.AI is unique in that we built a custom CLI wrapper since one doesn't exist officially.

## Future Improvements

Potential enhancements:
1. Add support for Z.AI's web search tool (native integration)
2. Add support for GLM-4.5V (visual model) for image understanding
3. Implement retry logic for rate limits
4. Add token usage tracking
5. Support for non-streaming mode
6. Better error messages for Chinese API errors
7. Caching layer for repeated requests

## Credits

- **Z.AI API**: [https://docs.z.ai](https://docs.z.ai)
- **Implementation**: Custom CLI wrapper following stackediTED's provider pattern
- **Integration**: Matches Claude, Gemini, OpenAI architecture

## See Also

- [Z.AI Documentation](https://docs.z.ai)
- [GLM Model Card](https://docs.z.ai/guides/models)
- [Function Calling Guide](https://docs.z.ai/guides/capabilities/function-calling)
- [stackediTED Provider Architecture](./README.md)
