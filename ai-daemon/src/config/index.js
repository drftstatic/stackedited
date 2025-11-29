/**
 * Configuration Loader
 *
 * Loads configuration from:
 * 1. Default values
 * 2. ~/.stackedit-ai/agents.toml (if exists)
 * 3. Environment variables (highest priority)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import toml from 'toml';

const CONFIG_DIR = path.join(os.homedir(), '.stackedit-ai');
const AGENTS_FILE = path.join(CONFIG_DIR, 'agents.toml');

/**
 * Default agent configurations
 */
const DEFAULT_AGENTS = {
  claude: {
    name: 'Claude Opus 4.5',
    cli: 'claude',
    model: 'claude-opus-4-5-20251101',
    capabilities: ['editing', 'code', 'nuance', 'review', 'research'],
    enabled: true
  },
  gemini: {
    name: 'Gemini 3 Pro',
    cli: 'gemini',
    model: 'gemini-3-pro',
    capabilities: ['research', 'grounding', 'large-context', 'analysis'],
    enabled: true
  },
  codex: {
    name: 'GPT-5.1-Codex-Max',
    cli: 'codex',
    model: 'gpt-5.1-codex-max',
    capabilities: ['long-tasks', 'code', 'implementation', 'windows'],
    enabled: true
  }
};

/**
 * Load agents configuration
 */
export function loadAgentsConfig() {
  let agents = { ...DEFAULT_AGENTS };

  // Try to load from TOML file
  if (fs.existsSync(AGENTS_FILE)) {
    try {
      const content = fs.readFileSync(AGENTS_FILE, 'utf-8');
      const parsed = toml.parse(content);

      if (parsed.agents) {
        // Merge with defaults
        for (const [id, config] of Object.entries(parsed.agents)) {
          agents[id] = {
            ...agents[id],
            ...config
          };
        }
      }

      console.log(`Loaded agents config from ${AGENTS_FILE}`);
    } catch (err) {
      console.warn(`Failed to parse ${AGENTS_FILE}: ${err.message}`);
    }
  }

  // Environment overrides
  if (process.env.CLAUDE_CLI_PATH) {
    agents.claude.cli = process.env.CLAUDE_CLI_PATH;
  }
  if (process.env.CLAUDE_MODEL) {
    agents.claude.model = process.env.CLAUDE_MODEL;
  }
  if (process.env.CODEX_CLI_PATH) {
    agents.codex.cli = process.env.CODEX_CLI_PATH;
  }
  if (process.env.CODEX_MODEL) {
    agents.codex.model = process.env.CODEX_MODEL;
  }
  if (process.env.GEMINI_CLI_PATH) {
    agents.gemini.cli = process.env.GEMINI_CLI_PATH;
  }
  if (process.env.GEMINI_MODEL) {
    agents.gemini.model = process.env.GEMINI_MODEL;
  }

  return agents;
}

/**
 * Ensure config directory exists
 */
export function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    console.log(`Created config directory: ${CONFIG_DIR}`);
  }
}

/**
 * Create default agents.toml if it doesn't exist
 */
export function createDefaultAgentsFile() {
  ensureConfigDir();

  if (!fs.existsSync(AGENTS_FILE)) {
    const content = `# StackEdit AI Agents Configuration
# Customize AI providers and their capabilities

[agents.claude]
name = "Claude Opus 4.5"
cli = "claude"
model = "claude-opus-4-5-20251101"
capabilities = ["editing", "code", "nuance", "review", "research"]
enabled = true

[agents.gemini]
name = "Gemini 3 Pro"
cli = "gemini"
model = "gemini-3-pro"
capabilities = ["research", "grounding", "large-context", "analysis"]
enabled = true

[agents.codex]
name = "GPT-5.1-Codex-Max"
cli = "codex"
model = "gpt-5.1-codex-max"
capabilities = ["long-tasks", "code", "implementation", "windows"]
enabled = true
`;

    fs.writeFileSync(AGENTS_FILE, content);
    console.log(`Created default agents config: ${AGENTS_FILE}`);
  }
}

export default {
  loadAgentsConfig,
  ensureConfigDir,
  createDefaultAgentsFile,
  CONFIG_DIR,
  AGENTS_FILE
};
