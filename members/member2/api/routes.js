/**
 * Member 2 API handlers.
 *
 * POST booking, PATCH booking status and GET guest audit history.
 * Booking uses one connection and transaction for lock, procedure, booking and audit.
 * Status updates are conditional; audit cursors retain exact microsecond timestamps.
 */

import { InputError, integer, day, paged, route } from "../../../api/shared/http.js";
import { bookingSelect } from "../../../api/shared/queries.js";

/**
 * Register this member's endpoints on the shared Express instance.
 * @param {import("express").Express} app Existing router/listener host.
 * @param {{pool: import("pg").Pool, mongo: import("mongodb").Db}} dependencies
 */
export function registerMember2Routes(app, { pool, mongo }) {
  app.post(
    "/api/bookings",
    route(async (req, res) => {
      const guest = integer(req.body?.guest_id, "Guest");
      const property = integer(req.body?.property_id, "Property");
      const nights = integer(req.body?.nights, "Nights", 1, 365);
      const status = req.body?.status ?? "CONFIRMED";
      if (!["CONFIRMED", "CHECKED_IN"].includes(status))
        throw new InputError("Choose a valid starting status.");
      // One borrowed connection is essential: BEGIN and every booking query must share
      // it.
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Lock the actor before reading its balance, so the returned before/after pair
        // is consistent.
        const before = await client.query(
          "SELECT wallet_balance FROM guests WHERE id=$1 FOR UPDATE",
          [guest],
        );
        if (!before.rows.length) throw new InputError("Guest not found.", 404);
        // CALL returns its INOUT booking ID. The stored procedure calculates price and
        // emits the debit.
        const call = await client.query(
          "CALL create_booking($1::integer,$2::integer,$3::integer,$4::varchar,NULL::integer)",
          [guest, property, nights, status],
        );
        const booking = (
          await client.query(`${bookingSelect} WHERE b.id=$1`, [
            call.rows[0].p_booking_id,
          ])
        ).rows[0];
        // The same actor lock makes its newest audit row the debit created by this
        // transaction.
        const audit = (
          await client.query(
            "SELECT * FROM wallet_audit_logs WHERE guest_id=$1 ORDER BY id DESC LIMIT 1",
            [guest],
          )
        ).rows[0];
        // Only publish success after all three writes (wallet, booking, audit) are
        // committed.
        await client.query("COMMIT");
        res.status(201).json({
          booking,
          balance_before: before.rows[0].wallet_balance,
          balance_after: audit.balance_after,
          audit,
        });
      } catch (err) {
        // A procedure/index failure also removes the wallet UPDATE and trigger-created
        // row.
        await client.query("ROLLBACK");
        throw err;
      } finally {
        // Always return the borrowed connection, including validation/SQL error paths.
        client.release();
      }
    }),
  );
  app.patch(
    "/api/bookings/:id/status",
    route(async (req, res) => {
      const id = integer(req.params.id, "Booking ID");
      const status = req.body?.status;
      if (!["CHECKED_IN", "COMPLETED"].includes(status))
        throw new InputError("Advance to CHECKED_IN or COMPLETED.");
      // Only allow CONFIRMED -> CHECKED_IN -> COMPLETED; the UPDATE checks the old
      // state atomically.
      const previous = status === "CHECKED_IN" ? "CONFIRMED" : "CHECKED_IN";
      const result = await pool.query(
        "UPDATE bookings SET status=$1 WHERE id=$2 AND status=$3 RETURNING *",
        [status, id, previous],
      );
      if (!result.rows.length) {
        const exists = await pool.query("SELECT 1 FROM bookings WHERE id=$1", [id]);
        throw new InputError(
          exists.rows.length
            ? "This booking has already changed. Refresh and follow the next status."
            : "Booking not found.",
          exists.rows.length ? 409 : 404,
        );
      }
      res.json(result.rows[0]);
    }),
  );
  app.get(
    "/api/audit",
    route(async (req, res) => {
      const guest = integer(req.query.guest_id, "Guest");
      const limit = integer(req.query.limit ?? 20, "Page size", 1, 50);
      const values = [guest, limit + 1];
      const filters = ["guest_id=$1"];
      if (req.query.from) {
        values.push(day(req.query.from, "From date"));
        filters.push(
          `timestamp >= $${values.length}::date::timestamp AT TIME ZONE 'UTC'`,
        );
      }
      if (req.query.to) {
        values.push(day(req.query.to, "To date"));
        filters.push(
          `timestamp < ($${values.length}::date+1)::timestamp AT TIME ZONE 'UTC'`,
        );
      }
      if (req.query.from && req.query.to && req.query.from > req.query.to)
        throw new InputError("From date must come before the to date.");
      if (req.query.after) {
        // The audit cursor is base64url JSON [UTC timestamp with microseconds, audit
        // ID].
        // Decode and validate both pieces before binding the tuple comparison.
        let cursor;
        try {
          cursor = JSON.parse(
            Buffer.from(String(req.query.after), "base64url").toString(),
          );
        } catch {
          throw new InputError("Invalid ledger cursor.");
        }
        if (
          !Array.isArray(cursor) ||
          cursor.length !== 2 ||
          !Number.isFinite(Date.parse(cursor[0]))
        )
          throw new InputError("Invalid ledger cursor.");
        const id = integer(cursor[1], "Ledger cursor", 1, Number.MAX_SAFE_INTEGER);
        values.push(cursor[0], id);
        filters.push(
          `(timestamp,id)>($${values.length - 1}::timestamptz,$${values.length}::bigint)`,
        );
      }
      // Keep date bounds and the tuple cursor inside SQL so only one small ledger page
      // is read.
      // The extra cursor_time text preserves precision lost by JavaScript Date
      // timestamps.
      const rows = (
        await pool.query(
          `SELECT *, balance_after AS running_balance,
   to_char(timestamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_time
   FROM wallet_audit_logs WHERE ${filters.join(" AND ")} ORDER BY timestamp,id LIMIT $2`,
          values,
        )
      ).rows;
      // Preserve microseconds in cursors; JavaScript Date truncates them.
      const out = paged(rows, limit, (r) =>
        Buffer.from(JSON.stringify([r.cursor_time, r.id])).toString("base64url"),
      );
      // The first row's after balance minus its signed change reconstructs that page's
      // opening value.
      out.opening_balance = rows.length
        ? (Number(rows[0].balance_after) - Number(rows[0].amount_changed)).toFixed(2)
        : null;
      res.json(out);
    }),
  );
}
