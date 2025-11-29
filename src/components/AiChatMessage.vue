<template>
  <div class="ai-message" :class="messageClass">
    <!-- Role indicator -->
    <div class="ai-message__role">
      <span v-if="message.role === 'user'">You</span>
      <span v-else-if="message.role === 'assistant'">AI</span>
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
      <div v-else class="ai-message__text" v-html="formattedContent"></div>
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
        updateNotepad: 'Updating document',
        suggestEdit: 'Suggesting edit',
        searchVault: 'Searching vault',
        readDocument: 'Reading document',
        webSearch: 'Searching web',
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
}

.ai-message--user {
  background-color: rgba($link-color, 0.1);
  margin-left: 20px;

  .ai-message__role {
    color: $link-color;
  }
}

.ai-message--assistant {
  background-color: rgba(0, 0, 0, 0.04);
  margin-right: 20px;

  .ai-message__role {
    color: $secondary-text-color;
  }
}

.ai-message--system {
  background-color: rgba(255, 193, 7, 0.1);
  font-size: 12px;
  margin: 8px 40px;

  .ai-message__role {
    color: #f57c00;
  }
}

.ai-message--error {
  background-color: rgba(244, 67, 54, 0.1);

  .ai-message__role {
    color: #f44336;
  }
}

.ai-message--function {
  background-color: rgba(156, 39, 176, 0.1);

  .ai-message__role {
    color: #9c27b0;
  }
}

.ai-message__role {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 4px;
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
  }

  pre.ai-message__code {
    background-color: rgba(0, 0, 0, 0.06);
    padding: 8px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 8px 0;

    code {
      background: none;
      padding: 0;
    }
  }

  a {
    color: $link-color;
    text-decoration: underline;
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
}

.ai-message__function-name {
  font-weight: 500;
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
}
</style>
