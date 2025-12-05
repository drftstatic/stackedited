/**
 * Authorship Tracking Vuex Module
 *
 * Tracks who wrote what in each document:
 * - Human edits
 * - AI provider edits (Claude, Gemini, GPT, Z.AI, Grok, Composer)
 * - Timestamp tracking
 * - Visual color-coding support
 */

export default {
  namespaced: true,

  state: () => ({
    // Map of fileId -> authorship data
    // Each file has an array of text ranges with author info
    authorshipByFile: {},

    // Visual overlay enabled/disabled
    showAuthorship: false,

    // Color scheme for each author
    authorColors: {
      human: '#757575',      // Gray - neutral
      claude: '#F59E0B',     // Orange (Amber)
      gemini: '#3B82F6',     // Blue
      openai: '#84CC16',     // Green (Lime)
      glm: '#6366F1',        // Indigo (Z.AI)
      zai: '#6366F1',        // Indigo (Z.AI alias)
      xai: '#6366F1',        // Indigo (X.AI alias)
      cursor: '#9D4EDD',     // Purple (Grok)
      composer: '#2DD4BF',   // Teal
    },
  }),

  mutations: {
    /**
     * Initialize authorship for a file
     */
    initFile(state, { fileId, content }) {
      if (!state.authorshipByFile[fileId]) {
        state.authorshipByFile[fileId] = {
          ranges: content ? [{
            start: 0,
            end: content.length,
            author: 'human',
            timestamp: Date.now(),
          }] : [],
          version: 1,
        };
      }
    },

    /**
     * Record an edit with authorship
     */
    recordEdit(state, {
      fileId, start, end, newText, author, timestamp,
    }) {
      const fileAuth = state.authorshipByFile[fileId];
      if (!fileAuth) return;

      const newRange = {
        start,
        end: start + newText.length,
        author: author || 'human',
        timestamp: timestamp || Date.now(),
      };

      // Remove overlapping ranges and insert new one
      const ranges = fileAuth.ranges.filter((range) => {
        // Keep ranges that don't overlap with the edit
        return range.end <= start || range.start >= end;
      });

      // Adjust ranges after the edit point
      const lengthDiff = newText.length - (end - start);
      ranges.forEach((range) => {
        if (range.start >= end) {
          range.start += lengthDiff;
          range.end += lengthDiff;
        }
      });

      // Insert new range
      ranges.push(newRange);

      // Sort by start position
      ranges.sort((a, b) => a.start - b.start);

      fileAuth.ranges = ranges;
      fileAuth.version += 1;
    },

    /**
     * Replace entire document (for AI full rewrites)
     */
    replaceDocument(state, {
      fileId, content, author, timestamp,
    }) {
      state.authorshipByFile[fileId] = {
        ranges: [{
          start: 0,
          end: content.length,
          author: author || 'human',
          timestamp: timestamp || Date.now(),
        }],
        version: 1,
      };
    },

    /**
     * Clear authorship for a file
     */
    clearFile(state, fileId) {
      delete state.authorshipByFile[fileId];
    },

    /**
     * Toggle authorship visualization
     */
    setShowAuthorship(state, value) {
      state.showAuthorship = value;
    },

    toggleShowAuthorship(state) {
      state.showAuthorship = !state.showAuthorship;
    },
  },

  getters: {
    /**
     * Get authorship ranges for a file
     */
    getFileAuthorship: (state) => (fileId) => state.authorshipByFile[fileId] || { ranges: [], version: 0 },

    /**
     * Get author color
     */
    getAuthorColor: (state) => (author) => state.authorColors[author] || state.authorColors.human,

    /**
     * Get authorship statistics for a file
     */
    getFileStats: (state) => (fileId) => {
      const fileAuth = state.authorshipByFile[fileId];
      if (!fileAuth) return null;

      const stats = {};
      let totalChars = 0;

      fileAuth.ranges.forEach((range) => {
        const length = range.end - range.start;
        totalChars += length;
        stats[range.author] = (stats[range.author] || 0) + length;
      });

      // Convert to percentages
      const percentages = {};
      Object.keys(stats).forEach((author) => {
        percentages[author] = totalChars > 0
          ? Math.round((stats[author] / totalChars) * 100)
          : 0;
      });

      return {
        totalChars,
        byAuthor: stats,
        percentages,
      };
    },

    /**
     * Check if authorship visualization is enabled
     */
    isShowingAuthorship: (state) => state.showAuthorship,
  },

  actions: {
    /**
     * Initialize authorship tracking for current file
     */
    initCurrentFile({ commit, rootGetters }) {
      const currentFile = rootGetters['file/current'];
      const currentContent = rootGetters['content/current'];

      if (currentFile?.id) {
        commit('initFile', {
          fileId: currentFile.id,
          content: currentContent?.text || '',
        });
      }
    },

    /**
     * Record a human edit
     */
    recordHumanEdit({ commit, rootGetters }, { start, end, newText }) {
      const currentFile = rootGetters['file/current'];
      if (!currentFile?.id) return;

      commit('recordEdit', {
        fileId: currentFile.id,
        start,
        end,
        newText,
        author: 'human',
        timestamp: Date.now(),
      });
    },

    /**
     * Record an AI edit
     */
    recordAIEdit({ commit, rootGetters }, {
      start, end, newText, providerId,
    }) {
      const currentFile = rootGetters['file/current'];
      if (!currentFile?.id) return;

      commit('recordEdit', {
        fileId: currentFile.id,
        start,
        end,
        newText,
        author: providerId,
        timestamp: Date.now(),
      });
    },

    /**
     * Toggle authorship visualization
     */
    toggleVisualization({ commit }) {
      commit('toggleShowAuthorship');
    },
  },
};
