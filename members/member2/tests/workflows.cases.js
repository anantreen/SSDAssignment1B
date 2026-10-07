/**
 * Member 2 integration regression cases.
 *
 * Each check names the behavior under test and asserts real HTTP/database results.
 * Fixtures come from tests/helpers.js; these cases keep their previous assertions.
 */

import assert from "node:assert/strict";
import { check, request, guest, book, pool } from "../../../tests/helpers.js";

// Regression: booking commits one debit, one booking and one trigger-created audit.
check(
  "booking commits one debit, one booking and one trigger-created audit",
  async () => {
    const g = await guest();
    const price = Number(
      (await pool.query("SELECT base_price FROM properties WHERE id=1")).rows[0]
        .base_price,
    );
    const r = await book(g);
    assert.equal(r.status, 201);
    assert.equal(Number(r.data.balance_before), 50000);
    assert.equal(Number(r.data.balance_after), 50000 - price);
    assert.equal(r.data.audit.action_type, "DEBIT");
    assert.equal(Number(r.data.audit.amount_changed), -price);
    assert.equal(r.data.booking.nights, 1);
    assert.equal(Number(r.data.booking.total_cost), price);
  },
);
// Regression: insufficient funds leaves wallet, bookings and audits unchanged.
check("insufficient funds leaves wallet, bookings and audits unchanged", async () => {
  const g = await guest(1);
  const r = await book(g);
  assert.equal(r.status, 422);
  assert.match(r.data.error, /not enough money/);
  const state = (
    await pool.query(
      `
SELECT wallet_balance,

    (SELECT count(*)
     FROM bookings
     WHERE guest_id=$1) AS bookings,

    (SELECT count(*)
     FROM wallet_audit_logs
     WHERE guest_id=$1) AS audits
FROM guests
WHERE id=$1
`,
      [g.id],
    )
  ).rows[0];
  assert.equal(state.wallet_balance, "1.00");
  assert.equal(state.bookings, "0");
  assert.equal(state.audits, "0");
});
// Regression: second active check-in rolls back its debit and audit; completion
// releases slot.
check(
  "second active check-in rolls back its debit and audit; completion releases slot",
  async () => {
    const g = await guest();
    const first = await book(g, "CHECKED_IN");
    assert.equal(first.status, 201);
    const second = await book(g, "CHECKED_IN");
    assert.equal(second.status, 409);
    assert.match(second.data.error, /already has a checked-in/);
    const state = (
      await pool.query(
        `
SELECT wallet_balance,

    (SELECT count(*)
     FROM wallet_audit_logs
     WHERE guest_id=$1) AS audits
FROM guests
WHERE id=$1
`,
        [g.id],
      )
    ).rows[0];
    assert.equal(state.wallet_balance, first.data.balance_after);
    assert.equal(state.audits, "1");
    assert.equal(
      (
        await request(`/api/bookings/${first.data.booking.id}/status`, "PATCH", {
          status: "COMPLETED",
        })
      ).status,
      200,
    );
    assert.equal((await book(g, "CHECKED_IN")).status, 201);
  },
);
// Regression: concurrent bookings cannot spend the same wallet money twice.
check("concurrent bookings cannot spend the same wallet money twice", async () => {
  const price = Number(
    (await pool.query("SELECT base_price FROM properties WHERE id=1")).rows[0]
      .base_price,
  );
  const g = await guest(price);
  const results = await Promise.all([book(g), book(g)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 422]);
  assert.equal(
    (await pool.query("SELECT wallet_balance FROM guests WHERE id=$1", [g.id])).rows[0]
      .wallet_balance,
    "0.00",
  );
});
// Regression: audit records reject update, delete and truncate.
check("audit records reject update, delete and truncate", async () => {
  const g = await guest();
  await book(g);
  const audit = (
    await pool.query("SELECT id FROM wallet_audit_logs WHERE guest_id=$1", [g.id])
  ).rows[0];
  for (const sql of [
    "UPDATE wallet_audit_logs SET balance_after=0 WHERE id=$1",
    "DELETE FROM wallet_audit_logs WHERE id=$1",
  ])
    await assert.rejects(pool.query(sql, [audit.id]), (e) => e.code === "42501");
  await assert.rejects(
    pool.query("TRUNCATE wallet_audit_logs"),
    (e) => e.code === "42501",
  );
});
// Regression: malformed inputs and forged prices cannot alter a booking.
check("malformed inputs and forged prices cannot alter a booking", async () => {
  const g = await guest();
  assert.equal((await book(g, "CONFIRMED", -1)).status, 400);
  assert.equal(
    (
      await request("/api/bookings", "POST", {
        guest_id: "1 OR 1=1",
        property_id: 1,
        nights: 1,
      })
    ).status,
    400,
  );
  assert.equal((await request("/api/search?latitude=91&longitude=0")).status, 400);
  const result = await request("/api/bookings", "POST", {
    guest_id: g.id,
    property_id: 1,
    nights: 1,
    total_cost: 0.01,
  });
  assert.equal(result.status, 201);
  assert.notEqual(Number(result.data.booking.total_cost), 0.01);
});
// Regression: audit microsecond cursor does not repeat or skip adjacent entries.
check("audit microsecond cursor does not repeat or skip adjacent entries", async () => {
  const g = await guest();
  await pool.query("UPDATE guests SET wallet_balance=wallet_balance+1 WHERE id=$1", [
    g.id,
  ]);
  await pool.query("UPDATE guests SET wallet_balance=wallet_balance+1 WHERE id=$1", [
    g.id,
  ]);
  const a = await request(`/api/audit?guest_id=${g.id}&limit=1`);
  const b = await request(
    `/api/audit?guest_id=${g.id}&limit=1&after=${encodeURIComponent(a.data.next)}`,
  );
  assert.equal(a.data.items.length, 1);
  assert.equal(b.data.items.length, 1);
  assert.notEqual(a.data.items[0].id, b.data.items[0].id);
  assert.equal(a.data.opening_balance, "50000.00");
});
