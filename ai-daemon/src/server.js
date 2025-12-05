/**
 * AI Daemon Server
 *
 * WebSocket server that handles:
 * - Chat sessions with AI providers
 * - Vault synchronization
 * - Smart provider routing
 * - Function call execution
 */

import { WebSocketServer } from 'ws';
import express from 'express';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';

import { ClaudeProvider } from './providers/claude.js';
import { TedProvider } from './providers/ted.js';
import { GeminiProvider } from './providers/gemini.js';
import { OpenAIProvider } from './providers/openai.js';
import { GLMProvider } from './providers/glm.js';
// import { ZAIProvider } from './providers/zai.js'; // Disabled - DevPack subscription not compatible with direct API
import { CursorProvider } from './providers/cursor.js';
import { ComposerProvider } from './providers/composer.js';
import { VaultService } from './services/vaultService.js';
import { CapabilityMatcher } from './services/capabilityMatcher.js';

export class AIDaemonServer {
  constructor(config = {}) {
    this.config = {
      port: config.port || 3001,
      allowedOrigins: config.allowedOrigins || '*',
      defaultProvider: config.defaultProvider || 'claude',
      ...config
    };

    // Initialize Express app
    this.app = express();
    this.server = http.createServer(this.app);

    // Initialize WebSocket server
    this.wss = new WebSocketServer({ server: this.server });

    // Session management
    this.sessions = new Map(); // sessionId -> session

    // Vault service for document cache
    this.vault = new VaultService();

    // Initialize providers
    this.providers = [
      new ClaudeProvider(config.claude || {}),
      new GeminiProvider(config.gemini || {}),
      new TedProvider(config.ted || config.gemini || {}), // Ted shares Gemini config
      new OpenAIProvider(config.openai || {}),
      new GLMProvider(config.glm || {}),
      // new ZAIProvider(config.zai || {}), // Disabled - DevPack subscription works via Claude Code proxy
      new CursorProvider(config.cursor || {}),
      new ComposerProvider(config.composer || {})
    ];

    // Smart routing
    this.matcher = new CapabilityMatcher(this.providers);

    // Setup handlers
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  setupMiddleware() {
    this.app.use(express.json({ limit: '10mb' }));

    // CORS
    this.app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (this.config.allowedOrigins === '*' ||
        this.config.allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin || '*');
      }
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        sessions: this.sessions.size,
        vault: this.vault.getStats()
      });
    });

    // Provider status
    this.app.get('/providers', async (req, res) => {
      const status = [];
      for (const provider of this.providers) {
        const available = await provider.isAvailable();
        status.push({
          ...provider.getInfo(),
          available
        });
      }
      res.json(status);
    });

    // Vault sync endpoint (REST fallback)
    this.app.post('/vault/sync', (req, res) => {
      const result = this.vault.sync(req.body.documents || []);
      res.json({ success: true, ...result });
    });

    // Search vault (REST)
    this.app.get('/vault/search', (req, res) => {
      const query = req.query.q;
      if (!query) {
        return res.status(400).json({ error: 'Missing query parameter: q' });
      }
      const results = this.vault.search(query);
      res.json(results);
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const sessionId = uuidv4();

      // Create session
      const session = {
        id: sessionId,
        ws,
        mode: 'auto', // auto, manual
        providerId: this.config.defaultProvider,
        context: {
          currentFile: null,
          currentContent: '',
          history: []
        },
        createdAt: Date.now()
      };

      this.sessions.set(sessionId, session);
      console.log(`[Session ${sessionId.slice(0, 8)}] Connected`);

      // Send welcome message with provider availability
      this.getProvidersWithStatus().then(providers => {
        this.send(ws, {
          type: 'connected',
          sessionId,
          mode: session.mode,
          providerId: session.providerId,
          providers
        });
      });

      // Handle messages
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(session, message);
        } catch (error) {
          console.error(`[Session ${sessionId.slice(0, 8)}] Error:`, error.message);
          this.send(ws, {
            type: 'error',
            message: error.message
          });
        }
      });

      ws.on('close', () => {
        console.log(`[Session ${sessionId.slice(0, 8)}] Disconnected`);
        this.sessions.delete(sessionId);
      });

      ws.on('error', (error) => {
        console.error(`[Session ${sessionId.slice(0, 8)}] WebSocket error:`, error.message);
      });
    });
  }

  async handleMessage(session, message) {
    console.log(`[Session ${session.id.slice(0, 8)}] Received message type: ${message.type}`);

    switch (message.type) {
      case 'chat':
        console.log(`[Session ${session.id.slice(0, 8)}] Chat message: "${message.text?.slice(0, 50)}..."`);
        await this.handleChat(session, message);
        break;

      case 'setMode':
        session.mode = message.mode || 'auto';
        this.send(session.ws, {
          type: 'modeChanged',
          mode: session.mode
        });
        break;

      case 'setProvider':
        if (this.providers.find(p => p.id === message.providerId)) {
          session.providerId = message.providerId;
          session.mode = 'manual'; // Set mode to manual when user explicitly selects provider
          this.send(session.ws, {
            type: 'providerChanged',
            providerId: session.providerId
          });
        } else {
          this.send(session.ws, {
            type: 'error',
            message: `Unknown provider: ${message.providerId}`
          });
        }
        break;

      case 'updateContext':
        session.context = {
          ...session.context,
          ...message.context
        };
        break;

      case 'vaultUpdate':
        console.log(`[Session ${session.id.slice(0, 8)}] Vault update received with ${message.documents?.length || 0} documents`);
        const result = this.vault.sync(message.documents || []);
        console.log(`[Session ${session.id.slice(0, 8)}] Vault synced: ${result.count} documents, ${result.added} added, ${result.updated} updated, ${result.removed} removed`);
        this.send(session.ws, {
          type: 'vaultSynced',
          ...result
        });
        break;

      case 'getSuggestions':
        const suggestions = await this.matcher.getSuggestions(message.text || '');
        this.send(session.ws, {
          type: 'suggestions',
          providers: suggestions
        });
        break;

      case 'clearHistory':
        session.context.history = [];
        this.send(session.ws, {
          type: 'historyCleared'
        });
        break;

      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  async handleChat(session, message, options = {}) {
    const text = message.text;
    const { mentions, targetProvider, hasHumanMention, trustMode } = message;
    const { hopCount = 0, providerChain = [] } = options;

    console.log(`[Chat] Starting chat handler for: "${text?.slice(0, 50)}..." (Hop: ${hopCount}, Chain: ${providerChain.join(' -> ')})`);

    // Allow empty text if it's a chain (responding to history)
    if (!text?.trim() && hopCount === 0) {
      console.log('[Chat] Empty message, rejecting');
      return this.send(session.ws, {
        type: 'error',
        message: 'Empty message'
      });
    }

    // Signal thinking
    console.log('[Chat] Sending thinking signal');
    this.send(session.ws, { type: 'thinking' });

    try {
      // Select provider based on @mention or mode
      let provider, selection;

      // Priority: options.targetProvider > @mention > manual mode > auto mode
      const explicitProvider = options.targetProvider || targetProvider;

      if (explicitProvider) {
        console.log(`[Chat] Using target provider: ${explicitProvider}`);
        const result = await this.matcher.selectManual(explicitProvider);
        provider = result.provider;
        selection = result.selection;
        // Update session provider to match mention
        session.providerId = explicitProvider;
      } else if (session.mode === 'auto') {
        console.log(`[Chat] Auto-selecting provider`);
        const result = await this.matcher.selectBest(text || session.context.history[session.context.history.length - 1]?.content || '');
        provider = result.provider;
        selection = result.selection;
      } else {
        console.log(`[Chat] Using manual provider: ${session.providerId}`);
        const result = await this.matcher.selectManual(session.providerId);
        provider = result.provider;
        selection = result.selection;
      }

      // Add current provider to chain
      const currentChain = [...providerChain, provider.id];

      // Send provider selection info
      console.log(`[Chat] Provider selected: ${provider?.id}, sending selection info`);
      this.send(session.ws, {
        type: 'providerSelected',
        ...selection
      });

      // Build context WITHOUT the entire vault
      // AI only sees the current document, not the entire drive
      console.log('[Chat] Building context (current document only)');
      const context = {
        ...session.context,
        vault: this.vault.getAllDocuments()
      };

      // Add user message to history ONLY if it's the first hop (user input)
      if (text && hopCount === 0) {
        session.context.history.push({
          role: 'user',
          content: text
        });
      }

      // Send message to AI
      // If chaining, we send the last message from history as the "prompt" 
      // or just an empty string if the provider supports reading history directly.
      // Most providers need a "prompt". We'll use the last message content.
      const prompt = text || session.context.history[session.context.history.length - 1]?.content || 'Continue';

      console.log(`[Chat] Calling provider.sendMessage() with message length: ${prompt.length}`);
      const response = await provider.sendMessage(
        prompt,
        context,
        // Streaming callback
        (chunk) => {
          this.send(session.ws, {
            type: 'chunk',
            text: chunk,
            providerId: provider.id
          });
        }
      );

      // Handle function calls
      if (response.functionCalls?.length) {
        for (const call of response.functionCalls) {
          const result = await this.executeFunction(call, session);
          this.send(session.ws, {
            type: 'functionCall',
            function: call.name,
            arguments: call.arguments,
            result,
            providerId: provider.id
          });
        }
      }

      // Send text response
      if (response.text) {
        session.context.history.push({
          role: 'assistant',
          content: response.text,
          providerId: provider.id
        });

        this.send(session.ws, {
          type: 'response',
          text: response.text,
          providerId: provider.id
        });

        // Check for @human mention to pause
        if (response.text.includes('@human')) {
          if (!trustMode) {
            console.log('[Chat] @human mentioned and Trust Mode is OFF. Pausing.');
            this.send(session.ws, { type: 'awaitingHuman' });
            return; // Stop chaining
          }
        }

        // CHAINING LOGIC
        // Increased limit to 10 hops for productive collaboration
        // Add loop detection to prevent same agent being called consecutively
        if (hopCount < 10) {
          const mentionMap = {
            'claude': 'claude',
            'gemini': 'gemini',
            'gpt': 'openai',
            'openai': 'openai',
            'zai': 'glm',
            'glm': 'glm',
            'grok': 'cursor',
            'cursor': 'cursor',
            'composer': 'composer'
          };

          const mentionRegex = /@(\w+)/i;
          const match = response.text.match(mentionRegex);

          if (match) {
            const mentionedName = match[1].toLowerCase();
            const nextProviderId = mentionMap[mentionedName];

            // Prevent same agent from being called twice in a row (loop detection)
            if (nextProviderId && nextProviderId !== 'human') {
              // Check if this would create an immediate loop (same agent twice in a row)
              const lastProvider = currentChain[currentChain.length - 1];
              if (nextProviderId === lastProvider) {
                console.log(`[Chat] Prevented immediate loop: ${provider.id} tried to tag itself`);
                this.send(session.ws, { type: 'done' });
                return;
              }

              // Check for oscillation (A->B->A->B pattern)
              if (currentChain.length >= 2) {
                const secondLast = currentChain[currentChain.length - 2];
                if (nextProviderId === secondLast) {
                  console.log(`[Chat] Prevented oscillation: ${currentChain.slice(-2).join('<->')} pattern detected`);
                  this.send(session.ws, { type: 'done' });
                  return;
                }
              }

              console.log(`[Chat] Chaining to ${nextProviderId} (Hop ${hopCount + 1})`);

              // Notify client
              this.send(session.ws, {
                type: 'chaining',
                toProvider: nextProviderId,
                hop: hopCount + 1
              });

              // Recursive call with updated chain
              await this.handleChat(
                session,
                { ...message, text: null }, // No new user text
                {
                  hopCount: hopCount + 1,
                  targetProvider: nextProviderId,
                  providerChain: currentChain
                }
              );
              return; // Done with this handler
            }
          }
        } else {
          console.log(`[Chat] Max hop count (10) reached, stopping chain`);
        }
      }

      this.send(session.ws, { type: 'done' });

    } catch (error) {
      console.error(`Chat error:`, error.message);
      this.send(session.ws, {
        type: 'error',
        message: error.message
      });
    }
  }

  async executeFunction(call, session) {
    const { name, arguments: args } = call;

    switch (name) {
      case 'searchVault':
        return {
          status: 'success',
          results: this.vault.search(args.query)
        };

      case 'readDocument':
        const doc = this.vault.readDocument(args.path);
        if (doc) {
          return { status: 'success', document: doc };
        } else {
          return { status: 'error', message: `Document not found: ${args.path}` };
        }

      case 'updateNotepad':
      case 'suggestEdit':
      case 'updateDocument':
        // These are handled client-side
        // Return acknowledgment for the AI
        return {
          status: 'pending_client_execution',
          message: 'Edit will be applied by the client'
        };

      case 'webSearch':
        // Web search is handled by the provider's built-in capability
        // This is mainly for acknowledgment
        return {
          status: 'delegated',
          message: 'Web search performed by provider'
        };

      default:
        return {
          status: 'error',
          message: `Unknown function: ${name}`
        };
    }
  }

  send(ws, data) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * Get all providers with their availability status
   */
  async getProvidersWithStatus() {
    const status = [];
    for (const provider of this.providers) {
      const available = await provider.isAvailable();
      status.push({
        ...provider.getInfo(),
        available
      });
    }
    return status;
  }

  async start() {
    // Check provider availability
    console.log('Checking AI provider availability...');
    for (const provider of this.providers) {
      const available = await provider.isAvailable();
      console.log(`  ${provider.name}: ${available ? 'available' : 'NOT AVAILABLE'}`);
    }

    // Start server
    return new Promise((resolve) => {
      this.server.listen(this.config.port, () => {
        console.log(`\nAI Daemon running on port ${this.config.port}`);
        console.log(`  WebSocket: ws://localhost:${this.config.port}`);
        console.log(`  Health: http://localhost:${this.config.port}/health`);
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      // Close all WebSocket connections
      for (const session of this.sessions.values()) {
        session.ws.close();
      }
      this.sessions.clear();

      // Close server
      this.server.close(() => {
        console.log('AI Daemon stopped');
        resolve();
      });
    });
  }
}

export default AIDaemonServer;
