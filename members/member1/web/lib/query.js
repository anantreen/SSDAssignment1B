/**
 * Encode filter objects as URL query parameters.
 *
 * Empty/null/undefined values are omitted; false and numeric zero remain valid values.
 * URLSearchParams escapes search text and cursors before they enter a URL.
 */

export const qs = (filters) =>
  new URLSearchParams(
    Object.entries(filters).filter(
      ([, value]) => value !== "" && value !== null && value !== undefined,
    ),
  ).toString();
