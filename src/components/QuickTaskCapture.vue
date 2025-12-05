<template>
  <transition name="quick-task">
    <div v-if="isVisible" class="quick-task-capture" @click.self="close">
      <div class="quick-task-capture__modal">
        <div class="quick-task-capture__header">
          <h3 class="quick-task-capture__title">Quick Add Task</h3>
          <button
            class="quick-task-capture__close"
            @click="close"
            title="Close (Esc)"
          >
            ×
          </button>
        </div>

        <div class="quick-task-capture__body">
          <textarea
            ref="input"
            v-model="taskInput"
            class="quick-task-capture__input"
            placeholder="Type your task... Try: Fix auth bug @claude high due:tomorrow #security"
            rows="3"
            @keydown.enter="handleEnter"
            @keydown.esc="close"
          />

          <!-- Preview parsed metadata -->
          <div v-if="parsedTask && taskInput.trim()" class="quick-task-capture__preview">
            <div class="quick-task-capture__preview-label">Preview:</div>
            <div class="quick-task-capture__preview-items">
              <span v-if="parsedTask.assignee" class="quick-task-capture__tag quick-task-capture__tag--assignee">
                @{{ parsedTask.assignee }}
              </span>
              <span v-if="parsedTask.priority" class="quick-task-capture__tag quick-task-capture__tag--priority" :class="`quick-task-capture__tag--${parsedTask.priority}`">
                {{ parsedTask.priority }}
              </span>
              <span v-if="parsedTask.due" class="quick-task-capture__tag quick-task-capture__tag--due">
                {{ formatDate(parsedTask.due) }}
              </span>
              <span v-for="tag in parsedTask.tags" :key="tag" class="quick-task-capture__tag quick-task-capture__tag--label">
                #{{ tag }}
              </span>
              <span v-if="parsedTask.estimated" class="quick-task-capture__tag quick-task-capture__tag--estimate">
                {{ formatEstimate(parsedTask.estimated) }}
              </span>
            </div>
          </div>

          <div class="quick-task-capture__hint">
            Press <kbd>Enter</kbd> to add • <kbd>Esc</kbd> to cancel
          </div>
        </div>

        <div class="quick-task-capture__actions">
          <button
            class="quick-task-capture__btn quick-task-capture__btn--cancel"
            @click="close"
          >
            Cancel
          </button>
          <button
            class="quick-task-capture__btn quick-task-capture__btn--submit"
            @click="submit"
            :disabled="!taskInput.trim()"
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { mapActions } from 'vuex';
import taskParser from '../services/taskParser';

export default {
  name: 'QuickTaskCapture',

  data: () => ({
    isVisible: false,
    taskInput: '',
    parsedTask: null,
  }),

  watch: {
    taskInput(newVal) {
      // Parse as user types
      if (newVal.trim()) {
        this.parsedTask = taskParser.parse(newVal);
      } else {
        this.parsedTask = null;
      }
    },
  },

  methods: {
    ...mapActions('tasks', ['createTask']),

    /**
     * Show the quick capture modal
     */
    show() {
      this.isVisible = true;
      this.$nextTick(() => {
        this.$refs.input?.focus();
      });
    },

    /**
     * Close the modal and reset
     */
    close() {
      this.isVisible = false;
      this.taskInput = '';
      this.parsedTask = null;
    },

    /**
     * Handle Enter key (submit unless Shift+Enter for newline)
     */
    handleEnter(event) {
      if (event.shiftKey) {
        // Allow newline with Shift+Enter
        return;
      }

      event.preventDefault();
      this.submit();
    },

    /**
     * Submit the task
     */
    submit() {
      if (!this.taskInput.trim()) return;

      const parsed = taskParser.parse(this.taskInput);

      // Create task with parsed metadata
      this.createTask({
        description: parsed.description || this.taskInput.trim(),
        assignee: parsed.assignee || 'human',
        status: 'open',
        createdBy: 'human',
        priority: parsed.priority,
        due: parsed.due ? parsed.due.getTime() : null,
        tags: parsed.tags,
        estimated: parsed.estimated,
        mentions: parsed.mentions,
      });

      // Show brief success feedback
      this.$store.dispatch('notification/success', 'Task created!');

      // Close and reset
      this.close();
    },

    /**
     * Format date for display
     */
    formatDate(date) {
      return taskParser.formatDate(date);
    },

    /**
     * Format estimate for display
     */
    formatEstimate(ms) {
      return taskParser.formatEstimate(ms);
    },
  },
};
</script>

<style scoped>
/* Modal overlay */
.quick-task-capture {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

/* Modal box */
.quick-task-capture__modal {
  background: var(--background-primary, #1e1e1e);
  border: 1px solid var(--border-color, #3e3e3e);
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Header */
.quick-task-capture__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color, #3e3e3e);
}

.quick-task-capture__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #e0e0e0);
}

.quick-task-capture__close {
  background: none;
  border: none;
  color: var(--text-secondary, #a0a0a0);
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s;
}

.quick-task-capture__close:hover {
  background-color: var(--background-hover, #2a2a2a);
  color: var(--text-primary, #e0e0e0);
}

/* Body */
.quick-task-capture__body {
  padding: 20px;
}

.quick-task-capture__input {
  width: 100%;
  background-color: var(--background-secondary, #2a2a2a);
  border: 1px solid var(--border-color, #3e3e3e);
  border-radius: 4px;
  color: var(--text-primary, #e0e0e0);
  padding: 12px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.15s;
}

.quick-task-capture__input:focus {
  outline: none;
  border-color: var(--accent-color, #007acc);
}

.quick-task-capture__input::placeholder {
  color: var(--text-tertiary, #666);
}

/* Preview */
.quick-task-capture__preview {
  margin-top: 12px;
  padding: 12px;
  background-color: var(--background-secondary, #2a2a2a);
  border-radius: 4px;
  border: 1px solid var(--border-color, #3e3e3e);
}

.quick-task-capture__preview-label {
  font-size: 11px;
  text-transform: uppercase;
  color: var(--text-tertiary, #666);
  margin-bottom: 8px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.quick-task-capture__preview-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.quick-task-capture__tag {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
}

.quick-task-capture__tag--assignee {
  background-color: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.quick-task-capture__tag--priority {
  font-weight: 600;
}

.quick-task-capture__tag--high {
  background-color: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.quick-task-capture__tag--medium {
  background-color: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.quick-task-capture__tag--low {
  background-color: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}

.quick-task-capture__tag--due {
  background-color: rgba(168, 85, 247, 0.2);
  color: #c084fc;
}

.quick-task-capture__tag--label {
  background-color: rgba(99, 102, 241, 0.2);
  color: #818cf8;
}

.quick-task-capture__tag--estimate {
  background-color: rgba(45, 212, 191, 0.2);
  color: #5eead4;
}

/* Hint */
.quick-task-capture__hint {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-tertiary, #666);
}

.quick-task-capture__hint kbd {
  display: inline-block;
  padding: 2px 6px;
  background-color: var(--background-secondary, #2a2a2a);
  border: 1px solid var(--border-color, #3e3e3e);
  border-radius: 3px;
  font-family: monospace;
  font-size: 11px;
  font-weight: 600;
}

/* Actions */
.quick-task-capture__actions {
  padding: 12px 20px;
  border-top: 1px solid var(--border-color, #3e3e3e);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.quick-task-capture__btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}

.quick-task-capture__btn--cancel {
  background-color: transparent;
  border-color: var(--border-color, #3e3e3e);
  color: var(--text-secondary, #a0a0a0);
}

.quick-task-capture__btn--cancel:hover {
  background-color: var(--background-hover, #2a2a2a);
  color: var(--text-primary, #e0e0e0);
}

.quick-task-capture__btn--submit {
  background-color: var(--accent-color, #007acc);
  color: white;
}

.quick-task-capture__btn--submit:hover:not(:disabled) {
  background-color: var(--accent-color-hover, #005a9e);
}

.quick-task-capture__btn--submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Transitions */
.quick-task-enter-active,
.quick-task-leave-active {
  transition: opacity 0.2s;
}

.quick-task-enter-from,
.quick-task-leave-to {
  opacity: 0;
}
</style>
