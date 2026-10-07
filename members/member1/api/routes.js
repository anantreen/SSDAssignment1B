/**
 * Member 1 API handlers.
 *
 * GET health, guest/property pages/details and booking pages/details.
 * Lists use keyset ID cursors and fetch limit+1; SQL values are bound separately.
 * Table/column identifiers come from fixed local constants, never arbitrary user input.
 */

import {
  InputError,
  integer,
  page,
  paged,
  statusSet,
  searchText,
  route,
} from "../../../api/shared/http.js";
import { bookingSelect } from "../../../api/shared/queries.js";

/**
 * Register this member's endpoints on the shared Express instance.
 * @param {import("express").Express} app Existing router/listener host.
 * @param {{pool: import("pg").Pool, mongo: import("mongodb").Db}} dependencies
 */
export function registerMember1Routes(app, { pool, mongo }) {
  app.get(
    "/api/health",
    route(async (req, res) => {
      // A successful health response requires both persistence engines to answer.
      await Promise.all([pool.query("SELECT 1"), mongo.command({ ping: 1 })]);
      res.json({ ok: true, mode: "live", project: "StaySpot" });
    }),
  );
  // Reuse the list/detail shape for two fixed entities while keeping identifiers
  // trusted.
  for (const [entity, column] of [
    ["guests", "name"],
    ["properties", "title"],
  ]) {
    app.get(
      `/api/${entity}`,
      route(async (req, res) => {
        const { limit, after } = page(req.query);
        const s = searchText(req.query.search);
        const values = [after, limit + 1];
        let filter = "";
        if (s) {
          // Escape LIKE wildcards so a user's percent/underscore means literal search
          // text.
          values.push(`%${s.replace(/[\\%_]/g, "\\$&")}%`);
          filter = ` AND ${column} ILIKE $3`;
        }
        // entity/column are fixed constants from the loop, never request values.
        const result = await pool.query(
          `SELECT * FROM ${entity} WHERE id>$1${filter} ORDER BY id LIMIT $2`,
          values,
        );
        res.json(paged(result.rows, limit));
      }),
    );
    app.get(
      `/api/${entity}/:id`,
      route(async (req, res) => {
        const result = await pool.query(`SELECT * FROM ${entity} WHERE id=$1`, [
          integer(req.params.id, "Record ID"),
        ]);
        if (!result.rows.length) throw new InputError("Record not found.", 404);
        res.json(result.rows[0]);
      }),
    );
  }
  app.get(
    "/api/bookings",
    route(async (req, res) => {
      const { limit, after } = page(req.query);
      const values = [after, limit + 1];
      // Build filter clauses alongside the parameter array; IDs/status remain bound
      // values.
      const where = ["b.id>$1"];
      for (const [key, col] of [
        ["guest_id", "b.guest_id"],
        ["search", "b.id"],
      ])
        if (req.query[key]) {
          values.push(integer(req.query[key], key));
          where.push(`${col}=$${values.length}`);
        }
      if (req.query.status) {
        if (!statusSet.includes(req.query.status))
          throw new InputError("Choose a valid booking status.");
        values.push(req.query.status);
        where.push(`b.status=$${values.length}`);
      }
      const result = await pool.query(
        `${bookingSelect} WHERE ${where.join(" AND ")} ORDER BY b.id LIMIT $2`,
        values,
      );
      res.json(paged(result.rows, limit));
    }),
  );
  app.get(
    "/api/bookings/:id",
    route(async (req, res) => {
      const result = await pool.query(`${bookingSelect} WHERE b.id=$1`, [
        integer(req.params.id, "Booking ID"),
      ]);
      if (!result.rows.length) throw new InputError("Booking not found.", 404);
      res.json(result.rows[0]);
    }),
  );
}
