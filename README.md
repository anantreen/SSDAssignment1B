# SSDAssignment1B — StaySpot Assignment 2

A working browser front end for StaySpot, with a PostgreSQL/MongoDB API and all four inherited workflows. The clone instructions use the repository folder **SSDAssignment1B**; the product name is **StaySpot**.

**Source repository:** https://github.com/git-adityamishra/27_a1
**Inherited main commit:** `774fbd2f33463c3e88352bdb0b7988165c65abcf`
**Submission repository:** https://github.com/anantreen/SSDAssignment1B
**Final commit hash:** resolve the current published revision with `git rev-parse HEAD` or [GitHub commits](https://github.com/anantreen/SSDAssignment1B/commits/main). The packaging script stamps that exact committed SHA into the ZIP README.
**Demo walkthrough:** [demo_walkthrough.mp4](docs/demo_walkthrough.mp4) — captioned actual live-browser captures, under five minutes; method disclosed in [browser verification](docs/browser_verification.md). Add the team's uploaded share link here if an external demo URL is required.

## Clone and run from a new machine

Use a Bash terminal on macOS/Linux. On Windows, use Ubuntu in WSL 2 and enable Docker Desktop's WSL integration; run all commands inside that WSL terminal, rather than mixing Windows and WSL installations.

### 1. Install the prerequisites

| Tool | Required for | Install |
|---|---|---|
| Git | Clone the repository | [Git downloads](https://git-scm.com/downloads) |
| Node.js 22.12+ and npm | API, React dependencies and production build | [Node.js downloads](https://nodejs.org/en/download) |
| Python 3.11+ with pip/venv | Database seeders and Python checks | [Python downloads](https://www.python.org/downloads/) |
| Docker with Compose v2 | PostgreSQL 16 and MongoDB 7.0 services | [Docker Desktop](https://docs.docker.com/desktop/) or [Docker Engine](https://docs.docker.com/engine/install/) |
| PostgreSQL client `psql` | Apply the SQL scripts | [PostgreSQL downloads](https://www.postgresql.org/download/) |
| MongoDB Shell `mongosh` | Create validators/indexes and run workflows | [mongosh installation](https://www.mongodb.com/docs/mongodb-shell/install/) |

Docker supplies the **database servers**. The existing setup script also requires the **psql and mongosh clients on your host/WSL PATH**; you do not need additional native database servers.

On macOS with [Homebrew](https://brew.sh) installed, the client-only installation is:

```bash
brew install libpq mongosh
export PATH="$(brew --prefix libpq)/bin:$PATH"
```

[libpq package details](https://formulae.brew.sh/formula/libpq) and [mongosh package details](https://formulae.brew.sh/formula/mongosh) describe these client packages. That PATH adjustment must be present in the terminal that runs setup; add it to your shell configuration if you want it to persist. On Ubuntu/WSL, install `postgresql-client` and `python3-venv` through apt and install mongosh using its linked Linux instructions. Keep Node/Python/Git and the client tools available in the same WSL environment.

Check the prerequisites before proceeding:

```bash
git --version
node --version
npm --version
python3 --version
psql --version
mongosh --version
docker compose version
```

Start Docker Desktop and wait for its engine to be ready. On supported Docker Desktop installations, `docker desktop start` does this from the terminal; opening the Docker Desktop app also works. For Docker Engine on Linux, start its service using your distribution's setup instructions. Verify readiness with `docker info`.

### 2. First-time setup and production build

Run this sequence once against the new project's empty database volumes:

```bash
git clone https://github.com/anantreen/SSDAssignment1B.git
cd SSDAssignment1B

# Local settings are intentionally not committed. Create your own from the sample.
cp .env.example .env

# Install Python seeders and the locked JavaScript dependency tree.
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r data_generation/requirements.txt
npm ci

# The Docker engine must already be running.
docker info
docker compose up -d --wait

# Create schema/indexes/workflows, then seed both databases.
bash scripts/setup.sh

# Build the front end and serve it through the Express API.
npm run build
npm start
```

Open **http://127.0.0.1:3000**. Keep the `npm start` terminal running. The first run downloads database images and generates 50,000 bookings, 100,000 audits and 500,000 search sessions, so it takes longer than later starts. Run `npm start` after `npm run build`; there is no prebuilt `dist/` committed in Git.

In a **second terminal** in the cloned folder, verify the app and important workflows:

```bash
curl http://127.0.0.1:3000/api/health
npm test
```

Health should return `ok: true`. The API tests should report 12 passes and zero skipped tests when .env and both seeded databases are available. Sample actors include guest #1, Ananya Rao; select another guest using the header for demonstrations. Browser map tiles require internet access.

### 3. Starting it again and developing

The named Docker volumes retain the schema and data. On later runs, do **not** rerun setup or the full seeders:

```bash
cd SSDAssignment1B
# Start Docker Desktop/Engine first if it stopped.
docker compose up -d --wait
npm start
```

For front-end development, stop the existing app with Ctrl+C, then use `npm run dev` instead of `npm start`. Open http://127.0.0.1:5173; Vite proxies /api to the API on port 3000. Use the default API port for this development command. After production source changes, rerun `npm run build` before `npm start`.

To stop: Ctrl+C stops the app, and `docker compose stop` stops the engines while retaining their data. `docker compose start --wait` resumes already-created services. React/API credentials are read from your own .env; the original developer's hidden runtime folders are not needed by a new clone.

### Troubleshooting

| Symptom | Fix |
|---|---|
| docker.sock is missing / cannot connect to Docker | Start Docker Desktop/Engine; wait for `docker info` to succeed. Activating Python's venv does not start Docker. |
| `psql` or `mongosh`: command not found | Install the listed clients and put their binaries on PATH in this terminal. |
| `venv` / ensurepip missing on Ubuntu | Install the distribution's `python3-venv` package and recreate .venv. |
| Port 5432 or 27017 is already occupied | Change `POSTGRES_PORT`/`MONGO_PORT` and the matching connection URL in .env before starting Compose; examples appear below. |
| relation/table already exists during setup | Setup was run on an initialized database. Skip setup on later runs and use the restart commands. |
| API cannot find dist/index.html / page unavailable | Run `npm run build`, then `npm start` from the project root. |
| Port 3000 is in use | Stop the previous app instance. For production you may change PORT in .env and use that URL; the development proxy expects 3000. |
| Map has no recent search pins after a later restart | SearchSessions expire after two hours; add a pin in the UI or run the telemetry-only replenishment command below. |

## Code sections for four members

The code is organized under [members/](members/README.md), following the supplied responsibility/Figma-screen mapping. Each member folder contains their screens, route handlers, database scripts and existing tests. The current UI, stylesheet, endpoint contracts and root commands are preserved.

| Member | Assigned section | Figma screens |
|---|---|---|
| [Member 1](members/member1/README.md) | Browse, Property Details, shared React components and PostgreSQL schema | 00 Foundations & Users; 01 Browse; 02 Property Details |
| [Member 2](members/member2/README.md) | Booking, Status Transition, Wallet Audit, procedure/index/trigger | 03 Transaction / Book Stay; 04 Booking Status & Constraint; 05 Wallet Audit Trail |
| [Member 3](members/member3/README.md) | Analytics, window functions, Materialized View | 06 Analytics |
| [Member 4](members/member4/README.md) | Map, Reviews, MongoDB pipelines | 07 Map / Search Hotspots; 08 Reviews & Amenities |

## Screens and technology choices

| Screen | What works |
|---|---|
| Browse | Paged/searchable properties, guests and bookings, record details, status filters and booking status advancement |
| Book a stay | DB-priced booking procedure, wallet before/after, real trigger audit entry, insufficient-funds and active-stay errors |
| Audit trail | Read-only guest ledger, dates, opening/running balances and chronological microsecond-safe cursors |
| Analytics | Part A CTE/window function, seven-day SVG chart, DENSE_RANK table, materialized totals and concurrent refresh timestamp/button |
| Search map | Leaflet map, click/form-selected origin, 5 km circle, distance-sorted pins, full-candidate grid hotspots, 15-second polling and add-pin |
| Reviews | Shared indexed $facet pipeline, five rating buckets, top tags, property average and readable flexible amenities catalog |

The header switches demo actors through paged search; real login is not required. Every data view has loading, empty and error/retry states. The phone layout exposes all six destinations and stacks dense sections. Tables scroll within their panels when necessary.

React + Vite provide reusable UI and a small static build. Express keeps the API simple and serves that build. pg and mongodb call the database workflows directly; financial logic stays in PostgreSQL. Leaflet provides map interaction, OpenStreetMap supplies attributed tiles, and inline SVG charts avoid an additional chart dependency. System fonts avoid external font downloads. The package lock fixes installed dependency versions.

[Handover note](docs/handover_note.md), [API sketch](docs/api_endpoints.md), [users/style](docs/design/users_and_style.md), [Assignment 2 report](docs/assignment2_report.md), [browser evidence](docs/browser_verification.md).

The [design handover](docs/design/README.md) contains nine current wireframes and matching UI references in the four-member allocation. Open [the gallery](docs/design/preview.html) locally, or download [the editable Excalidraw wireframe board](docs/design/StaySpot-wireframes.excalidraw) and open it in Excalidraw. SVG/PNG exports and booking/error state annotations are included. No application UI or API changes are introduced by these artifacts.

![Browse screen](docs/screenshots/01_browse.png)

## Important tests

```bash
# npm test loads the ignored .env; tests use both real databases.
npm test
# With Python dependencies installed and .env exported:
python tests/database_checks.py
```

Twelve API integration cases and eight database checks passed. They test booking success/failure, concurrent deductions, active check-in rollback/release, immutable audit, forged prices/invalid inputs, bounded pagination, precise ledger cursors, seven-day gaps/ties, geospatial bounds/live pins, facet counts/validators and materialized totals. API tests explicitly skip when database environment variables are missing; a skipped run is not represented as verification. Tests append a few dedicated test records; the initial seed independently meets assignment thresholds.

[API test log](performance/api_test_results.txt), [database test log](performance/database_test_results.txt), [production build log](performance/build_results.txt).

## Readable code and implementation notes

[Code walkthrough](docs/code_walkthrough.md) and [verification notes](docs/readability_verification.md) explain the source files and the browser/API/database flow. Each source now has purpose comments, logical-block explanations and, for Python, function docstrings. Indentation follows .editorconfig and .prettierrc.json; long statements/state declarations are expanded. The UI and API contracts are preserved. Valid JSON files are explained in the guide rather than receiving invalid inline comments. Raw performance evidence and generated artifacts retain their original contents.

## Assumptions and data model

- Project 3 is StaySpot. Currency is INR; PostgreSQL uses exact numeric monetary fields.
- A booking costs the property's current base_price × nights. It begins CONFIRMED or CHECKED_IN and progresses CONFIRMED → CHECKED_IN → COMPLETED. Only CHECKED_IN is unique per guest, exactly as the brief specifies; multiple confirmed reservations are allowed.
- Nights are explicit (1–365). Gross booked revenue includes all listed statuses. Historical seeded bookings represent already-settled history before the demo wallet snapshot; the generated ledger itself comes from real, consistent wallet updates.
- Revenue days are UTC. Six warm-up days and zero-filled dates produce true seven-day averages. DENSE_RANK compares properties on the same day, using unrounded averages.
- MongoDB document IDs reference actual PostgreSQL guest/property IDs. This seeder preserves linkage, but MongoDB does not enforce cross-database foreign keys.
- Geospatial origin coordinates are [longitude, latitude]; a strict 5 km query and explicit recency filter accompany a two-hour TTL. Hotspots use approximate grid cells, rather than DBSCAN. Reviews use integer stars and are scoped to the selected property over the past year.
- The audit table rejects ordinary UPDATE/DELETE/TRUNCATE; a privileged database owner can bypass triggers. This is a local teaching demo, without real authentication, property/date availability, refunds or deployment migrations.

## Database configuration and lifecycle

The quickstart above already installs and seeds the databases. This section documents that configuration and the optional native-server path; it is not another first-run sequence. `scripts/setup.sh` targets empty databases and intentionally refuses duplicate seeding.

The script loads .env, installs all six SQL files and the MongoDB validators/indexes, then seeds 1,000 guests, 2,000 properties, 50,000 bookings, 100,000 trigger audit entries, 500,000 city-clustered search sessions, 50,000 reviews and matching property catalogs. MongoDB setup runs before its seed data so validation is exercised during insertion. COPY/bulk batches keep memory bounded; errors exit unsuccessfully.

If Compose reports that docker.sock does not exist, Docker Desktop is stopped. Start it with `docker desktop start` (or open Docker in Applications) and wait for `docker info` to succeed. The Python virtual environment does not start the Docker engine.

If another MongoDB already uses port 27017, set `MONGO_PORT=27019` and `MONGO_URL=mongodb://127.0.0.1:27019` in .env. Compose and the app must use the same host port. `POSTGRES_PORT` similarly controls PostgreSQL's host port; update `DATABASE_URL` when changing it. Existing local database services do not need to be stopped.

Compose uses MongoDB 7.0 because MongoDB 8 has a [documented incompatibility with Linux kernels 6.19 through 7.0.13](https://www.mongodb.com/docs/manual/release-notes/8.0/), including this Mac's Docker Desktop kernel 7.0.12. The Docker path was verified from a fresh Git clone using PostgreSQL 16.15 and MongoDB 7.0.40: full seeding, production serving, 12 API tests and eight database checks passed. [Fresh-clone verification details](docs/clone_validation.md) record the tested scope. The earlier native MongoDB 8 performance reports remain records of their original runs. The UI and API code are unchanged.

For databases installed without Docker, create an empty PostgreSQL database and an empty MongoDB database, edit .env to their connection details, then run the same setup script. PostgreSQL must permit installing pg_trgm. Do not run both projects' default Docker port mappings simultaneously; use separate ports/database names or one chosen project at a time.

New clones use the defaults in .env.example: PostgreSQL on 5432 and MongoDB on 27017. Only the earlier developer verification environment used ports 55432/27018; friends do not need those services or any hidden runtime folder. If the default ports are busy, change the host-port variables and their corresponding URLs together, for example:

```dotenv
POSTGRES_PORT=55434
DATABASE_URL=postgresql://stayspot:stayspot@127.0.0.1:55434/stayspot
MONGO_PORT=27021
MONGO_URL=mongodb://127.0.0.1:27021
```

Search sessions intentionally expire after two hours. Before a later stress-test/demo, append fresh telemetry without resetting wallets:

```bash
set -a
source .env
set +a
python scripts/replenish_sessions.py --count 500000
```

## Independent Part A workflows

```bash
set -a
source .env
set +a
# Caller owns the transaction; on a failed CALL the entire transaction aborts.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "BEGIN; CALL create_booking(1,1,1,'CONFIRMED',NULL); COMMIT;"
# Workflow 2 uses the same SQL function as the browser API.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/06_window_analytics.sql
psql "$DATABASE_URL" -c "SELECT refresh_property_summary();"
mongosh "$MONGO_URL/$MONGO_DB" --quiet -f mongo/02_workflow3_geonear.js
mongosh "$MONGO_URL/$MONGO_DB" --quiet -f mongo/03_workflow4_facet.js
```

Mongo shell scripts must run from the repository root because they load the shared pure builders in mongo/pipelines.cjs. Failed booking transactions preserve the original wallet and audit count. The corrected procedure signature is create_booking(guest_id, property_id, nights, starting_status, INOUT booking_id); caller-supplied total_cost was removed to prevent forged prices.

## Verification and reports

```bash
set -a
source .env
set +a
python scripts/capture_performance.py
python tests/database_checks.py
python scripts/build_reports.py
```

Eight live-database checks passed. The measured SQL workflow uses idx_bookings_property_date; MongoDB uses GEO_NEAR_2DSPHERE / IXSCAN and an indexed match before $facet. The original all-history and optimized bounded output differ in scope; the same-scope SQL comparison was separately verified for equal results. Reads do not force the optimizer by disabling sequential scans. A materialized refresh still processes the global source data.

[Assignment 1 report and requirement audit](docs/assignment1_report.md), [ERD](docs/relational_erd.png), [MongoDB validators/map](docs/mongo_schema_map.json), [performance and complexity](docs/performance_and_complexity.md), [database test log](performance/database_test_results.txt).

## Submission metadata and packaging

Team numbers and member names/roll numbers still need filling. The responsibility and Figma-screen allocation below follows the supplied table; confirm actual personal contributions before submission.

| Member | Roll number | Assigned Figma screens | Assigned code/test section |
|---|---|---|---|
| Member 1 — name pending | Pending | 00 Foundations & Users; 01 Browse; 02 Property Details | Browse, Property Details, shared React components, PostgreSQL schema |
| Member 2 — name pending | Pending | 03 Transaction / Book Stay; 04 Booking Status & Constraint; 05 Wallet Audit Trail | Booking, Status Transition, Wallet Audit, procedure/index/trigger |
| Member 3 — name pending | Pending | 06 Analytics | Analytics, window functions, Materialized View |
| Member 4 — name pending | Pending | 07 Map / Search Hotspots; 08 Reviews & Amenities | Map, Reviews, MongoDB pipelines |

Assignment 2 is published at https://github.com/anantreen/SSDAssignment1B with the inherited commits preserved. The original repository remains linked as the source/upstream. This is a separate GitHub repository retaining the source history; it is not represented as a GitHub-registered fork. Confirm the course's fork requirement and fill the remaining team identity fields before Moodle submission.

The final packager requires a clean committed tree and stamps the exact source HEAD and supplied repository URL into the ZIP README. It excludes .git, node_modules, virtual environments, caches, build output, secrets and database dumps; it enforces a ZIP strictly below 20,000,000 bytes. A review archive can be made while metadata is pending; its name explicitly prevents confusion with a final submission.

```bash
python scripts/package_submission.py --assignment 2 --review
# After filling metadata and committing, use the actual team/repository values:
python scripts/package_submission.py --assignment 2 --team YOUR_TEAM_NUMBER --repo-url https://github.com/anantreen/SSDAssignment1B
```

The final filenames are <team>_a1.zip for Assignment 1 and <new_team>_a1b.zip for Assignment 2. Submit one correctly named ZIP to Moodle and prepare for the team's live viva. [Requirement audit](docs/requirements_checklist.md) records these remaining team-owned steps.

## Executed performance proof

Captured from real seeded databases with the default planner; no scan-forcing settings. Full logs are linked below. Workflow 2 covers five properties for 30 days (plus six warm-up days). Workflow 4 covers one property's past-year reviews. These scopes are explicit and are shared with the UI/API.

```text
SELECT * FROM revenue_analytics((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date-29, (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date, ARRAY[1,2,3,4,5])
Subquery Scan on revenue_analytics  (cost=734.58..736.45 rows=25 width=80) (actual time=0.243..0.305 rows=150 loops=1)
  Output: revenue_analytics.property_id, revenue_analytics.booking_date, revenue_analytics.daily_total, revenue_analytics.moving_avg_7d, revenue_analytics.revenue_momentum_rank
  Buffers: shared hit=23
  ->  Incremental Sort  (cost=734.58..736.20 rows=25 width=112) (actual time=0.243..0.297 rows=150 loops=1)
        Output: moving.id, moving.day, moving.daily_total, (round(moving.moving_avg, 2)), (dense_rank() OVER (?)), moving.moving_avg
        Sort Key: moving.day, moving.id
        Presorted Key: moving.day
        Full-sort Groups: 5  Sort Method: quicksort  Average Memory: 27kB  Peak Memory: 27kB
        Buffers: shared hit=23
        ->  WindowAgg  (cost=734.55..735.11 rows=25 width=112) (actual time=0.225..0.273 rows=150 loops=1)
              Output: moving.id, moving.day, moving.daily_total, round(moving.moving_avg, 2), dense_rank() OVER (?), moving.moving_avg
              Buffers: shared hit=23
              ->  Sort  (cost=734.55..734.61 rows=25 width=72) (actual time=0.224..0.228 rows=150 loops=1)
                    Output: moving.day, moving.moving_avg, moving.id, moving.daily_total
                    Sort Key: moving.day, moving.moving_avg DESC
                    Sort Method: quicksort  Memory: 31kB
                    Buffers: shared hit=23
                    ->  Subquery Scan on moving  (cost=458.97..733.97 rows=25 width=72) (actual time=0.102..0.202 rows=150 loops=1)
                          Output: moving.day, moving.moving_avg, moving.id, moving.daily_total
                          Filter: ((moving.day <= ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text))::date) AND (moving.day >= (((CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text))::date - 29)))
                          Rows Removed by Filter: 30
                          Buffers: shared hit=23
                          ->  WindowAgg  (cost=458.97..571.47 rows=5000 width=72) (actual time=0.098..0.172 rows=180 loops=1)
                                Output: properties.id, ((d_1.d)::date), COALESCE(d.revenue, '0'::numeric), avg(COALESCE(d.revenue, '0'::numeric)) OVER (?)
                                Buffers: shared hit=23
                                ->  Sort  (cost=458.97..471.47 rows=5000 width=40) (actual time=0.093..0.098 rows=180 loops=1)
                                      Output: properties.id, ((d_1.d)::date), d.revenue
                                      Sort Key: properties.id, ((d_1.d)::date)
                                      Sort Method: quicksort  Memory: 30kB
                                      Buffers: shared hit=23
                                      ->  Hash Left Join  (cost=22.69..151.78 rows=5000 width=40) (actual time=0.027..0.067 rows=180 loops=1)
                                            Output: properties.id, (d_1.d)::date, d.revenue
                                            Inner Unique: true
                                            Hash Cond: ((properties.id = d.property_id) AND ((d_1.d)::date = d.day))
                                            Buffers: shared hit=23
                                            ->  Nested Loop  (cost=0.31..90.02 rows=5000 width=12) (actual time=0.007..0.024 rows=180 loops=1)
                                                  Output: properties.id, d_1.d
                                                  Buffers: shared hit=11
                                                  ->  Function Scan on pg_catalog.generate_series d_1  (cost=0.03..10.03 rows=1000 width=8) (actual time=0.005..0.006 rows=36 loops=1)
                                                        Output: d_1.d
                                                        Function Call: generate_series((((((CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text))::date - 29) - 6))::timestamp without time zone, (((CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text))::date)::timestamp without time zone, '1 day'::interval)
                                                  ->  Materialize  (cost=0.28..17.50 rows=5 width=4) (actual time=0.000..0.000 rows=5 loops=36)
                                                        Output: properties.id
                                                        Buffers: shared hit=11
                                                        ->  Index Only Scan using properties_pkey on public.properties  (cost=0.28..17.48 rows=5 width=4) (actual time=0.001..0.003 rows=5 loops=1)
                                                              Output: properties.id
                                                              Index Cond: (properties.id = ANY ('{1,2,3,4,5}'::integer[]))
                                                              Heap Fetches: 0
                                                              Buffers: shared hit=11
                                            ->  Hash  (cost=22.21..22.21 rows=12 width=40) (actual time=0.019..0.019 rows=14 loops=1)
                                                  Output: d.revenue, d.property_id, d.day
                                                  Buckets: 1024  Batches: 1  Memory Usage: 9kB
                                                  Buffers: shared hit=12
                                                  ->  Subquery Scan on d  (cost=21.88..22.21 rows=12 width=40) (actual time=0.015..0.017 rows=14 loops=1)
                                                        Output: d.revenue, d.property_id, d.day
                                                        Buffers: shared hit=12
                                                        ->  HashAggregate  (cost=21.88..22.09 rows=12 width=40) (actual time=0.015..0.016 rows=14 loops=1)
                                                              Output: b.property_id, (((b.created_at AT TIME ZONE 'UTC'::text))::date), sum(b.total_cost)
                                                              Group Key: b.property_id, ((b.created_at AT TIME ZONE 'UTC'::text))::date
                                                              Batches: 1  Memory Usage: 24kB
                                                              Buffers: shared hit=12
                                                              ->  Index Only Scan using idx_bookings_property_date on public.bookings b  (cost=0.32..21.79 rows=12 width=14) (actual time=0.003..0.010 rows=27 loops=1)
                                                                    Output: b.property_id, ((b.created_at AT TIME ZONE 'UTC'::text))::date, b.total_cost
                                                                    Index Cond: ((b.property_id = ANY ('{1,2,3,4,5}'::integer[])) AND (b.created_at >= ((((((CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text))::date - 29) - 6))::timestamp without time zone AT TIME ZONE 'UTC'::text)) AND (b.created_at < (((((CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text))::date + 1))::timestamp without time zone AT TIME ZONE 'UTC'::text)))
                                                                    Heap Fetches: 13
                                                                    Buffers: shared hit=12
Planning Time: 0.205 ms
Execution Time: 0.329 ms

```

Workflow 3 cursor excerpt from explain("executionStats"):

```json
{
  "queryPlanner": {
    "winningPlan": {
      "isCached": false,
      "stage": "GEO_NEAR_2DSPHERE",
      "keyPattern": {
        "location": "2dsphere",
        "created_at": -1
      },
      "indexName": "idx_sessions_geo_recent",
      "indexVersion": 2,
      "inputStages": [
        {
          "stage": "FETCH",
          "inputStage": {
            "stage": "IXSCAN",
            "keyPattern": {
              "location": "2dsphere",
              "created_at": -1
            },
            "indexName": "idx_sessions_geo_recent",
            "isMultiKey": false,
            "multiKeyPaths": {
              "location": [],
              "created_at": []
            },
            "isUnique": false,
            "isSparse": false,
            "isPartial": false,
            "indexVersion": 2,
            "direction": "forward",
            "indexBounds": {
              "location": [
                "[4251398048237748224, 4251398048237748224]",
                "[4305441243766194176, 4305441243766194176]",
                "[4308537468510011392, 4308537468510011392]",
                "[4308695798184411136, 4308695798184411136]",
                "[4308705693789061120, 4308705693789061120]",
                "[4308706518422781952, 4308706518422781952]",
                "[4308706569962389504, 4308706569962389504]",
                "[4308706574257356800, 4308706574257356800]",
                "[4308706576471949312, 4308706576471949312]",
                "[4308706576522280960, 4308706576522280960]",
                "[4308706576533815296, 4308706576533815296]",
                "[4308706576534077440, 4308706576534077440]",
                "[4308706576534077441, 4308706576534110207]",
                "[4308706576534142976, 4308706576534142976]",
                "[4308706576534142977, 4308706576534175743]",
                "[4308706576534175745, 4308706576534208511]",
                "[4308706576534208513, 4308706576534339583]",
                "[4308706576534339585, 4308706576534470655]",
                "[4308706576534601728, 4308706576534601728]",
                "[4308706576534798336, 4308706576534798336]",
                "[4308706576534798337, 4308706576534831103]",
                "[4308706576534863872, 4308706576534863872]",
                "[4308706576534896641, 4308706576534929407]",
                "[4308706576534929408, 4308706576534929408]",
                "[4308706576534929409, 4308706576534962175]",
                "[4308706576535060480, 4308706576535060480]",
                "[4308706576535093249, 4308706576535126015]",
                "[4308706576535126016, 4308706576535126016]",
                "[4308706576535126017, 4308706576535257087]",
                "[4308706576535257089, 4308706576535388159]",
                "[4308706576535388161, 4308706576535519231]",
                "[4308706576535519233, 4308706576535650303]",
                "[4308706576535650304, 4308706576535650304]",
                "[4308706576535650305, 4308706576535683071]",
                "[4308706576535683073, 4308706576535715839]",
                "[4308706576535715840, 4308706576535715840]",
                "[4308706576535748609, 4308706576535781375]",
                "[4308706576535781377, 4308706576535912447]",
                "[4308706576535912448, 4308706576535912448]",
                "[4308706576673275904, 4308706576673275904]",
                "[4308706577478582272, 4308706577478582272]",
                "[4308706587142258688, 4308706587142258688]",
                "[4308708992323944448, 4308708992323944448]",
                "[4308748574742544384, 4308748574742544384]",
                "[4308818943486722048, 4308818943486722048]",
                "[4309944843393564672, 4309944843393564672]"
              ],
              "created_at": [
                "[new Date(9223372036854775807), new Date(1791356226196)]"
              ]
            }
          }
        },
        {
          "stage": "FETCH",
          "inputStage": {
            "stage": "IXSCAN",
            "keyPattern": {
              "location": "2dsphere",
              "created_at": -1
            },
            "indexName": "idx_sessions_geo_recent",
            "isMultiKey": false,
            "multiKeyPaths": {
              "location": [],
              "created_at": []
            },
            "isUnique": false,
            "isSparse": false,
            "isPartial": false,
            "indexVersion": 2,
            "direction": "forward",
            "indexBounds": {
              "location": [
                "[4251398048237748224, 4251398048237748224]",
                "[4305441243766194176, 4305441243766194176]",
                "[4308537468510011392, 4308537468510011392]",
                "[4308695798184411136, 4308695798184411136]",
                "[4308705693789061120, 4308705693789061120]",
                "[4308706518422781952, 4308706518422781952]",
                "[4308706569962389504, 4308706569962389504]",
                "[4308706574257356800, 4308706574257356800]",
                "[4308706576471949312, 4308706576471949312]",
                "[4308706576507600897, 4308706576509698047]",
                "[4308706576509698048, 4308706576509698048]",
                "[4308706576509960192, 4308706576509960192]",
                "[4308706576509960193, 4308706576510091263]",
                "[4308706576510091265, 4308706576510222335]",
                "[4308706576510222337, 4308706576510746623]",
                "[4308706576510746624, 4308706576510746624]",
                "[4308706576510746625, 4308706576511270911]",
                "[4308706576522280960, 4308706576522280960]",
                "[4308706576531718144, 4308706576531718144]",
                "[4308706576531718145, 4308706576532242431]",
                "[4308706576532242433, 4308706576532373503]",
                "[4308706576532504576, 4308706576532504576]",
                "[4308706576532766721, 4308706576533291007]",
                "[4308706576533291009, 4308706576533815295]",
                "[4308706576533815296, 4308706576533815296]",
                "[4308706576533815297, 4308706576533946367]",
                "[4308706576533946369, 4308706576534077439]",
                "[4308706576534077440, 4308706576534077440]",
                "[4308706576534110209, 4308706576534142975]",
                "[4308706576534142976, 4308706576534142976]",
                "[4308706576534470657, 4308706576534601727]",
                "[4308706576534601728, 4308706576534601728]",
                "[4308706576534601729, 4308706576534732799]",
                "[4308706576534732801, 4308706576534765567]",
                "[4308706576534765569, 4308706576534798335]",
                "[4308706576534798336, 4308706576534798336]",
                "[4308706576534831105, 4308706576534863871]",
                "[4308706576534863872, 4308706576534863872]",
                "[4308706576534863873, 4308706576534896639]",
                "[4308706576534929408, 4308706576534929408]",
                "[4308706576534962177, 4308706576534994943]",
                "[4308706576534994945, 4308706576535027711]",
                "[4308706576535027713, 4308706576535060479]",
                "[4308706576535060480, 4308706576535060480]",
                "[4308706576535060481, 4308706576535093247]",
                "[4308706576535126016, 4308706576535126016]",
                "[4308706576535650304, 4308706576535650304]",
                "[4308706576535715840, 4308706576535715840]",
                "[4308706576535715841, 4308706576535748607]",
                "[4308706576535912448, 4308706576535912448]",
                "[4308706576535912449, 4308706576536436735]",
                "[4308706576536436737, 4308706576536961023]",
                "[4308706576536961025, 4308706576537485311]",
                "[4308706576537485313, 4308706576538009599]",
                "[4308706576538009600, 4308706576538009600]",
                "[4308706576543252480, 4308706576543252480]",
                "[4308706576546398208, 4308706576546398208]",
                "[4308706576546398209, 4308706576546922495]",
                "[4308706576546922497, 4308706576547053567]",
                "[4308706576547184640, 4308706576547184640]",
                "[4308706576547315713, 4308706576547446783]",
                "[4308706576555835392, 4308706576555835392]",
                "[4308706576606167040, 4308706576606167040]",
                "[4308706576673275904, 4308706576673275904]",
                "[4308706577478582272, 4308706577478582272]",
                "[4308706587142258688, 4308706587142258688]",
                "[4308708992323944448, 4308708992323944448]",
                "[4308748574742544384, 4308748574742544384]",
                "[4308818943486722048, 4308818943486722048]",
                "[4309944843393564672, 4309944843393564672]"
              ],
              "created_at": [
                "[new Date(9223372036854775807), new Date(1791356226196)]"
              ]
            }
          }
        },
        {
          "stage": "FETCH",
          "inputStage": {
            "stage": "IXSCAN",
            "keyPattern": {
              "location": "2dsphere",
              "created_at": -1
            },
            "indexName": "idx_sessions_geo_recent",
            "isMultiKey": false,
            "multiKeyPaths": {
              "location": [],
              "created_at": []
            },
            "isUnique": false,
            "isSparse": false,
            "isPartial": false,
            "indexVersion": 2,
            "direction": "forward",
            "indexBounds": {
              "location": [
                "[4251398048237748224, 4251398048237748224]",
                "[4305441243766194176, 4305441243766194176]",
                "[4308537468510011392, 4308537468510011392]",
                "[4308695798184411136, 4308695798184411136]",
                "[4308705693789061120, 4308705693789061120]",
                "[4308706518422781952, 4308706518422781952]",
                "[4308706569962389504, 4308706569962389504]",
                "[4308706574257356800, 4308706574257356800]",
                "[4308706576471949312, 4308706576471949312]",
                "[4308706576488726528, 4308706576488726528]",
                "[4308706576501309440, 4308706576501309440]",
                "[4308706576502358016, 4308706576502358016]",
                "[4308706576502882305, 4308706576503406591]",
                "[4308706576503406593, 4308706576503930879]",
                "[4308706576504455168, 4308706576504455168]",
                "[4308706576505503745, 4308706576507600895]",
                "[4308706576509698048, 4308706576509698048]",
                "[4308706576509698049, 4308706576509829119]",
                "[4308706576509829121, 4308706576509960191]",
                "[4308706576509960192, 4308706576509960192]",
                "[4308706576510746624, 4308706576510746624]",
                "[4308706576511270913, 4308706576511795199]",
                "[4308706576511795201, 4308706576513892351]",
                "[4308706576513892353, 4308706576515989503]",
                "[4308706576518086656, 4308706576518086656]",
                "[4308706576518086657, 4308706576520183807]",
                "[4308706576520183809, 4308706576522280959]",
                "[4308706576522280960, 4308706576522280960]",
                "[4308706576522280961, 4308706576530669567]",
                "[4308706576530669569, 4308706576531193855]",
                "[4308706576531193857, 4308706576531718143]",
                "[4308706576531718144, 4308706576531718144]",
                "[4308706576532373505, 4308706576532504575]",
                "[4308706576532504576, 4308706576532504576]",
                "[4308706576532504577, 4308706576532635647]",
                "[4308706576532635649, 4308706576532766719]",
                "[4308706576534863872, 4308706576534863872]",
                "[4308706576538009600, 4308706576538009600]",
                "[4308706576538009601, 4308706576538533887]",
                "[4308706576538533889, 4308706576539058175]",
                "[4308706576539058177, 4308706576541155327]",
                "[4308706576541155329, 4308706576541679615]",
                "[4308706576542203904, 4308706576542203904]",
                "[4308706576542728193, 4308706576543252479]",
                "[4308706576543252480, 4308706576543252480]",
                "[4308706576543252481, 4308706576545349631]",
                "[4308706576545349633, 4308706576545873919]",
                "[4308706576545873921, 4308706576546398207]",
                "[4308706576546398208, 4308706576546398208]",
                "[4308706576547053569, 4308706576547184639]",
                "[4308706576547184640, 4308706576547184640]",
                "[4308706576547184641, 4308706576547315711]",
                "[4308706576547446785, 4308706576549543935]",
                "[4308706576549543937, 4308706576551641087]",
                "[4308706576551641088, 4308706576551641088]",
                "[4308706576553738241, 4308706576555835391]",
                "[4308706576555835392, 4308706576555835392]",
                "[4308706576606167040, 4308706576606167040]",
                "[4308706576673275904, 4308706576673275904]",
                "[4308706577478582272, 4308706577478582272]",
                "[4308706587142258688, 4308706587142258688]",
                "[4308706596805935104, 4308706596805935104]",
                "[4308706597611241472, 4308706597611241472]",
                "[4308706597678350336, 4308706597678350336]",
                "[4308706597728681984, 4308706597728681984]",
                "[4308706597741264896, 4308706597741264896]",
                "[4308706597743362049, 4308706597745459199]",
                "[4308706597745459201, 4308706597747556351]",
                "[4308706597749653504, 4308706597749653504]",
                "[4308706597751750657, 4308706597753847807]",
                "[4308706597753847809, 4308706597755944959]",
                "[4308706597758042112, 4308706597758042112]",
                "[4308706597762236416, 4308706597762236416]",
                "[4308706597812568064, 4308706597812568064]",
                "[4308706600027160576, 4308706600027160576]",
                "[4308706604322127872, 4308706604322127872]",
                "[4308708992323944448, 4308708992323944448]",
                "[4308748574742544384, 4308748574742544384]",
                "[4308818943486722048, 4308818943486722048]",
                "[4309944843393564672, 4309944843393564672]"
              ],
              "created_at": [
                "[new Date(9223372036854775807), new Date(1791356226196)]"
              ]
            }
          }
        },
        {
          "stage": "FETCH",
          "inputStage": {
            "stage": "IXSCAN",
            "keyPattern": {
              "location": "2dsphere",
              "created_at": -1
            },
            "indexName": "idx_sessions_geo_recent",
            "isMultiKey": false,
            "multiKeyPaths": {
              "location": [],
              "created_at": []
            },
            "isUnique": false,
            "isSparse": false,
            "isPartial": false,
            "indexVersion": 2,
            "direction": "forward",
            "indexBounds": {
              "location": [
                "[4251398048237748224, 4251398048237748224]",
                "[4305441243766194176, 4305441243766194176]",
                "[4308537468510011392, 4308537468510011392]",
                "[4308695798184411136, 4308695798184411136]",
                "[4308705693789061120, 4308705693789061120]",
                "[4308706518422781952, 4308706518422781952]",
                "[4308706569962389504, 4308706569962389504]",
                "[4308706574257356800, 4308706574257356800]",
                "[4308706576413229057, 4308706576421617663]",
                "[4308706576421617664, 4308706576421617664]",
                "[4308706576421617665, 4308706576430006271]",
                "[4308706576455172096, 4308706576455172096]",
                "[4308706576463560705, 4308706576471949311]",
                "[4308706576471949312, 4308706576471949312]",
                "[4308706576471949313, 4308706576480337919]",
                "[4308706576480337921, 4308706576488726527]",
                "[4308706576488726528, 4308706576488726528]",
                "[4308706576488726529, 4308706576497115135]",
                "[4308706576497115137, 4308706576499212287]",
                "[4308706576499212289, 4308706576501309439]",
                "[4308706576501309440, 4308706576501309440]",
                "[4308706576501309441, 4308706576501833727]",
                "[4308706576501833729, 4308706576502358015]",
                "[4308706576502358016, 4308706576502358016]",
                "[4308706576502358017, 4308706576502882303]",
                "[4308706576503930881, 4308706576504455167]",
                "[4308706576504455168, 4308706576504455168]",
                "[4308706576504455169, 4308706576504979455]",
                "[4308706576504979457, 4308706576505503743]",
                "[4308706576515989505, 4308706576518086655]",
                "[4308706576518086656, 4308706576518086656]",
                "[4308706576522280960, 4308706576522280960]",
                "[4308706576541679617, 4308706576542203903]",
                "[4308706576542203904, 4308706576542203904]",
                "[4308706576542203905, 4308706576542728191]",
                "[4308706576543252480, 4308706576543252480]",
                "[4308706576551641088, 4308706576551641088]",
                "[4308706576551641089, 4308706576553738239]",
                "[4308706576555835392, 4308706576555835392]",
                "[4308706576555835393, 4308706576564223999]",
                "[4308706576564224001, 4308706576572612607]",
                "[4308706576572612609, 4308706576581001215]",
                "[4308706576589389824, 4308706576589389824]",
                "[4308706576606167040, 4308706576606167040]",
                "[4308706576648110081, 4308706576656498687]",
                "[4308706576656498688, 4308706576656498688]",
                "[4308706576656498689, 4308706576664887295]",
                "[4308706576664887297, 4308706576666984447]",
                "[4308706576666984449, 4308706576669081599]",
                "[4308706576669081600, 4308706576669081600]",
                "[4308706576673275904, 4308706576673275904]",
                "[4308706577478582272, 4308706577478582272]",
                "[4308706587142258688, 4308706587142258688]",
                "[4308706596805935104, 4308706596805935104]",
                "[4308706597611241472, 4308706597611241472]",
                "[4308706597678350336, 4308706597678350336]",
                "[4308706597711904769, 4308706597720293375]",
                "[4308706597720293377, 4308706597728681983]",
                "[4308706597728681984, 4308706597728681984]",
                "[4308706597728681985, 4308706597737070591]",
                "[4308706597737070593, 4308706597739167743]",
                "[4308706597739167745, 4308706597741264895]",
                "[4308706597741264896, 4308706597741264896]",
                "[4308706597741264897, 4308706597743362047]",
                "[4308706597747556353, 4308706597749653503]",
                "[4308706597749653504, 4308706597749653504]",
                "[4308706597749653505, 4308706597751750655]",
                "[4308706597755944961, 4308706597758042111]",
                "[4308706597758042112, 4308706597758042112]",
                "[4308706597758042113, 4308706597760139263]",
                "[4308706597760139265, 4308706597762236415]",
                "[4308706597762236416, 4308706597762236416]",
                "[4308706597762236417, 4308706597770625023]",
                "[4308706597770625025, 4308706597779013631]",
                "[4308706597812568064, 4308706597812568064]",
                "[4308706597858705408, 4308706597858705408]",
                "[4308706597859753984, 4308706597859753984]",
                "[4308706597859753985, 4308706597860278271]",
                "[4308706597862899712, 4308706597862899712]",
                "[4308706597862899713, 4308706597871288319]",
                "[4308706600027160576, 4308706600027160576]",
                "[4308706604322127872, 4308706604322127872]",
                "[4308708992323944448, 4308708992323944448]",
                "[4308748574742544384, 4308748574742544384]",
                "[4308818943486722048, 4308818943486722048]",
                "[4309944843393564672, 4309944843393564672]"
              ],
              "created_at": [
                "[new Date(9223372036854775807), new Date(1791356226196)]"
              ]
            }
          }
        },
        {
          "stage": "FETCH",
          "inputStage": {
            "stage": "IXSCAN",
            "keyPattern": {
              "location": "2dsphere",
              "created_at": -1
            },
            "indexName": "idx_sessions_geo_recent",
            "isMultiKey": false,
            "multiKeyPaths": {
              "location": [],
              "created_at": []
            },
            "isUnique": false,
            "isSparse": false,
            "isPartial": false,
            "indexVersion": 2,
            "direction": "forward",
            "indexBounds": {
              "location": [
                "[4251398048237748224, 4251398048237748224]",
                "[4305441243766194176, 4305441243766194176]",
                "[4308537468510011392, 4308537468510011392]",
                "[4308695798184411136, 4308695798184411136]",
                "[4308705693789061120, 4308705693789061120]",
                "[4308706518422781952, 4308706518422781952]",
                "[4308706569962389504, 4308706569962389504]",
                "[4308706574257356800, 4308706574257356800]",
                "[4308706575331098624, 4308706575331098624]",
                "[4308706576136404992, 4308706576136404992]",
                "[4308706576203513856, 4308706576203513856]",
                "[4308706576253845504, 4308706576253845504]",
                "[4308706576262234113, 4308706576270622719]",
                "[4308706576270622721, 4308706576304177151]",
                "[4308706576337731584, 4308706576337731584]",
                "[4308706576371286017, 4308706576404840447]",
                "[4308706576404840449, 4308706576413229055]",
                "[4308706576421617664, 4308706576421617664]",
                "[4308706576430006273, 4308706576438394879]",
                "[4308706576438394881, 4308706576446783487]",
                "[4308706576446783489, 4308706576455172095]",
                "[4308706576455172096, 4308706576455172096]",
                "[4308706576455172097, 4308706576463560703]",
                "[4308706576471949312, 4308706576471949312]",
                "[4308706576581001217, 4308706576589389823]",
                "[4308706576589389824, 4308706576589389824]",
                "[4308706576589389825, 4308706576597778431]",
                "[4308706576597778433, 4308706576606167039]",
                "[4308706576606167040, 4308706576606167040]",
                "[4308706576606167041, 4308706576639721471]",
                "[4308706576639721473, 4308706576648110079]",
                "[4308706576656498688, 4308706576656498688]",
                "[4308706576669081600, 4308706576669081600]",
                "[4308706576669081601, 4308706576671178751]",
                "[4308706576671178753, 4308706576673275903]",
                "[4308706576673275904, 4308706576673275904]",
                "[4308706576673275905, 4308706576807493631]",
                "[4308706576807493633, 4308706576941711359]",
                "[4308706577478582272, 4308706577478582272]",
                "[4308706578283888640, 4308706578283888640]",
                "[4308706578317443073, 4308706578350997503]",
                "[4308706578350997504, 4308706578350997504]",
                "[4308706578350997505, 4308706578384551935]",
                "[4308706587142258688, 4308706587142258688]",
                "[4308706595899965441, 4308706595933519871]",
                "[4308706595933519872, 4308706595933519872]",
                "[4308706595944529921, 4308706595945054207]",
                "[4308706595945054208, 4308706595945054208]",
                "[4308706595946102784, 4308706595946102784]",
                "[4308706595950297088, 4308706595950297088]",
                "[4308706596000628736, 4308706596000628736]",
                "[4308706596805935104, 4308706596805935104]",
                "[4308706597393137664, 4308706597393137664]",
                "[4308706597393137665, 4308706597401526271]",
                "[4308706597409914880, 4308706597409914880]",
                "[4308706597409914881, 4308706597443469311]",
                "[4308706597544132608, 4308706597544132608]",
                "[4308706597560909824, 4308706597560909824]",
                "[4308706597573492736, 4308706597573492736]",
                "[4308706597575589889, 4308706597577687039]",
                "[4308706597577687041, 4308706597586075647]",
                "[4308706597594464256, 4308706597594464256]",
                "[4308706597602852865, 4308706597611241471]",
                "[4308706597611241472, 4308706597611241472]",
                "[4308706597611241473, 4308706597644795903]",
                "[4308706597644795905, 4308706597678350335]",
                "[4308706597678350336, 4308706597678350336]",
                "[4308706597678350337, 4308706597711904767]",
                "[4308706597779013633, 4308706597812568063]",
                "[4308706597812568064, 4308706597812568064]",
                "[4308706597812568065, 4308706597846122495]",
                "[4308706597846122497, 4308706597854511103]",
                "[4308706597854511105, 4308706597856608255]",
                "[4308706597856608257, 4308706597858705407]",
                "[4308706597858705408, 4308706597858705408]",
                "[4308706597858705409, 4308706597859229695]",
                "[4308706597859229697, 4308706597859753983]",
                "[4308706597859753984, 4308706597859753984]",
                "[4308706597860278273, 4308706597860802559]",
                "[4308706597860802561, 4308706597862899711]",
                "[4308706597862899712, 4308706597862899712]",
                "[4308706597871288321, 4308706597879676927]",
                "[4308706597879676929, 4308706597913231359]",
                "[4308706597946785792, 4308706597946785792]",
                "[4308706597997117440, 4308706597997117440]",
                "[4308706597997117441, 4308706598005506047]",
                "[4308706598148112384, 4308706598148112384]",
                "[4308706598953418752, 4308706598953418752]",
                "[4308706600027160576, 4308706600027160576]",
                "[4308706604322127872, 4308706604322127872]",
                "[4308708992323944448, 4308708992323944448]",
                "[4308748574742544384, 4308748574742544384]",
                "[4308818943486722048, 4308818943486722048]",
                "[4309944843393564672, 4309944843393564672]"
              ],
              "created_at": [
                "[new Date(9223372036854775807), new Date(1791356226196)]"
              ]
            }
          }
        },
        {
          "stage": "FETCH",
          "inputStage": {
            "stage": "IXSCAN",
            "keyPattern": {
              "location": "2dsphere",
              "created_at": -1
            },
            "indexName": "idx_sessions_geo_recent",
            "isMultiKey": false,
            "multiKeyPaths": {
              "location": [],
              "created_at": []
            },
            "isUnique": false,
            "isSparse": false,
            "isPartial": false,
            "indexVersion": 2,
            "direction": "forward",
            "indexBounds": {
              "location": [
                "[4251398048237748224, 4251398048237748224]",
                "[4305441243766194176, 4305441243766194176]",
                "[4308537468510011392, 4308537468510011392]",
                "[4308695798184411136, 4308695798184411136]",
                "[4308705693789061120, 4308705693789061120]",
                "[4308706518422781952, 4308706518422781952]",
                "[4308706569962389504, 4308706569962389504]",
                "[4308706574257356800, 4308706574257356800]",
                "[4308706574391574529, 4308706574525792255]",
                "[4308706574525792256, 4308706574525792256]",
                "[4308706574567735297, 4308706574576123903]",
                "[4308706574576123904, 4308706574576123904]",
                "[4308706574592901120, 4308706574592901120]",
                "[4308706575331098624, 4308706575331098624]",
                "[4308706575867969537, 4308706576002187263]",
                "[4308706576002187265, 4308706576136404991]",
                "[4308706576136404992, 4308706576136404992]",
                "[4308706576136404993, 4308706576169959423]",
                "[4308706576169959425, 4308706576203513855]",
                "[4308706576203513856, 4308706576203513856]",
                "[4308706576203513857, 4308706576237068287]",
                "[4308706576237068289, 4308706576245456895]",
                "[4308706576245456897, 4308706576253845503]",
                "[4308706576253845504, 4308706576253845504]",
                "[4308706576253845505, 4308706576262234111]",
                "[4308706576304177153, 4308706576337731583]",
                "[4308706576337731584, 4308706576337731584]",
                "[4308706576337731585, 4308706576371286015]",
                "[4308706576941711361, 4308706577075929087]",
                "[4308706577210146816, 4308706577210146816]",
                "[4308706577344364545, 4308706577478582271]",
                "[4308706577478582272, 4308706577478582272]",
                "[4308706577478582273, 4308706577612799999]",
                "[4308706577747017728, 4308706577747017728]",
                "[4308706578015453185, 4308706578149670911]",
                "[4308706578149670913, 4308706578283888639]",
                "[4308706578283888640, 4308706578283888640]",
                "[4308706578283888641, 4308706578317443071]",
                "[4308706578350997504, 4308706578350997504]",
                "[4308706578384551937, 4308706578418106367]",
                "[4308706578418106369, 4308706578552324095]",
                "[4308706587142258688, 4308706587142258688]",
                "[4308706595732193281, 4308706595866411007]",
                "[4308706595866411009, 4308706595899965439]",
                "[4308706595933519872, 4308706595933519872]",
                "[4308706595933519873, 4308706595941908479]",
                "[4308706595941908481, 4308706595944005631]",
                "[4308706595944005633, 4308706595944529919]",
                "[4308706595945054208, 4308706595945054208]",
                "[4308706595945054209, 4308706595945578495]",
                "[4308706595945578497, 4308706595946102783]",
                "[4308706595946102784, 4308706595946102784]",
                "[4308706595946102785, 4308706595948199935]",
                "[4308706595948199937, 4308706595950297087]",
                "[4308706595950297088, 4308706595950297088]",
                "[4308706595950297089, 4308706595958685695]",
                "[4308706595958685697, 4308706595967074303]",
                "[4308706595967074305, 4308706596000628735]",
                "[4308706596000628736, 4308706596000628736]",
                "[4308706596000628737, 4308706596134846463]",
                "[4308706596134846465, 4308706596269064191]",
                "[4308706596537499648, 4308706596537499648]",
                "[4308706596671717377, 4308706596805935103]",
                "[4308706596805935104, 4308706596805935104]",
                "[4308706596805935105, 4308706596940152831]",
                "[4308706597074370560, 4308706597074370560]",
                "[4308706597208588289, 4308706597342806015]",
                "[4308706597342806017, 4308706597376360447]",
                "[4308706597376360449, 4308706597384749055]",
                "[4308706597384749057, 4308706597393137663]",
                "[4308706597393137664, 4308706597393137664]",
                "[4308706597401526273, 4308706597409914879]",
                "[4308706597409914880, 4308706597409914880]",
                "[4308706597443469313, 4308706597477023743]",
                "[4308706597477023745, 4308706597510578175]",
                "[4308706597510578177, 4308706597544132607]",
                "[4308706597544132608, 4308706597544132608]",
                "[4308706597544132609, 4308706597552521215]",
                "[4308706597552521217, 4308706597560909823]",
                "[4308706597560909824, 4308706597560909824]",
                "[4308706597560909825, 4308706597569298431]",
                "[4308706597569298433, 4308706597571395583]",
                "[4308706597571395585, 4308706597573492735]",
                "[4308706597573492736, 4308706597573492736]",
                "[4308706597573492737, 4308706597575589887]",
                "[4308706597586075649, 4308706597594464255]",
                "[4308706597594464256, 4308706597594464256]",
                "[4308706597594464257, 4308706597602852863]",
                "[4308706597611241472, 4308706597611241472]",
                "[4308706597913231361, 4308706597946785791]",
                "[4308706597946785792, 4308706597946785792]",
                "[4308706597946785793, 4308706597980340223]",
                "[4308706597980340225, 4308706597988728831]",
                "[4308706597988728833, 4308706597997117439]",
                "[4308706597997117440, 4308706597997117440]",
                "[4308706598005506049, 4308706598013894655]",
                "[4308706598013894657, 4308706598148112383]",
                "[4308706598148112384, 4308706598148112384]",
                "[4308706598148112385, 4308706598282330111]",
                "[4308706598282330113, 4308706598416547839]",
                "[4308706598953418752, 4308706598953418752]",
                "[4308706599758725120, 4308706599758725120]",
                "[4308706599758725121, 4308706599892942847]",
                "[4308706600027160576, 4308706600027160576]",
                "[4308706604322127872, 4308706604322127872]",
                "[4308708992323944448, 4308708992323944448]",
                "[4308748574742544384, 4308748574742544384]",
                "[4308818943486722048, 4308818943486722048]",
                "[4309944843393564672, 4309944843393564672]"
              ],
              "created_at": [
                "[new Date(9223372036854775807), new Date(1791356226196)]"
              ]
            }
          }
        },
        {
          "stage": "FETCH",
          "inputStage": {
            "stage": "IXSCAN",
            "keyPattern": {
              "location": "2dsphere",
              "created_at": -1
            },
            "indexName": "idx_sessions_geo_recent",
            "isMultiKey": false,
            "multiKeyPaths": {
              "location": [],
              "created_at": []
            },
            "isUnique": false,
            "isSparse": false,
            "isPartial": false,
            "indexVersion": 2,
            "direction": "forward",
            "indexBounds": {
              "location": [
                "[4251398048237748224, 4251398048237748224]",
                "[4305441243766194176, 4305441243766194176]",
                "[4308537468510011392, 4308537468510011392]",
                "[4308695798184411136, 4308695798184411136]",
                "[4308704783255994368, 4308704783255994368]",
                "[4308704787550961664, 4308704787550961664]",
                "[4308704788624703488, 4308704788624703488]",
                "[4308704788624703489, 4308704789161574399]",
                "[4308704800435863552, 4308704800435863552]",
                "[4308704811844370433, 4308704811978588159]",
                "[4308704811978588160, 4308704811978588160]",
                "[4308704811978588161, 4308704812112805887]",
                "[4308704812247023616, 4308704812247023616]",
                "[4308704812414795777, 4308704812448350207]",
                "[4308704812448350208, 4308704812448350208]",
                "[4308704812515459072, 4308704812515459072]",
                "[4308704813320765440, 4308704813320765440]",
                "[4308704817615732736, 4308704817615732736]",
                "[4308704869155340288, 4308704869155340288]",
                "[4308705693789061120, 4308705693789061120]",
                "[4308706518422781952, 4308706518422781952]",
                "[4308706569962389504, 4308706569962389504]",
                "[4308706570499260417, 4308706571036131327]",
                "[4308706571036131328, 4308706571036131328]",
                "[4308706571036131329, 4308706571573002239]",
                "[4308706573183614976, 4308706573183614976]",
                "[4308706573183614977, 4308706573720485887]",
                "[4308706573720485889, 4308706574257356799]",
                "[4308706574257356800, 4308706574257356800]",
                "[4308706574257356801, 4308706574391574527]",
                "[4308706574525792256, 4308706574525792256]",
                "[4308706574525792257, 4308706574559346687]",
                "[4308706574559346689, 4308706574567735295]",
                "[4308706574576123904, 4308706574576123904]",
                "[4308706574576123905, 4308706574584512511]",
                "[4308706574584512513, 4308706574592901119]",
                "[4308706574592901120, 4308706574592901120]",
                "[4308706574592901121, 4308706574626455551]",
                "[4308706574626455553, 4308706574660009983]",
                "[4308706574660009985, 4308706574794227711]",
                "[4308706574794227713, 4308706575331098623]",
                "[4308706575331098624, 4308706575331098624]",
                "[4308706575331098625, 4308706575867969535]",
                "[4308706577075929089, 4308706577210146815]",
                "[4308706577210146816, 4308706577210146816]",
                "[4308706577210146817, 4308706577344364543]",
                "[4308706577478582272, 4308706577478582272]",
                "[4308706577612800001, 4308706577747017727]",
                "[4308706577747017728, 4308706577747017728]",
                "[4308706577747017729, 4308706577881235455]",
                "[4308706577881235457, 4308706578015453183]",
                "[4308706578552324097, 4308706580699807743]",
                "[4308706580699807745, 4308706580834025471]",
                "[4308706580968243200, 4308706580968243200]",
                "[4308706581773549568, 4308706581773549568]",
                "[4308706582847291392, 4308706582847291392]",
                "[4308706587142258688, 4308706587142258688]",
                "[4308706591437225984, 4308706591437225984]",
                "[4308706592510967808, 4308706592510967808]",
                "[4308706593316274176, 4308706593316274176]",
                "[4308706593450491905, 4308706593584709631]",
                "[4308706593584709633, 4308706595732193279]",
                "[4308706596269064193, 4308706596403281919]",
                "[4308706596403281921, 4308706596537499647]",
                "[4308706596537499648, 4308706596537499648]",
                "[4308706596537499649, 4308706596671717375]",
                "[4308706596805935104, 4308706596805935104]",
                "[4308706596940152833, 4308706597074370559]",
                "[4308706597074370560, 4308706597074370560]",
                "[4308706597074370561, 4308706597208588287]",
                "[4308706598416547841, 4308706598953418751]",
                "[4308706598953418752, 4308706598953418752]",
                "[4308706598953418753, 4308706599490289663]",
                "[4308706599490289665, 4308706599624507391]",
                "[4308706599624507393, 4308706599758725119]",
                "[4308706599758725120, 4308706599758725120]",
                "[4308706599892942849, 4308706600027160575]",
                "[4308706600027160576, 4308706600027160576]",
                "[4308706600027160577, 4308706600564031487]",
                "[4308706600564031489, 4308706600597585919]",
                "[4308706600631140352, 4308706600631140352]",
                "[4308706600832466944, 4308706600832466944]",
                "[4308706601100902400, 4308706601100902400]",
                "[4308706602711515137, 4308706603248386047]",
                "[4308706603248386048, 4308706603248386048]",
                "[4308706603248386049, 4308706603785256959]",
                "[4308706604322127872, 4308706604322127872]",
                "[4308708992323944448, 4308708992323944448]",
                "[4308748574742544384, 4308748574742544384]",
                "[4308818943486722048, 4308818943486722048]",
                "[4309944843393564672, 4309944843393564672]"
              ],
              "created_at": [
                "[new Date(9223372036854775807), new Date(1791356226196)]"
              ]
            }
          }
        },
        {
          "stage": "FETCH",
          "inputStage": {
            "stage": "IXSCAN",
            "keyPattern": {
              "location": "2dsphere",
              "created_at": -1
            },
            "indexName": "idx_sessions_geo_recent",
            "isMultiKey": false,
            "multiKeyPaths": {
              "location": [],
              "created_at": []
            },
            "isUnique": false,
            "isSparse": false,
            "isPartial": false,
            "indexVersion": 2,
            "direction": "forward",
            "indexBounds": {
              "location": [
                "[4251398048237748224, 4251398048237748224]",
                "[4305441243766194176, 4305441243766194176]",
                "[4308537468510011392, 4308537468510011392]",
                "[4308695798184411136, 4308695798184411136]",
                "[4308704778961027072, 4308704778961027072]",
                "[4308704780034768896, 4308704780034768896]",
                "[4308704780034768897, 4308704780571639807]",
                "[4308704783255994368, 4308704783255994368]",
                "[4308704783255994369, 4308704785403478015]",
                "[4308704785403478017, 4308704787550961663]",
                "[4308704787550961664, 4308704787550961664]",
                "[4308704787550961665, 4308704788087832575]",
                "[4308704788087832577, 4308704788624703487]",
                "[4308704788624703488, 4308704788624703488]",
                "[4308704789161574401, 4308704789698445311]",
                "[4308704789698445313, 4308704791845928959]",
                "[4308704800435863552, 4308704800435863552]",
                "[4308704809025798145, 4308704811173281791]",
                "[4308704811173281793, 4308704811710152703]",
                "[4308704811710152705, 4308704811844370431]",
                "[4308704811978588160, 4308704811978588160]",
                "[4308704812112805889, 4308704812247023615]",
                "[4308704812247023616, 4308704812247023616]",
                "[4308704812247023617, 4308704812381241343]",
                "[4308704812381241345, 4308704812414795775]",
                "[4308704812448350208, 4308704812448350208]",
                "[4308704812448350209, 4308704812481904639]",
                "[4308704812481904641, 4308704812515459071]",
                "[4308704812515459072, 4308704812515459072]",
                "[4308704812515459073, 4308704812649676799]",
                "[4308704812649676801, 4308704812783894527]",
                "[4308704812783894529, 4308704813320765439]",
                "[4308704813320765440, 4308704813320765440]",
                "[4308704813320765441, 4308704815468249087]",
                "[4308704815468249089, 4308704817615732735]",
                "[4308704817615732736, 4308704817615732736]",
                "[4308704819763216385, 4308704821910700031]",
                "[4308704821910700032, 4308704821910700032]",
                "[4308704869155340288, 4308704869155340288]",
                "[4308705693789061120, 4308705693789061120]",
                "[4308706518422781952, 4308706518422781952]",
                "[4308706557077487616, 4308706557077487616]",
                "[4308706557077487617, 4308706559224971263]",
                "[4308706565667422208, 4308706565667422208]",
                "[4308706565667422209, 4308706567814905855]",
                "[4308706567814905857, 4308706569962389503]",
                "[4308706569962389504, 4308706569962389504]",
                "[4308706569962389505, 4308706570499260415]",
                "[4308706571036131328, 4308706571036131328]",
                "[4308706571573002241, 4308706572109873151]",
                "[4308706572109873153, 4308706572646744063]",
                "[4308706572646744065, 4308706573183614975]",
                "[4308706573183614976, 4308706573183614976]",
                "[4308706574257356800, 4308706574257356800]",
                "[4308706580834025473, 4308706580968243199]",
                "[4308706580968243200, 4308706580968243200]",
                "[4308706580968243201, 4308706581102460927]",
                "[4308706581102460929, 4308706581236678655]",
                "[4308706581236678657, 4308706581773549567]",
                "[4308706581773549568, 4308706581773549568]",
                "[4308706581773549569, 4308706582310420479]",
                "[4308706582310420481, 4308706582847291391]",
                "[4308706582847291392, 4308706582847291392]",
                "[4308706582847291393, 4308706584994775039]",
                "[4308706584994775041, 4308706587142258687]",
                "[4308706587142258688, 4308706587142258688]",
                "[4308706587142258689, 4308706589289742335]",
                "[4308706589289742337, 4308706591437225983]",
                "[4308706591437225984, 4308706591437225984]",
                "[4308706591437225985, 4308706591974096895]",
                "[4308706591974096897, 4308706592510967807]",
                "[4308706592510967808, 4308706592510967808]",
                "[4308706592510967809, 4308706593047838719]",
                "[4308706593047838721, 4308706593182056447]",
                "[4308706593182056449, 4308706593316274175]",
                "[4308706593316274176, 4308706593316274176]",
                "[4308706593316274177, 4308706593450491903]",
                "[4308706600027160576, 4308706600027160576]",
                "[4308706600597585921, 4308706600631140351]",
                "[4308706600631140352, 4308706600631140352]",
                "[4308706600631140353, 4308706600664694783]",
                "[4308706600664694785, 4308706600698249215]",
                "[4308706600698249217, 4308706600832466943]",
                "[4308706600832466944, 4308706600832466944]",
                "[4308706600832466945, 4308706600966684671]",
                "[4308706600966684673, 4308706601100902399]",
                "[4308706601100902400, 4308706601100902400]",
                "[4308706601100902401, 4308706601637773311]",
                "[4308706601637773313, 4308706602174644223]",
                "[4308706602174644225, 4308706602711515135]",
                "[4308706603248386048, 4308706603248386048]",
                "[4308706603785256961, 4308706604322127871]",
                "[4308706604322127872, 4308706604322127872]",
                "[4308706604322127873, 4308706606469611519]",
                "[4308706606469611521, 4308706608617095167]",
                "[4308706608617095168, 4308706608617095168]",
                "[4308706615059546113, 4308706617207029759]",
                "[4308706617207029760, 4308706617207029760]",
                "[4308706617878118401, 4308706618012336127]",
                "[4308706618012336128, 4308706618012336128]",
                "[4308706618280771584, 4308706618280771584]",
                "[4308708992323944448, 4308708992323944448]",
                "[4308748574742544384, 4308748574742544384]",
                "[4308818943486722048, 4308818943486722048]",
                "[4309944843393564672, 4309944843393564672]"
              ],
              "created_at": [
                "[new Date(9223372036854775807), new Date(1791356226196)]"
              ]
            }
          }
        },
        {
          "stage": "FETCH",
          "inputStage": {
            "stage": "IXSCAN",
            "keyPattern": {
              "location": "2dsphere",
              "created_at": -1
            },
            "indexName": "idx_sessions_geo_recent",
            "isMultiKey": false,
            "multiKeyPaths": {
              "location": [],
              "created_at": []
            },
            "isUnique": false,
            "isSparse": false,
            "isPartial": false,
            "indexVersion": 2,
            "direction": "forward",
            "indexBounds": {
              "location": [
                "[4251398048237748224, 4251398048237748224]",
                "[4305441243766194176, 4305441243766194176]",
                "[4308537468510011392, 4308537468510011392]",
                "[4308695798184411136, 4308695798184411136]",
                "[4308700196230922240, 4308700196230922240]",
                "[4308703494765805568, 4308703494765805568]",
                "[4308703769643712512, 4308703769643712512]",
                "[4308703915672600577, 4308703924262535167]",
                "[4308703924262535168, 4308703924262535168]",
                "[4308703975802142720, 4308703975802142720]",
                "[4308704027341750272, 4308704027341750272]",
                "[4308704027341750273, 4308704035931684863]",
                "[4308704035931684865, 4308704044521619455]",
                "[4308704044521619457, 4308704053111554047]",
                "[4308704061701488640, 4308704061701488640]",
                "[4308704074586390528, 4308704074586390528]",
                "[4308704075660132352, 4308704075660132352]",
                "[4308704075928567808, 4308704075928567808]",
                "[4308704075928567809, 4308704076062785535]",
                "[4308704113241096192, 4308704113241096192]",
                "[4308704319399526400, 4308704319399526400]",
                "[4308704748896256000, 4308704748896256000]",
                "[4308704753191223296, 4308704753191223296]",
                "[4308704754264965120, 4308704754264965120]",
                "[4308704754264965121, 4308704754801836031]",
                "[4308704766076125185, 4308704774666059775]",
                "[4308704774666059777, 4308704776813543423]",
                "[4308704776813543425, 4308704778961027071]",
                "[4308704778961027072, 4308704778961027072]",
                "[4308704778961027073, 4308704779497897983]",
                "[4308704779497897985, 4308704780034768895]",
                "[4308704780034768896, 4308704780034768896]",
                "[4308704780571639809, 4308704781108510719]",
                "[4308704781108510721, 4308704783255994367]",
                "[4308704783255994368, 4308704783255994368]",
                "[4308704791845928961, 4308704800435863551]",
                "[4308704800435863552, 4308704800435863552]",
                "[4308704800435863553, 4308704809025798143]",
                "[4308704817615732736, 4308704817615732736]",
                "[4308704817615732737, 4308704819763216383]",
                "[4308704821910700032, 4308704821910700032]",
                "[4308704821910700033, 4308704824058183679]",
                "[4308704824058183681, 4308704826205667327]",
                "[4308704826205667329, 4308704834795601919]",
                "[4308704843385536513, 4308704851975471103]",
                "[4308704851975471104, 4308704851975471104]",
                "[4308704869155340288, 4308704869155340288]",
                "[4308704907810045952, 4308704907810045952]",
                "[4308704909957529601, 4308704912105013247]",
                "[4308704912105013249, 4308704920694947839]",
                "[4308704920694947840, 4308704920694947840]",
                "[4308704937874817024, 4308704937874817024]",
                "[4308705693789061120, 4308705693789061120]",
                "[4308706449703305216, 4308706449703305216]",
                "[4308706466883174400, 4308706466883174400]",
                "[4308706466883174401, 4308706475473108991]",
                "[4308706475473108993, 4308706484063043583]",
                "[4308706484063043585, 4308706486210527231]",
                "[4308706488358010880, 4308706488358010880]",
                "[4308706501242912768, 4308706501242912768]",
                "[4308706518422781952, 4308706518422781952]",
                "[4308706518422781953, 4308706552782520319]",
                "[4308706552782520321, 4308706554930003967]",
                "[4308706554930003969, 4308706557077487615]",
                "[4308706557077487616, 4308706557077487616]",
                "[4308706559224971265, 4308706561372454911]",
                "[4308706561372454913, 4308706563519938559]",
                "[4308706563519938561, 4308706565667422207]",
                "[4308706565667422208, 4308706565667422208]",
                "[4308706569962389504, 4308706569962389504]",
                "[4308706587142258688, 4308706587142258688]",
                "[4308706604322127872, 4308706604322127872]",
                "[4308706608617095168, 4308706608617095168]",
                "[4308706608617095169, 4308706610764578815]",
                "[4308706610764578817, 4308706612912062463]",
                "[4308706612912062465, 4308706615059546111]",
                "[4308706617207029760, 4308706617207029760]",
                "[4308706617207029761, 4308706617743900671]",
                "[4308706617743900673, 4308706617878118399]",
                "[4308706618012336128, 4308706618012336128]",
                "[4308706618012336129, 4308706618146553855]",
                "[4308706618146553857, 4308706618280771583]",
                "[4308706618280771584, 4308706618280771584]",
                "[4308706618280771585, 4308706618817642495]",
                "[4308706618817642497, 4308706619354513407]",
                "[4308706619354513409, 4308706621501997055]",
                "[4308706621501997057, 4308706655861735423]",
                "[4308708992323944448, 4308708992323944448]",
                "[4308748574742544384, 4308748574742544384]",
                "[4308818943486722048, 4308818943486722048]",
                "[4309944843393564672, 4309944843393564672]"
              ],
              "created_at": [
                "[new Date(9223372036854775807), new Date(1791356226196)]"
              ]
            }
          }
        },
        {
          "stage": "FETCH",
          "inputStage": {
            "stage": "IXSCAN",
            "keyPattern": {
              "location": "2dsphere",
              "created_at": -1
            },
            "indexName": "idx_sessions_geo_recent",
            "isMultiKey": false,
            "multiKeyPaths": {
              "location": [],
              "created_at": []
            },
            "isUnique": false,
            "isSparse": false,
            "isPartial": false,
            "indexVersion": 2,
            "direction": "forward",
            "indexBounds": {
              "location": [
                "[4251398048237748224, 4251398048237748224]",
                "[4305441243766194176, 4305441243766194176]",
                "[4308537468510011392, 4308537468510011392]",
                "[4308695798184411136, 4308695798184411136]",
                "[4308700196230922240, 4308700196230922240]",
                "[4308703494765805568, 4308703494765805568]",
                "[4308703769643712512, 4308703769643712512]",
                "[4308703778233647105, 4308703786823581695]",
                "[4308703786823581696, 4308703786823581696]",
                "[4308703838363189248, 4308703838363189248]",
                "[4308703872722927617, 4308703907082665983]",
                "[4308703907082665985, 4308703915672600575]",
                "[4308703924262535168, 4308703924262535168]",
                "[4308703924262535169, 4308703932852469759]",
                "[4308703932852469761, 4308703941442404351]",
                "[4308703941442404353, 4308703975802142719]",
                "[4308703975802142720, 4308703975802142720]",
                "[4308703975802142721, 4308704010161881087]",
                "[4308704010161881089, 4308704018751815679]",
                "[4308704018751815681, 4308704027341750271]",
                "[4308704027341750272, 4308704027341750272]",
                "[4308704053111554049, 4308704061701488639]",
                "[4308704061701488640, 4308704061701488640]",
                "[4308704061701488641, 4308704070291423231]",
                "[4308704070291423233, 4308704072438906879]",
                "[4308704072438906881, 4308704074586390527]",
                "[4308704074586390528, 4308704074586390528]",
                "[4308704074586390529, 4308704075123261439]",
                "[4308704075123261441, 4308704075660132351]",
                "[4308704075660132352, 4308704075660132352]",
                "[4308704075660132353, 4308704075794350079]",
                "[4308704075794350081, 4308704075928567807]",
                "[4308704075928567808, 4308704075928567808]",
                "[4308704076062785537, 4308704076197003263]",
                "[4308704076197003265, 4308704076733874175]",
                "[4308704076733874177, 4308704078881357823]",
                "[4308704078881357825, 4308704113241096191]",
                "[4308704113241096192, 4308704113241096192]",
                "[4308704113241096193, 4308704147600834559]",
                "[4308704147600834561, 4308704181960572927]",
                "[4308704319399526400, 4308704319399526400]",
                "[4308704525557956608, 4308704525557956608]",
                "[4308704542737825792, 4308704542737825792]",
                "[4308704547032793088, 4308704547032793088]",
                "[4308704547032793089, 4308704549180276735]",
                "[4308704662996910080, 4308704662996910080]",
                "[4308704662996910081, 4308704697356648447]",
                "[4308704697356648449, 4308704731716386815]",
                "[4308704731716386817, 4308704740306321407]",
                "[4308704740306321409, 4308704748896255999]",
                "[4308704748896256000, 4308704748896256000]",
                "[4308704748896256001, 4308704751043739647]",
                "[4308704751043739649, 4308704753191223295]",
                "[4308704753191223296, 4308704753191223296]",
                "[4308704753191223297, 4308704753728094207]",
                "[4308704753728094209, 4308704754264965119]",
                "[4308704754264965120, 4308704754264965120]",
                "[4308704754801836033, 4308704755338706943]",
                "[4308704755338706945, 4308704757486190591]",
                "[4308704757486190593, 4308704766076125183]",
                "[4308704800435863552, 4308704800435863552]",
                "[4308704834795601921, 4308704843385536511]",
                "[4308704851975471104, 4308704851975471104]",
                "[4308704851975471105, 4308704860565405695]",
                "[4308704860565405697, 4308704869155340287]",
                "[4308704869155340288, 4308704869155340288]",
                "[4308704869155340289, 4308704903515078655]",
                "[4308704903515078657, 4308704905662562303]",
                "[4308704905662562305, 4308704907810045951]",
                "[4308704907810045952, 4308704907810045952]",
                "[4308704907810045953, 4308704909957529599]",
                "[4308704920694947840, 4308704920694947840]",
                "[4308704920694947841, 4308704929284882431]",
                "[4308704929284882433, 4308704937874817023]",
                "[4308704937874817024, 4308704937874817024]",
                "[4308704937874817025, 4308704972234555391]",
                "[4308704972234555393, 4308705006594293759]",
                "[4308705040954032129, 4308705075313770495]",
                "[4308705075313770496, 4308705075313770496]",
                "[4308705693789061120, 4308705693789061120]",
                "[4308706312264351744, 4308706312264351744]",
                "[4308706312264351745, 4308706346624090111]",
                "[4308706346624090113, 4308706346758307839]",
                "[4308706346892525568, 4308706346892525568]",
                "[4308706347697831936, 4308706347697831936]",
                "[4308706350919057408, 4308706350919057408]",
                "[4308706363803959296, 4308706363803959296]",
                "[4308706380983828481, 4308706415343566847]",
                "[4308706415343566849, 4308706449703305215]",
                "[4308706449703305216, 4308706449703305216]",
                "[4308706449703305217, 4308706458293239807]",
                "[4308706458293239809, 4308706466883174399]",
                "[4308706466883174400, 4308706466883174400]",
                "[4308706486210527233, 4308706488358010879]",
                "[4308706488358010880, 4308706488358010880]",
                "[4308706488358010881, 4308706490505494527]",
                "[4308706490505494529, 4308706492652978175]",
                "[4308706492652978177, 4308706501242912767]",
                "[4308706501242912768, 4308706501242912768]",
                "[4308706501242912769, 4308706509832847359]",
                "[4308706509832847361, 4308706518422781951]",
                "[4308706518422781952, 4308706518422781952]",
                "[4308706655861735425, 4308706690221473791]",
                "[4308706690221473793, 4308706724581212159]",
                "[4308706724581212160, 4308706724581212160]",
                "[4308708992323944448, 4308708992323944448]",
                "[4308748574742544384, 4308748574742544384]",
                "[4308818943486722048, 4308818943486722048]",
                "[4309944843393564672, 4309944843393564672]"
              ],
              "created_at": [
                "[new Date(9223372036854775807), new Date(1791356226196)]"
              ]
            }
          }
        }
      ]
    }
  },
  "executionStats": {
    "executionSuccess": true,
    "nReturned": 224,
    "executionTimeMillis": 6,
    "totalKeysExamined": 4866,
    "totalDocsExamined": 1146
  }
}
```

Workflow 4 cursor excerpt from explain("executionStats"):

```json
{
  "queryPlanner": {
    "winningPlan": {
      "isCached": false,
      "stage": "PROJECTION_SIMPLE",
      "transformBy": {
        "rating": true,
        "location_tags": true,
        "_id": false
      },
      "inputStage": {
        "stage": "FETCH",
        "inputStage": {
          "stage": "IXSCAN",
          "keyPattern": {
            "property_id": 1,
            "timestamp": -1
          },
          "indexName": "idx_reviews_property_time",
          "isMultiKey": false,
          "multiKeyPaths": {
            "property_id": [],
            "timestamp": []
          },
          "isUnique": false,
          "isSparse": false,
          "isPartial": false,
          "indexVersion": 2,
          "direction": "forward",
          "indexBounds": {
            "property_id": [
              "[1, 1]"
            ],
            "timestamp": [
              "[new Date(9223372036854775807), new Date(1759823826196)]"
            ]
          }
        }
      }
    }
  },
  "executionStats": {
    "executionSuccess": true,
    "nReturned": 28,
    "executionTimeMillis": 0,
    "totalKeysExamined": 28,
    "totalDocsExamined": 28
  }
}
```

Full [SQL plans](performance/postgres_explain_analyzes.txt), [MongoDB executionStats](performance/mongo_execution_stats.json), and [before/after complexity report](docs/performance_and_complexity.md).
