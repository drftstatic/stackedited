<template>
  <div class="ai-provider">
    <div class="ai-provider__row">
      <!-- Provider buttons -->
      <div class="ai-provider__buttons">
        <button
          v-for="provider in allProviders"
          :key="provider.id"
          v-title="provider.available ? provider.name : `${provider.name} (unavailable)`"
          class="ai-provider__btn"
          :class="[
            `ai-provider__btn--${provider.id}`,
            {
              'ai-provider__btn--active': providerId === provider.id,
              'ai-provider__btn--disabled': !provider.available
            }
          ]"
          :disabled="!provider.available"
          @click="selectProvider(provider.id)"
        >
          {{ getProviderShortName(provider.id) }}
        </button>
      </div>

      <!-- Trust Mode Toggle -->
      <div class="ai-provider__trust">
        <button
          class="ai-provider__trust-btn"
          :class="{ 'ai-provider__trust-btn--active': trustMode }"
          @click="toggleTrustMode"
          v-title="trustMode ? 'Trust Mode ON: AI continues autonomously' : 'Trust Mode OFF: AI pauses for human approval'"
        >
          <span class="ai-provider__trust-icon">{{ trustMode ? '🔓' : '🔒' }}</span>
          <span class="ai-provider__trust-label">TRUST</span>
        </button>
      </div>
    </div>

    <!-- Connection status -->
    <div v-if="!connected" class="ai-provider__status ai-provider__status--disconnected">
      Connecting...
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import aiService from '../services/aiService';

export default {
  computed: {
    ...mapState('aiChat', [
      'providerId',
      'providers',
      'providers',
      'connected',
      'trustMode',
    ]),
    allProviders() {
      // Return all providers, available ones first
      return [...this.providers].sort((a, b) => {
        if (a.available && !b.available) return -1;
        if (!a.available && b.available) return 1;
        return 0;
      });
    },
  },
  methods: {
    selectProvider(providerId) {
      aiService.setProvider(providerId);
    },
    toggleTrustMode() {
      this.$store.dispatch('aiChat/toggleTrustMode');
    },
    getProviderShortName(id) {
      const names = {
        claude: 'Claude',
        gemini: 'Gemini',
        openai: 'GPT',
        xai: 'X.AI',
        cursor: 'Grok',
      };
      return names[id] || id;
    },
  },
};
</script>

<style lang="scss">
@import '../styles/variables.scss';

.ai-provider {
  padding: 8px 12px;
  border-bottom: 1px solid $border-color;
}

.ai-provider__row {
  display: flex;
  align-items: stretch;
}

.ai-provider__buttons {
  display: flex;
  gap: 6px;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
}

.ai-provider__trust {
  margin-left: 8px;
  padding-left: 8px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.ai-provider__trust-btn {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border: 1px solid rgba($fever-purple, 0.3);
  background: rgba($fever-purple, 0.05);
  border-radius: $border-radius-lg;
  cursor: pointer;
  transition: all $transition-base;
  height: 100%;

  &:hover {
    background: rgba($fever-purple, 0.1);
  }

  &.ai-provider__trust-btn--active {
    background: rgba($fever-teal, 0.15);
    border-color: $fever-teal;

    .ai-provider__trust-label {
      color: $fever-teal;
    }
  }
}

.ai-provider__trust-icon {
  font-size: 12px;
  margin-right: 6px;
}

.ai-provider__trust-label {
  font-family: $font-family-ui;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: $fever-purple;
  text-transform: uppercase;
}

.ai-provider__btn {
  flex: 1;
  min-width: 60px;
  padding: 8px 12px;
  border: 2px solid transparent;
  background: rgba(255, 255, 255, 0.05);
  border-radius: $border-radius-lg;
  cursor: pointer;
  font-family: $font-family-ui;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: $secondary-text-color;
  transition: all $transition-base;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

// Claude - Purple
.ai-provider__btn--claude {
  border-color: rgba($fever-purple, 0.3);
  color: $fever-purple;

  &:hover:not(:disabled) {
    background: rgba($fever-purple, 0.1);
    border-color: $fever-purple;
  }

  &.ai-provider__btn--active {
    background: $fever-purple;
    border-color: $fever-purple;
    color: white;
    box-shadow: 0 0 20px rgba($fever-purple, 0.4);
  }
}

// Gemini - Teal
.ai-provider__btn--gemini {
  border-color: rgba($fever-teal, 0.3);
  color: $fever-teal;

  &:hover:not(:disabled) {
    background: rgba($fever-teal, 0.1);
    border-color: $fever-teal;
  }

  &.ai-provider__btn--active {
    background: $fever-teal;
    border-color: $fever-teal;
    color: white;
    box-shadow: 0 0 20px rgba($fever-teal, 0.4);
  }
}

// OpenAI/GPT - Coral
.ai-provider__btn--openai {
  border-color: rgba($fever-coral, 0.3);
  color: $fever-coral;

  &:hover:not(:disabled) {
    background: rgba($fever-coral, 0.1);
    border-color: $fever-coral;
  }

  &.ai-provider__btn--active {
    background: $fever-coral;
    border-color: $fever-coral;
    color: white;
    box-shadow: 0 0 20px rgba($fever-coral, 0.4);
  }
}

// X.AI - Amber
.ai-provider__btn--xai {
  border-color: rgba($fever-amber, 0.3);
  color: $fever-amber;

  &:hover:not(:disabled) {
    background: rgba($fever-amber, 0.1);
    border-color: $fever-amber;
  }

  &.ai-provider__btn--active {
    background: $fever-amber;
    border-color: $fever-amber;
    color: white;
    box-shadow: 0 0 20px rgba($fever-amber, 0.4);
  }
}

// Cursor/Grok - Lime
.ai-provider__btn--cursor {
  border-color: rgba($fever-lime, 0.3);
  color: $fever-lime;

  &:hover:not(:disabled) {
    background: rgba($fever-lime, 0.1);
    border-color: $fever-lime;
  }

  &.ai-provider__btn--active {
    background: $fever-lime;
    border-color: $fever-lime;
    color: $fever-ghost-dark;
    box-shadow: 0 0 20px rgba($fever-lime, 0.4);
  }
}

.ai-provider__status {
  margin-top: 8px;
  font-size: 11px;
  text-align: center;
}

.ai-provider__status--disconnected {
  color: $fever-amber;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
</style>
