<template>
  <div class="ai-chat">
    <!-- Header -->
    <div class="ai-chat__header">
      <div class="ai-chat__title">
        <span class="ai-chat__title-text">AI Chat</span>
        <span class="ai-chat__title-subtitle">multi-provider workspace</span>
      </div>
      <!-- Task Panel Toggle -->
      <button
        class="ai-chat__task-toggle"
        @click="toggleTaskPanel"
        v-title="'Toggle task panel'"
      >
        <span class="ai-chat__task-icon">📋</span>
        <span v-if="taskCount > 0" class="ai-chat__task-badge">{{ taskCount }}</span>
      </button>
      <!-- Connection Status -->
      <div class="ai-chat__status" :class="statusClass">
        <span class="ai-chat__status-dot" />
        <span class="ai-chat__status-text">{{ statusText }}</span>
      </div>
    </div>

    <!-- Provider Selector -->
    <ai-provider-selector />

    <!-- Messages -->
    <div ref="messages" class="ai-chat__messages">
      <div v-if="messages.length === 0" class="ai-chat__empty">
        <p>Select a provider and start chatting.</p>
        <p class="ai-chat__hint">Your AI assistants can edit documents, research topics, and collaborate on ideas.</p>
      </div>
      <ai-chat-message
        v-for="message in messages"
        :key="message.id"
        :message="message"
      />
      <div v-if="thinking" class="ai-chat__thinking">
        <span class="ai-chat__thinking-text">{{ thinkingText }}</span>
        <span class="ai-chat__thinking-dot" />
        <span class="ai-chat__thinking-dot" />
        <span class="ai-chat__thinking-dot" />
      </div>
      <div v-if="awaitingHuman" class="ai-chat__awaiting">
        <span class="ai-chat__awaiting-icon">👤</span>
        <span class="ai-chat__awaiting-text">Waiting for human input...</span>
        <button class="ai-chat__awaiting-btn" @click="resumeChat">Resume</button>
      </div>
    </div>

    <!-- Input -->
    <ai-chat-input @send="sendMessage" />

    <!-- Diff Modal -->
    <ai-diff-modal v-if="showDiffModal" />
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import aiService from '../services/aiService';
import AiChatMessage from './AiChatMessage';
import AiChatInput from './AiChatInput';
import AiProviderSelector from './AiProviderSelector';
import AiDiffModal from './AiDiffModal';

export default {
  components: {
    AiChatMessage,
    AiChatInput,
    AiProviderSelector,
    AiDiffModal,
  },
  computed: {
    ...mapState('aiChat', [
      'connected',
      'thinking',
      'messages',
      'showDiffModal',
      'error',
      'error',
      'providerId',
      'providerId',
      'awaitingHuman',
      'chaining',
    ]),
    ...mapGetters('aiChat', [
      'connectionStatus',
      'currentProvider',
    ]),
    ...mapGetters('tasks', ['filteredTasks']),
    taskCount() {
      // Count non-completed tasks
      return this.filteredTasks.filter((t) => t.status !== 'completed').length;
    },
    statusClass() {
      return `ai-chat__status--${this.connectionStatus}`;
    },
    statusText() {
      switch (this.connectionStatus) {
        case 'connected': return 'Connected';
        case 'error': return this.error || 'Connection error';
        default: return 'Connecting...';
      }
    },
    currentProviderName() {
      const names = {
        claude: 'Claude',
        gemini: 'Gemini',
        openai: 'GPT',
        xai: 'X.AI',
        cursor: 'Grok',
        composer: 'Composer',
      };
      return names[this.providerId] || 'AI';
    },
    thinkingText() {
      if (this.chaining) {
        const names = {
          claude: 'Claude',
          gemini: 'Gemini',
          openai: 'GPT',
          xai: 'X.AI',
          cursor: 'Grok',
          composer: 'Composer',
        };
        const target = names[this.chaining.toProvider] || this.chaining.toProvider;
        return `Chaining to ${target} (Hop ${this.chaining.hop})...`;
      }
      return `${this.currentProviderName} is thinking...`;
    },
  },
  watch: {
    messages() {
      // Scroll to bottom when new messages arrive
      this.$nextTick(() => {
        const el = this.$refs.messages;
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      });
    },
  },
  methods: {
    sendMessage(text) {
      aiService.sendMessage(text);
    },
    reconnect() {
      aiService.connect().catch(() => {});
    },
    resumeChat() {
      this.$store.commit('aiChat/setAwaitingHuman', false);
      // Optionally send a signal to server that human is back/approved
      // For now, just clearing the state allows user to type
    },
    toggleTaskPanel() {
      this.$store.commit('tasks/toggleTaskPanel');
    },
  },
};
</script>

<style lang="scss">
@import '../styles/variables.scss';

// ═══════════════════════════════════════════════════════════════
// AI Chat - Multi-Provider Workspace
// ═══════════════════════════════════════════════════════════════

.ai-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
  background: linear-gradient(
    180deg,
    rgba($fever-purple, 0.03) 0%,
    transparent 40%,
    rgba($fever-teal, 0.02) 100%
  );
  position: relative;

  .app--dark & {
    background: linear-gradient(
      180deg,
      rgba($fever-teal, 0.04) 0%,
      transparent 40%,
      rgba($fever-purple, 0.03) 100%
    );
  }

  // Subtle noise texture overlay
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: $noise-pattern;
    opacity: 0.015;
    pointer-events: none;
    mix-blend-mode: overlay;
  }
}

// ───────────────────────────────────────────────────────────────
// HEADER - Title and status
// ───────────────────────────────────────────────────────────────

.ai-chat__header {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid rgba($fever-purple, 0.15);
  background: linear-gradient(
    135deg,
    rgba($fever-purple, 0.08) 0%,
    rgba($fever-teal, 0.06) 50%,
    rgba($fever-purple, 0.04) 100%
  );
  position: relative;
  overflow: hidden;

  .app--dark & {
    background: linear-gradient(
      135deg,
      rgba($fever-teal, 0.1) 0%,
      rgba($fever-purple, 0.08) 50%,
      rgba($fever-teal, 0.05) 100%
    );
    border-bottom-color: rgba($fever-teal, 0.15);
  }

  // Animated gradient overlay
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba($fever-purple, 0.05) 25%,
      rgba($fever-teal, 0.05) 75%,
      transparent 100%
    );
    animation: header-shimmer 8s ease-in-out infinite;
    pointer-events: none;
  }

  // Bottom accent line
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      $fever-purple 20%,
      $fever-teal 80%,
      transparent 100%
    );
    opacity: 0.4;

    .app--dark & {
      background: linear-gradient(
        90deg,
        transparent 0%,
        $fever-teal 20%,
        $fever-purple 80%,
        transparent 100%
      );
      opacity: 0.5;
    }
  }
}

@keyframes header-shimmer {
  0%, 100% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(100%);
  }
}

// ───────────────────────────────────────────────────────────────
// TITLE - Header title and subtitle
// ───────────────────────────────────────────────────────────────

.ai-chat__title {
  display: flex;
  flex-direction: column;
  flex: 1;
  line-height: 1.3;
}

.ai-chat__title-text {
  font-family: $font-family-display;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
  background: linear-gradient(135deg, $fever-purple-deep 0%, $fever-teal-dark 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  .app--dark & {
    background: linear-gradient(135deg, $fever-teal 0%, $fever-purple-light 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.ai-chat__title-subtitle {
  font-family: $font-family-main;
  font-size: 10px;
  letter-spacing: 0.5px;
  color: $fever-purple;
  opacity: 0.6;
  margin-top: 2px;
  text-transform: lowercase;

  .app--dark & {
    color: $fever-teal-light;
  }
}

// ───────────────────────────────────────────────────────────────
// TASK PANEL TOGGLE - Button to show/hide task panel
// ───────────────────────────────────────────────────────────────

.ai-chat__task-toggle {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin: 0 8px;
  border: 1px solid rgba($fever-indigo, 0.3);
  background: rgba($fever-indigo, 0.05);
  border-radius: 50%;
  cursor: pointer;
  transition: all $transition-base;

  &:hover {
    background: rgba($fever-indigo, 0.1);
    border-color: $fever-indigo;
    transform: scale(1.05);
  }

  .app--dark & {
    border-color: rgba($fever-indigo, 0.4);
    background: rgba($fever-indigo, 0.08);

    &:hover {
      background: rgba($fever-indigo, 0.15);
    }
  }
}

.ai-chat__task-icon {
  font-size: 16px;
}

.ai-chat__task-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 10px;
  background: $fever-coral;
  color: white;
  font-family: $font-family-monospace;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba($fever-coral, 0.4);
  animation: task-badge-pulse 2s infinite;
}

@keyframes task-badge-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 2px 6px rgba($fever-coral, 0.4);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 2px 10px rgba($fever-coral, 0.6);
  }
}

// ───────────────────────────────────────────────────────────────
// CONNECTION STATUS - Provider connection indicator
// ───────────────────────────────────────────────────────────────

.ai-chat__status {
  display: flex;
  align-items: center;
  font-size: 11px;
  font-family: $font-family-main;
  padding: 4px 8px;
  border-radius: $border-radius-base;
  background: rgba($fever-teal, 0.1);
  transition: all $transition-base;

  .app--dark & {
    background: rgba($fever-teal, 0.15);
  }
}

.ai-chat__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
  transition: all $transition-base;
  position: relative;
}

.ai-chat__status--connected .ai-chat__status-dot {
  background: radial-gradient(circle, $fever-teal-light 0%, $fever-teal 100%);
  box-shadow: 0 0 12px rgba($fever-teal, 0.6);
  animation: pulse-dot 2s infinite;

  &::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 1px solid rgba($fever-teal, 0.4);
    animation: pulse-ring 2s infinite;
  }
}

.ai-chat__status--disconnected .ai-chat__status-dot {
  background: #9e9e9e;
  box-shadow: none;
}

.ai-chat__status--error .ai-chat__status-dot {
  background: radial-gradient(circle, $fever-coral-light 0%, $fever-coral 100%);
  box-shadow: 0 0 12px rgba($fever-coral, 0.6);
  animation: error-pulse 1s infinite;
}

@keyframes pulse-dot {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

@keyframes pulse-ring {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.8);
    opacity: 0;
  }
}

@keyframes error-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.ai-chat__status-text {
  flex: 1;
  font-style: italic;
  color: $fever-purple-deep;
  letter-spacing: 0.3px;

  .app--dark & {
    color: $fever-teal;
  }
}

// ───────────────────────────────────────────────────────────────
// MESSAGE CONTAINER - The conversation flow
// ───────────────────────────────────────────────────────────────

.ai-chat__messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px 16px 16px; // Extra right padding for breathing room
  scroll-behavior: smooth;
}

.ai-chat__empty {
  text-align: center;
  padding: 30px 20px;
  color: $secondary-text-color;

  p {
    margin: 10px 0;
    line-height: 1.5;
  }

  p:first-child {
    font-family: $font-family-display;
    font-weight: 600;
    font-size: 16px;
    letter-spacing: 0.5px;
    color: $fever-purple-deep;

    .app--dark & {
      color: $fever-teal;
    }
  }
}

.ai-chat__hint {
  font-size: 13px;
  font-style: italic;
  opacity: 0.7;
  max-width: 280px;
  margin: 0 auto;
}

// ───────────────────────────────────────────────────────────────
// THINKING STATE - Provider processing animation
// ───────────────────────────────────────────────────────────────

.ai-chat__thinking {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  margin: 8px 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba($fever-purple, 0.08) 25%,
    rgba($fever-teal, 0.06) 75%,
    transparent 100%
  );
  border-radius: $border-radius-lg;
  border-left: 3px solid $fever-purple;
  animation: thinking-shimmer 3s ease-in-out infinite;
  position: relative;
  overflow: hidden;

  .app--dark & {
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba($fever-teal, 0.1) 25%,
      rgba($fever-purple, 0.08) 75%,
      transparent 100%
    );
    border-left-color: $fever-teal;
  }

  // Animated scan line
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba($fever-teal, 0.1) 50%,
      transparent 100%
    );
    animation: thinking-scan 2s ease-in-out infinite;
  }
}

@keyframes thinking-shimmer {
  0%, 100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

@keyframes thinking-scan {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

.ai-chat__thinking-text {
  font-family: $font-family-main;
  font-size: 13px;
  font-style: italic;
  color: $fever-purple-deep;
  margin-right: 12px;
  letter-spacing: 0.3px;

  .app--dark & {
    color: $fever-teal;
  }
}

.ai-chat__thinking-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, $fever-purple 0%, $fever-teal 100%);
  margin: 0 4px;
  animation: ai-thinking 1.4s infinite ease-in-out both;
  box-shadow: 0 0 6px rgba($fever-purple, 0.4);

  .app--dark & {
    background: linear-gradient(135deg, $fever-teal 0%, $fever-purple 100%);
    box-shadow: 0 0 6px rgba($fever-teal, 0.4);
  }

  &:nth-child(2) { animation-delay: -0.32s; }
  &:nth-child(3) { animation-delay: -0.16s; }
  &:nth-child(4) { animation-delay: 0s; }
}

@keyframes ai-thinking {
  0%, 80%, 100% {
    transform: scale(0.5);
    opacity: 0.4;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}

// ───────────────────────────────────────────────────────────────
// AWAITING HUMAN STATE
// ───────────────────────────────────────────────────────────────

.ai-chat__awaiting {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin: 8px 0;
  background: rgba($fever-amber, 0.1);
  border: 1px solid rgba($fever-amber, 0.3);
  border-radius: $border-radius-lg;
  animation: pulse-amber 2s infinite;
}

.ai-chat__awaiting-icon {
  font-size: 16px;
  margin-right: 10px;
}

.ai-chat__awaiting-text {
  flex: 1;
  font-family: $font-family-main;
  font-size: 13px;
  color: $fever-amber;
  font-weight: 500;
}

.ai-chat__awaiting-btn {
  padding: 4px 12px;
  background: rgba($fever-amber, 0.2);
  border: 1px solid $fever-amber;
  border-radius: 4px;
  color: $fever-amber;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: $fever-amber;
    color: $fever-ghost-dark;
  }
}

@keyframes pulse-amber {
  0%, 100% { box-shadow: 0 0 0 rgba($fever-amber, 0); }
  50% { box-shadow: 0 0 10px rgba($fever-amber, 0.2); }
}
</style>
