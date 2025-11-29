/**
 * Capability Matcher Service
 *
 * Smart routing between AI providers based on task requirements.
 * Implements capability-based scoring from STUDIO patterns.
 *
 * Three modes:
 * 1. Auto - Score all providers, pick best match
 * 2. Manual - User explicitly selects provider
 * 3. Suggested - Show ranked options with scores
 */

// Task keywords mapped to capabilities
const TASK_CAPABILITY_MAP = {
  // Editing tasks
  'edit': ['editing', 'nuance'],
  'rewrite': ['editing', 'nuance'],
  'improve': ['editing', 'review'],
  'fix': ['editing', 'code'],
  'polish': ['editing', 'nuance'],
  'rephrase': ['editing', 'nuance'],
  'shorten': ['editing'],
  'expand': ['editing'],
  'clarify': ['editing', 'nuance'],

  // Research tasks
  'research': ['research', 'grounding'],
  'search': ['research', 'grounding'],
  'find': ['research'],
  'look up': ['research', 'grounding'],
  'what is': ['research'],
  'latest': ['research', 'grounding'],
  'current': ['research', 'grounding'],
  'news': ['research', 'grounding'],

  // Code tasks
  'code': ['code', 'implementation'],
  'function': ['code', 'implementation'],
  'debug': ['code', 'review'],
  'refactor': ['code', 'review'],
  'implement': ['code', 'implementation'],

  // Analysis tasks
  'analyze': ['analysis', 'review'],
  'review': ['review'],
  'summarize': ['analysis'],
  'explain': ['analysis', 'nuance'],

  // Long context tasks
  'entire document': ['large-context'],
  'whole file': ['large-context'],
  'all my': ['large-context'],
  'across': ['large-context'],
  'compare': ['large-context', 'analysis'],

  // Long-running tasks
  'thorough': ['long-tasks'],
  'comprehensive': ['long-tasks', 'analysis'],
  'detailed': ['long-tasks', 'analysis']
};

export class CapabilityMatcher {
  constructor(providers) {
    // Map of providerId -> provider instance
    this.providers = new Map();
    for (const provider of providers) {
      this.providers.set(provider.id, provider);
    }
  }

  /**
   * Analyze message to detect required capabilities
   * @param {string} message - User message
   * @returns {string[]} - Required capabilities
   */
  analyzeTask(message) {
    const messageLower = message.toLowerCase();
    const capabilities = new Set();

    for (const [keyword, caps] of Object.entries(TASK_CAPABILITY_MAP)) {
      if (messageLower.includes(keyword)) {
        caps.forEach(cap => capabilities.add(cap));
      }
    }

    // Default to general editing if no specific capabilities detected
    if (capabilities.size === 0) {
      capabilities.add('editing');
      capabilities.add('nuance');
    }

    return Array.from(capabilities);
  }

  /**
   * Score a provider against required capabilities
   * @param {object} provider - Provider instance
   * @param {string[]} requiredCapabilities - Required capabilities
   * @returns {number} - Score from 0.0 to 1.0
   */
  scoreProvider(provider, requiredCapabilities) {
    if (!provider.enabled) return 0;

    const providerCaps = new Set(provider.capabilities);
    let matchedCount = 0;

    for (const cap of requiredCapabilities) {
      if (providerCaps.has(cap)) {
        matchedCount++;
      }
    }

    // Base score from capability match
    const baseScore = requiredCapabilities.length > 0
      ? matchedCount / requiredCapabilities.length
      : 0.5;

    // Bonus for having extra relevant capabilities
    const extraCaps = provider.capabilities.length - matchedCount;
    const bonusScore = Math.min(extraCaps * 0.05, 0.15);

    return Math.min(baseScore + bonusScore, 1.0);
  }

  /**
   * Get ranked providers for a task
   * @param {string} message - User message
   * @returns {Array} - Providers sorted by score with reasons
   */
  async rankProviders(message) {
    const requiredCapabilities = this.analyzeTask(message);
    const rankings = [];

    for (const [id, provider] of this.providers) {
      const available = await provider.isAvailable();
      const score = available ? this.scoreProvider(provider, requiredCapabilities) : 0;

      rankings.push({
        id,
        name: provider.name,
        score: Math.round(score * 100) / 100,
        available,
        capabilities: provider.capabilities,
        matchedCapabilities: requiredCapabilities.filter(c =>
          provider.capabilities.includes(c)
        ),
        reason: this.explainScore(provider, requiredCapabilities, score, available)
      });
    }

    // Sort by score descending
    rankings.sort((a, b) => b.score - a.score);

    return rankings;
  }

  /**
   * Generate human-readable explanation for score
   */
  explainScore(provider, requiredCapabilities, score, available) {
    if (!available) {
      return `${provider.name} CLI not available`;
    }

    const matched = requiredCapabilities.filter(c =>
      provider.capabilities.includes(c)
    );

    if (matched.length === 0) {
      return `No matching capabilities for this task`;
    }

    if (score >= 0.9) {
      return `Excellent match: ${matched.join(', ')}`;
    } else if (score >= 0.7) {
      return `Good match: ${matched.join(', ')}`;
    } else if (score >= 0.5) {
      return `Partial match: ${matched.join(', ')}`;
    } else {
      return `Limited match: ${matched.join(', ')}`;
    }
  }

  /**
   * Auto-select best provider for task
   * @param {string} message - User message
   * @returns {object} - Best provider with selection info
   */
  async selectBest(message) {
    const rankings = await this.rankProviders(message);

    // Get the best available provider
    const best = rankings.find(r => r.available && r.score > 0);

    if (!best) {
      throw new Error('No AI providers available');
    }

    return {
      provider: this.providers.get(best.id),
      selection: {
        mode: 'auto',
        providerId: best.id,
        score: best.score,
        reason: best.reason,
        alternatives: rankings.slice(1, 4) // Top 3 alternatives
      }
    };
  }

  /**
   * Manually select a provider
   * @param {string} providerId - Provider ID
   * @returns {object} - Selected provider
   */
  async selectManual(providerId) {
    const provider = this.providers.get(providerId);

    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    const available = await provider.isAvailable();
    if (!available) {
      throw new Error(`${provider.name} CLI is not available`);
    }

    return {
      provider,
      selection: {
        mode: 'manual',
        providerId,
        score: 1.0,
        reason: 'Manually selected'
      }
    };
  }

  /**
   * Get suggested providers with scores
   * @param {string} message - User message
   * @returns {Array} - Ranked providers
   */
  async getSuggestions(message) {
    return this.rankProviders(message);
  }

  /**
   * Add or update a provider
   */
  setProvider(provider) {
    this.providers.set(provider.id, provider);
  }

  /**
   * Remove a provider
   */
  removeProvider(providerId) {
    this.providers.delete(providerId);
  }

  /**
   * Get all provider IDs
   */
  getProviderIds() {
    return Array.from(this.providers.keys());
  }
}

export default CapabilityMatcher;
