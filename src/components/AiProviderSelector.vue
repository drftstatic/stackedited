<template>
  <div class="ai-provider">
    <!-- Mode selector -->
    <div class="ai-provider__mode">
      <button
        v-title="'Auto-select best AI for the task'"
        class="ai-provider__mode-btn"
        :class="{ 'ai-provider__mode-btn--active': mode === 'auto' }"
        @click="setMode('auto')"
      >
        Auto
      </button>
      <button
        v-title="'Manually select AI provider'"
        class="ai-provider__mode-btn"
        :class="{ 'ai-provider__mode-btn--active': mode === 'manual' }"
        @click="setMode('manual')"
      >
        Manual
      </button>
    </div>

    <!-- Provider buttons (manual mode) -->
    <div v-if="mode === 'manual'" class="ai-provider__list">
      <button
        v-for="provider in availableProviders"
        :key="provider.id"
        v-title="provider.name"
        class="ai-provider__btn"
        :class="{ 'ai-provider__btn--active': providerId === provider.id }"
        @click="selectProvider(provider.id)"
      >
        {{ getProviderShortName(provider.id) }}
      </button>
    </div>

    <!-- Current selection info -->
    <div v-if="selection" class="ai-provider__selection">
      <span class="ai-provider__using">
        Using: <strong>{{ getCurrentProviderName() }}</strong>
        <span v-if="selection.score" class="ai-provider__score">
          ({{ Math.round(selection.score * 100) }}%)
        </span>
      </span>
      <span v-if="selection.reason" class="ai-provider__reason">
        {{ selection.reason }}
      </span>
    </div>

    <!-- Suggestions (auto mode) -->
    <div v-if="mode === 'auto' && suggestions.length > 1" class="ai-provider__suggestions">
      <span class="ai-provider__suggestions-label">Alternatives:</span>
      <span
        v-for="alt in topAlternatives"
        :key="alt.id"
        v-title="`Switch to ${alt.name}: ${alt.reason}`"
        class="ai-provider__alt"
        @click="selectProvider(alt.id); setMode('manual')"
      >
        {{ getProviderShortName(alt.id) }} ({{ Math.round(alt.score * 100) }}%)
      </span>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import aiService from '../services/aiService';

export default {
  computed: {
    ...mapState('aiChat', [
      'mode',
      'providerId',
      'providers',
      'suggestions',
      'selection',
    ]),
    ...mapGetters('aiChat', [
      'availableProviders',
    ]),
    topAlternatives() {
      // Show top 2 alternatives that aren't the current selection
      return this.suggestions
        .filter((s) => s.id !== this.providerId && s.available)
        .slice(0, 2);
    },
  },
  methods: {
    setMode(mode) {
      aiService.setMode(mode);
    },
    selectProvider(providerId) {
      aiService.setProvider(providerId);
    },
    getProviderShortName(id) {
      const names = {
        claude: 'Claude',
        gemini: 'Gemini',
        openai: 'GPT',
      };
      return names[id] || id;
    },
    getCurrentProviderName() {
      const provider = this.providers.find((p) => p.id === this.providerId);
      return provider?.name || this.providerId;
    },
  },
};
</script>

<style lang="scss">
@import '../styles/variables.scss';

.ai-provider {
  padding: 8px 12px;
  border-bottom: 1px solid $border-color;
  font-size: 12px;
}

.ai-provider__mode {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.ai-provider__mode-btn {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid $border-color;
  background: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: $secondary-text-color;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
}

.ai-provider__mode-btn--active {
  background-color: $link-color;
  border-color: $link-color;
  color: white;

  &:hover {
    background-color: darken($link-color, 10%);
  }
}

.ai-provider__list {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.ai-provider__btn {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid $border-color;
  background: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  color: $secondary-text-color;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
}

.ai-provider__btn--active {
  background-color: rgba($link-color, 0.15);
  border-color: $link-color;
  color: $link-color;
}

.ai-provider__selection {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ai-provider__using {
  color: $secondary-text-color;

  strong {
    color: $font-color;
  }
}

.ai-provider__score {
  color: $link-color;
  font-size: 11px;
}

.ai-provider__reason {
  font-size: 11px;
  color: $secondary-text-color;
  font-style: italic;
}

.ai-provider__suggestions {
  margin-top: 6px;
  font-size: 11px;
  color: $secondary-text-color;
}

.ai-provider__suggestions-label {
  margin-right: 4px;
}

.ai-provider__alt {
  display: inline-block;
  padding: 2px 6px;
  margin: 2px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
  cursor: pointer;

  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
}
</style>
