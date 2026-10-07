/**
 * Member 3 API handlers.
 *
 * GET bounded SQL window analytics and POST concurrent materialized refresh.
 * Default ranks are within twelve properties selected by lifetime materialized revenue.
 * Independent reads run concurrently; this endpoint is not a single cross-query
 * snapshot.
 */

import { InputError, integer, day, route } from "../../../api/shared/http.js";

/**
 * Register this member's endpoints on the shared Express instance.
 * @param {import("express").Express} app Existing router/listener host.
 * @param {{pool: import("pg").Pool, mongo: import("mongodb").Db}} dependencies
 */
export function registerMember3Routes(app, { pool, mongo }) {
  app.get(
    "/api/analytics",
    route(async (req, res) => {
      const today = new Date().toISOString().slice(0, 10);
      const from = day(
        req.query.from ??
          new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
        "From date",
      );
      const to = day(req.query.to ?? today, "To date");
      // Cap output size using an inclusive UTC calendar-day range; six warm-up days
      // stay in SQL.
      const days = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
      if (days < 1 || days > 90)
        throw new InputError("Choose an analytics period between 1 and 90 days.");
      // An explicit property ID narrows the cohort; otherwise use the top twelve
      // materialized totals.
      const selected = req.query.property_id
        ? [integer(req.query.property_id, "Property")]
        : (
            await pool.query(
              `
SELECT property_id
FROM mv_property_summary
ORDER BY total_revenue DESC,
         property_id
LIMIT 12
`,
            )
          ).rows.map((r) => r.property_id);
      // These independent read queries do not depend on one another, so avoid serial
      // network waits.
      const [series, summary, totals, state] = await Promise.all([
        pool.query(
          // Read the installed Part A function rather than reimplementing its windows
          // in JavaScript.
          "SELECT * FROM revenue_analytics($1::date,$2::date,$3::integer[])",
          [from, to, selected],
        ),
        pool.query(
          "SELECT * FROM mv_property_summary WHERE property_id=ANY($1) ORDER BY total_revenue DESC",
          [selected],
        ),
        pool.query(
          `
SELECT COALESCE(SUM(total_revenue), 0) AS total_revenue,
       COALESCE(SUM(total_nights_booked), 0) AS total_nights,
       COALESCE(SUM(total_bookings), 0) AS total_bookings,
       COUNT(*) AS properties
FROM mv_property_summary
`,
        ),
        pool.query("SELECT refreshed_at FROM analytics_refresh_state WHERE name=$1", [
          "property_summary",
        ]),
      ]);
      res.json({
        series: series.rows,
        summary: summary.rows,
        totals: totals.rows[0],
        refreshed_at: state.rows[0]?.refreshed_at ?? null,
        from,
        to,
        cohort:
          "Top 12 properties by lifetime revenue; daily dense ranks within this cohort.",
      });
    }),
  );
  app.post(
    "/api/analytics/refresh",
    route(async (req, res) => {
      const result = await pool.query(
        // The database serializes refreshes and returns the actual completion clock.
        "SELECT refresh_property_summary() AS refreshed_at",
      );
      res.json(result.rows[0]);
    }),
  );
}
