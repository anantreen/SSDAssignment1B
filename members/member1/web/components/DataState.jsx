/**
 * DataState shared component.
 *
 * Gate children behind a common loading, retryable-error or empty-results state.
 * The resource contract is {loading, error, data, reload}, supplied by useData.
 */

import React from "react";
import { RefreshCw, Leaf } from "lucide-react";

import { Alert } from "./Alert.jsx";

/**
 * Gate children behind a common loading, retryable-error or empty-results state.
 * The resource contract is {loading, error, data, reload}, supplied by useData.
 */
export function DataState({ resource, empty = false, children }) {
  if (resource.loading)
    return (
      <div className="state" role="status">
        <RefreshCw className="spin" size={24} />
        <p>Getting everything ready…</p>
      </div>
    );
  if (resource.error)
    return (
      <div className="state">
        <Alert message={resource.error} />
        <button className="btn secondary" onClick={resource.reload}>
          Try again
        </button>
      </div>
    );
  if (empty)
    return (
      <div className="state">
        <Leaf size={30} />
        <h3>Nothing here yet</h3>
        <p>Try another filter, date range, or property.</p>
      </div>
    );
  return children;
}
