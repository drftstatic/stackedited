<template>
  <div v-if="showAuthorship" class="authorship-overlay">
    <!-- Author Legend -->
    <div class="authorship-overlay__legend">
      <div class="authorship-overlay__legend-title">Authorship</div>
      <div
        v-for="(stats, author) in authorStats"
        :key="author"
        class="authorship-overlay__legend-item"
      >
        <span
          class="authorship-overlay__legend-dot"
          :style="{ backgroundColor: getAuthorColor(author) }"
        />
        <span class="authorship-overlay__legend-name">{{ getAuthorName(author) }}</span>
        <span class="authorship-overlay__legend-percent">{{ stats.percent }}%</span>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import editorSvc from '../services/editorSvc';

export default {
  data: () => ({
    decorations: [], // Track applied decorations for cleanup
  }),

  computed: {
    ...mapState('authorship', ['showAuthorship']),
    ...mapGetters('authorship', ['getFileAuthorship', 'getAuthorColor']),
    ...mapGetters('file', { currentFile: 'current' }),
    ...mapGetters('content', { currentContent: 'current' }),

    authorshipRanges() {
      if (!this.currentFile?.id) return [];
      const fileAuth = this.getFileAuthorship(this.currentFile.id);
      return fileAuth.ranges || [];
    },

    authorStats() {
      if (!this.currentFile?.id) return {};

      const stats = {};
      let totalChars = 0;

      this.authorshipRanges.forEach((range) => {
        const length = range.end - range.start;
        totalChars += length;
        stats[range.author] = (stats[range.author] || 0) + length;
      });

      // Convert to percentages
      const result = {};
      Object.keys(stats).forEach((author) => {
        result[author] = {
          chars: stats[author],
          percent: totalChars > 0 ? Math.round((stats[author] / totalChars) * 100) : 0,
        };
      });

      return result;
    },
  },

  watch: {
    showAuthorship: {
      immediate: true,
      handler(newValue) {
        if (newValue) {
          this.applyAuthorshipHighlights();
        } else {
          this.clearAuthorshipHighlights();
        }
      },
    },

    authorshipRanges: {
      deep: true,
      handler() {
        if (this.showAuthorship) {
          this.applyAuthorshipHighlights();
        }
      },
    },
  },

  methods: {
    getAuthorName(author) {
      const names = {
        human: 'You',
        claude: 'Claude',
        gemini: 'Gemini',
        openai: 'GPT',
        zai: 'Z.AI',
        cursor: 'Grok',
        composer: 'Composer',
        glm: 'Z.AI',
      };
      return names[author] || author;
    },

    applyAuthorshipHighlights() {
      // Clear existing highlights
      this.clearAuthorshipHighlights();

      const { clEditor } = editorSvc;
      if (!clEditor || !clEditor.setOption) return;

      // Inject CSS for authorship colors dynamically
      this.injectAuthorshipStyles();

      // Apply CSS classes to text ranges based on authorship
      this.authorshipRanges.forEach((range) => {
        const className = `authorship-${range.author}`;
        try {
          const from = clEditor.posFromIndex(range.start);
          const to = clEditor.posFromIndex(range.end);
          const marker = clEditor.markText(from, to, {
            className,
            title: `Written by ${this.getAuthorName(range.author)}`,
          });
          this.decorations.push(marker);
        } catch (err) {
          // Range might be invalid if document changed
          console.warn('Failed to apply authorship highlight:', err);
        }
      });
    },

    clearAuthorshipHighlights() {
      // Remove all markers
      this.decorations.forEach((marker) => {
        try {
          marker.clear();
        } catch (err) {
          // Marker might already be cleared
        }
      });
      this.decorations = [];
    },

    injectAuthorshipStyles() {
      // Check if styles already injected
      if (document.getElementById('authorship-styles')) return;

      const styleEl = document.createElement('style');
      styleEl.id = 'authorship-styles';

      const styles = Object.keys(this.$store.state.authorship.authorColors)
        .map((author) => {
          const color = this.getAuthorColor(author);
          return `.authorship-${author} {
            background-color: ${color}20 !important;
            border-bottom: 2px solid ${color}80;
            border-radius: 2px;
          }`;
        })
        .join('\n');

      styleEl.textContent = styles;
      document.head.appendChild(styleEl);
    },
  },

  beforeDestroy() {
    this.clearAuthorshipHighlights();
    // Remove injected styles
    const styleEl = document.getElementById('authorship-styles');
    if (styleEl) {
      styleEl.remove();
    }
  },
};
</script>

<style lang="scss">
@import '../styles/variables.scss';

.authorship-overlay {
  position: relative;
  pointer-events: none; // Allow clicks to pass through to editor
}

// ───────────────────────────────────────────────────────────────
// LEGEND - Shows authorship breakdown
// ───────────────────────────────────────────────────────────────

.authorship-overlay__legend {
  position: fixed;
  bottom: 80px;
  right: 20px;
  background: rgba($body-bg, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid $border-color;
  border-radius: $border-radius-lg;
  padding: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  pointer-events: auto;
  z-index: 100;
  min-width: 160px;

  .app--dark & {
    background: rgba($body-bg-dark, 0.95);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }
}

.authorship-overlay__legend-title {
  font-family: $font-family-display;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: $secondary-text-color;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid $border-color;

  .app--dark & {
    color: rgba(255, 255, 255, 0.6);
    border-bottom-color: $border-color-dark;
  }
}

.authorship-overlay__legend-item {
  display: flex;
  align-items: center;
  padding: 4px 0;
  font-size: 12px;
}

.authorship-overlay__legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.authorship-overlay__legend-name {
  flex: 1;
  color: $text-color;
  font-weight: 500;

  .app--dark & {
    color: $body-color-dark;
  }
}

.authorship-overlay__legend-percent {
  color: $secondary-text-color;
  font-family: $font-family-monospace;
  font-size: 11px;
  margin-left: 8px;

  .app--dark & {
    color: rgba(255, 255, 255, 0.5);
  }
}

// Highlights are now applied via CodeMirror markers with dynamic CSS injection
// See injectAuthorshipStyles() method
</style>
