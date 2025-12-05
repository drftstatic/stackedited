/**
 * Natural Language Task Parser
 *
 * Parses task descriptions with embedded metadata:
 * - @mentions (agent assignments)
 * - Priority indicators (high, medium, low, !!, !)
 * - Due dates (due:tomorrow, due:2025-12-15, due:week)
 * - Tags (#tag1, #tag2)
 * - Estimates (est:2h, est:30m)
 *
 * Example input:
 * "Fix auth bug @claude high due:tomorrow #security est:2h"
 *
 * Parsed output:
 * {
 *   description: "Fix auth bug",
 *   assignee: "claude",
 *   priority: "high",
 *   due: Date object,
 *   tags: ["security"],
 *   estimated: 7200000 (ms)
 * }
 */

class TaskParser {
  constructor() {
    // Agent name mapping
    this.agentMap = {
      claude: 'claude',
      gemini: 'gemini',
      gpt: 'openai',
      openai: 'openai',
      grok: 'cursor',
      cursor: 'cursor',
      composer: 'composer',
      human: 'human',
      me: 'human',
    };

    // Priority keywords and symbols
    this.priorityMap = {
      high: 'high',
      urgent: 'high',
      critical: 'high',
      '!!': 'high',
      medium: 'medium',
      normal: 'medium',
      '!': 'medium',
      low: 'low',
    };

    // Relative date keywords
    this.relativeDates = {
      today: 0,
      tomorrow: 1,
      yesterday: -1,
      week: 7,
      month: 30,
    };
  }

  /**
   * Parse task description with embedded metadata
   *
   * @param {string} input - Raw task input
   * @returns {Object} Parsed task data
   */
  parse(input) {
    if (!input || typeof input !== 'string') {
      return {
        description: '',
        assignee: null,
        priority: null,
        due: null,
        tags: [],
        estimated: null,
        mentions: [],
      };
    }

    const result = {
      description: input,
      assignee: null,
      priority: null,
      due: null,
      tags: [],
      estimated: null,
      mentions: [],
    };

    // Extract @mentions
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(input)) !== null) {
      const mention = match[1].toLowerCase();
      result.mentions.push(mention);

      // Map first valid agent mention to assignee
      if (!result.assignee && this.agentMap[mention]) {
        result.assignee = this.agentMap[mention];
      }
    }

    // Extract priority
    const priorityRegex = /\b(high|urgent|critical|medium|normal|low|!!|!)\b/i;
    const priorityMatch = input.match(priorityRegex);
    if (priorityMatch) {
      const priorityKey = priorityMatch[1].toLowerCase();
      result.priority = this.priorityMap[priorityKey];
    }

    // Extract due date
    const dueRegex = /due:([\w-]+)/i;
    const dueMatch = input.match(dueRegex);
    if (dueMatch) {
      result.due = this.parseDate(dueMatch[1]);
    }

    // Extract tags
    const tagRegex = /#(\w+)/g;
    while ((match = tagRegex.exec(input)) !== null) {
      result.tags.push(match[1].toLowerCase());
    }

    // Extract estimate
    const estimateRegex = /est:(\d+)([hm])/i;
    const estimateMatch = input.match(estimateRegex);
    if (estimateMatch) {
      const value = parseInt(estimateMatch[1], 10);
      const unit = estimateMatch[2].toLowerCase();
      result.estimated = unit === 'h' ? value * 3600000 : value * 60000; // Convert to ms
    }

    // Clean description (remove parsed metadata)
    result.description = input
      .replace(mentionRegex, '') // Remove @mentions
      .replace(/\b(high|urgent|critical|medium|normal|low|!!|!)\b/gi, '') // Remove priority
      .replace(/due:[\w-]+/gi, '') // Remove due dates
      .replace(/#\w+/g, '') // Remove tags
      .replace(/est:\d+[hm]/gi, '') // Remove estimates
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim();

    return result;
  }

  /**
   * Parse date string into Date object
   *
   * Supports:
   * - Relative: today, tomorrow, week, month
   * - Absolute: 2025-12-15, 12-15, 15
   *
   * @param {string} dateStr - Date string
   * @returns {Date|null} Parsed date or null
   */
  parseDate(dateStr) {
    if (!dateStr) return null;

    const input = dateStr.toLowerCase();

    // Relative dates
    if (this.relativeDates[input] !== undefined) {
      const days = this.relativeDates[input];
      const date = new Date();
      date.setDate(date.getDate() + days);
      date.setHours(23, 59, 59, 999); // End of day
      return date;
    }

    // Absolute dates
    // Try ISO format: 2025-12-15
    const isoMatch = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1; // 0-indexed
      const day = parseInt(isoMatch[3], 10);
      return new Date(year, month, day, 23, 59, 59, 999);
    }

    // Try MM-DD format (assume current year)
    const mmddMatch = input.match(/^(\d{1,2})-(\d{1,2})$/);
    if (mmddMatch) {
      const year = new Date().getFullYear();
      const month = parseInt(mmddMatch[1], 10) - 1;
      const day = parseInt(mmddMatch[2], 10);
      return new Date(year, month, day, 23, 59, 59, 999);
    }

    // Try day only (assume current month/year)
    const dayMatch = input.match(/^(\d{1,2})$/);
    if (dayMatch) {
      const date = new Date();
      const day = parseInt(dayMatch[1], 10);
      date.setDate(day);
      date.setHours(23, 59, 59, 999);
      return date;
    }

    return null;
  }

  /**
   * Format a Date object as human-readable string
   *
   * @param {Date} date - Date to format
   * @returns {string} Formatted date
   */
  formatDate(date) {
    if (!(date instanceof Date)) return '';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (dateOnly.getTime() === today.getTime()) return 'Today';
    if (dateOnly.getTime() === tomorrow.getTime()) return 'Tomorrow';

    // Within a week
    const daysAway = Math.floor((dateOnly - today) / (1000 * 60 * 60 * 24));
    if (daysAway >= 0 && daysAway <= 7) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return dayNames[date.getDay()];
    }

    // Format as MM/DD/YYYY
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  /**
   * Format estimated time in human-readable form
   *
   * @param {number} ms - Time in milliseconds
   * @returns {string} Formatted time
   */
  formatEstimate(ms) {
    if (!ms || ms <= 0) return '';

    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);

    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;

    return '<1m';
  }
}

// Export singleton instance
export default new TaskParser();
