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

    <!-- Color Highlights (rendered as background highlights in editor) -->
    <div class="authorship-overlay__highlights">
      <div
        v-for="(range, index) in authorshipRanges"
        :key="`${range.author}-${index}`"
        class="authorship-overlay__highlight"
        :style="getHighlightStyle(range)"
        :title="`Written by ${getAuthorName(range.author)} at ${formatTimestamp(range.timestamp)}`"
      />
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';

export default {
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
      };
      return names[author] || author;
    },

    getHighlightStyle(range) {
      const color = this.getAuthorColor(range.author);
      return {
        backgroundColor: `${color}15`, // 15 = ~8% opacity in hex
        borderLeft: `3px solid ${color}`,
        // Position would be calculated based on text offset in the editor
        // This is a simplified version - real implementation would need
        // to calculate pixel positions from character offsets
      };
    },

    formatTimestamp(timestamp) {
      return new Date(timestamp).toLocaleString();
    },
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

// ───────────────────────────────────────────────────────────────
// HIGHLIGHTS - Color-coded text ranges
// ───────────────────────────────────────────────────────────────

.authorship-overlay__highlights {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.authorship-overlay__highlight {
  position: absolute;
  border-radius: 2px;
  transition: background-color $transition-base;
  pointer-events: auto;
  cursor: help;

  &:hover {
    opacity: 0.8;
  }
}
</style>
