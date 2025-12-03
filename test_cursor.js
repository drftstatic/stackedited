#!/usr/bin/env node

/**
 * Test script for Cursor providers
 * Connects to AI daemon and tests cursor/grok and composer providers
 */

import WebSocket from 'ws';

const PORT = process.env.AI_DAEMON_PORT || 3002;

console.log('Testing Cursor Providers...');
console.log('Connecting to AI daemon on port', PORT);

const ws = new WebSocket(`ws://localhost:${PORT}`);

ws.on('open', () => {
  console.log('Connected to AI daemon');

  // Test Cursor (Grok) provider
  console.log('\n--- Testing Cursor (Grok) Provider ---');
  ws.send(JSON.stringify({
    type: 'setProvider',
    providerId: 'cursor'
  }));

  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'chat',
      text: 'Hello, this is a test message from the Cursor provider. Please respond briefly.'
    }));
  }, 1000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());

    switch (message.type) {
      case 'connected':
        console.log('Daemon connected, providers:', message.providers.length);
        break;

      case 'providerChanged':
        console.log('Provider changed to:', message.providerId);
        break;

      case 'thinking':
        console.log('AI is thinking...');
        break;

      case 'chunk':
        process.stdout.write(message.text);
        break;

      case 'response':
        console.log('\nResponse received from', message.providerId);
        console.log('Full response:', message.text);
        break;

      case 'error':
        console.error('Error:', message.message);

        // If it's an error, close and exit
        ws.close();
        process.exit(1);
        break;

      case 'done':
        console.log('\n--- Test completed successfully ---');

        // Test Composer provider next
        console.log('\n--- Testing Composer Provider ---');
        ws.send(JSON.stringify({
          type: 'setProvider',
          providerId: 'composer'
        }));

        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'chat',
            text: 'Hello, this is a test message from the Composer provider. Please respond briefly.'
          }));
        }, 1000);
        break;

      default:
        console.log('Message type:', message.type, JSON.stringify(message).slice(0, 100) + '...');
    }
  } catch (e) {
    console.error('Failed to parse message:', e.message);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('Connection closed');
  process.exit(0);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.error('Test timed out after 30 seconds');
  ws.close();
  process.exit(1);
}, 30000);