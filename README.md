# StackediTED

> **A Collaborative AI Workspace**  
> A remix of StackEdit transformed into a multi-agent workspace for creative collaboration between humans and AI.  
> **Developed by Fladry Creative** / [robb@fladrycreative.com](mailto:robb@fladrycreative.com)

---

## What is StackediTED?

StackediTED reimagines document editing as a **collaborative conversation** between you and multiple AI agents. Instead of a sidebar chat, the AI workspace sits alongside your editor in a **50/50 split layout**, creating a true collaborative environment.

### Core Features

🤖 **6 AI Providers Working Together**
- **Claude** (Anthropic) - Deep reasoning and analysis
- **Gemini** (Google) - Multimodal understanding
- **GPT** (OpenAI via Codex) - Code generation and optimization
- **Z.AI** - Chinese AI company (GLM models)
- **Grok** (X.AI via Cursor) - Real-time knowledge
- **Composer** (Cursor) - Agentic composition

💬 **@Mention System**
Direct messages to specific AI agents using mentions:
```
@claude analyze this code for security issues
@gpt optimize this function
@gemini explain this diagram
@composer write a REST API
@grok what's happening in AI news?
```

🔗 **Agent-to-Agent Chaining** (Max 3 Hops)
AI agents can collaborate autonomously by mentioning each other:
```
Human: @claude write a sort algorithm
Claude: Here's quicksort... @gpt can you optimize?
GPT: Using timsort... @gemini verify complexity?
Gemini: O(n log n) is correct... @human approve?
```

🔒 **Trust Mode**
- **Trust OFF** (default): Conversation pauses when AI mentions `@human`, awaiting your approval
- **Trust ON**: AI agents continue autonomously, only notifying you with `@human` mentions

📝 **Document-Aware AI**
- Your entire vault is synced to the AI daemon
- Agents can reference other documents, search your vault, and suggest edits
- Real-time document context for all conversations

---

## Architecture

### Frontend (Vue 2)
- **Editor**: Markdown editor with live preview
- **AI Chat Panel**: 50/50 split layout with resizable divider
- **Vuex State**: Manages chat history, provider state, and chaining logic

### Backend (AI Daemon)
- **WebSocket Server**: Real-time bidirectional communication
- **Provider Adapters**: CLI wrappers for Claude, Gemini, GPT, Cursor
- **API Integration**: Direct API calls for Z.AI
- **Smart Routing**: Auto-selects best provider or routes via @mentions
- **Vault Service**: Caches and indexes your documents for AI context

### Provider Colors
| Provider | Color | Hex |
|----------|-------|-----|
| Claude | Purple | #9D4EDD |
| Gemini | Teal | #2DD4BF |
| GPT | Coral | #FF6B6B |
| Z.AI | Amber | #F59E0B |
| Grok | Lime | #84CC16 |
| Composer | Indigo | #6366F1 |

---

## Installation & Setup

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install AI daemon dependencies
cd ai-daemon
npm install
cd ..
```

### 2. Configure AI Providers

Copy the example environment file:
```bash
cp ai-daemon/.env.example ai-daemon/.env
```

Edit `ai-daemon/.env` with your credentials:

```bash
# Claude (Anthropic CLI)
CLAUDE_CLI_PATH=claude
CLAUDE_MODEL=claude-opus-4-5-20251101

# Gemini (Google CLI)
GEMINI_CLI_PATH=gemini
GEMINI_MODEL=gemini-3-pro-preview

# OpenAI (Codex CLI)
CODEX_CLI_PATH=codex
CODEX_MODEL=gpt-5-codex

# Z.AI (API Key)
ZAI_API_KEY=your_zai_api_key_here
ZAI_MODEL=glm-4.6

# Cursor (Subscription - runs both Grok and Composer)
CURSOR_API_KEY=your_cursor_api_key_here
CURSOR_MODEL=grok
COMPOSER_MODEL=composer-1
```

### 3. Install CLI Tools

You'll need the CLI tools for the providers you want to use:

```bash
# Claude
brew install anthropics/claude/claude

# Gemini
npm install -g @google-ai/generativelanguage

# Codex (OpenAI)
npm install -g codex

# Cursor (for Grok and Composer)
# Install from https://cursor.sh
```

### 4. Run the Application

**Terminal 1 - Start AI Daemon:**
```bash
cd ai-daemon
npm start
# Or in dev mode with auto-reload:
npm run dev
```

**Terminal 2 - Start Frontend:**
```bash
npm start
```

Open http://localhost:8080 in your browser.

---

## Usage Examples

### Basic Mentioning
```
@claude review this markdown document
→ Routes to Claude

@gpt refactor this code to be more functional
→ Routes to GPT
```

### Agent Chaining
```
Human: @claude design a user authentication API
Claude: Here's the design... @gpt implement it?
[Auto-routes to GPT]
GPT: Here's the code... @gemini review security?
[Auto-routes to Gemini]
Gemini: Security looks good... @human deploy?
[Pauses if Trust Mode is OFF]
```

### Trust Mode
Toggle the **TRUST** button in the AI panel:
- 🔒 **Locked** = Pauses on `@human` mentions
- 🔓 **Unlocked** = Continues autonomously

---

## Development

### Project Structure
```
stackedited/
├── src/                      # Frontend Vue application
│   ├── components/           # UI components
│   │   ├── AiChat.vue       # AI chat panel
│   │   ├── AiProviderSelector.vue  # Provider buttons
│   │   └── Layout.vue       # 50/50 split layout
│   ├── services/
│   │   └── aiService.js     # WebSocket client
│   └── store/
│       └── aiChat.js        # Vuex state management
│
├── ai-daemon/                # AI daemon server
│   ├── src/
│   │   ├── server.js        # WebSocket server + routing
│   │   ├── providers/       # Provider adapters
│   │   │   ├── claude.js
│   │   │   ├── gemini.js
│   │   │   ├── openai.js
│   │   │   ├── zai.js
│   │   │   ├── cursor.js
│   │   │   └── composer.js
│   │   └── services/
│   │       └── vaultService.js  # Document indexing
│   └── index.js
```

### Build for Production

```bash
# Build frontend
npm run build

# The AI daemon runs as-is with:
cd ai-daemon
npm start
```

### Running Tests

```bash
# Frontend tests
npm test

# Linting
npm run lint
```

---

## Roadmap

- [ ] **Function Calling**: Let AI agents edit files directly
- [ ] **Vision Support**: Upload images for Gemini/GPT-4V analysis
- [ ] **Custom Providers**: Plugin system for new AI providers
- [ ] **Team Collaboration**: Multi-user editing with shared AI context
- [ ] **Streaming Improvements**: Better UX for long responses
- [ ] **Mobile Support**: Responsive layout for tablets/phones

---

## Credits

Built on top of [StackEdit](https://stackedit.io/) by [Benoit Schweblin](https://github.com/benweet).

**Remixed with 💜 by Fladry Creative**
- Email: [robb@fladrycreative.com](mailto:robb@fladrycreative.com)
- Design Philosophy: "Controlled Drift" — Machine/human interface at the edge of perception

---

## License

Apache 2.0 (same as original StackEdit)

---

## Contributing

This is a creative experiment. If you want to contribute or have ideas, reach out!

**Key areas for contribution:**
- New AI provider integrations
- UI/UX improvements
- Performance optimizations
- Documentation

---

## FAQ

**Q: Why so many AI providers?**  
A: Different AIs have different strengths. Claude excels at reasoning, GPT at code, Gemini at multimodal tasks. Let them collaborate!

**Q: What's the "controlled drift" philosophy?**  
A: AI agents can autonomously collaborate (drift), but with safety limits (controlled). Max 3 hops, Trust Mode, and @human pauses keep things from going off the rails.

**Q: Does this cost a lot to run?**  
A: Depends on your usage. Most providers are CLI-based and use your existing API keys. Cursor runs on a subscription, not per-call billing.

**Q: Can I use this offline?**  
A: The editor works offline, but AI features require internet and running providers.

---

**Built for creators who want AI as a true collaborator, not just a tool.** 🚀
