#!/usr/bin/env node

/**
 * StackEdit AI Daemon
 *
 * Entry point for the AI daemon service.
 * Starts WebSocket server and routes to AI CLI tools.
 *
 * Usage:
 *   node index.js
 *   npm start
 *   npm run dev  (with --watch for development)
 */

import 'dotenv/config';
import { AIDaemonServer } from './src/server.js';

// Configuration from environment
const config = {
  port: parseInt(process.env.AI_DAEMON_PORT || '3001', 10),
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : '*',
  defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'claude',

  // Provider-specific config
  claude: {
    cli: process.env.CLAUDE_CLI_PATH || 'claude',
    model: process.env.CLAUDE_MODEL || 'opus'
  },
  openai: {
    cli: process.env.CODEX_CLI_PATH || 'codex',
    model: process.env.CODEX_MODEL || 'gpt-5-codex'
  },
  gemini: {
    cli: process.env.GEMINI_CLI_PATH || 'gemini',
    model: process.env.GEMINI_MODEL || 'gemini-3-pro-preview'
  },
  glm: {
    cli: 'claude', // Uses Claude CLI but with Z.AI proxy
    model: 'opus', // DevPack maps 'opus' to GLM-4.6
    apiKey: process.env.GLM_API_KEY
  },
  zai: {
    apiKey: process.env.ZAI_API_KEY,
    model: process.env.ZAI_MODEL || 'glm-4.6'
  },
  cursor: {
    cli: process.env.CURSOR_CLI_PATH || 'cursor-agent',
    model: process.env.CURSOR_MODEL || 'grok',
    apiKey: process.env.CURSOR_API_KEY
  },
  composer: {
    cli: process.env.COMPOSER_CLI_PATH || 'cursor-agent',
    model: process.env.COMPOSER_MODEL || 'composer-1',
    apiKey: process.env.CURSOR_API_KEY // Same key as cursor
  }
};

// Create and start server
const server = new AIDaemonServer(config);

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down...');
  await server.stop();
  process.exit(0);
});

// Start the server
console.log('StackEdit AI Daemon');
console.log('==================');
server.start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
