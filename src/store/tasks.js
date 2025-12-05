/**
 * Task Management Vuex Module
 *
 * Tracks tasks for humans and AI agents:
 * - Task creation from chat messages
 * - Assignment to AI agents via @mentions
 * - Status tracking (open, in_progress, completed)
 * - Integration with authorship for tracking who did what
 */

import Vue from 'vue';

export default {
  namespaced: true,

  state: () => ({
    // Map of taskId -> task object
    tasks: {},

    // Show/hide task panel
    showTaskPanel: false,

    // Active filters
    filters: {
      status: 'all', // all, open, in_progress, completed
      assignee: 'all', // all, human, or providerId
    },
  }),

  mutations: {
    /**
     * Add a new task
     */
    addTask(state, task) {
      const taskId = task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newTask = {
        ...task,
        id: taskId,
        createdAt: task.createdAt || Date.now(),
        updatedAt: Date.now(),
        status: task.status || 'open',
        priority: task.priority || null, // high, medium, low
        due: task.due || null, // timestamp
        tags: task.tags || [],
        estimated: task.estimated || null, // ms
      };
      console.log('[tasks/addTask] Mutation adding task:', newTask);
      // Use Vue.set to make Vue 2 reactive to new properties
      Vue.set(state.tasks, taskId, newTask);
      console.log('[tasks/addTask] State after adding:', { ...state.tasks });
    },

    /**
     * Update task properties
     */
    updateTask(state, { taskId, updates }) {
      if (state.tasks[taskId]) {
        Object.assign(state.tasks[taskId], updates, {
          updatedAt: Date.now(),
        });
      }
    },

    /**
     * Delete a task
     */
    deleteTask(state, taskId) {
      delete state.tasks[taskId];
    },

    /**
     * Change task status
     */
    setTaskStatus(state, { taskId, status }) {
      if (state.tasks[taskId]) {
        state.tasks[taskId].status = status;
        state.tasks[taskId].updatedAt = Date.now();
        if (status === 'completed') {
          state.tasks[taskId].completedAt = Date.now();
        }
      }
    },

    /**
     * Assign task to an agent or human
     */
    assignTask(state, { taskId, assignee }) {
      if (state.tasks[taskId]) {
        state.tasks[taskId].assignee = assignee;
        state.tasks[taskId].updatedAt = Date.now();
      }
    },

    /**
     * Toggle task panel visibility
     */
    toggleTaskPanel(state) {
      state.showTaskPanel = !state.showTaskPanel;
    },

    setShowTaskPanel(state, value) {
      state.showTaskPanel = value;
    },

    /**
     * Set filter values
     */
    setFilter(state, { key, value }) {
      state.filters[key] = value;
    },
  },

  getters: {
    /**
     * Get all tasks as array
     */
    allTasks: (state) => Object.values(state.tasks).sort((a, b) => b.createdAt - a.createdAt),

    /**
     * Get filtered tasks
     */
    filteredTasks: (state, getters) => {
      let tasks = getters.allTasks;

      // Filter by status
      if (state.filters.status !== 'all') {
        tasks = tasks.filter((task) => task.status === state.filters.status);
      }

      // Filter by assignee
      if (state.filters.assignee !== 'all') {
        tasks = tasks.filter((task) => task.assignee === state.filters.assignee);
      }

      return tasks;
    },

    /**
     * Get tasks by status
     */
    tasksByStatus: (state, getters) => (status) => getters.allTasks.filter((task) => task.status === status),

    /**
     * Get tasks assigned to a specific agent or human
     */
    tasksByAssignee: (state, getters) => (assignee) => getters.allTasks.filter((task) => task.assignee === assignee),

    /**
     * Count tasks by status
     */
    statusCounts: (state, getters) => {
      const counts = {
        open: 0,
        in_progress: 0,
        completed: 0,
      };

      getters.allTasks.forEach((task) => {
        if (counts[task.status] !== undefined) {
          counts[task.status]++;
        }
      });

      return counts;
    },

    /**
     * Get tasks related to a specific file
     */
    tasksForFile: (state, getters) => (fileId) => getters.allTasks.filter((task) => task.fileId === fileId),
  },

  actions: {
    /**
     * Create a task manually
     */
    createTask({ commit, rootGetters }, {
      description, assignee, status, createdBy, priority, due, tags, estimated, mentions,
    }) {
      console.log('[tasks/createTask] Action called with:', {
        description, assignee, status, createdBy, priority, due, tags, estimated, mentions,
      });

      const currentFile = rootGetters['file/current'];

      const task = {
        description,
        assignee,
        status: status || 'open',
        createdBy: createdBy || 'human',
        fileId: currentFile?.id,
        fileName: currentFile?.name,
        priority,
        due,
        tags: tags || [],
        estimated,
        mentions: mentions || [],
      };

      console.log('[tasks/createTask] Task object:', task);
      commit('addTask', task);
      console.log('[tasks/createTask] Task committed');
    },

    /**
     * Create a task from a chat message
     */
    createTaskFromMessage({ commit, rootGetters }, { messageText, mentions, providerId }) {
      const currentFile = rootGetters['file/current'];

      // Extract task description (remove @mentions)
      const description = messageText.replace(/@\w+/g, '').trim();

      // Determine assignee from mentions
      let assignee = 'human';
      if (mentions && mentions.length > 0) {
        // First AI mention becomes assignee
        const aiMention = mentions.find((m) => m !== 'human' && m !== 'all');
        if (aiMention) {
          // Map mention to provider ID
          const mentionMap = {
            claude: 'claude',
            gemini: 'gemini',
            gpt: 'openai',
            openai: 'openai',
            zai: 'zai',
            grok: 'cursor',
            cursor: 'cursor',
            composer: 'composer',
          };
          assignee = mentionMap[aiMention] || aiMention;
        }
      }

      const task = {
        description,
        assignee,
        status: 'open',
        createdBy: providerId || 'human',
        fileId: currentFile?.id,
        fileName: currentFile?.name,
        mentions,
      };

      commit('addTask', task);
    },

    /**
     * Mark task as in progress
     */
    startTask({ commit }, taskId) {
      commit('setTaskStatus', { taskId, status: 'in_progress' });
    },

    /**
     * Mark task as completed
     */
    completeTask({ commit }, taskId) {
      commit('setTaskStatus', { taskId, status: 'completed' });
    },

    /**
     * Reopen a completed task
     */
    reopenTask({ commit }, taskId) {
      commit('setTaskStatus', { taskId, status: 'open' });
    },

    /**
     * Toggle task panel visibility
     */
    togglePanel({ commit }) {
      commit('toggleTaskPanel');
    },
  },
};
