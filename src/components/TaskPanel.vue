<template>
  <div v-if="showTaskPanel" class="task-panel">
    <!-- Header -->
    <div class="task-panel__header">
      <div class="task-panel__title">
        <span class="task-panel__title-icon">📋</span>
        <span class="task-panel__title-text">Tasks</span>
        <span class="task-panel__count">{{ filteredTasks.length }}</span>
      </div>
      <button
        class="task-panel__close"
        @click="closePanel"
        v-title="'Close task panel'"
      >
        ✕
      </button>
    </div>

    <!-- Filters -->
    <div class="task-panel__filters">
      <!-- Status Filter -->
      <select
        v-model="statusFilter"
        class="task-panel__filter"
        @change="updateStatusFilter"
      >
        <option value="all">All Status</option>
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
      </select>

      <!-- Assignee Filter -->
      <select
        v-model="assigneeFilter"
        class="task-panel__filter"
        @change="updateAssigneeFilter"
      >
        <option value="all">All Agents</option>
        <option value="human">You</option>
        <option value="claude">Claude</option>
        <option value="gemini">Gemini</option>
        <option value="openai">GPT</option>
        <option value="cursor">Grok</option>
        <option value="composer">Composer</option>
      </select>
    </div>

    <!-- Status Summary -->
    <div class="task-panel__summary">
      <div class="task-panel__summary-item">
        <span class="task-panel__summary-dot task-panel__summary-dot--open" />
        <span>{{ statusCounts.open }} Open</span>
      </div>
      <div class="task-panel__summary-item">
        <span class="task-panel__summary-dot task-panel__summary-dot--progress" />
        <span>{{ statusCounts.in_progress }} In Progress</span>
      </div>
      <div class="task-panel__summary-item">
        <span class="task-panel__summary-dot task-panel__summary-dot--done" />
        <span>{{ statusCounts.completed }} Done</span>
      </div>
      <button
        v-if="hasOpenTasks"
        class="task-panel__run-btn"
        @click="runTasks"
        v-title="'Run all open tasks'"
      >
        ▶ Run
      </button>
    </div>

    <!-- Add Task Form -->
    <div v-if="showAddForm" class="task-panel__add-form">
      <textarea
        v-model="newTaskDescription"
        class="task-panel__add-input"
        placeholder="Task description... (Ctrl+Enter to submit)"
        rows="2"
        @keydown.enter="handleEnter"
      />
      <div class="task-panel__add-actions">
        <select v-model="newTaskAssignee" class="task-panel__add-select">
          <option value="claude">Claude</option>
          <option value="gemini">Gemini</option>
          <option value="openai">GPT</option>
          <option value="cursor">Grok</option>
          <option value="composer">Composer</option>
          <option value="human">You</option>
        </select>
        <button class="task-panel__add-btn task-panel__add-btn--save" @click.prevent="addTask">
          Add
        </button>
        <button class="task-panel__add-btn task-panel__add-btn--cancel" @click.prevent="cancelAdd">
          Cancel
        </button>
      </div>
    </div>

    <!-- Add Task Button -->
    <div v-if="!showAddForm" class="task-panel__add-toggle">
      <button class="task-panel__add-toggle-btn" @click="showAddForm = true">
        + New Task
      </button>
    </div>

    <!-- Tasks List -->
    <div class="task-panel__list">
      <div
        v-for="task in filteredTasks"
        :key="task.id"
        class="task-item"
        :class="`task-item--${task.status}`"
      >
        <!-- Task Header -->
        <div class="task-item__header">
          <button
            class="task-item__status-btn"
            @click="cycleTaskStatus(task)"
            v-title="getStatusTooltip(task.status)"
          >
            {{ getStatusIcon(task.status) }}
          </button>
          <div class="task-item__assignee" :style="getAssigneeStyle(task.assignee)">
            {{ getAssigneeName(task.assignee) }}
          </div>
        </div>

        <!-- Task Content -->
        <div class="task-item__content">
          <div class="task-item__description">{{ task.description }}</div>
          <div v-if="task.fileName" class="task-item__file">📄 {{ task.fileName }}</div>
        </div>

        <!-- Task Footer -->
        <div class="task-item__footer">
          <div class="task-item__time">{{ formatTime(task.createdAt) }}</div>
          <button
            class="task-item__delete"
            @click="deleteTask(task.id)"
            v-title="'Delete task'"
          >
            🗑️
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredTasks.length === 0" class="task-panel__empty">
        <p>No tasks yet</p>
        <p class="task-panel__empty-hint">
          Mention an AI agent in chat to create tasks automatically
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from 'vuex';

export default {
  data: () => ({
    statusFilter: 'all',
    assigneeFilter: 'all',
    showAddForm: false,
    newTaskDescription: '',
    newTaskAssignee: 'claude',
    isSubmitting: false, // Prevent duplicate submissions
  }),

  computed: {
    ...mapState('tasks', ['showTaskPanel', 'tasks']),
    ...mapGetters('tasks', ['filteredTasks', 'statusCounts']),
    ...mapGetters('authorship', ['getAuthorColor']),
    hasOpenTasks() {
      // Check ALL tasks, not just filtered ones
      return Object.values(this.tasks).some((task) => task.status === 'open');
    },
  },

  watch: {
    showTaskPanel(newValue) {
      // Sync local filter state with store when panel opens
      if (newValue) {
        this.statusFilter = this.$store.state.tasks.filters.status;
        this.assigneeFilter = this.$store.state.tasks.filters.assignee;
      }
    },
  },

  methods: {
    ...mapMutations('tasks', ['setShowTaskPanel', 'setFilter']),
    ...mapActions('tasks', ['startTask', 'completeTask', 'reopenTask']),

    closePanel() {
      this.setShowTaskPanel(false);
    },

    updateStatusFilter() {
      this.setFilter({ key: 'status', value: this.statusFilter });
    },

    updateAssigneeFilter() {
      this.setFilter({ key: 'assignee', value: this.assigneeFilter });
    },

    cycleTaskStatus(task) {
      // Cycle: open -> in_progress -> completed -> open
      const statusCycle = {
        open: 'in_progress',
        in_progress: 'completed',
        completed: 'open',
      };

      const newStatus = statusCycle[task.status] || 'open';

      if (newStatus === 'in_progress') {
        this.startTask(task.id);
      } else if (newStatus === 'completed') {
        this.completeTask(task.id);
      } else {
        this.reopenTask(task.id);
      }
    },

    deleteTask(taskId) {
      this.$store.commit('tasks/deleteTask', taskId);
    },

    getStatusIcon(status) {
      const icons = {
        open: '○',
        in_progress: '◐',
        completed: '●',
      };
      return icons[status] || '○';
    },

    getStatusTooltip(status) {
      const tooltips = {
        open: 'Click to start task',
        in_progress: 'Click to mark complete',
        completed: 'Click to reopen',
      };
      return tooltips[status] || 'Change status';
    },

    getAssigneeName(assignee) {
      const names = {
        human: 'You',
        claude: 'Claude',
        gemini: 'Gemini',
        openai: 'GPT',
        cursor: 'Grok',
        composer: 'Composer',
      };
      return names[assignee] || assignee;
    },

    getAssigneeStyle(assignee) {
      const color = this.getAuthorColor(assignee);
      return {
        backgroundColor: `${color}20`,
        borderColor: color,
        color,
      };
    },

    formatTime(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;

      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;

      return date.toLocaleDateString();
    },

    handleEnter(event) {
      // Ctrl+Enter or Cmd+Enter submits, plain Enter allows newlines
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        this.addTask();
      }
      // Otherwise allow the default newline behavior
    },

    addTask() {
      console.log('[TaskPanel] addTask called');

      // Prevent duplicate submissions
      if (this.isSubmitting) {
        console.log('[TaskPanel] Already submitting, ignoring');
        return;
      }
      if (!this.newTaskDescription.trim()) {
        console.log('[TaskPanel] Empty description, ignoring');
        return;
      }

      this.isSubmitting = true;
      console.log('[TaskPanel] Creating task:', {
        description: this.newTaskDescription.trim(),
        assignee: this.newTaskAssignee,
      });

      this.$store.dispatch('tasks/createTask', {
        description: this.newTaskDescription.trim(),
        assignee: this.newTaskAssignee,
        status: 'open',
        createdBy: 'human',
      });

      console.log('[TaskPanel] After dispatch, all tasks:', this.$store.getters['tasks/allTasks']);
      console.log('[TaskPanel] Tasks state:', this.$store.state.tasks.tasks);

      // Reset form
      this.newTaskDescription = '';
      this.newTaskAssignee = 'claude';
      this.showAddForm = false;

      // Reset submission flag after a short delay
      setTimeout(() => {
        this.isSubmitting = false;
      }, 300);
    },

    cancelAdd() {
      this.newTaskDescription = '';
      this.newTaskAssignee = 'claude';
      this.showAddForm = false;
    },

    runTasks() {
      // Get all open tasks
      const openTasks = this.filteredTasks.filter((task) => task.status === 'open');

      if (openTasks.length === 0) return;

      // Send each task as a message to the assigned agent
      openTasks.forEach((task) => {
        const mention = `@${task.assignee === 'openai' ? 'gpt' : task.assignee}`;
        const message = `${mention} ${task.description}`;

        // Import aiService dynamically to send message
        import('../services/aiService').then((module) => {
          module.default.sendMessage(message);
        });

        // Mark task as in progress
        this.$store.dispatch('tasks/startTask', task.id);
      });

      this.$store.dispatch('notification/info', `Running ${openTasks.length} task(s)...`);
    },
  },
};
</script>

<style lang="scss">
@import '../styles/variables.scss';

.task-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 380px;
  max-height: 600px;
  background: rgba($body-bg, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid $border-color;
  border-radius: $border-radius-lg;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .app--dark & {
    background: rgba($body-bg-dark, 0.98);
    border-color: $border-color-dark;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }
}

.task-panel__header {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid $border-color;
  background: linear-gradient(135deg, rgba($fever-indigo, 0.08) 0%, transparent 100%);

  .app--dark & {
    border-bottom-color: $border-color-dark;
    background: linear-gradient(135deg, rgba($fever-indigo, 0.12) 0%, transparent 100%);
  }
}

.task-panel__title {
  flex: 1;
  display: flex;
  align-items: center;
  font-family: $font-family-display;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: $text-color;

  .app--dark & {
    color: $body-color-dark;
  }
}

.task-panel__title-icon {
  margin-right: 8px;
  font-size: 18px;
}

.task-panel__count {
  margin-left: 8px;
  font-family: $font-family-monospace;
  font-size: 12px;
  padding: 2px 8px;
  background: rgba($fever-indigo, 0.15);
  border-radius: 12px;
  color: $fever-indigo;
}

.task-panel__close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  color: $secondary-text-color;
  transition: all $transition-base;

  &:hover {
    background: rgba($fever-coral, 0.1);
    color: $fever-coral;
  }
}

.task-panel__filters {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid $border-color;

  .app--dark & {
    border-bottom-color: $border-color-dark;
  }
}

.task-panel__filter {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid $border-color;
  border-radius: $border-radius-base;
  background: rgba(255, 255, 255, 0.05);
  font-size: 12px;
  color: $text-color;
  cursor: pointer;

  .app--dark & {
    border-color: $border-color-dark;
    background: rgba(0, 0, 0, 0.2);
    color: $body-color-dark;
  }
}

.task-panel__summary {
  display: flex;
  gap: 16px;
  padding: 10px 12px;
  border-bottom: 1px solid $border-color;
  font-size: 11px;
  color: $secondary-text-color;
  align-items: center;

  .app--dark & {
    border-bottom-color: $border-color-dark;
  }
}

.task-panel__run-btn {
  margin-left: auto;
  padding: 4px 12px;
  border: 1px solid $fever-lime;
  background: rgba($fever-lime, 0.1);
  border-radius: 12px;
  color: $fever-lime;
  font-family: $font-family-ui;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all $transition-base;

  &:hover {
    background: rgba($fever-lime, 0.2);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba($fever-lime, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
}

.task-panel__summary-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.task-panel__summary-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;

  &--open {
    background: $fever-amber;
  }

  &--progress {
    background: $fever-blue;
  }

  &--done {
    background: $fever-lime;
  }
}

.task-panel__list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.task-item {
  padding: 12px;
  margin-bottom: 8px;
  border-radius: $border-radius-base;
  border-left: 3px solid;
  background: rgba(255, 255, 255, 0.5);
  transition: all $transition-base;

  .app--dark & {
    background: rgba(0, 0, 0, 0.2);
  }

  &:hover {
    transform: translateX(2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &--open {
    border-left-color: $fever-amber;
  }

  &--in_progress {
    border-left-color: $fever-blue;
  }

  &--completed {
    border-left-color: $fever-lime;
    opacity: 0.7;
  }
}

.task-item__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.task-item__status-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba($fever-indigo, 0.1);
  cursor: pointer;
  font-size: 14px;
  transition: all $transition-base;

  &:hover {
    transform: scale(1.1);
    background: rgba($fever-indigo, 0.2);
  }
}

.task-item__assignee {
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid;
  font-family: $font-family-ui;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.task-item__content {
  margin-bottom: 8px;
}

.task-item__description {
  font-size: 13px;
  line-height: 1.4;
  color: $text-color;
  margin-bottom: 6px;

  .app--dark & {
    color: $body-color-dark;
  }
}

.task-item__file {
  font-size: 11px;
  color: $secondary-text-color;
  font-family: $font-family-monospace;
}

.task-item__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.task-item__time {
  font-size: 10px;
  color: $secondary-text-color;
  font-family: $font-family-monospace;
}

.task-item__delete {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  opacity: 0.5;
  transition: all $transition-base;

  &:hover {
    opacity: 1;
    transform: scale(1.1);
  }
}

.task-panel__empty {
  text-align: center;
  padding: 40px 20px;
  color: $secondary-text-color;

  p {
    margin: 8px 0;
  }

  p:first-child {
    font-size: 14px;
    font-weight: 600;
  }
}

.task-panel__empty-hint {
  font-size: 12px;
  font-style: italic;
  opacity: 0.7;
}

// ───────────────────────────────────────────────────────────────
// ADD TASK FORM - Manual task creation
// ───────────────────────────────────────────────────────────────

.task-panel__add-toggle {
  padding: 8px 12px;
  border-bottom: 1px solid $border-color;

  .app--dark & {
    border-bottom-color: $border-color-dark;
  }
}

.task-panel__add-toggle-btn {
  width: 100%;
  padding: 8px 12px;
  border: 1px dashed rgba($fever-indigo, 0.3);
  background: rgba($fever-indigo, 0.03);
  border-radius: $border-radius-base;
  color: $fever-indigo;
  font-family: $font-family-ui;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all $transition-base;

  &:hover {
    background: rgba($fever-indigo, 0.08);
    border-style: solid;
    border-color: $fever-indigo;
  }
}

.task-panel__add-form {
  padding: 12px;
  border-bottom: 1px solid $border-color;
  background: rgba($fever-indigo, 0.03);

  .app--dark & {
    border-bottom-color: $border-color-dark;
    background: rgba($fever-indigo, 0.05);
  }
}

.task-panel__add-input {
  width: 100%;
  padding: 8px;
  border: 1px solid $border-color;
  border-radius: $border-radius-base;
  background: rgba(255, 255, 255, 0.5);
  font-family: $font-family-main;
  font-size: 13px;
  color: $text-color;
  resize: vertical;
  margin-bottom: 8px;

  .app--dark & {
    border-color: $border-color-dark;
    background: rgba(0, 0, 0, 0.2);
    color: $body-color-dark;
  }

  &::placeholder {
    color: $secondary-text-color;
    opacity: 0.6;
  }

  &:focus {
    outline: none;
    border-color: $fever-indigo;
    box-shadow: 0 0 0 2px rgba($fever-indigo, 0.2);
  }
}

.task-panel__add-actions {
  display: flex;
  gap: 8px;
}

.task-panel__add-select {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid $border-color;
  border-radius: $border-radius-base;
  background: rgba(255, 255, 255, 0.5);
  font-family: $font-family-ui;
  font-size: 11px;
  color: $text-color;
  cursor: pointer;

  .app--dark & {
    border-color: $border-color-dark;
    background: rgba(0, 0, 0, 0.2);
    color: $body-color-dark;
  }
}

.task-panel__add-btn {
  padding: 6px 12px;
  border: 1px solid;
  border-radius: $border-radius-base;
  font-family: $font-family-ui;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all $transition-base;

  &--save {
    border-color: $fever-lime;
    background: rgba($fever-lime, 0.1);
    color: $fever-lime;

    &:hover {
      background: rgba($fever-lime, 0.2);
    }
  }

  &--cancel {
    border-color: $fever-coral;
    background: rgba($fever-coral, 0.1);
    color: $fever-coral;

    &:hover {
      background: rgba($fever-coral, 0.2);
    }
  }
}
</style>
