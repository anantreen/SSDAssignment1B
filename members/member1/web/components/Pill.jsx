/**
 * Pill shared component.
 *
 * Render database status codes as readable labels while retaining their CSS status
 * class.
 * Underscores become spaces for display; neither the stored value nor API contract
 * changes.
 */

import React from "react";

/**
 * Render database status codes as readable labels while retaining their CSS status
 * class.
 * Underscores become spaces for display; neither the stored value nor API contract
 * changes.
 */
export function Pill({ status }) {
  return (
    <span className={`pill ${status?.toLowerCase()}`}>
      {status?.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}
