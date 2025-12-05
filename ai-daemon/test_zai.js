#!/usr/bin/env node
/**
 * Test Z.AI Provider Integration
 *
 * Tests the Z.AI provider with the new CLI wrapper
 */

import { config } from 'dotenv';
import { ZAIProvider } from './src/providers/zai.js';

// Load .env file
config();

async function testZAI() {
  console.log('🧪 Testing Z.AI Provider Integration\n');

  // Check if API key is set
  if (!process.env.ZAI_API_KEY) {
    console.error('❌ Error: ZAI_API_KEY environment variable not set');
    console.log('\nSet it with:');
    console.log('  export ZAI_API_KEY=your_api_key_here');
    process.exit(1);
  }

  console.log('✓ API key found');

  // Initialize provider
  const provider = new ZAIProvider({
    apiKey: process.env.ZAI_API_KEY,
    model: 'glm-4.6'
  });

  console.log(`✓ Provider initialized: ${provider.name}`);
  console.log(`  Model: ${provider.model}`);
  console.log(`  CLI: ${provider.cli}`);

  // Test availability
  console.log('\n📋 Testing CLI availability...');
  const available = await provider.isAvailable();

  if (!available) {
    console.error('❌ Z.AI CLI not available');
    process.exit(1);
  }

  console.log('✓ CLI is available');

  // Test basic message (no tools)
  console.log('\n💬 Testing basic message...');
  console.log('Prompt: "Say hello in 10 words or less"\n');

  try {
    let streamedText = '';
    const result = await provider.sendMessage(
      'Say hello in 10 words or less',
      {
        currentContent: '',
        currentFile: { name: 'test.md', path: 'test.md' },
        vault: []
      },
      (chunk) => {
        process.stdout.write(chunk);
        streamedText += chunk;
      }
    );

    console.log('\n');
    console.log('✓ Basic message successful');
    console.log(`  Response length: ${result.text.length} chars`);
    console.log(`  Function calls: ${result.functionCalls.length}`);

    // Test with document editing (tool use)
    console.log('\n🛠️  Testing tool use...');
    console.log('Prompt: "Fix the typo: change teh to the"\n');

    const toolResult = await provider.sendMessage(
      'Fix the typo in this text: "teh cat"',
      {
        currentContent: 'teh cat',
        currentFile: { name: 'test.md', path: 'test.md' },
        vault: []
      },
      (chunk) => {
        process.stdout.write(chunk);
      }
    );

    console.log('\n');
    console.log('✓ Tool use test completed');
    console.log(`  Response length: ${toolResult.text.length} chars`);
    console.log(`  Function calls: ${toolResult.functionCalls.length}`);

    if (toolResult.functionCalls.length > 0) {
      console.log('\n  📞 Function calls detected:');
      toolResult.functionCalls.forEach((call, i) => {
        console.log(`    ${i + 1}. ${call.name}`);
        console.log(`       Arguments:`, JSON.stringify(call.arguments, null, 2).split('\n').map((line, idx) => idx === 0 ? line : '       ' + line).join('\n'));
      });
    }

    console.log('\n✅ All tests passed!');
    console.log('\nZ.AI provider is ready to use 🚀');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run tests
testZAI();
