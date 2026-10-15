/**
 * Minimal in-memory cache for parsed recipe data.
 * Provides get, set, and clear keyed by an arbitrary string.
 */
export class IngestCache {
  constructor() {
    this.store = new Map();
  }

  /**
   * @param {string} key
   * @returns {any | undefined}
   */
  get(key) {
    return this.store.get(key);
  }

  /**
   * @param {string} key
   * @param {any} value
   */
  set(key, value) {
    this.store.set(key, value);
  }

  /**
   * Remove a single entry, or clear the entire cache if no key is given.
   * @param {string} [key]
   */
  clear(key) {
    if (key === undefined) {
      this.store.clear();
    } else {
      this.store.delete(key);
    }
  }
}

export const ingestCache = new IngestCache();
