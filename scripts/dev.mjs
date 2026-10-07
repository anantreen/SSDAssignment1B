/**
 * Run the API and Vite development servers together.
 *
 * Spawn both with inherited terminal output; .env is loaded for the API process.
 * Forward normal termination to both children and stop the pair after a failed child.
 */

import { spawn } from "node:child_process";
const processes = [
  spawn(process.execPath, ["--env-file-if-exists=.env", "api/server.js"], {
    stdio: "inherit",
  }),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js"], { stdio: "inherit" }),
];
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    for (const p of processes) p.kill(signal);
  });
for (const p of processes)
  p.on("exit", (code) => {
    if (code) {
      for (const other of processes) other.kill();
      process.exit(code);
    }
  });
