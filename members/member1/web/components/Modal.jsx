/**
 * Modal shared component.
 *
 * Shared accessible dialog with Escape dismissal and keyboard focus containment.
 * Capture the previous focus target, focus the dialog, and restore focus during
 * cleanup.
 */

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Shared accessible dialog with Escape dismissal and keyboard focus containment.
 * Capture the previous focus target, focus the dialog, and restore focus during
 * cleanup.
 */
export function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    // Remember the invoking button so closing the dialog returns the keyboard user
    // there.
    const previous = document.activeElement;
    ref.current?.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      // At either end of the focusable list, wrap Tab/Shift+Tab inside the open dialog.
      if (e.key === "Tab") {
        const els = ref.current?.querySelectorAll('button,input,select,[tabindex="0"]');
        if (!els?.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      // Every installed document listener must be removed when the dialog closes.
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-shade"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="section-head">
          <h2>{title}</h2>
          <button aria-label="Close dialog" className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
