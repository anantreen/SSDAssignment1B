/**
 * Booking status control embedded in the Browse table.
 *
 * CONFIRMED advances to CHECKED_IN; CHECKED_IN advances to COMPLETED.
 * The server enforces legal transitions and PostgreSQL enforces one active stay.
 * Success refreshes the parent page; failure leaves its friendly message there.
 */

import React from "react";
import { ArrowRight } from "lucide-react";
import { api } from "../../member1/web/lib/api.js";

/**
 * Render the next legal action for a booking, or All done for a completed stay.
 * @param {Object} props booking is the row; onSuccess reloads it; onError displays its
 * failure.
 */
export function BookingStatusAction({ booking, onSuccess, onError }) {
  /**
   * Choose only the next legal status; the API/database decide whether it can proceed.
   */
  async function advance(item) {
    try {
      await api(`/bookings/${item.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: item.status === "CONFIRMED" ? "CHECKED_IN" : "COMPLETED",
        }),
      });
      onSuccess();
    } catch (e) {
      onError(e.message);
    }
  }
  return booking.status !== "COMPLETED" ? (
    <button className="text-btn" onClick={() => advance(booking)}>
      {booking.status === "CONFIRMED" ? "Check in" : "Complete stay"}{" "}
      <ArrowRight size={14} />
    </button>
  ) : (
    <span className="muted">All done</span>
  );
}
