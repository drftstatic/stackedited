/**
 * Keyboard Shortcut Service
 *
 * Manages global keyboard shortcuts for the application.
 * Inspired by Linear's keyboard-first design.
 *
 * Features:
 * - Global shortcut registration
 * - Context-aware shortcuts (ignore when input focused)
 * - Modifier key support (Cmd/Ctrl, Shift, Alt)
 * - Shortcut hints and help modal
 */

class KeyboardService {
  constructor() {
    this.shortcuts = new Map();
    this.enabled = true;
    this.listener = null;
  }

  /**
   * Initialize the keyboard service
   */
  init() {
    this.listener = (event) => this.handleKeyDown(event);
    document.addEventListener('keydown', this.listener);
  }

  /**
   * Cleanup and remove listeners
   */
  destroy() {
    if (this.listener) {
      document.removeEventListener('keydown', this.listener);
      this.listener = null;
    }
    this.shortcuts.clear();
  }

  /**
   * Register a keyboard shortcut
   *
   * @param {string} key - Key to trigger (e.g., 'c', 'Enter', 'Escape')
   * @param {Function} handler - Function to call when triggered
   * @param {Object} options - Configuration options
   * @param {boolean} options.ctrl - Require Ctrl/Cmd key
   * @param {boolean} options.shift - Require Shift key
   * @param {boolean} options.alt - Require Alt key
   * @param {string} options.context - Context where shortcut is active ('global' or 'task-list')
   * @param {string} options.description - Human-readable description
   */
  register(key, handler, options = {}) {
    const shortcut = {
      key: key.toLowerCase(),
      handler,
      ctrl: options.ctrl || false,
      shift: options.shift || false,
      alt: options.alt || false,
      context: options.context || 'global',
      description: options.description || '',
    };

    const shortcutKey = this.getShortcutKey(shortcut);
    this.shortcuts.set(shortcutKey, shortcut);
  }

  /**
   * Unregister a shortcut
   */
  unregister(key, options = {}) {
    const shortcut = {
      key: key.toLowerCase(),
      ctrl: options.ctrl || false,
      shift: options.shift || false,
      alt: options.alt || false,
    };
    const shortcutKey = this.getShortcutKey(shortcut);
    this.shortcuts.delete(shortcutKey);
  }

  /**
   * Get unique key for a shortcut
   */
  getShortcutKey(shortcut) {
    const modifiers = [];
    if (shortcut.ctrl) modifiers.push('ctrl');
    if (shortcut.shift) modifiers.push('shift');
    if (shortcut.alt) modifiers.push('alt');
    return `${modifiers.join('+')}-${shortcut.key}`;
  }

  /**
   * Handle keydown events
   */
  handleKeyDown(event) {
    if (!this.enabled) return;

    // Don't trigger shortcuts when typing in inputs, textareas, or contenteditable
    const target = event.target;
    const isInput = target.tagName === 'INPUT' ||
                   target.tagName === 'TEXTAREA' ||
                   target.isContentEditable;

    // Check if shortcut exists
    const modifiers = [];
    if (event.ctrlKey || event.metaKey) modifiers.push('ctrl');
    if (event.shiftKey) modifiers.push('shift');
    if (event.altKey) modifiers.push('alt');
    const shortcutKey = `${modifiers.join('+')}-${event.key.toLowerCase()}`;

    const shortcut = this.shortcuts.get(shortcutKey);
    if (!shortcut) return;

    // Global shortcuts can trigger anywhere (unless in input)
    // Context-specific shortcuts require specific context
    if (shortcut.context === 'global' && isInput) return;

    // Call handler
    event.preventDefault();
    shortcut.handler(event);
  }

  /**
   * Temporarily disable all shortcuts
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Re-enable shortcuts
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Get all registered shortcuts grouped by context
   */
  getAllShortcuts() {
    const byContext = {
      global: [],
      'task-list': [],
    };

    this.shortcuts.forEach((shortcut) => {
      const context = shortcut.context || 'global';
      if (!byContext[context]) {
        byContext[context] = [];
      }
      byContext[context].push({
        key: this.formatShortcutDisplay(shortcut),
        description: shortcut.description,
      });
    });

    return byContext;
  }

  /**
   * Format shortcut for display (e.g., "Cmd+K", "C", "Shift+?")
   */
  formatShortcutDisplay(shortcut) {
    const parts = [];
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    if (shortcut.ctrl) parts.push(isMac ? 'Cmd' : 'Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    parts.push(shortcut.key.toUpperCase());

    return parts.join('+');
  }
}

// Export singleton instance
export default new KeyboardService();
