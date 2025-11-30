/**
 * AI Chat Vuex Module
 *
 * State management for AI chat functionality including:
 * - Connection state
 * - Messages and history
 * - Provider selection
 * - Edit management (pending, history, undo)
 */

export default {
  namespaced: true,

  state: () => ({
    // Connection state
    sessionId: null,
    connected: false,
    thinking: false,
    error: null,

    // Provider state
    mode: 'auto', // auto, manual
    providerId: 'claude',
    providers: [],
    suggestions: [],
    selection: null, // Current selection info { mode, providerId, score, reason, alternatives }

    // Messages
    messages: [],

    // Edit management
    trustMode: false, // When true, auto-apply edits without review
    pendingEdit: null, // Edit waiting for approval
    editHistory: [], // Applied edits for undo
    showDiffModal: false,

    // UI state
    showPanel: false,
  }),

  mutations: {
    setSessionId(state, value) {
      state.sessionId = value;
    },

    setConnected(state, value) {
      state.connected = value;
    },

    setThinking(state, value) {
      state.thinking = value;
    },

    setError(state, value) {
      state.error = value;
    },

    setMode(state, value) {
      state.mode = value;
    },

    setProviderId(state, value) {
      state.providerId = value;
    },

    setProviders(state, value) {
      state.providers = value;
    },

    setSuggestions(state, value) {
      state.suggestions = value;
    },

    setSelection(state, value) {
      state.selection = value;
    },

    setTrustMode(state, value) {
      state.trustMode = value;
    },

    addMessage(state, message) {
      state.messages.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...message,
      });
    },

    appendToLastMessage(state, text) {
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        lastMessage.content = (lastMessage.content || '') + text;
      }
    },

    markLastMessageComplete(state) {
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        lastMessage.isStreaming = false;
      }
    },

    clearMessages(state) {
      state.messages = [];
    },

    addPendingEdit(state, edit) {
      state.pendingEdit = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...edit,
      };
    },

    clearPendingEdit(state) {
      state.pendingEdit = null;
    },

    addEditToHistory(state, edit) {
      state.editHistory.push(edit);
      // Keep last 50 edits
      if (state.editHistory.length > 50) {
        state.editHistory.shift();
      }
    },

    removeLastEdit(state) {
      state.editHistory.pop();
    },

    clearEditHistory(state) {
      state.editHistory = [];
    },

    setShowDiffModal(state, value) {
      state.showDiffModal = value;
    },

    setShowPanel(state, value) {
      state.showPanel = value;
    },

    togglePanel(state) {
      state.showPanel = !state.showPanel;
    },
  },

  getters: {
    isAvailable: (state) => state.connected && !state.error,

    lastEdit: (state) => state.editHistory[state.editHistory.length - 1],

    recentEdits: (state) => state.editHistory.slice(-10).reverse(),

    messageCount: (state) => state.messages.length,

    currentProvider: (state) => state.providers.find((p) => p.id === state.providerId) || null,

    availableProviders: (state) => state.providers.filter((p) => p.available && p.enabled),

    connectionStatus: (state) => {
      if (state.error) return 'error';
      if (state.connected) return 'connected';
      return 'disconnected';
    },
  },

  actions: {
    togglePanel({ commit, state }) {
      commit('setShowPanel', !state.showPanel);
    },

    async undoLastEdit({ state, commit, dispatch }) {
      const lastEdit = state.editHistory[state.editHistory.length - 1];
      if (lastEdit?.previousContent) {
        await dispatch('content/patchCurrent', {
          text: lastEdit.previousContent,
        }, { root: true });
        commit('removeLastEdit');
        dispatch('notification/info', 'AI edit undone', { root: true });
      }
    },

    toggleTrustMode({ commit, state, dispatch }) {
      const newMode = !state.trustMode;
      commit('setTrustMode', newMode);
      dispatch(
        'notification/info',
        newMode ? 'Trust mode enabled - edits will auto-apply' : 'Trust mode disabled - edits require approval',
        { root: true },
      );
    },
  },
};
