#!/usr/bin/env node
/**
 * Test GLM Provider Integration (Z.AI DevPack)
 *
 * Tests the GLM provider which uses Claude CLI with Z.AI DevPack proxy
 */

import { config } from 'dotenv';
import { GLMProvider } from './src/providers/glm.js';

// Load .env file
config();

async function testGLM() {
  console.log('🧪 Testing GLM Provider Integration (Z.AI DevPack)\n');

  // Check if API key is set
  if (!process.env.GLM_API_KEY) {
    console.error('❌ Error: GLM_API_KEY environment variable not set');
    console.log('\nSet it in .env file:');
    console.log('  GLM_API_KEY=your_zai_api_key_here');
    process.exit(1);
  }

  console.log('✓ API key found');

  // Initialize provider
  const provider = new GLMProvider({
    apiKey: process.env.GLM_API_KEY,
    model: 'opus' // DevPack maps opus to GLM-4.6
  });

  console.log(`✓ Provider initialized: ${provider.name}`);
  console.log(`  Model: ${provider.model}`);
  console.log(`  CLI: ${provider.cli}`);

  // Test availability
  console.log('\n📋 Testing CLI availability...');
  const available = await provider.isAvailable();

  if (!available) {
    console.error('❌ Claude CLI not available (required for GLM DevPack)');
    console.log('\nInstall Claude CLI:');
    console.log('  brew install anthropics/claude/claude');
    process.exit(1);
  }

  console.log('✓ Claude CLI is available');

  // Test basic message
  console.log('\n💬 Testing basic message via DevPack...');
  console.log('Prompt: "Write a haiku about AI coding"\n');

  try {
    let streamedText = '';
    const result = await provider.sendMessage(
      'Write a haiku about AI coding',
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
    console.log('\n🛠️  Testing tool use via DevPack...');
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
    console.log('\nGLM provider (via Z.AI DevPack) is ready to use 🚀');
    console.log('\n💰 Cost: ~$3/month for DevPack subscription vs $15-50+/month for Claude API');

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
testGLM();
