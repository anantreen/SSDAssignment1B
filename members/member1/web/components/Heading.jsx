/**
 * Heading shared component.
 *
 * Reusable screen heading: eyebrow, title, description and optional action control.
 * Children keep the same markup so spacing and responsive rules stay consistent.
 */

import React from "react";

/**
 * Reusable screen heading: eyebrow, title, description and optional action control.
 * Children keep the same markup so spacing and responsive rules stay consistent.
 */
export function Heading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
