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
    model: process.env.CLAUDE_MODEL || 'claude-opus-4-5-20251101'
  },
  openai: {
    cli: process.env.CODEX_CLI_PATH || 'codex',
    model: process.env.CODEX_MODEL || 'gpt-5-codex'
  },
  gemini: {
    cli: process.env.GEMINI_CLI_PATH || 'gemini',
    model: process.env.GEMINI_MODEL || 'gemini-3-pro-preview'
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
