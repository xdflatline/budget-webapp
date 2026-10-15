const CHF_FORMATTER = new Intl.NumberFormat('de-CH', {
  style: 'decimal',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a number as CHF with Swiss locale (e.g. 1'234.56).
 * @param {number} value
 * @returns {string}
 */
export function formatChf(value) {
  return CHF_FORMATTER.format(value);
}
