/**
 * Workflow 2 and materialized lifetime summaries.
 *
 * The API runs the Part A window function for the requested UTC period.
 * The chart displays four properties; the table ranks the twelve-property cohort.
 * Refreshing the materialized view is a separate POST followed by a data reread.
 */

import React, { useState } from "react";
import {
  Home,
  LayoutGrid,
  ChartNoAxesCombined,
  RefreshCw,
  CalendarDays,
  Clock3,
} from "lucide-react";
import { money } from "../../member1/web/lib/format.js";
import { count } from "../../member1/web/lib/format.js";
import { date } from "../../member1/web/lib/format.js";
import { today } from "../../member1/web/lib/format.js";
import { daysAgo } from "../../member1/web/lib/format.js";
import { qs } from "../../member1/web/lib/query.js";
import { api } from "../../member1/web/lib/api.js";
import { useData } from "../../member1/web/hooks/useData.js";
import { Alert } from "../../member1/web/components/Alert.jsx";
import { DataState } from "../../member1/web/components/DataState.jsx";
import { Heading } from "../../member1/web/components/Heading.jsx";
import { LineChart } from "./LineChart.jsx";

/**
 * Load the selected period, render SQL-produced averages/ranks and expose summary
 * refresh.
 * analyticsData preserves the API response shape rather than recomputing financial
 * metrics.
 */
export function Analytics() {
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const resource = useData(`/analytics?${qs({ from, to })}`);
  const analyticsData = resource.data;
  /**
   * Refresh the materialized summary, then request its actual totals and completion
   * time.
   */
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      await api("/analytics/refresh", { method: "POST", body: "{}" });
      resource.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  // The API already supplies SQL DENSE_RANK values; display the selected end-date
  // slice.
  // Ordering by rank does not recompute it or remove tied properties.
  const ranks =
    analyticsData?.series
      .filter((s) => s.booking_date.slice(0, 10) === to)
      .sort(
        (a, b) => Number(a.revenue_momentum_rank) - Number(b.revenue_momentum_rank),
      ) ?? [];
  return (
    <>
      <Heading
        eyebrow="A LITTLE PERSPECTIVE"
        title="Good places. Growing stories."
        description="See where your stays are taking you, one seven-day average at a time."
        action={
          <button className="btn secondary" onClick={refresh} disabled={busy}>
            {busy ? <RefreshCw className="spin" size={16} /> : <RefreshCw size={16} />}{" "}
            Refresh totals
          </button>
        }
      />
      {error && <Alert message={error} />}
      <DataState resource={resource}>
        <div className="stats-grid">
          {[
            [
              "Gross booked revenue",
              money(analyticsData?.totals.total_revenue),
              ChartNoAxesCombined,
            ],
            ["Nights booked", count(analyticsData?.totals.total_nights), CalendarDays],
            ["Total bookings", count(analyticsData?.totals.total_bookings), Home],
            ["Properties", count(analyticsData?.totals.properties), LayoutGrid],
          ].map(([label, value, Icon]) => (
            <div className="panel stat" key={label}>
              <span>
                <Icon size={18} />
                {label}
              </span>
              <strong>{value}</strong>
              <small>Lifetime materialized totals</small>
            </div>
          ))}
        </div>
        <div className="refresh-note">
          <Clock3 size={14} /> Last refreshed {date(analyticsData?.refreshed_at)}
        </div>
        <div className="panel">
          <div className="section-head">
            <div>
              <h2>Revenue, with room to grow</h2>
              <p className="muted">
                Seven-day moving average · top 4 displayed properties · UTC
              </p>
            </div>
            <div className="date-filters">
              <label>
                From
                <input
                  aria-label="Analytics from date"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label>
                To
                <input
                  aria-label="Analytics to date"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
            </div>
          </div>
          {analyticsData?.series.length ? (
            <LineChart series={analyticsData.series} summary={analyticsData.summary} />
          ) : (
            <p className="state">No property data in this period.</p>
          )}
        </div>
        <div className="panel ranking-panel">
          <div className="section-head">
            <h2>Places on the rise</h2>
            <span className="soft-tag">Daily dense rank · {to}</span>
          </div>
          <p className="help">
            Top 12 properties by lifetime revenue. Ranks compare their unrounded
            seven-day averages on the same day; equal values share a rank.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Property</th>
                  <th>7-day average</th>
                  <th>Day revenue</th>
                  <th>Lifetime nights</th>
                </tr>
              </thead>
              <tbody>
                {ranks.map((s) => {
                  const p = analyticsData.summary.find(
                    (p) => p.property_id === s.property_id,
                  );
                  return (
                    <tr key={s.property_id}>
                      <td>
                        <span className="rank-number">{s.revenue_momentum_rank}</span>
                      </td>
                      <td>{p?.title ?? `Property #${s.property_id}`}</td>
                      <td>
                        <strong>{money(s.moving_avg_7d)}</strong>
                      </td>
                      <td>{money(s.daily_total)}</td>
                      <td>{count(p?.total_nights_booked)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>
    </>
  );
}
