/**
 * Alert shared component.
 *
 * Present one friendly success/error message without changing the surrounding layout.
 * role=status announces success; role=alert makes a failure noticeable to assistive
 * tools.
 */

import React from "react";
import { ReceiptText, CircleCheck } from "lucide-react";

/**
 * Present one friendly success/error message without changing the surrounding layout.
 * role=status announces success; role=alert makes a failure noticeable to assistive
 * tools.
 */
export function Alert({ message, success = false }) {
  return (
    <div
      role={success ? "status" : "alert"}
      className={`alert ${success ? "success" : ""}`}
    >
      {success ? <CircleCheck size={19} /> : <ReceiptText size={19} />}
      <span>{message}</span>
    </div>
  );
}
