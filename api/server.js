/**
 * Process entry point: connections, listener and graceful shutdown.
 *
 * Loads connection configuration from environment; npm scripts load .env when present.
 * The pool is shared across HTTP requests, while each atomic booking borrows one
 * client.
 * Keep listening on loopback for this local demo; close DB clients during normal
 * shutdown.
 */

import pg from "pg";
import { MongoClient } from "mongodb";
import { createApp } from "./app.js";
// Limit concurrent SQL clients and bound connection/query waits instead of hanging
// requests.
const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://stayspot:stayspot@127.0.0.1:5432/stayspot",
  max: 10,
  connectionTimeoutMillis: 5000,
  statement_timeout: 15000,
});
const client = new MongoClient(process.env.MONGO_URL ?? "mongodb://127.0.0.1:27017", {
  serverSelectionTimeoutMS: 5000,
});
// Select the document database; the driver establishes connections when operations run.
const mongo = client.db(process.env.MONGO_DB ?? "stayspot");
pool.on("error", (error) => console.error("Database connection error:", error.code));
const server = createApp({ pool, mongo }).listen(
  Number(process.env.PORT ?? 3000),
  "127.0.0.1",
  () => console.log(`StaySpot API: http://127.0.0.1:${process.env.PORT ?? 3000}`),
);
// Handle Ctrl+C/termination: stop accepting requests before closing database
// connections.
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(async () => {
      await pool.end();
      await client.close();
      process.exit(0);
    }),
  );
