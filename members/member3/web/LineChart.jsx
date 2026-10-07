/**
 * SVG renderer for already-computed seven-day revenue series.
 *
 * This component draws data supplied by SQL; it does not recalculate the average.
 * Coordinates map dates to horizontal positions and revenue to an inverted y-axis.
 * The Analytics table provides numeric values alongside this visual presentation.
 */

import React from "react";

/**
 * Plot at most four property series using the values supplied by the SQL workflow.
 * @param {Object} props series contains per-day averages; summary supplies property
 * titles/order.
 */
export function LineChart({ series, summary }) {
  const colors = ["#244c38", "#c76a42", "#90a187", "#c5a771"];
  // Use the first four summary properties and reuse their order for line/legend colors.
  const ids = summary.slice(0, 4).map((s) => s.property_id);
  const filtered = series.filter((s) => ids.includes(s.property_id));
  // The SQL result is date-ordered; Set removes repeated dates across property series.
  const dates = [...new Set(filtered.map((s) => s.booking_date.slice(0, 10)))];
  // Keep the vertical scale nonzero even when all daily averages are zero.
  const max = Math.max(1, ...filtered.map((s) => Number(s.moving_avg_7d)));
  // Reserve horizontal space for y-axis labels and spread dates across the plot width.
  const xForDate = (i) => 64 + (i / Math.max(1, dates.length - 1)) * 820;
  // SVG y increases downward, so larger revenue must map to a smaller y coordinate.
  const yForRevenue = (v) => 218 - (v / max) * 170;
  return (
    <>
      <svg
        viewBox="0 0 930 265"
        className="revenue-chart"
        role="img"
        aria-label="Seven-day moving average revenue for the top four properties. Values are also provided in the ranking table."
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line
              x1="64"
              y1={yForRevenue(max * t)}
              x2="895"
              y2={yForRevenue(max * t)}
              stroke="#e5e8e0"
              strokeDasharray="4 5"
            />
            <text
              x="52"
              y={yForRevenue(max * t) + 4}
              textAnchor="end"
              fill="#7b8278"
              fontSize="11"
            >
              ₹{Math.round((max * t) / 1000)}k
            </text>
          </g>
        ))}
        {ids.map((id, i) => (
          <polyline
            key={id}
            fill="none"
            stroke={colors[i]}
            strokeWidth="3"
            strokeLinejoin="round"
            points={filtered
              .filter((s) => s.property_id === id)
              .map(
                (s) =>
                  `${xForDate(dates.indexOf(s.booking_date.slice(0, 10)))},${yForRevenue(Number(s.moving_avg_7d))}`,
              )
              .join(" ")}
          />
        ))}
        {dates
          .filter(
            (d, i) =>
              i === 0 ||
              i === dates.length - 1 ||
              (i % 7 === 0 && i < dates.length - 3),
          )
          .map((d) => (
            <text
              key={d}
              x={xForDate(dates.indexOf(d))}
              y="248"
              textAnchor="middle"
              fill="#7b8278"
              fontSize="12"
            >
              {new Date(d).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </text>
          ))}
      </svg>
      <div className="chart-legend">
        {summary.slice(0, 4).map((s, i) => (
          <span key={s.property_id}>
            <i style={{ background: colors[i] }} />
            {s.title}
          </span>
        ))}
      </div>
    </>
  );
}
