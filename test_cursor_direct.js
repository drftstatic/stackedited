#!/usr/bin/env node

/**
 * Direct test of cursor-agent CLI
 */

import { spawn } from 'child_process';

console.log('Testing cursor-agent directly...');

const args = ['--model', 'grok', 'Hello from direct test. Please respond with just "OK".'];

console.log('Running:', 'cursor-agent', args.join(' '));

const child = spawn('cursor-agent', args);

let output = '';
let errorText = '';

child.stdout.on('data', (data) => {
  const text = data.toString();
  console.log('STDOUT:', text);
  output += text;
});

child.stderr.on('data', (data) => {
  const text = data.toString();
  console.log('STDERR:', text);
  errorText += text;
});

child.on('error', (error) => {
  console.error('Spawn error:', error.message);
});

child.on('close', (code) => {
  console.log('Exit code:', code);
  console.log('Output length:', output.length);
  console.log('Error length:', errorText.length);

  if (code !== 0) {
    console.error('Command failed with exit code', code);
    if (errorText) {
      console.error('Error output:', errorText);
    }
  } else {
    console.log('Command succeeded');
  }
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log('Timeout - killing process');
  child.kill();
}, 15000);