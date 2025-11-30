/**
 * AI Service
 *
 * WebSocket client for communicating with the AI daemon.
 * Handles connection lifecycle, message routing, and vault sync.
 */

import store from '../store';

class AIService {
  constructor() {
    this.ws = null;
    this.sessionId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.messageQueue = [];
    this.syncInterval = null;
    this.syncTimeout = null;
    this.hasReceivedChunks = false; // Track if we've streamed chunks for current response
  }

  /**
   * Get daemon URL from config or default
   */
  getDaemonUrl() {
    const conf = store.getters['data/serverConf'] || {};
    return conf.aiDaemonUrl || 'ws://localhost:3001';
  }

  /**
   * Initialize and connect to daemon
   */
  async init() {
    try {
      await this.connect();
      this.setupVaultSync();
    } catch (err) {
      console.warn('AI Service: Initial connection failed, will retry');
    }
  }

  /**
   * Connect to AI daemon
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const url = this.getDaemonUrl();

      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('AI Service: Connected to daemon');
          this.reconnectAttempts = 0;
          store.commit('aiChat/setConnected', true);
          store.commit('aiChat/setError', null);
          this.flushMessageQueue();
          this.syncCurrentDocument();
          this.syncVault();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (err) {
            console.error('AI Service: Failed to parse message', err);
          }
        };

        this.ws.onclose = () => {
          console.log('AI Service: Disconnected');
          store.commit('aiChat/setConnected', false);
          this.sessionId = null;
          this.attemptReconnect();
        };

        this.ws.onerror = (err) => {
          console.error('AI Service: WebSocket error');
          store.commit('aiChat/setError', 'Connection to AI daemon failed');
          reject(new Error('WebSocket connection failed'));
        };
      } catch (err) {
        store.commit('aiChat/setConnected', false);
        reject(err);
      }
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('AI Service: Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * 2 ** (this.reconnectAttempts - 1),
      30000, // Max 30 seconds
    );

    console.log(`AI Service: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(() => {
        // Will retry via onclose handler
      });
    }, delay);
  }

  /**
   * Handle incoming message from daemon
   */
  handleMessage(message) {
    switch (message.type) {
      case 'connected':
        this.sessionId = message.sessionId;
        store.commit('aiChat/setSessionId', message.sessionId);
        store.commit('aiChat/setMode', message.mode);
        store.commit('aiChat/setProviderId', message.providerId);
        store.commit('aiChat/setProviders', message.providers || []);
        break;

      case 'thinking':
        store.commit('aiChat/setThinking', true);
        this.hasReceivedChunks = false; // Reset for new response
        break;

      case 'providerSelected':
        store.commit('aiChat/setSelection', {
          mode: message.mode,
          providerId: message.providerId,
          score: message.score,
          reason: message.reason,
          alternatives: message.alternatives,
        });
        break;

      case 'chunk':
        // Track that we've received streaming chunks
        if (!this.hasReceivedChunks) {
          // First chunk - create the assistant message
          store.commit('aiChat/addMessage', {
            role: 'assistant',
            content: message.text,
            timestamp: Date.now(),
            isStreaming: true,
          });
          this.hasReceivedChunks = true;
        } else {
          // Subsequent chunks - append to existing message
          store.commit('aiChat/appendToLastMessage', message.text);
        }
        break;

      case 'response':
        store.commit('aiChat/setThinking', false);
        // Only add message if we didn't already stream chunks
        // (streaming creates the message progressively via chunks)
        if (!this.hasReceivedChunks) {
          store.commit('aiChat/addMessage', {
            role: 'assistant',
            content: message.text,
            timestamp: Date.now(),
          });
        } else {
          // Mark streaming complete on the existing message
          store.commit('aiChat/markLastMessageComplete');
        }
        break;

      case 'functionCall':
        this.handleFunctionCall(message);
        break;

      case 'done':
        store.commit('aiChat/setThinking', false);
        break;

      case 'error':
        store.commit('aiChat/setThinking', false);
        store.commit('aiChat/addMessage', {
          role: 'system',
          content: `Error: ${message.message}`,
          timestamp: Date.now(),
          isError: true,
        });
        break;

      case 'modeChanged':
        store.commit('aiChat/setMode', message.mode);
        break;

      case 'providerChanged':
        store.commit('aiChat/setProviderId', message.providerId);
        break;

      case 'vaultSynced':
        console.log(`AI Service: Vault synced (${message.count} documents)`);
        break;

      case 'suggestions':
        store.commit('aiChat/setSuggestions', message.providers);
        break;

      case 'historyCleared':
        // Confirmation received
        break;

      default:
        console.log('AI Service: Unknown message type:', message.type);
    }
  }

  /**
   * Handle AI function calls
   */
  handleFunctionCall(message) {
    const { function: funcName, arguments: args, result } = message;

    // Log the function call
    store.commit('aiChat/addMessage', {
      role: 'system',
      content: `AI action: ${funcName}`,
      timestamp: Date.now(),
      isFunctionCall: true,
      functionName: funcName,
      functionArgs: args,
      functionResult: result,
    });

    // Execute client-side function calls
    switch (funcName) {
      case 'updateNotepad':
        this.applyUpdateNotepad(args);
        break;

      case 'suggestEdit':
        this.applySuggestEdit(args);
        break;

      // searchVault and readDocument are handled server-side
    }
  }

  /**
   * Apply full document update
   */
  applyUpdateNotepad(args) {
    const currentContent = store.getters['content/current'];
    const { trustMode } = store.state.aiChat;

    // Store edit for undo/review
    store.commit('aiChat/addPendingEdit', {
      type: 'updateNotepad',
      previousContent: currentContent.text,
      newContent: args.content,
      timestamp: Date.now(),
    });

    if (trustMode) {
      // Auto-apply in trust mode
      this.applyEdit();
    } else {
      // Show diff modal for review
      store.commit('aiChat/setShowDiffModal', true);
    }
  }

  /**
   * Apply targeted edit
   */
  applySuggestEdit(args) {
    const { search, replace, explanation } = args;
    const currentContent = store.getters['content/current'];
    const { trustMode } = store.state.aiChat;

    const index = currentContent.text.indexOf(search);
    if (index === -1) {
      store.commit('aiChat/addMessage', {
        role: 'system',
        content: 'Could not find text to replace. The document may have changed.',
        timestamp: Date.now(),
        isError: true,
      });
      return;
    }

    const newContent = currentContent.text.slice(0, index)
      + replace
      + currentContent.text.slice(index + search.length);

    // Store edit for undo/review
    store.commit('aiChat/addPendingEdit', {
      type: 'suggestEdit',
      search,
      replace,
      explanation,
      previousContent: currentContent.text,
      newContent,
      timestamp: Date.now(),
    });

    if (trustMode) {
      this.applyEdit();
    } else {
      store.commit('aiChat/setShowDiffModal', true);
    }
  }

  /**
   * Apply the pending edit
   */
  applyEdit() {
    const { pendingEdit } = store.state.aiChat;
    if (!pendingEdit) return;

    // Store in edit history for undo
    store.commit('aiChat/addEditToHistory', pendingEdit);

    // Apply the edit
    store.dispatch('content/patchCurrent', {
      text: pendingEdit.newContent,
    });

    // Clear pending edit
    store.commit('aiChat/clearPendingEdit');
    store.commit('aiChat/setShowDiffModal', false);

    // Notify user
    const msg = pendingEdit.explanation || 'Document updated by AI';
    store.dispatch('notification/info', msg);
  }

  /**
   * Reject the pending edit
   */
  rejectEdit() {
    store.commit('aiChat/clearPendingEdit');
    store.commit('aiChat/setShowDiffModal', false);
    store.dispatch('notification/info', 'Edit rejected');
  }

  /**
   * Undo the last edit
   */
  undoLastEdit() {
    const lastEdit = store.getters['aiChat/lastEdit'];
    if (lastEdit?.previousContent) {
      store.dispatch('content/patchCurrent', {
        text: lastEdit.previousContent,
      });
      store.commit('aiChat/removeLastEdit');
      store.dispatch('notification/info', 'AI edit undone');
    }
  }

  /**
   * Setup vault synchronization
   */
  setupVaultSync() {
    // Sync when document changes (debounced)
    store.watch(
      () => store.getters['content/current']?.text,
      () => {
        clearTimeout(this.syncTimeout);
        this.syncTimeout = setTimeout(() => this.syncCurrentDocument(), 500);
      },
    );

    // Sync when switching files
    store.watch(
      () => store.getters['file/current']?.id,
      () => this.syncCurrentDocument(),
    );

    // Periodic full vault sync (every 30 seconds)
    this.syncInterval = setInterval(() => this.syncVault(), 30000);
  }

  /**
   * Sync current document to daemon
   */
  syncCurrentDocument() {
    if (!this.isConnected()) return;

    const currentFile = store.getters['file/current'];
    const currentContent = store.getters['content/current'];

    if (!currentFile?.id) return;

    this.send({
      type: 'updateContext',
      context: {
        currentFile: {
          id: currentFile.id,
          name: currentFile.name,
          path: store.getters.pathsByItemId?.[currentFile.id] || currentFile.name,
        },
        currentContent: currentContent?.text || '',
      },
    });
  }

  /**
   * Sync entire vault to daemon
   */
  syncVault() {
    if (!this.isConnected()) return;

    const files = Object.values(store.getters['file/itemsById'] || {});
    const vault = [];

    for (const file of files) {
      // Skip trash
      if (file.parentId === 'trash') continue;

      const contentId = `${file.id}/content`;
      const content = store.state.content.itemsById?.[contentId];

      if (content) {
        vault.push({
          id: file.id,
          name: file.name,
          path: store.getters.pathsByItemId?.[file.id] || file.name,
          text: content.text || '',
          hash: content.hash,
        });
      }
    }

    this.send({
      type: 'vaultUpdate',
      documents: vault,
    });
  }

  /**
   * Send chat message
   */
  async sendMessage(text) {
    if (!text?.trim()) return;

    // Add user message to UI immediately
    store.commit('aiChat/addMessage', {
      role: 'user',
      content: text,
      timestamp: Date.now(),
    });

    // Make sure current document is synced
    this.syncCurrentDocument();

    // Send to daemon
    this.send({
      type: 'chat',
      text,
    });
  }

  /**
   * Set selection mode (auto/manual)
   */
  setMode(mode) {
    this.send({
      type: 'setMode',
      mode,
    });
  }

  /**
   * Set provider (for manual mode)
   */
  setProvider(providerId) {
    this.send({
      type: 'setProvider',
      providerId,
    });
  }

  /**
   * Get provider suggestions for a message
   */
  getSuggestions(text) {
    this.send({
      type: 'getSuggestions',
      text,
    });
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    store.commit('aiChat/clearMessages');
    this.send({ type: 'clearHistory' });
  }

  /**
   * Send message to daemon
   */
  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue for when connection is restored
      this.messageQueue.push(message);
    }
  }

  /**
   * Flush queued messages
   */
  flushMessageQueue() {
    while (this.messageQueue.length && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(this.messageQueue.shift()));
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Export singleton instance
export default new AIService();
