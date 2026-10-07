# Fresh-clone run verification — 7 October 2026

The published source commit `553250273774b346123e4d60d7808f57b68b0999` was cloned into a separate directory. Dependencies were installed from package-lock.json and data_generation/requirements.txt, with no copied node_modules, virtual environment, build output or original .env. This documentation update does not change application/database code.

## Tested environment

- macOS Apple Silicon; Node.js 26.8.2; Python 3.14.7.
- Docker Compose with PostgreSQL 16.15 and MongoDB 7.0.40.
- Existing host psql/mongosh clients, as explicitly required in README.
- A dedicated Compose project and empty volumes. Host ports 55434/27021 and app port 3012 avoided the developer's existing services; .env connection URLs were updated to match.

## Results

| Step | Result |
|---|---|
| Git clone and dependency installation | Passed; all shared React helpers were present in Git |
| docker compose up -d --wait | Both services became healthy |
| bash scripts/setup.sh | All schema/workflow/index/validator scripts executed |
| Initial PostgreSQL seed | 1,000 guests, 2,000 properties, 50,000 bookings, 100,000 trigger-created audit entries |
| Initial MongoDB seed | 500,000 search sessions, 50,000 reviews, 2,000 matching catalogs |
| npm run build | Production assets generated successfully |
| npm test against Docker databases | 12 passed, 0 failed, 0 skipped |
| Python database checks against Docker | 8 passed |
| npm start /api/health | HTTP success with ok=true and live mode |
| Production HTML | Served the built front end and its asset references |

The same fresh clone also passed setup/build/API checks with separate empty databases on the existing native PostgreSQL/MongoDB services before the Docker check. Temporary verification services/data were kept separate from user data.

README supplies installation links, a first-run sequence, later-start instructions, platform notes and known failure fixes. Windows/WSL and Linux installation instructions are provided, but those operating systems were not run in this macOS verification. First-time image downloads depend on connection speed. Map tiles require internet access. Telemetry expires after two hours, so a later demo may need fresh pins.
