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

// ═══════════════════════════════════════════════════════════════
// TED'S DOMAIN - AI Chat with Fever Dream Personality
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
// TED'S HEADER - The consciousness interface
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
// TED'S AVATAR - The face of controlled chaos
// ───────────────────────────────────────────────────────────────

.ai-chat__ted-avatar {
  width: 56px;
  height: 56px;
  margin-right: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;

  // Glowing ring around avatar
  &::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      $fever-purple,
      $fever-teal,
      $fever-purple-light,
      $fever-teal-light,
      $fever-purple
    );
    opacity: 0.4;
    animation: avatar-ring-spin 12s linear infinite;
    filter: blur(4px);

    .app--dark & {
      opacity: 0.5;
    }
  }
}

@keyframes avatar-ring-spin {
  to {
    transform: rotate(360deg);
  }
}

.ai-chat__ted-face {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, $fever-purple 0%, $fever-teal 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: face-pulse 4s ease-in-out infinite;
  box-shadow:
    0 0 20px rgba($fever-purple, 0.4),
    inset 0 0 15px rgba(255, 255, 255, 0.1);
  z-index: 1;

  .app--dark & {
    background: linear-gradient(135deg, $fever-teal 0%, $fever-purple 100%);
    box-shadow:
      0 0 20px rgba($fever-teal, 0.4),
      inset 0 0 15px rgba(255, 255, 255, 0.1);
  }

  // Inner face detail
  &::after {
    content: '';
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.15) 0%,
      transparent 50%
    );
  }
}

@keyframes face-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow:
      0 0 20px rgba($fever-purple, 0.4),
      inset 0 0 15px rgba(255, 255, 255, 0.1);
  }
  50% {
    transform: scale(1.08);
    box-shadow:
      0 0 30px rgba($fever-purple, 0.5),
      0 0 60px rgba($fever-teal, 0.2),
      inset 0 0 15px rgba(255, 255, 255, 0.15);
  }
}

.ai-chat__ted-eye {
  width: 7px;
  height: 7px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 16px;
  animation: blink 5s infinite;
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);

  &--left {
    left: 12px;
  }

  &--right {
    right: 12px;
  }
}

@keyframes blink {
  0%, 45%, 55%, 100% {
    opacity: 1;
    transform: scaleY(1);
  }
  50% {
    opacity: 0.3;
    transform: scaleY(0.1);
  }
}

// ───────────────────────────────────────────────────────────────
// TED'S INTRO - Name and subtitle
// ───────────────────────────────────────────────────────────────

.ai-chat__ted-intro {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.ai-chat__ted-name {
  font-family: $font-family-display;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 3px;
  text-transform: uppercase;
  background: linear-gradient(135deg, $fever-purple-deep 0%, $fever-teal-dark 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;

  .app--dark & {
    background: linear-gradient(135deg, $fever-teal 0%, $fever-purple-light 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  // Subtle glitch effect on name
  &::after {
    content: 'Ted';
    position: absolute;
    left: 1px;
    top: 0;
    background: linear-gradient(135deg, $fever-coral 0%, transparent 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    opacity: 0;
    animation: ted-name-glitch 8s ease-in-out infinite;
  }
}

@keyframes ted-name-glitch {
  0%, 94%, 100% {
    opacity: 0;
    transform: translateX(0);
  }
  95% {
    opacity: 0.5;
    transform: translateX(-2px);
  }
  96% {
    opacity: 0;
    transform: translateX(2px);
  }
  97% {
    opacity: 0.3;
    transform: translateX(-1px);
  }
}

.ai-chat__ted-subtitle {
  font-family: $font-family-main;
  font-size: 11px;
  letter-spacing: 1px;
  color: $fever-purple;
  font-style: italic;
  opacity: 0.7;
  margin-top: 2px;

  .app--dark & {
    color: $fever-teal-light;
  }
}

// ───────────────────────────────────────────────────────────────
// CONNECTION STATUS - Ted's presence indicator
// ───────────────────────────────────────────────────────────────

.ai-chat__status {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  font-size: 12px;
  font-family: $font-family-main;
  border-bottom: 1px solid rgba($fever-purple, 0.1);
  background: linear-gradient(
    90deg,
    rgba($fever-teal, 0.05) 0%,
    transparent 50%,
    rgba($fever-purple, 0.05) 100%
  );
  transition: all $transition-base;

  .app--dark & {
    background: linear-gradient(
      90deg,
      rgba($fever-purple, 0.08) 0%,
      transparent 50%,
      rgba($fever-teal, 0.08) 100%
    );
    border-bottom-color: rgba($fever-teal, 0.1);
  }
}

.ai-chat__status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 10px;
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
  background: radial-gradient(circle, lighten($fever-coral, 10%) 0%, $fever-coral 100%);
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
  padding: 16px;
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
// THINKING STATE - Ted's contemplation animation
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
</style>
