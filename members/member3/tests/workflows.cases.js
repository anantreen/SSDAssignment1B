/**
 * Member 3 integration regression cases.
 *
 * Each check names the behavior under test and asserts real HTTP/database results.
 * Fixtures come from tests/helpers.js; these cases keep their previous assertions.
 */

import assert from "node:assert/strict";
import { check, request, pool } from "../../../tests/helpers.js";

// Regression: moving averages include missing days and full seven-day warm-up; ranks
// compare properties.
check(
  "moving averages include missing days and full seven-day warm-up; ranks compare properties",
  async () => {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const g = (
        await c.query(
          "INSERT INTO guests(name,wallet_balance) VALUES ('Window fixture',50000) RETURNING id",
        )
      ).rows[0].id;
      const props = (
        await c.query(
          `
INSERT INTO properties(title, base_price, latitude, longitude)
VALUES ('Window A',100,0,0),
       ('Window B',100,0,0) RETURNING id
`,
        )
      ).rows.map((r) => r.id);
      await c.query(
        `
INSERT INTO bookings(guest_id, property_id, total_cost, nights, status, created_at)
VALUES ($1,$2,700,1,'COMPLETED','2026-01-01T12:00:00Z')
`,
        [g, props[0]],
      );
      const rows = (
        await c.query(
          "SELECT * FROM revenue_analytics('2026-01-01','2026-01-08',$1::integer[])",
          [props],
        )
      ).rows;
      const start = rows.find(
        (r) => r.property_id === props[0] && r.booking_date.startsWith("2026-01-01"),
      );
      assert.equal(start.moving_avg_7d, "100.00");
      const after = rows.filter((r) => r.booking_date.startsWith("2026-01-08"));
      assert.equal(after.length, 2);
      assert.ok(
        after.every(
          (r) => r.moving_avg_7d === "0.00" && r.revenue_momentum_rank === "1",
        ),
      );
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
  },
);
// Regression: refresh updates the real materialized timestamp and total nights.
check("refresh updates the real materialized timestamp and total nights", async () => {
  const r = await request("/api/analytics/refresh", "POST", {});
  assert.equal(r.status, 200);
  assert.ok(Date.parse(r.data.refreshed_at) > 0);
  const a = await request("/api/analytics");
  assert.equal(a.status, 200);
  assert.equal(a.data.refreshed_at, r.data.refreshed_at);
  assert.ok(a.data.series.length <= 12 * 90);
  const nights = (await pool.query("SELECT sum(nights) AS n FROM bookings")).rows[0].n;
  assert.equal(a.data.totals.total_nights, nights);
  assert.equal(
    (await request("/api/analytics?from=2025-01-01&to=2026-01-01")).status,
    400,
  );
});
