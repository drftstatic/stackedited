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

.ai-message {
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.4;
  animation: message-appear 0.3s ease-in-out;
  transition: all 0.3s ease;

  &:hover {
    transform: translateX(2px);
  }
}

@keyframes message-appear {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ai-message--user {
  background: linear-gradient(135deg, $fever-teal-alpha 0%, transparent 100%);
  margin-left: 20px;
  border-left: 3px solid $fever-teal;

  .app--dark & {
    border-left-color: $fever-teal;
  }

  .ai-message__role {
    color: $fever-teal-dark;

    .app--dark & {
      color: $fever-teal;
    }
  }
}

.ai-message--assistant {
  background: linear-gradient(135deg, $fever-purple-alpha 0%, transparent 100%);
  margin-right: 20px;
  border-left: 3px solid $fever-purple;

  .app--dark & {
    border-left-color: $fever-purple;
  }

  .ai-message__role {
    color: $fever-purple-deep;
    font-weight: 600;

    .app--dark & {
      color: $fever-purple;
    }
  }
}

.ai-message--system {
  background: rgba(255, 193, 7, 0.1);
  font-size: 12px;
  margin: 8px 40px;
  border-left: 3px solid #f57c00;

  .ai-message__role {
    color: #f57c00;
  }
}

.ai-message--error {
  background: rgba($fever-coral, 0.1);
  border-left: 3px solid $fever-coral;

  .ai-message__role {
    color: $fever-coral;
  }
}

.ai-message--function {
  background: linear-gradient(135deg, rgba($fever-lime, 0.1) 0%, transparent 100%);
  border-left: 3px solid $fever-lime;

  .ai-message__role {
    color: darken($fever-lime, 20%);

    .app--dark & {
      color: $fever-lime;
    }
  }
}

.ai-message__role {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}

.ai-message__content {
  word-wrap: break-word;
}

.ai-message__text {
  code {
    background-color: rgba(0, 0, 0, 0.06);
    padding: 2px 4px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 13px;
    border: 1px solid rgba($fever-purple, 0.2);

    .app--dark & {
      background-color: rgba(255, 255, 255, 0.06);
      border-color: rgba($fever-teal, 0.2);
    }
  }

  pre.ai-message__code {
    background-color: rgba(0, 0, 0, 0.06);
    padding: 8px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 8px 0;
    border: 1px solid rgba($fever-purple, 0.2);

    .app--dark & {
      background-color: rgba(255, 255, 255, 0.06);
      border-color: rgba($fever-teal, 0.2);
    }

    code {
      background: none;
      padding: 0;
      border: none;
    }
  }

  a {
    color: $fever-teal-dark;
    text-decoration: underline;
    transition: color 0.3s ease;

    .app--dark & {
      color: $fever-teal;
    }

    &:hover {
      color: $fever-purple;

      .app--dark & {
        color: $fever-purple;
      }
    }
  }
}

.ai-message__function {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.ai-message__function-icon {
  font-size: 16px;
  animation: spin-slow 3s linear infinite;
}

@keyframes spin-slow {
  to {
    transform: rotate(360deg);
  }
}

.ai-message__function-name {
  font-weight: 500;
  font-style: italic;
}

.ai-message__function-explanation {
  font-size: 12px;
  color: $secondary-text-color;
  font-style: italic;
}

.ai-message__time {
  font-size: 10px;
  color: $secondary-text-color;
  text-align: right;
  margin-top: 4px;
  opacity: 0.6;
}
</style>
