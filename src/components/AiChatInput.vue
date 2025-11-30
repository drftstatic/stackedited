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

.ai-input {
  border-top: 1px solid $border-color;
  padding: 8px;
  background: linear-gradient(180deg, transparent 0%, rgba($fever-purple, 0.02) 100%);

  .app--dark & {
    background: linear-gradient(180deg, transparent 0%, rgba($fever-teal, 0.03) 100%);
  }
}

.ai-input__container {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.ai-input__textarea {
  flex: 1;
  resize: none;
  border: 1px solid $border-color;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.4;
  min-height: 36px;
  max-height: 150px;
  overflow-y: auto;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: $fever-teal;
    box-shadow: 0 0 8px rgba($fever-teal, 0.3);

    .app--dark & {
      border-color: $fever-purple;
      box-shadow: 0 0 8px rgba($fever-purple, 0.3);
    }
  }

  &::placeholder {
    color: $secondary-text-color;
    font-style: italic;
  }
}

.ai-input__send {
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, $fever-purple 0%, $fever-teal 100%);
  color: white;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba($fever-purple, 0.3);

  .app--dark & {
    background: linear-gradient(135deg, $fever-teal 0%, $fever-purple 100%);
    box-shadow: 0 2px 8px rgba($fever-teal, 0.3);
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba($fever-purple, 0.4);

    .app--dark & {
      box-shadow: 0 4px 12px rgba($fever-teal, 0.4);
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    width: 18px;
    height: 18px;
  }
}

.ai-input__actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.ai-input__action {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.05);
  border: none;
  cursor: pointer;
  color: $secondary-text-color;
  transition: all 0.3s ease;
  letter-spacing: 0.5px;

  .app--dark & {
    background-color: rgba(255, 255, 255, 0.05);
  }

  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);

    .app--dark & {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }
}

.ai-input__action--active {
  background: linear-gradient(135deg, rgba($fever-purple, 0.3) 0%, rgba($fever-teal, 0.3) 100%);
  color: $fever-purple-deep;
  font-weight: 600;

  .app--dark & {
    color: $fever-teal;
  }

  &:hover {
    background: linear-gradient(135deg, rgba($fever-purple, 0.4) 0%, rgba($fever-teal, 0.4) 100%);
  }
}
</style>
