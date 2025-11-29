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
      new ClaudeProvider(config.claude || {})
      // Gemini and Codex providers will be added in Phase 4
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

      // Send welcome message
      this.send(ws, {
        type: 'connected',
        sessionId,
        mode: session.mode,
        providerId: session.providerId,
        providers: this.providers.map(p => p.getInfo())
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
    switch (message.type) {
      case 'chat':
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
        const result = this.vault.sync(message.documents || []);
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

  async handleChat(session, message) {
    const text = message.text;
    if (!text?.trim()) {
      return this.send(session.ws, {
        type: 'error',
        message: 'Empty message'
      });
    }

    // Signal thinking
    this.send(session.ws, { type: 'thinking' });

    try {
      // Select provider based on mode
      let provider, selection;

      if (session.mode === 'auto') {
        const result = await this.matcher.selectBest(text);
        provider = result.provider;
        selection = result.selection;
      } else {
        const result = await this.matcher.selectManual(session.providerId);
        provider = result.provider;
        selection = result.selection;
      }

      // Send provider selection info
      this.send(session.ws, {
        type: 'providerSelected',
        ...selection
      });

      // Build context with vault
      const context = {
        ...session.context,
        vault: this.vault.getAllDocuments()
      };

      // Add user message to history
      session.context.history.push({
        role: 'user',
        content: text
      });

      // Send message to AI
      const response = await provider.sendMessage(
        text,
        context,
        // Streaming callback
        (chunk) => {
          this.send(session.ws, {
            type: 'chunk',
            text: chunk
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
            result
          });
        }
      }

      // Send text response
      if (response.text) {
        session.context.history.push({
          role: 'assistant',
          content: response.text
        });

        this.send(session.ws, {
          type: 'response',
          text: response.text
        });
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
