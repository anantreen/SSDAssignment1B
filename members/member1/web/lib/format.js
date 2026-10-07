/**
 * Display-only helpers shared by every member.
 *
 * PostgreSQL monetary values often arrive as strings; Number is used here to format
 * them.
 * Financial arithmetic and authoritative booking totals remain in PostgreSQL NUMERIC.
 * UTC date helpers produce API filter values; date formats an instant for the local
 * display.
 */

/**
 * Format a monetary snapshot as INR using Indian digit grouping.
 */
export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
/**
 * Format non-monetary totals (bookings, nights, review counts).
 */
export const count = (value) => new Intl.NumberFormat("en-IN").format(Number(value ?? 0));
/**
 * Display a timestamp in the browser's locale/timezone; missing values use an em dash.
 */
export const date = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
/**
 * Return today's UTC calendar date as YYYY-MM-DD, matching the SQL analytics
 * convention.
 */
export const today = () => new Date().toISOString().slice(0, 10);
/**
 * Return the UTC date days whole 24-hour periods before now for default filters.
 */
export const daysAgo = (days) =>
  new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
