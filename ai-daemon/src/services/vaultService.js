/**
 * Vault Service
 *
 * Manages in-memory cache of all documents in the workspace.
 * Provides search and retrieval functionality for AI context.
 */

export class VaultService {
  constructor() {
    // Map of documentId -> { id, name, path, text, hash, updatedAt }
    this.documents = new Map();
  }

  /**
   * Update vault cache with documents from client
   * @param {Array} docs - Array of document objects
   */
  sync(docs) {
    const incomingIds = new Set();

    for (const doc of docs) {
      if (!doc.id) continue;

      incomingIds.add(doc.id);

      // Check if document changed (by hash or content)
      const existing = this.documents.get(doc.id);
      if (existing && existing.hash === doc.hash) {
        continue; // No change
      }

      this.documents.set(doc.id, {
        id: doc.id,
        name: doc.name || 'Untitled',
        path: doc.path || doc.name || 'Untitled',
        text: doc.text || '',
        hash: doc.hash || this.hashContent(doc.text || ''),
        updatedAt: Date.now()
      });
    }

    // Remove documents no longer in vault
    for (const [id] of this.documents) {
      if (!incomingIds.has(id)) {
        this.documents.delete(id);
      }
    }

    return {
      count: this.documents.size,
      updated: incomingIds.size
    };
  }

  /**
   * Simple hash for change detection
   */
  hashContent(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  /**
   * Search across all documents
   * @param {string} query - Search query
   * @returns {Array} - Matching documents with snippets
   */
  search(query) {
    const results = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    for (const doc of this.documents.values()) {
      const textLower = doc.text.toLowerCase();
      const nameLower = doc.name.toLowerCase();

      // Check for exact phrase match first
      let matchIndex = textLower.indexOf(queryLower);
      let matchType = 'exact';

      // Fall back to word matching if no exact match
      if (matchIndex === -1 && queryWords.length > 0) {
        for (const word of queryWords) {
          const wordIndex = textLower.indexOf(word);
          if (wordIndex !== -1) {
            matchIndex = wordIndex;
            matchType = 'partial';
            break;
          }
        }
      }

      // Also match on document name
      const nameMatch = nameLower.includes(queryLower) ||
        queryWords.some(w => nameLower.includes(w));

      if (matchIndex !== -1 || nameMatch) {
        results.push({
          id: doc.id,
          name: doc.name,
          path: doc.path,
          matchType: matchIndex !== -1 ? matchType : 'name',
          snippet: matchIndex !== -1
            ? this.extractSnippet(doc.text, matchIndex, query.length)
            : doc.text.slice(0, 150) + (doc.text.length > 150 ? '...' : '')
        });
      }
    }

    // Sort by match quality: exact > partial > name
    results.sort((a, b) => {
      const order = { exact: 0, partial: 1, name: 2 };
      return order[a.matchType] - order[b.matchType];
    });

    return results.slice(0, 10); // Limit to top 10 results
  }

  /**
   * Extract a snippet around the match
   */
  extractSnippet(text, index, queryLength) {
    const contextBefore = 60;
    const contextAfter = 60;

    const start = Math.max(0, index - contextBefore);
    const end = Math.min(text.length, index + queryLength + contextAfter);

    let snippet = text.slice(start, end);

    // Add ellipsis if truncated
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';

    // Clean up whitespace
    snippet = snippet.replace(/\s+/g, ' ').trim();

    return snippet;
  }

  /**
   * Read a specific document by path
   * @param {string} path - Document path
   * @returns {object|null} - Document or null if not found
   */
  readDocument(path) {
    // Try exact path match first
    for (const doc of this.documents.values()) {
      if (doc.path === path || doc.name === path) {
        return {
          id: doc.id,
          name: doc.name,
          path: doc.path,
          content: doc.text
        };
      }
    }

    // Try fuzzy path match (case insensitive, partial)
    const pathLower = path.toLowerCase();
    for (const doc of this.documents.values()) {
      if (doc.path.toLowerCase().includes(pathLower) ||
          doc.name.toLowerCase().includes(pathLower)) {
        return {
          id: doc.id,
          name: doc.name,
          path: doc.path,
          content: doc.text
        };
      }
    }

    return null;
  }

  /**
   * Get all documents for context
   */
  getAllDocuments() {
    return Array.from(this.documents.values()).map(doc => ({
      id: doc.id,
      name: doc.name,
      path: doc.path
      // Exclude full text to keep context manageable
    }));
  }

  /**
   * Get vault stats
   */
  getStats() {
    let totalChars = 0;
    let totalWords = 0;

    for (const doc of this.documents.values()) {
      totalChars += doc.text.length;
      totalWords += doc.text.split(/\s+/).filter(w => w).length;
    }

    return {
      documentCount: this.documents.size,
      totalCharacters: totalChars,
      totalWords: totalWords,
      estimatedTokens: Math.round(totalWords * 1.3) // Rough estimate
    };
  }

  /**
   * Clear vault cache
   */
  clear() {
    this.documents.clear();
  }
}

export default VaultService;
