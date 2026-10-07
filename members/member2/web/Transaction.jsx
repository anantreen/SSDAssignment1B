/**
 * Workflow 1: book a stay through the atomic SQL procedure.
 *
 * The displayed price is an estimate; PostgreSQL computes the authoritative total.
 * The request contains guest/property IDs, nights and initial status, never a cost.
 * Successful responses include before/after balances and the real trigger audit row.
 */

import React, { useEffect, useState } from "react";
import { CalendarPlus, ArrowRight, RefreshCw, Wallet, Leaf } from "lucide-react";
import { money } from "../../member1/web/lib/format.js";
import { api } from "../../member1/web/lib/api.js";
import { Alert } from "../../member1/web/components/Alert.jsx";
import { Heading } from "../../member1/web/components/Heading.jsx";
import { Picker } from "../../member1/web/components/Picker.jsx";

/**
 * Submit a stay for the selected actor, then render its committed receipt.
 * @param {Object} props actor supplies identity; initialProperty may come from Browse.
 * onWallet publishes the server's after balance back to the shared application shell.
 */
export function Transaction({ actor, initialProperty, onWallet }) {
  const [property, setProperty] = useState(initialProperty);
  const [nights, setNights] = useState(2);
  const [status, setStatus] = useState("CONFIRMED");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  useEffect(() => {
    // Clear another actor's receipt/error when the demo guest changes.
    setResult(null);
    setError("");
  }, [actor?.id]);
  /**
   * Submit one booking request and publish the committed wallet balance to App.
   * finally restores the button even if validation, connectivity or database work
   * fails.
   */
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      // The server owns pricing, wallet locking, procedure execution and rollback.
      // busy disables the form button while this request is in flight.
      const data = await api("/bookings", {
        method: "POST",
        body: JSON.stringify({
          guest_id: actor?.id,
          property_id: property?.id,
          nights,
          status,
        }),
      });
      setResult(data);
      // Update the shared header wallet only from a successful committed response.
      onWallet(data.balance_after);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="MAKE YOURSELF AT HOME"
        title="Let’s book your next stay."
        description="Pick a place, choose your nights, and leave the rest to us."
      />
      <div className="two-col transaction-layout">
        <div className="panel">
          <div className="section-head">
            <h2>The little details</h2>
            <CalendarPlus size={21} />
          </div>
          <form onSubmit={submit}>
            <Picker
              entity="properties"
              label="01 · Choose your property"
              value={property}
              onSelect={setProperty}
            />
            <div className="form-grid">
              <label>
                02 · Number of nights
                <input
                  aria-label="Number of nights"
                  type="number"
                  min="1"
                  max="365"
                  required
                  value={nights}
                  onChange={(e) => setNights(e.target.value)}
                />
              </label>
              <label>
                03 · Start your stay
                <select
                  aria-label="Starting status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="CONFIRMED">Reserve for later</option>
                  <option value="CHECKED_IN">Check in now</option>
                </select>
              </label>
            </div>
            <p className="help">
              Only one checked-in stay per guest is allowed. Confirmed reservations can
              coexist.
            </p>
            {error && <Alert message={error} />}
            <button
              className="btn full"
              disabled={busy || !property || !actor}
              type="submit"
            >
              {busy ? (
                <>
                  <RefreshCw className="spin" size={18} />
                  Booking your stay…
                </>
              ) : (
                <>
                  Confirm booking <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
        <aside>
          <div className="wallet-card">
            <span>
              <Wallet size={18} /> YOUR STAY WALLET
            </span>
            <h2>{money(actor?.wallet_balance)}</h2>
            <p>{actor?.name ?? "Select a guest"} · Available balance</p>
            <div className="wallet-decoration">
              <Leaf size={74} />
            </div>
          </div>
          <div className="panel quote">
            <h2>Your stay summary</h2>
            {property ? (
              <>
                <h3>{property.title}</h3>
                <div>
                  <span>
                    {money(property.base_price)} × {nights || 0} nights
                  </span>
                  <strong>
                    {money(Number(property.base_price) * Number(nights || 0))}
                  </strong>
                </div>
                <div className="quote-total">
                  <span>Total</span>
                  <strong>
                    {money(Number(property.base_price) * Number(nights || 0))}
                  </strong>
                </div>
                <p className="help">
                  The database calculates the final price and books only when your
                  wallet can cover it.
                </p>
              </>
            ) : (
              <p className="muted">Choose a property to see your total.</p>
            )}
          </div>
          <div className="small-note">
            <Leaf size={18} />
            <p>
              A fresh place. A familiar feeling.
              <br />
              Make this one yours.
            </p>
          </div>
        </aside>
      </div>
      {result && (
        <div className="panel booking-result">
          <Alert
            success
            message={`You're all set. Booking #${result.booking.id} is ${result.booking.status.replaceAll("_", " ").toLowerCase()}.`}
          />
          <div className="result-grid">
            <div>
              <small>Balance before</small>
              <strong>{money(result.balance_before)}</strong>
            </div>
            <ArrowRight size={22} />
            <div>
              <small>Balance after</small>
              <strong>{money(result.balance_after)}</strong>
            </div>
            <div>
              <small>Trigger-created audit #{result.audit.id}</small>
              <strong>
                {result.audit.action_type}{" "}
                {money(Math.abs(result.audit.amount_changed))}
              </strong>
            </div>
          </div>
          <p className="help">
            Booking, wallet debit, and audit entry were committed together. Visit
            Bookings to advance this stay.
          </p>
        </div>
      )}
    </>
  );
}
