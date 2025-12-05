# Z.AI Quick Start Guide

**⏱️ 5 Minute Setup**

---

## 1. Get Your API Key

Visit: https://z.ai
1. Register account
2. Top up credits (¥50+ recommended)
3. Go to API Keys page
4. Generate new key

---

## 2. Add to Environment

```bash
cd ai-daemon
echo "ZAI_API_KEY=your_key_here" >> .env
```

Or export temporarily:
```bash
export ZAI_API_KEY=your_key_here
```

---

## 3. Test It Works

```bash
# Test CLI
node bin/zai-cli.js --version

# Test basic message
node bin/zai-cli.js --print "Say hello in 5 words"

# Run full integration test
node test_zai.js
```

Expected output:
```
✅ All tests passed!
Z.AI provider is ready to use 🚀
```

---

## 4. Start Using

```bash
# Terminal 1 - Start daemon
npm start

# Terminal 2 - Start app
cd ..
npm run serve
```

Then in the app:
```
@zai hello! analyze this code...
```

---

## That's It! 🎉

**Full docs**: See [ZAI_INTEGRATION.md](./ZAI_INTEGRATION.md)

---

## Quick Commands

```bash
# Check CLI version
node bin/zai-cli.js --version

# Test with system prompt
node bin/zai-cli.js --print --system-prompt "Be concise" "Explain AI"

# Test with different model
node bin/zai-cli.js --print --model glm-4.5 "Hello"

# See all options
node bin/zai-cli.js --help
```

---

## Troubleshooting

**Problem**: `Error: API key required`
**Fix**: Set `ZAI_API_KEY` in `.env` or environment

**Problem**: `CLI not found`
**Fix**: Run `chmod +x bin/zai-cli.js`

**Problem**: API errors
**Fix**: Check credit balance at z.ai dashboard

---

## Models Available

| Model | Description | Best For |
|-------|-------------|----------|
| `glm-4.6` | Latest flagship ⭐ | Agents, code |
| `glm-4.5` | Previous gen | General |
| `glm-4-32B-0414-128K` | Large context | Long docs |

Default: `glm-4.6`

---

## @Mention in Chat

```
@zai fix the typo in this document
@zai what's wrong with this code?
@zai search the vault for examples
```

Color: **Indigo** (#6366F1)

---

## Advanced: CLI Direct

```bash
# With custom parameters
node bin/zai-cli.js \
  --print \
  --model glm-4.6 \
  --temperature 0.9 \
  --max-tokens 2000 \
  --system-prompt "You are a code reviewer" \
  "Review this function for bugs"
```

---

## Support

- **Docs**: [Z.AI Documentation](https://docs.z.ai)
- **Integration**: See `ZAI_INTEGRATION.md`
- **Implementation**: See `ZAI_IMPLEMENTATION_SUMMARY.md`
- **Issues**: Test with `test_zai.js` first

---

**Ready to collaborate with the Chinese friends! 🇨🇳🤖**
