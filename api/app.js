/**
 * Compose the existing API, static front end and error translation.
 *
 * Dependencies are injected so integration tests can create an isolated listener.
 * Member route modules retain their endpoint paths and JSON response contracts.
 * This module creates an Express app; api/server.js owns actual process startup.
 */

import express from "express";
import pg from "pg";
// PostgreSQL DATE is a calendar value, not a local-midnight JavaScript instant.
pg.types.setTypeParser(1082, (value) => value);
import path from "node:path";
import { fileURLToPath } from "node:url";
// Register reads before writes exactly as in the previous API; paths remain unchanged.
import { registerMember1Routes } from "../members/member1/api/routes.js";
import { registerMember2Routes } from "../members/member2/api/routes.js";
import { registerMember3Routes } from "../members/member3/api/routes.js";
import { registerMember4Routes } from "../members/member4/api/routes.js";

/**
 * @param {{pool: import("pg").Pool, mongo: import("mongodb").Db}} dependencies
 * @returns {import("express").Express} App ready for listen() or test use.
 */
export function createApp({ pool, mongo }) {
  const app = express();
  app.disable("x-powered-by");
  // Bound JSON request bodies before any handler parses IDs or booking inputs.
  app.use(express.json({ limit: "8kb" }));
  registerMember1Routes(app, { pool, mongo });
  registerMember2Routes(app, { pool, mongo });
  registerMember3Routes(app, { pool, mongo });
  registerMember4Routes(app, { pool, mongo });
  // Resolve production assets relative to this source file, not the caller's shell
  // directory.
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
  app.use(express.static(root));
  app.use((req, res, next) => {
    // Unknown API paths must return JSON; page paths fall back to the SPA HTML entry
    // point.
    if (req.path.startsWith("/api/"))
      return res.status(404).json({ error: "API route not found." });
    if (req.method === "GET")
      return res.sendFile(path.join(root, "index.html"), (err) => {
        if (err) next(err);
      });
    next();
  });
  app.use((err, req, res, _next) => {
    let status = err.status ?? 500;
    let message = err.message;
    let code = err.code ?? "REQUEST_ERROR";
    // Translate the SQLSTATEs used by the active-stay index, procedure and CHECK
    // constraints.
    if (err.code === "23505") {
      status = 409;
      message =
        "This guest already has a checked-in stay. Complete it before checking in again.";
    } else if (err.code === "P0001") {
      status = 422;
      message =
        "There is not enough money in this wallet. Choose fewer nights or a lower-priced stay.";
    } else if (err.code === "P0002") {
      status = 404;
    } else if (err.code === "22023") {
      status = 400;
    } else if (err.code === "23514") {
      status = 400;
      message =
        "The request violates a database constraint. Check the booking details.";
    }
    // Avoid sending internal server/connection details to the browser on unexpected
    // failures.
    if (status >= 500) {
      console.error("Request failed:", code);
      message =
        "The service is temporarily unavailable. Check that both databases are running and try again.";
    }
    res.status(status).json({ error: message, code });
  });
  return app;
}
