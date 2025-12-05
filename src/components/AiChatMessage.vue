<template>
  <div class="ai-message" :class="messageClass">
    <!-- Role indicator -->
    <div class="ai-message__role">
      <span v-if="message.role === 'user'">You</span>
      <span v-else-if="message.role === 'assistant'">{{ getProviderName(message.providerId) }}</span>
      <span v-else>System</span>
    </div>

    <!-- Message content -->
    <div class="ai-message__content">
      <!-- Function call display -->
      <div v-if="message.isFunctionCall" class="ai-message__function">
        <span class="ai-message__function-icon">✨</span>
        <span class="ai-message__function-label">AI Action:</span>
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
      const classes = {
        'ai-message--user': this.message.role === 'user',
        'ai-message--assistant': this.message.role === 'assistant',
        'ai-message--system': this.message.role === 'system',
        'ai-message--error': this.message.isError,
        'ai-message--function': this.message.isFunctionCall,
      };

      // Add provider-specific class for assistant messages
      if (this.message.role === 'assistant' && this.message.providerId) {
        classes[`ai-message--${this.message.providerId}`] = true;
      }

      return classes;
    },
    formattedContent() {
      // Simple markdown rendering for chat messages
      let content = this.message.content || '';

      // SAFETY NET: Strip any remaining <tool_use> tags before processing
      // This is a fallback in case backend parsing missed something
      content = content.replace(/<tool_use\b[^>]*>[\s\S]*?<\/tool_use>/gi, '');

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
    getProviderName(providerId) {
      const names = {
        claude: 'CLAUDE',
        gemini: 'GEMINI',
        openai: 'GPT',
        xai: 'GROK',
        cursor: 'CURSOR',
        composer: 'COMPOSER',
        glm: 'Z.AI',
        ted: 'TED',
      };
      return names[providerId] || 'AI';
    },
    formatFunctionName(name) {
      const provider = this.getProviderName(this.message.providerId);
      const actions = {
        updateNotepad: `${provider} is updating the document`,
        suggestEdit: `${provider} has a suggestion`,
        searchVault: `${provider} is searching`,
        readDocument: `${provider} is reading`,
        webSearch: `${provider} is exploring the web`,
      };
      return actions[name] || name;
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
// ASSISTANT MESSAGES - Base style for all AI providers
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
}

// ───────────────────────────────────────────────────────────────
// CLAUDE MESSAGES - Purple
// ───────────────────────────────────────────────────────────────

.ai-message--claude {
  border-left-color: $fever-amber;
  background: linear-gradient(135deg, rgba($fever-amber, 0.1) 0%, transparent 100%);

  .ai-message__role {
    background: rgba($fever-amber, 0.15);
    color: darken($fever-amber, 10%);
    border: 1px solid rgba($fever-amber, 0.3);
  }
  .app--dark & .ai-message__role {
    background: rgba($fever-amber, 0.2);
    color: $fever-amber;
    border-color: rgba($fever-amber, 0.4);
  }
}

// ───────────────────────────────────────────────────────────────
// GEMINI MESSAGES - Teal
// ───────────────────────────────────────────────────────────────

.ai-message--gemini {
  border-left-color: $fever-blue;
  background: linear-gradient(135deg, rgba($fever-blue, 0.1) 0%, transparent 100%);

  .ai-message__role {
    background: rgba($fever-blue, 0.15);
    color: darken($fever-blue, 10%);
    border: 1px solid rgba($fever-blue, 0.3);
  }
  .app--dark & .ai-message__role {
    background: rgba($fever-blue, 0.2);
    color: $fever-blue;
    border-color: rgba($fever-blue, 0.4);
  }
}

// ───────────────────────────────────────────────────────────────
// GPT/OPENAI MESSAGES - Coral
// ───────────────────────────────────────────────────────────────

.ai-message--openai {
  border-left-color: $fever-lime;
  background: linear-gradient(135deg, rgba($fever-lime, 0.1) 0%, transparent 100%);

  .ai-message__role {
    background: rgba($fever-lime, 0.15);
    color: darken($fever-lime, 20%);
    border: 1px solid rgba($fever-lime, 0.3);
  }
  .app--dark & .ai-message__role {
    background: rgba($fever-lime, 0.2);
    color: $fever-lime;
    border-color: rgba($fever-lime, 0.4);
  }
}

// ───────────────────────────────────────────────────────────────
// X.AI MESSAGES - Indigo
.ai-message--xai,
.ai-message--glm,
.ai-message--ted {
  border-left-color: $fever-indigo;
  background: linear-gradient(135deg, rgba($fever-indigo, 0.1) 0%, transparent 100%);

  .ai-message__role {
    background: rgba($fever-indigo, 0.15);
    color: $fever-indigo;
    border: 1px solid rgba($fever-indigo, 0.3);
  }
  .app--dark & {
    border-left-color: $fever-indigo-glow;
    background: linear-gradient(135deg, rgba($fever-indigo, 0.1) 0%, transparent 100%);

    .ai-message__role {
      background: rgba($fever-indigo, 0.2);
      color: $fever-indigo-glow;
      border-color: rgba($fever-indigo, 0.4);
    }
  }
}

// ───────────────────────────────────────────────────────────────
// CURSOR/GROK MESSAGES - Lime
// ───────────────────────────────────────────────────────────────

.ai-message--cursor {
  border-left-color: $fever-purple;
  background: linear-gradient(135deg, rgba($fever-purple, 0.1) 0%, transparent 100%);

  .ai-message__role {
    background: rgba($fever-purple, 0.15);
    color: darken($fever-purple, 10%);
    border: 1px solid rgba($fever-purple, 0.3);
  }
  .app--dark & .ai-message__role {
    background: rgba($fever-purple, 0.2);
    color: $fever-purple-light;
    border-color: rgba($fever-purple, 0.4);
  }
}

.ai-message--composer {
  border-left-color: $fever-teal;
  background: linear-gradient(135deg, rgba($fever-teal, 0.1) 0%, transparent 100%);

  .ai-message__role {
    background: rgba($fever-teal, 0.15);
    color: darken($fever-teal, 10%);
    border: 1px solid rgba($fever-teal, 0.3);
  }
  .app--dark & .ai-message__role {
    background: rgba($fever-teal, 0.2);
    color: $fever-teal;
    border-color: rgba($fever-teal, 0.4);
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
  display: inline-block;
  font-family: $font-family-ui;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 8px;
  letter-spacing: 1px;
  padding: 2px 8px;
  border-radius: 12px;
  line-height: 1.4;
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
  gap: 8px;
  padding: 8px 12px;
  background: rgba($fever-teal, 0.08);
  border-left: 3px solid $fever-teal;
  border-radius: $border-radius-base;

  .app--dark & {
    background: rgba($fever-teal, 0.12);
  }
}

.ai-message__function-icon {
  font-size: 16px;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.ai-message__function-label {
  font-family: $font-family-ui;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: $fever-teal;
  opacity: 0.8;
}

.ai-message__function-name {
  font-family: $font-family-monospace;
  font-weight: 600;
  font-size: 12px;
  color: $fever-teal;

  .app--dark & {
    color: lighten($fever-teal, 10%);
  }
}

.ai-message__function-explanation {
  font-size: 12px;
  color: $secondary-text-color;
  font-style: italic;
  flex-basis: 100%;
  margin-top: 4px;
  padding-left: 24px; // Align with icon + label
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
