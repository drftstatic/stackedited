<template>
  <div class="ai-diff-modal">
    <div class="ai-diff-modal__backdrop" @click="reject"></div>
    <div class="ai-diff-modal__content">
      <div class="ai-diff-modal__header">
        <h3>Review AI Edit</h3>
        <span class="ai-diff-modal__type">{{ editTypeLabel }}</span>
      </div>

      <!-- Explanation -->
      <div v-if="pendingEdit?.explanation" class="ai-diff-modal__explanation">
        {{ pendingEdit.explanation }}
      </div>

      <!-- Diff view -->
      <div class="ai-diff-modal__diff">
        <div class="ai-diff-modal__diff-header">
          <span class="ai-diff-modal__diff-label ai-diff-modal__diff-label--old">Current</span>
          <span class="ai-diff-modal__diff-label ai-diff-modal__diff-label--new">Proposed</span>
        </div>
        <div class="ai-diff-modal__diff-content">
          <div class="ai-diff-modal__diff-side ai-diff-modal__diff-side--old">
            <pre>{{ truncatedOld }}</pre>
          </div>
          <div class="ai-diff-modal__diff-side ai-diff-modal__diff-side--new">
            <pre>{{ truncatedNew }}</pre>
          </div>
        </div>
      </div>

      <!-- For suggestEdit, show the specific change -->
      <div v-if="pendingEdit?.type === 'suggestEdit'" class="ai-diff-modal__specific">
        <div class="ai-diff-modal__specific-item">
          <span class="ai-diff-modal__specific-label">Find:</span>
          <code class="ai-diff-modal__specific-old">{{ pendingEdit.search }}</code>
        </div>
        <div class="ai-diff-modal__specific-item">
          <span class="ai-diff-modal__specific-label">Replace:</span>
          <code class="ai-diff-modal__specific-new">{{ pendingEdit.replace }}</code>
        </div>
      </div>

      <!-- Actions -->
      <div class="ai-diff-modal__actions">
        <button class="ai-diff-modal__btn ai-diff-modal__btn--reject" @click="reject">
          Reject
        </button>
        <button class="ai-diff-modal__btn ai-diff-modal__btn--accept" @click="accept">
          Accept (⌘+Enter)
        </button>
      </div>

      <!-- Keyboard shortcut hint -->
      <div class="ai-diff-modal__hint">
        Press <kbd>Escape</kbd> to reject, <kbd>⌘+Enter</kbd> to accept
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import aiService from '../services/aiService';

export default {
  computed: {
    ...mapState('aiChat', ['pendingEdit']),
    editTypeLabel() {
      if (this.pendingEdit?.type === 'updateNotepad') {
        return 'Full Document Update';
      }
      if (this.pendingEdit?.type === 'suggestEdit') {
        return 'Targeted Edit';
      }
      return 'Edit';
    },
    truncatedOld() {
      const text = this.pendingEdit?.previousContent || '';
      if (text.length > 2000) {
        return text.slice(0, 1000) + '\n\n... (truncated) ...\n\n' + text.slice(-1000);
      }
      return text;
    },
    truncatedNew() {
      const text = this.pendingEdit?.newContent || '';
      if (text.length > 2000) {
        return text.slice(0, 1000) + '\n\n... (truncated) ...\n\n' + text.slice(-1000);
      }
      return text;
    },
  },
  methods: {
    accept() {
      aiService.applyEdit();
    },
    reject() {
      aiService.rejectEdit();
    },
    handleKeydown(e) {
      if (e.key === 'Escape') {
        this.reject();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        this.accept();
      }
    },
  },
  mounted() {
    document.addEventListener('keydown', this.handleKeydown);
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.handleKeydown);
  },
};
</script>

<style lang="scss">
@import '../styles/variables.scss';

.ai-diff-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-diff-modal__backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.ai-diff-modal__content {
  position: relative;
  background-color: $body-bg;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 900px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ai-diff-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid $border-color;

  h3 {
    margin: 0;
    font-size: 18px;
  }
}

.ai-diff-modal__type {
  font-size: 12px;
  padding: 4px 8px;
  background-color: rgba($link-color, 0.1);
  color: $link-color;
  border-radius: 4px;
}

.ai-diff-modal__explanation {
  padding: 12px 20px;
  background-color: rgba(255, 193, 7, 0.1);
  font-size: 14px;
  color: #f57c00;
}

.ai-diff-modal__diff {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ai-diff-modal__diff-header {
  display: flex;
  border-bottom: 1px solid $border-color;
}

.ai-diff-modal__diff-label {
  flex: 1;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.ai-diff-modal__diff-label--old {
  background-color: rgba(244, 67, 54, 0.1);
  color: #d32f2f;
}

.ai-diff-modal__diff-label--new {
  background-color: rgba(76, 175, 80, 0.1);
  color: #388e3c;
}

.ai-diff-modal__diff-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.ai-diff-modal__diff-side {
  flex: 1;
  overflow: auto;
  padding: 12px 16px;
  font-family: monospace;
  font-size: 13px;
  line-height: 1.4;

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
}

.ai-diff-modal__diff-side--old {
  background-color: rgba(244, 67, 54, 0.03);
  border-right: 1px solid $border-color;
}

.ai-diff-modal__diff-side--new {
  background-color: rgba(76, 175, 80, 0.03);
}

.ai-diff-modal__specific {
  padding: 12px 20px;
  background-color: rgba(0, 0, 0, 0.02);
  border-top: 1px solid $border-color;
}

.ai-diff-modal__specific-item {
  margin: 8px 0;
}

.ai-diff-modal__specific-label {
  font-size: 12px;
  font-weight: 600;
  color: $secondary-text-color;
  margin-right: 8px;
}

.ai-diff-modal__specific-old {
  background-color: rgba(244, 67, 54, 0.15);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
}

.ai-diff-modal__specific-new {
  background-color: rgba(76, 175, 80, 0.15);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
}

.ai-diff-modal__actions {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid $border-color;
  justify-content: flex-end;
}

.ai-diff-modal__btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
}

.ai-diff-modal__btn--reject {
  background-color: rgba(0, 0, 0, 0.05);
  color: $secondary-text-color;

  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
}

.ai-diff-modal__btn--accept {
  background-color: #4caf50;
  color: white;

  &:hover {
    background-color: #43a047;
  }
}

.ai-diff-modal__hint {
  padding: 8px 20px;
  font-size: 11px;
  color: $secondary-text-color;
  text-align: center;
  border-top: 1px solid $border-color;

  kbd {
    background-color: rgba(0, 0, 0, 0.08);
    padding: 2px 6px;
    border-radius: 3px;
    font-family: inherit;
  }
}
</style>
