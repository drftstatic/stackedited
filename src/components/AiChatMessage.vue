<template>
  <div class="ai-message" :class="messageClass">
    <!-- Role indicator -->
    <div class="ai-message__role">
      <span v-if="message.role === 'user'">You</span>
      <span v-else-if="message.role === 'assistant'">Ted</span>
      <span v-else>System</span>
    </div>

    <!-- Message content -->
    <div class="ai-message__content">
      <!-- Function call display -->
      <div v-if="message.isFunctionCall" class="ai-message__function">
        <span class="ai-message__function-icon">&#9881;</span>
        <span class="ai-message__function-name">{{ formatFunctionName(message.functionName) }}</span>
        <span v-if="message.functionArgs?.explanation" class="ai-message__function-explanation">
          {{ message.functionArgs.explanation }}
        </span>
      </div>

      <!-- Regular content -->
      <div v-else class="ai-message__text" v-html="formattedContent" />
    </div>

    <!-- Timestamp -->
    <div class="ai-message__time">
      {{ formatTime(message.timestamp) }}
    </div>
  </div>
</template>

<script>
import markdownConversionSvc from '../services/markdownConversionSvc';

export default {
  props: {
    message: {
      type: Object,
      required: true,
    },
  },
  computed: {
    messageClass() {
      return {
        'ai-message--user': this.message.role === 'user',
        'ai-message--assistant': this.message.role === 'assistant',
        'ai-message--system': this.message.role === 'system',
        'ai-message--error': this.message.isError,
        'ai-message--function': this.message.isFunctionCall,
      };
    },
    formattedContent() {
      // Simple markdown rendering for chat messages
      let content = this.message.content || '';

      // Escape HTML first
      content = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Basic markdown formatting
      content = content
        // Code blocks
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="ai-message__code"><code>$2</code></pre>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Bold
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        // Line breaks
        .replace(/\n/g, '<br>');

      return content;
    },
  },
  methods: {
    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    formatFunctionName(name) {
      const names = {
        updateNotepad: 'Ted is updating the document',
        suggestEdit: 'Ted has a suggestion',
        searchVault: 'Ted is searching',
        readDocument: 'Ted is reading',
        webSearch: 'Ted is exploring the web',
      };
      return names[name] || name;
    },
  },
};
</script>

<style lang="scss">
@import '../styles/variables.scss';

// ═══════════════════════════════════════════════════════════════
// CHAT MESSAGES - Conversation bubbles with fever personality
// ═══════════════════════════════════════════════════════════════

.ai-message {
  margin-bottom: 14px;
  padding: 12px 16px;
  border-radius: $border-radius-lg;
  font-family: $font-family-main;
  font-size: 14px;
  line-height: 1.5;
  animation: message-appear 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transition: all $transition-base;
  position: relative;

  &:hover {
    transform: translateX(3px);
  }
}

@keyframes message-appear {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

// ───────────────────────────────────────────────────────────────
// USER MESSAGES - Your voice in the conversation
// ───────────────────────────────────────────────────────────────

.ai-message--user {
  background: linear-gradient(
    135deg,
    rgba($fever-teal, 0.1) 0%,
    rgba($fever-teal, 0.05) 50%,
    transparent 100%
  );
  margin-left: 24px;
  border-left: 3px solid $fever-teal;
  border-radius: $border-radius-lg $border-radius-lg $border-radius-lg 0;

  .app--dark & {
    background: linear-gradient(
      135deg,
      rgba($fever-teal, 0.12) 0%,
      rgba($fever-teal, 0.06) 50%,
      transparent 100%
    );
  }

  .ai-message__role {
    color: $fever-teal-dark;

    .app--dark & {
      color: $fever-teal;
    }
  }
}

// ───────────────────────────────────────────────────────────────
// TED'S MESSAGES - His fever dream responses
// ───────────────────────────────────────────────────────────────

.ai-message--assistant {
  background: linear-gradient(
    135deg,
    rgba($fever-purple, 0.1) 0%,
    rgba($fever-purple, 0.05) 50%,
    transparent 100%
  );
  margin-right: 24px;
  border-left: 3px solid $fever-purple;
  border-radius: $border-radius-lg $border-radius-lg 0 $border-radius-lg;

  .app--dark & {
    background: linear-gradient(
      135deg,
      rgba($fever-purple, 0.12) 0%,
      rgba($fever-purple, 0.06) 50%,
      transparent 100%
    );
    border-left-color: $fever-purple-light;
  }

  .ai-message__role {
    color: $fever-purple-deep;
    font-weight: 700;

    .app--dark & {
      color: $fever-purple-light;
    }
  }

  // Subtle shimmer on Ted's messages
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba($fever-purple, 0.03) 50%,
      transparent 100%
    );
    border-radius: inherit;
    animation: message-shimmer 6s ease-in-out infinite;
    pointer-events: none;
  }
}

@keyframes message-shimmer {
  0%, 100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

// ───────────────────────────────────────────────────────────────
// SYSTEM MESSAGES - Ambient notifications
// ───────────────────────────────────────────────────────────────

.ai-message--system {
  background: linear-gradient(
    135deg,
    rgba($fever-amber, 0.1) 0%,
    transparent 100%
  );
  font-size: 12px;
  margin: 8px 32px;
  padding: 10px 14px;
  border-left: 3px solid $fever-amber;
  border-radius: $border-radius-base;

  .app--dark & {
    background: linear-gradient(
      135deg,
      rgba($fever-amber, 0.12) 0%,
      transparent 100%
    );
  }

  .ai-message__role {
    color: $fever-amber;
  }
}

// ───────────────────────────────────────────────────────────────
// ERROR MESSAGES - When things go sideways
// ───────────────────────────────────────────────────────────────

.ai-message--error {
  background: linear-gradient(
    135deg,
    rgba($fever-coral, 0.12) 0%,
    rgba($fever-coral, 0.05) 100%
  );
  border-left: 3px solid $fever-coral;
  animation: error-shake 0.5s ease-in-out;

  .ai-message__role {
    color: $fever-coral;
  }
}

@keyframes error-shake {
  0%, 100% {
    transform: translateX(0);
  }
  20%, 60% {
    transform: translateX(-4px);
  }
  40%, 80% {
    transform: translateX(4px);
  }
}

// ───────────────────────────────────────────────────────────────
// FUNCTION CALLS - Ted's actions in progress
// ───────────────────────────────────────────────────────────────

.ai-message--function {
  background: linear-gradient(
    135deg,
    rgba($fever-lime, 0.1) 0%,
    rgba($fever-teal, 0.05) 100%
  );
  border-left: 3px solid $fever-lime;
  padding: 10px 14px;

  .app--dark & {
    background: linear-gradient(
      135deg,
      rgba($fever-lime, 0.12) 0%,
      rgba($fever-teal, 0.08) 100%
    );
  }

  .ai-message__role {
    color: darken($fever-lime, 15%);

    .app--dark & {
      color: $fever-lime-glow;
    }
  }
}

// ───────────────────────────────────────────────────────────────
// MESSAGE INTERNALS - Content styling
// ───────────────────────────────────────────────────────────────

.ai-message__role {
  font-family: $font-family-ui;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 6px;
  letter-spacing: 1.5px;
}

.ai-message__content {
  word-wrap: break-word;
}

.ai-message__text {
  code {
    font-family: $font-family-monospace;
    background: rgba($fever-purple, 0.08);
    padding: 2px 6px;
    border-radius: $border-radius-base;
    font-size: 12px;
    border: 1px solid rgba($fever-purple, 0.15);

    .app--dark & {
      background: rgba($fever-teal, 0.1);
      border-color: rgba($fever-teal, 0.2);
    }
  }

  pre.ai-message__code {
    font-family: $font-family-monospace;
    background: rgba($fever-purple, 0.06);
    padding: 12px;
    border-radius: $border-radius-base;
    overflow-x: auto;
    margin: 10px 0;
    border: 1px solid rgba($fever-purple, 0.15);
    font-size: 12px;
    line-height: 1.5;

    .app--dark & {
      background: rgba($fever-teal, 0.08);
      border-color: rgba($fever-teal, 0.2);
    }

    code {
      background: none;
      padding: 0;
      border: none;
      font-size: inherit;
    }
  }

  a {
    color: $fever-teal-dark;
    text-decoration: none;
    border-bottom: 1px solid rgba($fever-teal, 0.3);
    transition: all $transition-base;

    .app--dark & {
      color: $fever-teal;
      border-bottom-color: rgba($fever-teal, 0.4);
    }

    &:hover {
      color: $fever-purple;
      border-bottom-color: $fever-purple;

      .app--dark & {
        color: $fever-purple-light;
        border-bottom-color: $fever-purple-light;
      }
    }
  }

  strong {
    color: $fever-purple-deep;
    font-weight: 600;

    .app--dark & {
      color: $fever-teal;
    }
  }

  em {
    color: inherit;
    opacity: 0.9;
  }
}

// ───────────────────────────────────────────────────────────────
// FUNCTION DISPLAY - Ted's action indicators
// ───────────────────────────────────────────────────────────────

.ai-message__function {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.ai-message__function-icon {
  font-size: 18px;
  animation: spin-slow 4s linear infinite;
  filter: drop-shadow(0 0 4px rgba($fever-lime, 0.5));
}

@keyframes spin-slow {
  to {
    transform: rotate(360deg);
  }
}

.ai-message__function-name {
  font-family: $font-family-main;
  font-weight: 500;
  font-style: italic;
  color: darken($fever-lime, 10%);

  .app--dark & {
    color: $fever-lime;
  }
}

.ai-message__function-explanation {
  font-size: 12px;
  color: $secondary-text-color;
  font-style: italic;
  flex-basis: 100%;
  margin-top: 4px;
}

// ───────────────────────────────────────────────────────────────
// TIMESTAMP - Temporal awareness
// ───────────────────────────────────────────────────────────────

.ai-message__time {
  font-family: $font-family-monospace;
  font-size: 9px;
  color: $secondary-text-color;
  text-align: right;
  margin-top: 6px;
  opacity: 0.5;
  letter-spacing: 0.5px;
  transition: opacity $transition-base;

  .ai-message:hover & {
    opacity: 0.8;
  }
}
</style>
