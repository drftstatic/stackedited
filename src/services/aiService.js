/**
 * AI Service
 *
 * WebSocket client for communicating with the AI daemon.
 * Handles connection lifecycle, message routing, and vault sync.
 */

import store from '../store';

// Provider mention mappings
const MENTION_TO_PROVIDER = {
  claude: 'claude',
  gemini: 'gemini',
  ted: 'ted', // Ted (Project Manager)
  gpt: 'openai',
  openai: 'openai',
  glm: 'glm',
  zai: 'glm',
  grok: 'cursor',
  cursor: 'cursor',
  composer: 'composer',
  human: 'human', // Special case - request human input
  all: 'all', // Special case - broadcast
};

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
   * Parse @mentions from message text
   * Returns { mentions: string[], targetProvider: string|null }
   */
  parseMentions(text) {
    const mentionRegex = /@(\w+)/gi;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionName = match[1].toLowerCase();
      if (MENTION_TO_PROVIDER[mentionName]) {
        mentions.push(mentionName);
      }
    }

    // First valid mention determines target provider
    let targetProvider = null;
    for (const mention of mentions) {
      const provider = MENTION_TO_PROVIDER[mention];
      if (provider && provider !== 'human' && provider !== 'all') {
        targetProvider = provider;
        break;
      }
    }

    return { mentions, targetProvider };
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
      // Wait for StackEdit to finish loading files from IndexedDB
      await this.waitForFilesToLoad();
      await this.connect();
      this.setupVaultSync();
    } catch (err) {
      console.warn('AI Service: Initial connection failed, will retry');
    }
  }

  /**
   * Wait for StackEdit to load files from IndexedDB before connecting
   * This ensures vault sync will find files when it runs
   */
  waitForFilesToLoad() {
    return new Promise((resolve) => {
      const checkFiles = () => {
        const files = Object.values(store.getters['file/itemsById'] || {});
        if (files.length > 0) {
          console.log(`AI Service: Files loaded (${files.length} files), proceeding with connection`);
          resolve();
        } else {
          // Check again in 100ms
          setTimeout(checkFiles, 100);
        }
      };

      // Start checking after initial delay
      setTimeout(checkFiles, 500);

      // Timeout after 5 seconds even if no files (empty workspace is valid)
      setTimeout(() => {
        console.log('AI Service: Timeout waiting for files, connecting anyway (workspace may be empty)');
        resolve();
      }, 5000);
    });
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
            providerId: message.providerId,
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
            providerId: message.providerId,
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
        store.commit('aiChat/setChaining', null);
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

      case 'chaining':
        store.commit('aiChat/setChaining', {
          toProvider: message.toProvider,
          hop: message.hop,
        });
        store.commit('aiChat/setThinking', true);
        break;

      case 'awaitingHuman':
        store.commit('aiChat/setAwaitingHuman', true);
        store.commit('aiChat/setThinking', false);
        break;

      default:
        console.log('AI Service: Unknown message type:', message.type);
    }
  }

  /**
   * Handle AI function calls
   */
  handleFunctionCall(message) {
    const {
      function: funcName, arguments: args, result, providerId,
    } = message;

    // Log the function call
    store.commit('aiChat/addMessage', {
      role: 'system',
      content: `AI action: ${funcName}`,
      timestamp: Date.now(),
      isFunctionCall: true,
      functionName: funcName,
      functionArgs: args,
      functionResult: result,
      providerId,
    });

    // Execute client-side function calls
    switch (funcName) {
      case 'updateNotepad':
        this.applyUpdateNotepad(args);
        break;

      case 'suggestEdit':
        this.applySuggestEdit(args);
        break;

      case 'updateDocument':
        this.applyUpdateDocument(args);
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
  /**
   * Find text in document with loose whitespace matching
   */
  findFuzzyMatch(docText, searchText) {
    // 1. Try exact match
    const exactIndex = docText.indexOf(searchText);
    if (exactIndex !== -1) {
      return { start: exactIndex, end: exactIndex + searchText.length };
    }

    // 2. Try case-insensitive match
    const lowerDoc = docText.toLowerCase();
    const lowerSearch = searchText.toLowerCase();
    const caseInsensitiveIndex = lowerDoc.indexOf(lowerSearch);
    if (caseInsensitiveIndex !== -1) {
      return { start: caseInsensitiveIndex, end: caseInsensitiveIndex + searchText.length };
    }

    // 3. Try stripping all whitespace
    const stripSpace = (str) => {
      let stripped = '';
      const map = []; // strippedIndex -> originalIndex
      for (let i = 0; i < str.length; i += 1) {
        if (!/\s/.test(str[i])) {
          map.push(i);
          stripped += str[i];
        }
      }
      return { text: stripped, map };
    };

    const docStripped = stripSpace(docText);
    const searchStripped = stripSpace(searchText);

    if (searchStripped.text.length === 0) return null;

    const matchIndex = docStripped.text.indexOf(searchStripped.text);
    if (matchIndex !== -1) {
      const start = docStripped.map[matchIndex];
      const lastCharIndex = matchIndex + searchStripped.text.length - 1;
      const end = docStripped.map[lastCharIndex] + 1;
      return { start, end };
    }

    // 4. Try partial match (first 50 chars) as last resort
    if (searchText.length > 50) {
      const partialSearch = searchText.substring(0, 50);
      const partialIndex = docText.indexOf(partialSearch);
      if (partialIndex !== -1) {
        // Find the end by looking for a reasonable boundary
        const maxEnd = Math.min(partialIndex + searchText.length + 100, docText.length);
        return { start: partialIndex, end: maxEnd };
      }
    }

    return null;
  }

  /**
   * Apply targeted edit
   */
  applySuggestEdit(args) {
    const { search, replace, explanation } = args;
    const currentContent = store.getters['content/current'];
    const { trustMode } = store.state.aiChat;

    const match = this.findFuzzyMatch(currentContent.text, search);

    if (!match) {
      // Show what we were searching for to help debug
      const searchPreview = search.length > 100
        ? `${search.substring(0, 100)}...`
        : search;
      store.commit('aiChat/addMessage', {
        role: 'system',
        content: `Could not find text to replace. The document may have changed.\n\nSearching for: "${searchPreview}"`,
        timestamp: Date.now(),
        isError: true,
      });
      console.error('[AI Service] Failed to find text:', {
        search,
        docLength: currentContent.text.length,
        docPreview: currentContent.text.substring(0, 200)
      });
      return;
    }

    const newContent = currentContent.text.slice(0, match.start)
      + replace
      + currentContent.text.slice(match.end);

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
   * Apply edit to ANY document
   */
  async applyUpdateDocument(args) {
    const {
      path, search, replace, explanation,
    } = args;

    // Find file by path
    const files = Object.values(store.getters['file/itemsById'] || {});
    // pathsByItemId is id -> path
    let targetFile = null;
    const pathLower = path.toLowerCase();

    // 1. Exact match via pathsByItemId
    const pathsByItemId = store.getters.pathsByItemId || {};
    const exactId = Object.keys(pathsByItemId).find(id => pathsByItemId[id] === path);
    if (exactId) {
      targetFile = store.getters['file/itemsById'][exactId];
    }

    // 2. If not found, iterate and try fuzzy match on name/path
    if (!targetFile) {
      for (const file of files) {
        // Skip trash
        if (file.parentId === 'trash') continue;

        const currentPath = pathsByItemId[file.id] || file.name;
        if (currentPath.toLowerCase() === pathLower || file.name.toLowerCase() === pathLower) {
          targetFile = file;
          break;
        }
      }
    }

    if (!targetFile) {
      store.commit('aiChat/addMessage', {
        role: 'system',
        content: `Error: Could not find file "${path}" in the workspace.`,
        timestamp: Date.now(),
        isError: true,
      });
      return;
    }

    // Load content if needed
    const contentId = `${targetFile.id}/content`;
    let content = store.state.content.itemsById?.[contentId];

    if (!content) {
      try {
        console.log(`[AI Service] Loading content for ${targetFile.name}`);
        await store.dispatch('content/loadItem', contentId);
        content = store.state.content.itemsById?.[contentId];
      } catch (err) {
        store.commit('aiChat/addMessage', {
          role: 'system',
          content: `Error: Failed to load content for "${targetFile.name}".`,
          timestamp: Date.now(),
          isError: true,
        });
        return;
      }
    }

    if (!content) {
      store.commit('aiChat/addMessage', {
        role: 'system',
        content: `Error: File "${targetFile.name}" is empty or could not be read.`,
        timestamp: Date.now(),
        isError: true,
      });
      return;
    }

    // Apply match logic
    const Match = this.findFuzzyMatch(content.text, search);

    if (!Match) {
      // Show what we were searching for to help debug
      const searchPreview = search.length > 100
        ? `${search.substring(0, 100)}...`
        : search;

      store.commit('aiChat/addMessage', {
        role: 'system',
        content: `Could not find text to replace in "${targetFile.name}".\n\nSearching for: "${searchPreview}"`,
        timestamp: Date.now(),
        isError: true,
      });
      console.error('[AI Service] Failed to find text in', targetFile.name, {
        search,
        docLength: content.text.length
      });
      return;
    }

    const newContent = content.text.slice(0, Match.start)
      + replace
      + content.text.slice(Match.end);

    // Commit the change
    store.commit('content/patchItem', {
      id: content.id,
      text: newContent,
    });

    // Record authorship
    store.dispatch('authorship/recordAIEdit', {
      start: Match.start,
      end: Match.start + replace.length,
      newText: replace,
      providerId: store.state.aiChat.providerId,
      fileId: targetFile.id
    });

    store.dispatch('notification/info', `Updated ${targetFile.name}`);

    // Add success message to chat
    store.commit('aiChat/addMessage', {
      role: 'system',
      content: `✅ Updated **${targetFile.name}**\n\n_"${explanation}"_`,
      timestamp: Date.now(),
    });
  }
  applyEdit() {
    const { pendingEdit } = store.state.aiChat;
    const currentProviderId = store.state.aiChat.providerId;
    if (!pendingEdit) return;

    // Store in edit history for undo
    store.commit('aiChat/addEditToHistory', pendingEdit);

    // Record authorship before applying
    const currentContent = store.getters['content/current'];
    if (pendingEdit.type === 'suggestEdit') {
      // For targeted edits, find the position and record attribution
      const searchIndex = currentContent.text.indexOf(pendingEdit.search);
      if (searchIndex !== -1) {
        store.dispatch('authorship/recordAIEdit', {
          start: searchIndex,
          end: searchIndex + pendingEdit.search.length,
          newText: pendingEdit.replace,
          providerId: currentProviderId,
        });
      }
    } else if (pendingEdit.type === 'updateNotepad') {
      // For full document replacement, record entire document as AI-authored
      store.commit('authorship/replaceDocument', {
        fileId: store.getters['file/current']?.id,
        content: pendingEdit.newContent,
        author: currentProviderId,
        timestamp: Date.now(),
      });
    }

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
   * Proactively loads content for files that don't have it yet
   */
  async syncVault() {
    if (!this.isConnected()) {
      console.log('AI Service: Cannot sync vault - not connected');
      return;
    }

    const files = Object.values(store.getters['file/itemsById'] || {});
    console.log('AI Service: syncVault() found', files.length, 'files in store');

    const vault = [];

    for (const file of files) {
      // Skip trash
      if (file.parentId === 'trash') {
        console.log('AI Service: Skipping trash file:', file.name);
        continue;
      }

      const contentId = `${file.id}/content`;
      let content = store.state.content.itemsById?.[contentId];

      // If content not loaded yet, load it explicitly
      if (!content) {
        console.log(`AI Service: Loading content for ${file.name} (${contentId})`);
        try {
          await store.dispatch('content/loadItem', contentId);
          content = store.state.content.itemsById?.[contentId];
        } catch (err) {
          console.warn(`AI Service: Failed to load content for ${file.name}:`, err);
        }
      }

      console.log(`AI Service: File ${file.name} (${file.id}) - content exists:`, !!content);

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

    console.log('AI Service: Syncing vault with', vault.length, 'documents');
    console.log('AI Service: Vault contents:', vault.map(d => ({ name: d.name, textLength: d.text.length })));

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

    // Parse @mentions from message
    const { mentions, targetProvider } = this.parseMentions(text);

    // Check for @human mention - may need to pause based on trust mode
    const hasHumanMention = mentions.includes('human');
    const { trustMode, providerId } = store.state.aiChat;

    // Add user message to UI immediately
    store.commit('aiChat/addMessage', {
      role: 'user',
      content: text,
      timestamp: Date.now(),
      mentions, // Store mentions for display
    });

    // Create task if message has AI @mentions (not @human or @all)
    if (mentions.length > 0) {
      const aiMentions = mentions.filter((m) => m !== 'human' && m !== 'all');
      if (aiMentions.length > 0) {
        store.dispatch('tasks/createTaskFromMessage', {
          messageText: text,
          mentions,
          providerId: providerId || 'human',
        });
      }
    }

    // Make sure current document is synced
    this.syncCurrentDocument();

    // If targeting a specific provider via @mention, switch to it
    if (targetProvider) {
      this.setProvider(targetProvider);
    }

    // Send to daemon with mention metadata
    this.send({
      type: 'chat',
      text,
      mentions,
      targetProvider,
      hasHumanMention,
      trustMode,
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
