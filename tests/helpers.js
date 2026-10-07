/**
 * Shared real-database integration-test harness.
 *
 * Create one Express listener on an available loopback port and reuse it across member
 * cases.
 * Export live pool/mongo bindings after the before hook connects; release them in
 * after.
 * No environment means explicit skipped tests, not a claimed successful database run.
 */

import { test, before, after } from "node:test";
import pg from "pg";
import { MongoClient } from "mongodb";
import { createApp } from "../api/app.js";
const enabled = Boolean(process.env.DATABASE_URL && process.env.MONGO_URL);
export let pool;
export let mongo;
let client;
let server;
let base;
/**
 * Install the listener/dependencies before test cases; do not occupy the app's port
 * 3000.
 */
before(async () => {
  if (!enabled) return;
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  client = new MongoClient(process.env.MONGO_URL);
  mongo = client.db(process.env.MONGO_DB ?? "stayspot");
  await mongo.command({ ping: 1 });
  server = createApp({ pool, mongo }).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
/**
 * Wait for the listener to close before releasing its persistence connections.
 */
after(async () => {
  if (!enabled) return;
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
  await client.close();
});
export const check = (name, fn) => test(name, { skip: !enabled }, fn);
/**
 * Send real HTTP requests and retain both status code and decoded JSON for assertions.
 */
export async function request(path, method = "GET", body) {
  const response = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json() };
}
/**
 * Create a dedicated fixture actor; case-specific balances exercise wallet invariants.
 */
export async function guest(balance = 50000) {
  return (
    await pool.query(
      "INSERT INTO guests(name,wallet_balance) VALUES ($1,$2) RETURNING *",
      ["Integration test guest", balance],
    )
  ).rows[0];
}
/**
 * Reuse the production booking contract with fixture guest/property IDs.
 */
export async function book(g, status = "CONFIRMED", nights = 1) {
  return request("/api/bookings", "POST", {
    guest_id: g.id,
    property_id: 1,
    nights,
    status,
  });
}
