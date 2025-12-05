# Z.AI DevPack Quick Implementation Guide

## TL;DR

Z.AI DevPack provides an Anthropic-compatible API endpoint that we can use with Claude CLI by setting environment variables. We can create a GLM provider that reuses 100% of ClaudeProvider code by just changing the `ANTHROPIC_BASE_URL` environment variable.

## Step 1: Validate (5 minutes)

Test if Claude CLI respects the `ANTHROPIC_BASE_URL` environment variable:

```bash
# Replace YOUR_ZAI_API_KEY with actual key from https://z.ai/
ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic \
ANTHROPIC_AUTH_TOKEN=YOUR_ZAI_API_KEY \
claude -p --model opus "Write a haiku about AI integration"
```

**Expected result:** Claude CLI should make API calls to Z.AI instead of Anthropic and return a response using GLM-4.6.

**If this works, proceed to Step 2. If not, see "Alternative Approach" below.**

## Step 2: Create GLM Provider (30 minutes)

### File: `/Volumes/mini.1tb/01-DEVELOPMENT/active/stackedited/ai-daemon/src/providers/glm.js`

```javascript
/**
 * GLM Provider (via Z.AI DevPack)
 *
 * Uses Z.AI's Anthropic-compatible API endpoint to access GLM-4.6 models
 * through the Claude CLI. This is a lightweight wrapper around ClaudeProvider
 * that only changes the API endpoint and authentication.
 */

import { spawn } from 'child_process';
import { BaseProvider } from './base.js';

export class GLMProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'glm',
      name: 'Z.AI GLM-4.6',
      cli: config.cli || 'claude',
      model: config.model || 'opus', // Maps to glm-4.6
      capabilities: ['editing', 'code', 'reasoning'],
      ...config
    });
    this.zaiApiKey = config.zaiApiKey;
  }

  async isAvailable() {
    if (!this.zaiApiKey) {
      console.log('[GLM] No API key configured');
      return false;
    }

    return new Promise((resolve) => {
      const proc = spawn(this.cli, ['--version'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      proc.on('close', (code) => resolve(code === 0));
      proc.on('error', () => resolve(false));

      setTimeout(() => {
        proc.kill();
        resolve(false);
      }, 5000);
    });
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

  /**
   * Parse GLM CLI output (same as Claude - Z.AI uses Anthropic-compatible format)
   */
  parseOutput(output) {
    const result = {
      text: '',
      functionCalls: []
    };

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
        console.log(`[GLM] Extracted tool call: ${toolCall.name}`);
      } catch (e) {
        console.warn(`[GLM] Failed to parse tool call: ${e.message}`);
      }
    }

    if (lastIndex < output.length) {
      textParts.push(output.slice(lastIndex));
    }

    if (result.functionCalls.length === 0) {
      result.text = output.trim();
    } else {
      result.text = textParts.join('').trim();
    }

    return result;
  }
}

export default GLMProvider;
```

## Step 3: Register Provider in Server (10 minutes)

### File: `/Volumes/mini.1tb/01-DEVELOPMENT/active/stackedited/ai-daemon/src/server.js`

Find the provider initialization section and add:

```javascript
import { GLMProvider } from './providers/glm.js';

// ... existing code ...

// Initialize GLM provider if configured
if (config.glm?.enabled && config.glm?.apiKey) {
  providers.glm = new GLMProvider({
    zaiApiKey: config.glm.apiKey,
    model: config.glm.model || 'opus'
  });
  console.log('[Server] GLM provider initialized');
} else {
  console.log('[Server] GLM provider not configured (missing API key or disabled)');
}
```

## Step 4: Add Configuration Support (15 minutes)

### Create sample config file if not exists:

```bash
# Create config directory if needed
mkdir -p /Volumes/mini.1tb/01-DEVELOPMENT/active/stackedited/ai-daemon/config

# Create sample config
cat > /Volumes/mini.1tb/01-DEVELOPMENT/active/stackedited/ai-daemon/config/local.json << 'EOF'
{
  "claude": {
    "enabled": true,
    "model": "opus"
  },
  "glm": {
    "enabled": true,
    "apiKey": "YOUR_ZAI_API_KEY_HERE",
    "model": "opus"
  },
  "gemini": {
    "enabled": false
  },
  "openai": {
    "enabled": false
  },
  "zai": {
    "enabled": false
  },
  "cursor": {
    "enabled": false
  },
  "composer": {
    "enabled": false
  }
}
EOF
```

### Instructions for user:
1. Get Z.AI API key from https://z.ai/ (API Keys page)
2. Replace `YOUR_ZAI_API_KEY_HERE` with actual key
3. Restart AI daemon

## Step 5: Update Frontend (20 minutes)

### File: `/Volumes/mini.1tb/01-DEVELOPMENT/active/stackedited/src/services/aiService.js`

Add GLM to mention mappings:

```javascript
const MENTION_TO_PROVIDER = {
  claude: 'claude',
  gemini: 'gemini',
  gpt: 'openai',
  openai: 'openai',
  zai: 'zai',
  glm: 'glm',      // Add this line
  grok: 'cursor',
  cursor: 'cursor',
  composer: 'composer',
  human: 'human',
  all: 'all',
};
```

### File: `/Volumes/mini.1tb/01-DEVELOPMENT/active/stackedited/src/components/AiProviderSelector.vue`

Find the provider list and add GLM entry (details depend on current implementation).

## Step 6: Test (30 minutes)

### Basic Test
```bash
# Start daemon
cd /Volumes/mini.1tb/01-DEVELOPMENT/active/stackedited/ai-daemon
node src/server.js

# In another terminal, start frontend
cd /Volumes/mini.1tb/01-DEVELOPMENT/active/stackedited
npm run dev
```

### Test Cases

1. **Basic Chat**
   - Open stackediTED
   - Select "Z.AI GLM-4.6" provider
   - Send: "Hello, can you write a haiku about integration?"
   - Verify: Response appears, streams correctly

2. **Document Editing**
   - Create document with text: "The quick brown fox"
   - Send: "Fix the typo in 'quick' to 'quik'"
   - Verify: suggestEdit tool call fires, edit applies

3. **Multi-Agent Mention**
   - Send: "@glm can you help me write a function?"
   - Verify: GLM provider is auto-selected

4. **Error Handling**
   - Set invalid API key
   - Send message
   - Verify: Clear error message appears

## Alternative Approach (If Step 1 Fails)

If Claude CLI doesn't respect `ANTHROPIC_BASE_URL`, we have two options:

### Option A: Use Z.AI's Python SDK

Install Z.AI SDK and create a Python wrapper script that the GLM provider calls instead of Claude CLI.

### Option B: Direct HTTP API Integration

Implement direct HTTP calls to `https://api.z.ai/api/anthropic` using the Anthropic API format.

```javascript
// Example HTTP integration (if needed)
import fetch from 'node-fetch';

async sendMessage(message, context, onChunk) {
  const response = await fetch('https://api.z.ai/api/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.zaiApiKey}`,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'glm-4.6',
      messages: [{ role: 'user', content: message }],
      system: this.buildSystemPrompt(context),
      max_tokens: 4096,
      stream: true
    })
  });

  // Handle streaming response...
}
```

## Pricing Information

Share this with users:

| Plan | Cost | Prompts per 5hrs | Estimated Monthly Cost |
|------|------|------------------|----------------------|
| Z.AI Lite | $3/month | ~120 prompts | $3 |
| Z.AI Pro | $15/month | ~600 prompts | $15 |
| Claude API | Variable | Unlimited | ~$15-50+ depending on usage |

**Note:** Each "prompt" allows 15-20 model calls (multi-turn conversation), so Lite plan = ~2,400 messages per 5 hours.

## Getting Z.AI API Key

1. Visit https://z.ai/
2. Sign up / Log in (same account as Z.AI chat)
3. Navigate to "API Keys" in settings
4. Click "Create API Key"
5. Copy key and paste into `config/local.json`

## Troubleshooting

### "GLM provider not configured"
- Check `ai-daemon/config/local.json` has `glm.enabled: true` and `glm.apiKey` set

### "Failed to spawn GLM CLI"
- Verify Claude CLI is installed: `which claude`
- Verify it's in PATH: `echo $PATH`

### "GLM CLI error: Unauthorized"
- API key is invalid or expired
- Get new key from https://z.ai/

### "GLM CLI timeout"
- Z.AI servers may be slow or down
- Try again in a few minutes
- Check Z.AI status page

### Responses seem wrong/truncated
- Z.AI quotas may be exhausted (resets every 5 hours)
- Upgrade to Pro plan for higher limits

## Next Steps After Basic Integration

1. **Add quota tracking UI** - show remaining prompts
2. **Add model selection** - let user choose glm-4.6 vs glm-4.5-air
3. **Add DevPack subscription check** - verify user has active subscription
4. **Add cost calculator** - estimate monthly cost based on usage
5. **Add fallback logic** - if quota exceeded, auto-switch to Claude

## Success Criteria

Integration is successful when:
- [ ] GLM provider appears in provider selector
- [ ] Can send chat messages and receive responses
- [ ] Document editing (suggestEdit) works
- [ ] Full document replacement (updateNotepad) works
- [ ] @glm mentions auto-select GLM provider
- [ ] Error messages are clear and actionable
- [ ] Performance is comparable to Claude

## Estimated Timeline

- **Validation (Step 1):** 5 minutes
- **Create provider (Step 2):** 30 minutes
- **Register provider (Step 3):** 10 minutes
- **Config support (Step 4):** 15 minutes
- **Frontend updates (Step 5):** 20 minutes
- **Testing (Step 6):** 30 minutes

**Total: ~2 hours** (vs 4 hours estimated in full analysis - this is optimistic path)

## Files to Modify

Summary of all files that need changes:

1. `/Volumes/mini.1tb/01-DEVELOPMENT/active/stackedited/ai-daemon/src/providers/glm.js` - NEW FILE
2. `/Volumes/mini.1tb/01-DEVELOPMENT/active/stackedited/ai-daemon/src/server.js` - ADD PROVIDER INIT
3. `/Volumes/mini.1tb/01-DEVELOPMENT/active/stackedited/ai-daemon/config/local.json` - ADD CONFIG
4. `/Volumes/mini.1tb/01-DEVELOPMENT/active/stackedited/src/services/aiService.js` - ADD MENTION
5. `/Volumes/mini.1tb/01-DEVELOPMENT/active/stackedited/src/components/AiProviderSelector.vue` - ADD UI

Ready to implement!
