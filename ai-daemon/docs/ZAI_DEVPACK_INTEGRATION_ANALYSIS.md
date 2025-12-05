# Z.AI DevPack Integration Analysis for stackediTED

## Executive Summary

**YES, this is possible and relatively straightforward.** Z.AI DevPack provides an Anthropic API-compatible endpoint that can be used as a drop-in replacement for Claude's API. We can create a "GLM via DevPack" provider that reuses our existing ClaudeProvider architecture with minimal modifications.

## How Z.AI DevPack Works

### Core Mechanism: API Endpoint Redirection

Z.AI DevPack works by providing an **Anthropic-compatible API endpoint** at `https://api.z.ai/api/anthropic`. This endpoint:

1. Accepts the same API format as Anthropic's Claude API
2. Translates requests to GLM model format internally
3. Returns responses in Anthropic-compatible format
4. Supports the same authentication pattern (Bearer token)

**Critical Insight:** It's not a local proxy - it's a **cloud-based API gateway** that provides protocol translation between Anthropic's API format and Z.AI's GLM models.

### Environment Variables for Claude Code

When using Z.AI DevPack with Claude Code CLI, these environment variables redirect API calls:

```bash
export ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
export ANTHROPIC_AUTH_TOKEN=YOUR_ZAI_API_KEY
export API_TIMEOUT_MS=3000000
```

The Claude CLI respects `ANTHROPIC_BASE_URL` and will send all API requests to that endpoint instead of Anthropic's servers.

### Model Mappings

Z.AI DevPack maps Anthropic model identifiers to GLM models:

| Claude Model Tier | GLM Model | Z.AI Model ID |
|------------------|-----------|---------------|
| `opus` | GLM-4.6 | `glm-4.6` |
| `sonnet` | GLM-4.6 | `glm-4.6` |
| `haiku` | GLM-4.5-Air | `glm-4.5-air` |

**Environment Variable Method:**
```json
{
  "env": {
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-4.6",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-4.6",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-4.5-air"
  }
}
```

This is set in `~/.claude/settings.json` for global configuration.

## Integration Strategy for stackediTED

### Option 1: Environment Variable Approach (RECOMMENDED)

**How it works:**
1. Set `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN` as environment variables when spawning the Claude CLI process
2. Claude CLI automatically redirects to Z.AI's API gateway
3. No code changes needed to ClaudeProvider except env vars

**Implementation:**

```javascript
// In ClaudeProvider.sendMessage()
const claude = spawn(this.cli, args, {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    // Z.AI DevPack redirection
    ANTHROPIC_BASE_URL: 'https://api.z.ai/api/anthropic',
    ANTHROPIC_AUTH_TOKEN: this.apiKey, // Z.AI API key
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
```

**Advantages:**
- Minimal code changes
- Reuses entire ClaudeProvider infrastructure
- Tool/function calling works identically (same XML format)
- Parsing logic unchanged
- Easy to toggle between Anthropic and Z.AI

**Disadvantages:**
- Relies on Claude CLI respecting `ANTHROPIC_BASE_URL` env var (need to verify)
- Less explicit than custom provider class

### Option 2: Create GLMProvider as ClaudeProvider Subclass

**How it works:**
1. Extend ClaudeProvider
2. Override only the environment variable setup
3. Keep all parsing, tool calls, and streaming logic

**Implementation:**

```javascript
// ai-daemon/src/providers/glm.js
import { ClaudeProvider } from './claude.js';

export class GLMProvider extends ClaudeProvider {
  constructor(config = {}) {
    super({
      id: 'glm',
      name: 'Z.AI GLM-4.6',
      cli: config.cli || 'claude',
      model: config.model || 'opus', // Uses opus tier → glm-4.6
      capabilities: ['editing', 'code', 'reasoning'],
      ...config
    });
    this.zaiApiKey = config.zaiApiKey;
  }

  async sendMessage(message, context, onChunk) {
    // Store original env setup
    const originalBuildEnv = this.buildEnv;

    // Override env to inject Z.AI configuration
    this.buildEnv = () => ({
      ...process.env,
      ANTHROPIC_BASE_URL: 'https://api.z.ai/api/anthropic',
      ANTHROPIC_AUTH_TOKEN: this.zaiApiKey,
      PATH: process.env.PATH || '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin',
      TERM: 'dumb',
      CI: 'true',
      FORCE_COLOR: '0',
      NO_COLOR: '1'
    });

    // Call parent implementation
    return super.sendMessage(message, context, onChunk);
  }
}
```

**Advantages:**
- More explicit about using Z.AI
- Cleaner separation of concerns
- Easier to add GLM-specific features later
- Can show "GLM-4.6" in UI instead of "Claude"

**Disadvantages:**
- Slightly more code
- Need to modify ClaudeProvider to externalize env building

### Option 3: Direct HTTP API Integration (NOT RECOMMENDED)

Create a provider that calls Z.AI's HTTP API directly without using Claude CLI.

**Why NOT recommended:**
- Requires reimplementing all Claude CLI behavior (streaming, tool calls, etc.)
- More maintenance burden
- Loses benefit of Claude CLI's built-in features
- Z.AI's Anthropic-compatible endpoint exists specifically to avoid this

## Configuration Requirements

### API Key Setup

Users need to:
1. Subscribe to Z.AI DevPack (Lite: $3/month, Pro: $15/month, Max: pricing TBD)
2. Login to Z.AI Open Platform: https://z.ai/
3. Navigate to API Keys management page
4. Create an API key
5. Add to stackediTED settings

### Settings Schema Addition

```json
{
  "zai": {
    "enabled": true,
    "apiKey": "YOUR_ZAI_API_KEY",
    "model": "glm-4.6"
  }
}
```

### UI Provider Selector

Add "Z.AI GLM-4.6" as a provider option alongside Claude, Gemini, GPT, etc.

## Verification Needed

Before implementation, we should verify:

1. **Does Claude CLI respect `ANTHROPIC_BASE_URL`?**
   - Test: `ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic ANTHROPIC_AUTH_TOKEN=<zai_key> claude -p "test"`
   - If this works, Option 1 is trivial

2. **Does Z.AI's endpoint support all Claude CLI features?**
   - Tool/function calling format (XML `<tool_use>` tags)
   - Streaming responses
   - System prompts
   - Conversation history

3. **Rate limits and quotas**
   - Lite: ~120 prompts per 5 hours
   - Pro: ~600 prompts per 5 hours
   - How does this translate to actual requests?

## Pricing Comparison

| Service | Cost/Month | Estimated Token Allowance |
|---------|-----------|---------------------------|
| Anthropic Claude API | Variable | Pay per token (~$15/1M tokens for Opus) |
| Z.AI DevPack Lite | $3 | ~120 prompts/5hrs (15-20 calls per prompt) |
| Z.AI DevPack Pro | $15 | ~600 prompts/5hrs |

**Note:** Z.AI quotes **~1% of standard API pricing**, making it significantly cheaper for high-volume use.

## Implementation Recommendation

**Recommended Approach: Option 1 (Environment Variable)**

1. **Phase 1: Quick Validation (30 minutes)**
   - Test Claude CLI with `ANTHROPIC_BASE_URL` environment variable
   - Verify tool calls work with Z.AI endpoint
   - Confirm streaming responses

2. **Phase 2: Create GLMProvider (2 hours)**
   - Extend ClaudeProvider with Z.AI-specific env vars
   - Add configuration UI in AiProviderSelector
   - Add API key input in settings
   - Test basic chat functionality

3. **Phase 3: Integration Testing (1 hour)**
   - Test document editing with suggestEdit
   - Test full document replacement with updateNotepad
   - Verify vault search and web search (if supported)
   - Test multi-agent handoffs (@glm mentions)

4. **Phase 4: Documentation (30 minutes)**
   - Add Z.AI setup instructions
   - Document API key creation process
   - Add pricing information
   - Create troubleshooting guide

**Total estimated time: 4 hours**

## Code Changes Required

### 1. Create GLM Provider (`ai-daemon/src/providers/glm.js`)

```javascript
import { ClaudeProvider } from './claude.js';

export class GLMProvider extends ClaudeProvider {
  constructor(config = {}) {
    super({
      id: 'glm',
      name: 'Z.AI GLM-4.6',
      cli: config.cli || 'claude',
      model: config.model || 'opus',
      capabilities: ['editing', 'code', 'reasoning'],
      ...config
    });
    this.zaiApiKey = config.zaiApiKey;
  }

  async sendMessage(message, context, onChunk) {
    console.log('[GLM] Sending message via Z.AI DevPack');
    const systemPrompt = this.buildSystemPrompt(context);

    return new Promise((resolve, reject) => {
      let fullPrompt = message;
      if (context.history?.length) {
        const historyText = context.history
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n\n');
        fullPrompt = `Previous conversation:\n${historyText}\n\nCurrent request: ${message}`;
      }

      const args = ['-p', '--model', this.model];
      if (systemPrompt) {
        args.push('--system-prompt', systemPrompt);
      }
      args.push(fullPrompt);

      console.log(`[GLM] Spawning Claude CLI with Z.AI endpoint`);

      const claude = spawn(this.cli, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Z.AI DevPack API redirection
          ANTHROPIC_BASE_URL: 'https://api.z.ai/api/anthropic',
          ANTHROPIC_AUTH_TOKEN: this.zaiApiKey,
          API_TIMEOUT_MS: '3000000',
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

      let output = '';
      let errorOutput = '';

      claude.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        if (onChunk) onChunk(chunk);
      });

      claude.stderr.on('data', (data) => {
        const stderr = data.toString();
        console.log(`[GLM] stderr: ${stderr}`);
        errorOutput += stderr;
      });

      claude.on('close', (code) => {
        console.log(`[GLM] Process closed with code: ${code}`);
        if (code !== 0 && errorOutput && !output) {
          reject(new Error(`GLM CLI error (code ${code}): ${errorOutput}`));
        } else {
          const result = this.parseOutput(output);
          resolve(result);
        }
      });

      claude.on('error', (err) => {
        reject(new Error(`Failed to spawn GLM CLI: ${err.message}`));
      });

      setTimeout(() => {
        claude.kill();
        reject(new Error('GLM CLI timeout after 5 minutes'));
      }, 300000);
    });
  }
}

export default GLMProvider;
```

### 2. Register Provider in Server (`ai-daemon/src/server.js`)

```javascript
import { GLMProvider } from './providers/glm.js';

// In server initialization
if (config.glm?.enabled) {
  providers.glm = new GLMProvider({
    zaiApiKey: config.glm.apiKey,
    model: config.glm.model || 'opus'
  });
}
```

### 3. Update Frontend Provider List (`src/services/aiService.js`)

```javascript
const MENTION_TO_PROVIDER = {
  claude: 'claude',
  gemini: 'gemini',
  gpt: 'openai',
  openai: 'openai',
  zai: 'zai',
  glm: 'glm',  // Add GLM DevPack
  grok: 'cursor',
  cursor: 'cursor',
  composer: 'composer',
  human: 'human',
  all: 'all',
};
```

### 4. Update Provider Selector UI (`src/components/AiProviderSelector.vue`)

Add GLM to the provider list with appropriate icon and description.

## Testing Plan

### 1. Basic Functionality
- [ ] Provider initializes successfully
- [ ] Can send simple chat message
- [ ] Receives streaming response
- [ ] Response appears in UI

### 2. Document Editing
- [ ] suggestEdit tool call works
- [ ] updateNotepad tool call works
- [ ] Edits apply to document correctly
- [ ] Authorship tracking works

### 3. Advanced Features
- [ ] Multi-turn conversation with history
- [ ] @glm mentions trigger provider
- [ ] Vault search (if supported by Z.AI)
- [ ] Web search (if supported by Z.AI)

### 4. Error Handling
- [ ] Invalid API key shows helpful error
- [ ] Network errors are handled gracefully
- [ ] Quota exceeded shows clear message
- [ ] Timeout handling works

## Risks and Limitations

### Technical Risks

1. **Claude CLI Environment Variable Support**
   - Risk: Claude CLI may not respect `ANTHROPIC_BASE_URL`
   - Mitigation: Test thoroughly before committing to this approach
   - Alternative: Direct HTTP API integration (more work)

2. **API Compatibility**
   - Risk: Z.AI's Anthropic-compatible endpoint may not support all features
   - Mitigation: Start with basic chat, add features incrementally
   - Impact: May need to disable certain features for GLM provider

3. **Quota Management**
   - Risk: Lite plan (~120 prompts/5hrs) may be insufficient for active use
   - Mitigation: Show quota warnings, allow provider switching
   - Impact: Users may need Pro plan for serious use

### Business/UX Risks

1. **User Confusion**
   - "Z.AI", "GLM", "DevPack" - multiple names for same thing
   - Mitigation: Consistent naming in UI ("Z.AI GLM-4.6")

2. **Setup Complexity**
   - Users need to subscribe AND get API key
   - Mitigation: Clear onboarding documentation

3. **Performance Expectations**
   - GLM-4.6 may perform differently than Claude
   - Mitigation: Set clear expectations in UI

## Next Steps

1. **Validation Testing (TODAY)**
   ```bash
   ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic \
   ANTHROPIC_AUTH_TOKEN=<user_zai_key> \
   claude -p "Write a haiku about coding"
   ```

2. **If validation passes, implement Option 1**
   - Create GLMProvider class
   - Add configuration UI
   - Test basic functionality

3. **If validation fails, investigate alternatives**
   - Direct HTTP API integration
   - Z.AI's Python SDK as subprocess
   - Custom GLM client implementation

## Resources

### Documentation
- [Z.AI DevPack Claude Code Integration](https://docs.z.ai/devpack/tool/claude)
- [Z.AI DevPack Overview](https://docs.z.ai/devpack/overview)
- [Z.AI API Reference](https://docs.z.ai/api-reference/introduction)
- [Z.AI Powered Claude Code (GitHub)](https://github.com/geoh/z.ai-powered-claude-code)

### Configuration Guides
- [Configure Z.ai with Claude Code: Complete Guide](https://ziyu4huang.github.io/blogs/posts/2025-10-04-configure-zai-claude-code/)
- [How to use Claude Code with z.ai GLM-4.6](https://aiengineerguide.com/blog/claude-code-z-ai-glm-4-6/)

### Community Resources
- [Z.AI Powered Claude Code Setup Script](https://github.com/barkleesanders/claude-zai-setup)
- [Using z.ai with Claude Code for Cheaper](https://hboon.com/using-z-ai-with-claude-code-for-cheaper/)

## Conclusion

**Integration is feasible and recommended.** The Z.AI DevPack provides an elegant solution for reducing API costs while maintaining compatibility with our existing Claude-based infrastructure. The implementation can be completed in approximately 4 hours with minimal risk, assuming the Claude CLI properly respects the `ANTHROPIC_BASE_URL` environment variable.

The key insight is that Z.AI has already done the hard work of creating an Anthropic-compatible API gateway, so we can leverage this infrastructure rather than building from scratch.

**Recommended first step:** Validate that Claude CLI respects `ANTHROPIC_BASE_URL` environment variable with a simple test command.
