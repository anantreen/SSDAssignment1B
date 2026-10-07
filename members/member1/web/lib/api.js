/**
 * Browser JSON client for the existing /api routes.
 *
 * This is the only shared fetch wrapper; it contains no database credentials.
 * It turns non-JSON replies and unsuccessful HTTP status codes into readable errors.
 */

/**
 * @param {string} url Route suffix such as /bookings or /properties?limit=8.
 * @param {RequestInit} options Fetch options; write requests supply method and JSON
 * body.
 * @returns {Promise<any>} Parsed successful JSON response.
 * @throws {Error} Friendly server error or invalid/non-JSON response.
 */
export async function api(url, options = {}) {
  const res = await fetch(`/api${url}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  let data;
  try {
    // Parse once so success and failure paths use the same response body.
    data = await res.json();
  } catch {
    throw new Error(
      "The server did not return data. Check your connection and try again.",
    );
  }
  if (!res.ok)
    throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}
