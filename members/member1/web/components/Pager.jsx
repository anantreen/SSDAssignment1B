/**
 * Pager shared component.
 *
 * Present cursor navigation; the parent owns cursor/history updates and data loading.
 * Previous is available with history; Next is available only when the server sends a
 * cursor.
 */

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Present cursor navigation; the parent owns cursor/history updates and data loading.
 * Previous is available with history; Next is available only when the server sends a
 * cursor.
 */
export function Pager({ next, history, onNext, onBack, label }) {
  return (
    <div className="pager">
      <span>{label ?? `Page ${history.length + 1}`} · up to 20 records per page</span>
      <div>
        <button
          className="icon-btn"
          aria-label="Previous page"
          disabled={!history.length}
          onClick={onBack}
        >
          <ChevronLeft size={19} />
        </button>
        <button
          className="icon-btn"
          aria-label="Next page"
          disabled={!next}
          onClick={onNext}
        >
          <ChevronRight size={19} />
        </button>
      </div>
    </div>
  );
}
