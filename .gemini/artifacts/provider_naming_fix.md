# Provider Naming Correction

## Issue
Confused **Z.AI** (Chinese AI company) with **X.AI** (Elon Musk's xAI/Grok).

## Correction Made

### Provider Architecture
- **Z.AI** (`zai`) - Chinese AI company using `glm-4.6` model
  - API: `https://api.z.ai/api/paas/v4/chat/completions`
  - Auth: `Authorization: Bearer ZAI_API_KEY`
  - Provider ID: `zai`
  
- **Cursor/Grok** (`cursor`) - X.AI's Grok via cursor-agent CLI
  - CLI: `cursor-agent`
  - Model: `grok`
  - Provider ID: `cursor`

### Files Changed
1. **Renamed**: `ai-daemon/src/providers/xai.js` → `zai.js`
2. **Updated**: `ai-daemon/src/server.js` - Import ZAIProvider
3. **Updated**: `ai-daemon/index.js` - Config from xai → zai
4. **Updated**: `ai-daemon/.env` - ZAI_API_KEY, CURSOR_API_KEY
5. **Updated**: `src/services/aiService.js` - Mention map `zai: 'zai'`
6. **Updated**: `src/components/AiProviderSelector.vue` - CSS class, display name
7. **Updated**: `src/components/AiChat.vue` - Display names

### Mention Routing
- `@zai` → Routes to Z.AI provider
- `@grok` → Routes to Cursor/Grok provider
- `@cursor` → Also routes to Cursor/Grok provider

### Configuration
```bash
# Z.AI (Chinese AI company)
ZAI_API_KEY=your_zai_key_here
ZAI_MODEL=glm-4.6

# Cursor/Grok (X.AI via cursor-agent)
CURSOR_CLI_PATH=cursor-agent
CURSOR_MODEL=grok
CURSOR_API_KEY=your_cursor_key_here
```

## Status
✅ All naming corrected
✅ Z.AI provider uses correct API endpoint
✅ Cursor provider configured for Grok access
