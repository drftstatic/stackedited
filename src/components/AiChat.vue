<template>
  <div class="ai-chat side-bar__panel">
    <!-- Connection Status -->
    <div class="ai-chat__status" :class="statusClass">
      <span class="ai-chat__status-dot" />
      <span class="ai-chat__status-text">{{ statusText }}</span>
      <button v-if="!connected" class="button" @click="reconnect">Reconnect</button>
    </div>

    <!-- Provider Selector -->
    <ai-provider-selector />

    <!-- Messages -->
    <div ref="messages" class="ai-chat__messages">
      <div v-if="messages.length === 0" class="ai-chat__empty">
        <p>Ask me to help edit your document, research topics, or answer questions.</p>
        <p class="ai-chat__hint">Try: "Help me improve this introduction" or "Research the latest on..."</p>
      </div>
      <ai-chat-message
        v-for="message in messages"
        :key="message.id"
        :message="message"
      />
      <div v-if="thinking" class="ai-chat__thinking">
        <span class="ai-chat__thinking-dot" />
        <span class="ai-chat__thinking-dot" />
        <span class="ai-chat__thinking-dot" />
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
    ]),
    ...mapGetters('aiChat', [
      'connectionStatus',
    ]),
    statusClass() {
      return `ai-chat__status--${this.connectionStatus}`;
    },
    statusText() {
      switch (this.connectionStatus) {
        case 'connected': return 'Connected';
        case 'error': return this.error || 'Connection error';
        default: return 'Disconnected';
      }
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
  },
};
</script>

<style lang="scss">
@import '../styles/variables.scss';

.ai-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
}

.ai-chat__status {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  font-size: 12px;
  border-bottom: 1px solid $border-color;
  background-color: $info-bg;
}

.ai-chat__status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
}

.ai-chat__status--connected .ai-chat__status-dot {
  background-color: #4caf50;
}

.ai-chat__status--disconnected .ai-chat__status-dot {
  background-color: #9e9e9e;
}

.ai-chat__status--error .ai-chat__status-dot {
  background-color: #f44336;
}

.ai-chat__status-text {
  flex: 1;
}

.ai-chat__messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.ai-chat__empty {
  text-align: center;
  padding: 20px;
  color: $secondary-text-color;

  p {
    margin: 8px 0;
  }
}

.ai-chat__hint {
  font-size: 12px;
  font-style: italic;
}

.ai-chat__thinking {
  display: flex;
  align-items: center;
  padding: 12px;

  .ai-chat__thinking-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: $secondary-text-color;
    margin: 0 3px;
    animation: ai-thinking 1.4s infinite ease-in-out both;

    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
    &:nth-child(3) { animation-delay: 0s; }
  }
}

@keyframes ai-thinking {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
