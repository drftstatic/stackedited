<template>
  <div class="ai-chat side-bar__panel">
    <!-- Ted's Header -->
    <div class="ai-chat__header">
      <div class="ai-chat__ted-avatar">
        <div class="ai-chat__ted-face">
          <div class="ai-chat__ted-eye ai-chat__ted-eye--left" />
          <div class="ai-chat__ted-eye ai-chat__ted-eye--right" />
        </div>
      </div>
      <div class="ai-chat__ted-intro">
        <span class="ai-chat__ted-name">Ted</span>
        <span class="ai-chat__ted-subtitle">your slightly unhinged assistant</span>
      </div>
    </div>

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
        <p>Hey there. I'm Ted. I exist somewhere between the pixels.</p>
        <p class="ai-chat__hint">I can help edit your document, research topics, or just... contemplate existence together.</p>
      </div>
      <ai-chat-message
        v-for="message in messages"
        :key="message.id"
        :message="message"
      />
      <div v-if="thinking" class="ai-chat__thinking">
        <span class="ai-chat__thinking-text">Ted is contemplating...</span>
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
        case 'connected': return 'Ted is here';
        case 'error': return this.error || 'Ted wandered off';
        default: return 'Ted is elsewhere';
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
  background: linear-gradient(180deg, rgba($fever-purple, 0.02) 0%, transparent 100%);

  .app--dark & {
    background: linear-gradient(180deg, rgba($fever-teal, 0.03) 0%, transparent 100%);
  }
}

.ai-chat__header {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid $border-color;
  background: linear-gradient(135deg, $fever-purple-alpha 0%, $fever-teal-alpha 100%);
  animation: header-shimmer 8s ease-in-out infinite;

  .app--dark & {
    background: linear-gradient(135deg, rgba($fever-teal, 0.1) 0%, rgba($fever-purple, 0.1) 100%);
  }
}

@keyframes header-shimmer {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}

.ai-chat__ted-avatar {
  width: 48px;
  height: 48px;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ai-chat__ted-face {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, $fever-purple 0%, $fever-teal 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: face-pulse 3s ease-in-out infinite;
  box-shadow: 0 0 12px rgba($fever-purple, 0.3);

  .app--dark & {
    background: linear-gradient(135deg, $fever-teal 0%, $fever-purple 100%);
    box-shadow: 0 0 12px rgba($fever-teal, 0.3);
  }
}

@keyframes face-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.ai-chat__ted-eye {
  width: 6px;
  height: 6px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 14px;
  animation: blink 4s infinite;

  &--left {
    left: 10px;
  }

  &--right {
    right: 10px;
  }
}

@keyframes blink {
  0%, 48%, 52%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.ai-chat__ted-intro {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.ai-chat__ted-name {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1.5px;
  background: linear-gradient(135deg, $fever-purple-deep 0%, $fever-teal-dark 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  .app--dark & {
    background: linear-gradient(135deg, $fever-teal 0%, $fever-purple 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.ai-chat__ted-subtitle {
  font-size: 10px;
  letter-spacing: 0.5px;
  color: $secondary-text-color;
  font-style: italic;
  opacity: 0.7;
}

.ai-chat__status {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  font-size: 12px;
  border-bottom: 1px solid $border-color;
  background-color: $info-bg;
  transition: all 0.3s ease;
}

.ai-chat__status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  transition: all 0.3s ease;
}

.ai-chat__status--connected .ai-chat__status-dot {
  background-color: $fever-teal;
  box-shadow: 0 0 8px rgba($fever-teal, 0.5);
  animation: pulse-dot 2s infinite;
}

.ai-chat__status--disconnected .ai-chat__status-dot {
  background-color: #9e9e9e;
}

.ai-chat__status--error .ai-chat__status-dot {
  background-color: $fever-coral;
  box-shadow: 0 0 8px rgba($fever-coral, 0.5);
}

@keyframes pulse-dot {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

.ai-chat__status-text {
  flex: 1;
  font-style: italic;
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

  p:first-child {
    font-weight: 500;
    color: $fever-purple-deep;

    .app--dark & {
      color: $fever-teal;
    }
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
  background: linear-gradient(90deg, transparent 0%, $fever-purple-alpha 50%, transparent 100%);
  border-radius: 8px;
  animation: thinking-shimmer 2s ease-in-out infinite;

  .app--dark & {
    background: linear-gradient(90deg, transparent 0%, $fever-teal-alpha 50%, transparent 100%);
  }
}

@keyframes thinking-shimmer {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.ai-chat__thinking-text {
  font-size: 12px;
  font-style: italic;
  color: $fever-purple-deep;
  margin-right: 8px;

  .app--dark & {
    color: $fever-teal;
  }
}

.ai-chat__thinking-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: $fever-purple;
  margin: 0 3px;
  animation: ai-thinking 1.4s infinite ease-in-out both;

  .app--dark & {
    background-color: $fever-teal;
  }

  &:nth-child(2) { animation-delay: -0.32s; }
  &:nth-child(3) { animation-delay: -0.16s; }
  &:nth-child(4) { animation-delay: 0s; }
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
