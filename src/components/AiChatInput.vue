<template>
  <div class="ai-input">
    <div class="ai-input__container">
      <textarea
        ref="input"
        v-model="text"
        class="ai-input__textarea"
        placeholder="Ask Ted anything... or just say hi"
        rows="1"
        @keydown="handleKeydown"
        @input="autoResize"
      />
      <button
        v-title="'Send message (Enter)'"
        class="ai-input__send button"
        :disabled="!canSend"
        @click="send"
      >
        <icon-send />
      </button>
    </div>
    <div class="ai-input__actions">
      <button
        v-title="trustMode ? 'Disable trust mode' : 'Enable trust mode (auto-apply edits)'"
        class="ai-input__action button"
        :class="{ 'ai-input__action--active': trustMode }"
        @click="toggleTrustMode"
      >
        {{ trustMode ? 'Trust: ON' : 'Trust: OFF' }}
      </button>
      <button
        v-title="'Clear conversation'"
        class="ai-input__action button"
        @click="clearHistory"
      >
        Clear
      </button>
      <button
        v-if="canUndo"
        v-title="'Undo last AI edit'"
        class="ai-input__action button"
        @click="undoLastEdit"
      >
        Undo Edit
      </button>
    </div>
  </div>
</template>

<script>
import {
  mapState, mapGetters, mapActions, mapMutations,
} from 'vuex';
import aiService from '../services/aiService';

export default {
  data: () => ({
    text: '',
  }),
  computed: {
    ...mapState('aiChat', [
      'connected',
      'thinking',
      'trustMode',
      'editHistory',
    ]),
    canSend() {
      return this.connected && !this.thinking && this.text.trim().length > 0;
    },
    canUndo() {
      return this.editHistory.length > 0;
    },
  },
  methods: {
    ...mapMutations('aiChat', [
      'setTrustMode',
    ]),
    send() {
      if (!this.canSend) return;

      const message = this.text.trim();
      this.text = '';
      this.$emit('send', message);

      // Reset textarea height
      this.$nextTick(() => {
        this.$refs.input.style.height = 'auto';
      });
    },
    handleKeydown(e) {
      // Enter to send (Shift+Enter for new line)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
    },
    autoResize() {
      const el = this.$refs.input;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
    },
    toggleTrustMode() {
      this.setTrustMode(!this.trustMode);
    },
    clearHistory() {
      aiService.clearHistory();
    },
    undoLastEdit() {
      aiService.undoLastEdit();
    },
  },
  mounted() {
    // Focus input when panel opens
    this.$refs.input.focus();
  },
};
</script>

<style lang="scss">
@import '../styles/variables.scss';

// ═══════════════════════════════════════════════════════════════
// CHAT INPUT - The portal to Ted's consciousness
// ═══════════════════════════════════════════════════════════════

.ai-input {
  border-top: 1px solid rgba($fever-purple, 0.15);
  padding: 12px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba($fever-purple, 0.03) 50%,
    rgba($fever-teal, 0.02) 100%
  );
  position: relative;

  .app--dark & {
    border-top-color: rgba($fever-teal, 0.15);
    background: linear-gradient(
      180deg,
      transparent 0%,
      rgba($fever-teal, 0.04) 50%,
      rgba($fever-purple, 0.03) 100%
    );
  }

  // Top accent line
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 20%;
    right: 20%;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba($fever-purple, 0.3),
      rgba($fever-teal, 0.3),
      transparent
    );

    .app--dark & {
      background: linear-gradient(
        90deg,
        transparent,
        rgba($fever-teal, 0.4),
        rgba($fever-purple, 0.4),
        transparent
      );
    }
  }
}

.ai-input__container {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.ai-input__textarea {
  flex: 1;
  resize: none;
  border: 1px solid rgba($fever-purple, 0.2);
  border-radius: $border-radius-lg;
  padding: 10px 14px;
  font-family: $font-family-main;
  font-size: 14px;
  line-height: 1.5;
  min-height: 40px;
  max-height: 150px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.9);
  transition: all $transition-base;

  .app--dark & {
    border-color: rgba($fever-teal, 0.25);
    background: rgba($fever-ghost-dark, 0.8);
    color: rgba(255, 255, 255, 0.9);
  }

  &:focus {
    outline: none;
    border-color: $fever-teal;
    box-shadow:
      0 0 0 3px rgba($fever-teal, 0.15),
      0 0 20px rgba($fever-teal, 0.1);

    .app--dark & {
      border-color: $fever-purple;
      box-shadow:
        0 0 0 3px rgba($fever-purple, 0.2),
        0 0 20px rgba($fever-purple, 0.15);
    }
  }

  &::placeholder {
    color: rgba($fever-purple, 0.4);
    font-style: italic;

    .app--dark & {
      color: rgba($fever-teal, 0.5);
    }
  }
}

// ───────────────────────────────────────────────────────────────
// SEND BUTTON - Launch into the fever
// ───────────────────────────────────────────────────────────────

.ai-input__send {
  width: 40px;
  height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, $fever-purple 0%, $fever-teal 100%);
  color: white;
  border-radius: $border-radius-lg;
  border: none;
  cursor: pointer;
  transition: all $transition-base;
  box-shadow: 0 4px 12px rgba($fever-purple, 0.3);
  position: relative;
  overflow: hidden;

  .app--dark & {
    background: linear-gradient(135deg, $fever-teal 0%, $fever-purple 100%);
    box-shadow: 0 4px 12px rgba($fever-teal, 0.3);
  }

  // Shimmer effect on button
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      transparent 0%,
      rgba(255, 255, 255, 0.2) 50%,
      transparent 100%
    );
    opacity: 0;
    transition: opacity $transition-base;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px) scale(1.02);
    box-shadow:
      0 6px 16px rgba($fever-purple, 0.4),
      0 0 30px rgba($fever-teal, 0.2);

    .app--dark & {
      box-shadow:
        0 6px 16px rgba($fever-teal, 0.4),
        0 0 30px rgba($fever-purple, 0.2);
    }

    &::before {
      opacity: 1;
    }
  }

  &:active:not(:disabled) {
    transform: translateY(0) scale(0.98);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  svg {
    width: 20px;
    height: 20px;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
  }
}

// ───────────────────────────────────────────────────────────────
// ACTION BUTTONS - Control Ted's behavior
// ───────────────────────────────────────────────────────────────

.ai-input__actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.ai-input__action {
  font-family: $font-family-ui;
  font-size: 10px;
  font-weight: 500;
  padding: 6px 10px;
  border-radius: $border-radius-base;
  background: rgba($fever-purple, 0.06);
  border: 1px solid rgba($fever-purple, 0.1);
  cursor: pointer;
  color: $fever-purple-deep;
  transition: all $transition-base;
  letter-spacing: 0.8px;
  text-transform: uppercase;

  .app--dark & {
    background: rgba($fever-teal, 0.08);
    border-color: rgba($fever-teal, 0.15);
    color: $fever-teal;
  }

  &:hover {
    background: rgba($fever-purple, 0.12);
    border-color: rgba($fever-purple, 0.2);
    transform: translateY(-1px);

    .app--dark & {
      background: rgba($fever-teal, 0.15);
      border-color: rgba($fever-teal, 0.25);
    }
  }
}

.ai-input__action--active {
  background: linear-gradient(
    135deg,
    rgba($fever-purple, 0.2) 0%,
    rgba($fever-teal, 0.15) 100%
  );
  border-color: rgba($fever-purple, 0.3);
  color: $fever-purple-deep;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba($fever-purple, 0.15);

  .app--dark & {
    background: linear-gradient(
      135deg,
      rgba($fever-teal, 0.25) 0%,
      rgba($fever-purple, 0.2) 100%
    );
    border-color: rgba($fever-teal, 0.35);
    color: $fever-teal;
    box-shadow: 0 2px 8px rgba($fever-teal, 0.2);
  }

  &:hover {
    background: linear-gradient(
      135deg,
      rgba($fever-purple, 0.25) 0%,
      rgba($fever-teal, 0.2) 100%
    );

    .app--dark & {
      background: linear-gradient(
        135deg,
        rgba($fever-teal, 0.3) 0%,
        rgba($fever-purple, 0.25) 100%
      );
    }
  }
}
</style>
