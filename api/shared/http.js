/**
 * Shared validation, pagination and async-route contracts.
 *
 * Validate external values before binding them to SQL or building MongoDB queries.
 * These functions throw InputError; api/app.js maps that error to a friendly JSON
 * reply.
 * No helper selects tables from request text or concatenates untrusted SQL values.
 */

/**
 * Attach an HTTP status to a user-correctable error; default status is Bad Request.
 */
export class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
/**
 * Accept only digit strings/safe whole numbers inside the supplied bounds.
 * Reject fractions, signs, injected expressions and unsafe JavaScript integer
 * precision.
 */
export const integer = (value, name, min = 1, max = 2147483647) => {
  if (
    !/^\d+$/.test(String(value)) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < min ||
    Number(value) > max
  )
    throw new InputError(`${name} must be a whole number between ${min} and ${max}.`);
  return Number(value);
};
/**
 * Validate finite coordinates/numeric fields; empty input must not silently become
 * zero.
 */
export const number = (value, name, min, max) => {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === "" ||
    !Number.isFinite(Number(value)) ||
    Number(value) < min ||
    Number(value) > max
  )
    throw new InputError(`${name} must be between ${min} and ${max}.`);
  return Number(value);
};
/**
 * Require YYYY-MM-DD and round-trip through Date to reject impossible calendar dates.
 */
export const day = (value, name) => {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw new InputError(`${name} must be a valid YYYY-MM-DD date.`);
  return value;
};
/**
 * Standard list parameters: max 50 records, ID cursor defaulting to the beginning.
 */
export const page = (q) => ({
  limit: integer(q.limit ?? 20, "Page size", 1, 50),
  after: q.after ? integer(q.after, "Cursor", 0) : 0,
});
/**
 * Convert a limit+1 query into {items,next}; the extra row proves another page exists.
 * An optional cursor encoder supports audit timestamp/ID tuples as well as simple IDs.
 */
export const paged = (rows, limit, cursor = (r) => r.id) => ({
  items: rows.slice(0, limit),
  next: rows.length > limit ? String(cursor(rows[limit - 1])) : null,
});
/**
 * The three accepted persistent booking states; starting/transition rules are narrower.
 */
export const statusSet = ["CONFIRMED", "CHECKED_IN", "COMPLETED"];
/**
 * Trim and bound user-visible search text before constructing a parameterized query.
 */
export const searchText = (value) => {
  const s = String(value ?? "").trim();
  if (s.length > 80) throw new InputError("Search is limited to 80 characters.");
  return s;
};
/**
 * Forward rejected async handlers to Express's shared error middleware.
 */
export const route = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res)).catch(next);
