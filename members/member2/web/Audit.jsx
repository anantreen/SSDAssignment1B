/**
 * Read-only wallet ledger with date filters and cursor pages.
 *
 * Each row uses the trigger-stored balance_after snapshot as its running balance.
 * The page opening balance describes the state immediately before its first row.
 * The opaque server cursor preserves timestamp microseconds and an ID tie-breaker.
 */

import React, { useEffect, useState } from "react";
import { ReceiptText, Wallet, CircleCheck } from "lucide-react";
import { money } from "../../member1/web/lib/format.js";
import { date } from "../../member1/web/lib/format.js";
import { qs } from "../../member1/web/lib/query.js";
import { useData } from "../../member1/web/hooks/useData.js";
import { DataState } from "../../member1/web/components/DataState.jsx";
import { Pill } from "../../member1/web/components/Pill.jsx";
import { Heading } from "../../member1/web/components/Heading.jsx";
import { Pager } from "../../member1/web/components/Pager.jsx";

/**
 * Render chronological, date-filtered wallet pages for the selected actor.
 * @param {Object} props actor provides the guest ID and current wallet snapshot.
 */
export function Audit({ actor }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [after, setAfter] = useState("");
  const [history, setHistory] = useState([]);
  // Date filters and the selected actor are sent to the server; no full ledger is
  // loaded.
  const resource = useData(
    `/audit?${qs({ guest_id: actor?.id ?? 1, from, to, after, limit: 20 })}`,
  );
  // A cursor is valid only for its actor/date scope; reset history when that scope
  // changes.
  useEffect(() => {
    setAfter("");
    setHistory([]);
  }, [actor?.id, from, to]);
  return (
    <>
      <Heading
        eyebrow="EVERY RUPEE, ACCOUNTED FOR"
        title="A clear trail. Peace of mind."
        description={`Read-only wallet history for ${actor?.name ?? "your selected guest"}.`}
      />
      <div className="audit-summary">
        <div className="panel">
          <small>AVAILABLE IN WALLET</small>
          <strong>{money(actor?.wallet_balance)}</strong>
          <Wallet size={26} />
        </div>
        <div className="panel">
          <small>PAGE OPENING BALANCE</small>
          <strong>
            {resource.data?.opening_balance === null
              ? "—"
              : money(resource.data?.opening_balance)}
          </strong>
          <ReceiptText size={26} />
        </div>
        <div className="panel assurance">
          <CircleCheck size={25} />
          <div>
            <strong>Always recorded. Never edited.</strong>
            <p>Every wallet change leaves an immutable audit entry.</p>
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="section-head">
          <h2>Wallet activity</h2>
          <div className="date-filters">
            <label>
              From
              <input
                type="date"
                aria-label="Audit from date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                aria-label="Audit to date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
        </div>
        <DataState resource={resource} empty={!resource.data?.items.length}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Entry</th>
                  <th>Date & time</th>
                  <th>Type</th>
                  <th>Change</th>
                  <th>Running balance</th>
                </tr>
              </thead>
              <tbody>
                {resource.data?.items.map((r) => (
                  <tr key={r.id}>
                    <td>#{r.id}</td>
                    <td>{date(r.timestamp)}</td>
                    <td>
                      <Pill status={r.action_type} />
                    </td>
                    <td
                      className={Number(r.amount_changed) > 0 ? "positive" : "negative"}
                    >
                      {Number(r.amount_changed) > 0 ? "+" : ""}
                      {money(r.amount_changed)}
                    </td>
                    <td>
                      <strong>{money(r.running_balance)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
        <Pager
          history={history}
          next={resource.data?.next}
          onNext={() => {
            setHistory((h) => [...h, after]);
            setAfter(resource.data.next);
          }}
          onBack={() => {
            setAfter(history.at(-1));
            setHistory((h) => h.slice(0, -1));
          }}
        />
      </div>
    </>
  );
}
