<template>
  <div class="ai-input">
    <div class="ai-input__container">
      <textarea
        ref="input"
        v-model="text"
        class="ai-input__textarea"
        placeholder="Ask AI to help with your document..."
        rows="1"
        @keydown="handleKeydown"
        @input="autoResize"
      />
      <button
        v-title="'Send message (Cmd+Enter)'"
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
      // Cmd/Ctrl + Enter to send
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
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
  background-color: $body-bg;
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

  &:focus {
    outline: none;
    border-color: $link-color;
  }

  &::placeholder {
    color: $secondary-text-color;
  }
}

.ai-input__send {
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $link-color;
  color: white;
  border-radius: 8px;
  border: none;
  cursor: pointer;

  &:hover:not(:disabled) {
    background-color: darken($link-color, 10%);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
}

.ai-input__action--active {
  background-color: rgba($link-color, 0.2);
  color: $link-color;
}
</style>
