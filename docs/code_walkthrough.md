# StaySpot code walkthrough

Read this guide alongside the source comments. It explains how the four member sections form one application, then maps the important implementation files to their inputs, outputs and invariants. The readability pass preserves the screens, database rules, endpoint contracts and four-member ownership.

## Start with the request path

```text
web/index.html
  → web/src/main.jsx
    → members/member1/web/App.jsx
      → the selected member's screen
        → member1/web/lib/api.js or hooks/useData.js
          → api/server.js → api/app.js
            → members/memberN/api/routes.js
              → PostgreSQL procedure/function/table OR MongoDB pipeline
```

`main.jsx` only mounts React and loads the shared stylesheet. `App.jsx` owns the selected screen, guest and any property selected for booking. It reads the URL hash so direct links and browser history select the same screen. Each member screen owns its filters, pagination and result state. `api/server.js` owns connections and the HTTP listener; `api/app.js` composes routes and translates failures.

## Member 1: foundations, Browse and details

[App.jsx](../members/member1/web/App.jsx) coordinates the six screens. A first paged guest request selects a demo actor; the header's [Picker.jsx](../members/member1/web/components/Picker.jsx) searches additional actors without loading the complete guest table. The actor's wallet is reread on screen changes and updated from a successful booking response. Changing identity is a demo convenience, not authentication.

[Browse.jsx](../members/member1/web/Browse.jsx) chooses properties, guests or bookings and sends only applicable filters. Properties use eight cards per request; tabular entities use twenty rows. `after` identifies the current cursor, while `history` stores earlier cursors for Back. Changing search/status/actor filters discards invalid pagination history. Clicking a record fetches a detail endpoint before [PropertyDetails.jsx](../members/member1/web/PropertyDetails.jsx) displays it. The detail component also handles guest/booking records, with the Book action shown only for a property.

[useData.js](../members/member1/web/hooks/useData.js) returns `{loading,data,error,reload}`. URL changes and a local version counter trigger requests. Its cleanup flag prevents a superseded/unmounted effect from publishing stale data; it does **not** cancel the network request. [DataState.jsx](../members/member1/web/components/DataState.jsx) chooses the loading, retryable error or empty presentation before exposing children. [api.js](../members/member1/web/lib/api.js) supplies the `/api` prefix, reads JSON once, and throws the server's friendly failure message for unsuccessful HTTP responses.

Shared components retain one visual contract: `Heading` controls titles/actions; `Alert` uses accessible status/error roles; `Pill` turns status codes into labels; `Pager` delegates cursor changes; `Picker` searches bounded candidate pages; `Modal` contains keyboard focus, supports Escape and restores prior focus; `HouseArt` draws a decorative local SVG. The shared `format.js` changes representation only. It formats money/counts for display and timestamps locally, while UTC date helpers produce analytics filter values. `query.js` omits empty filters and safely URL-encodes other values.

[Member 1 routes](../members/member1/api/routes.js) provide health, lists and details. A fixed internal entity/column map is safe to interpolate as SQL identifiers; request values use PostgreSQL parameters. Search escapes `%`, `_` and backslash before ILIKE, so those input characters remain literal. Lists fetch `limit+1`, return at most `limit`, and use the extra row to decide whether another page exists. This avoids an expensive total-count query and deep OFFSET traversal.

[01_schema_ddl.sql](../members/member1/sql/01_schema_ddl.sql) defines the financial model. Identity columns provide primary keys; bookings/audits reference real actors/properties. PostgreSQL NUMERIC stores exact money. NOT NULL and CHECK constraints reject missing/negative balances, invalid coordinates, invalid statuses, nonpositive prices/costs, bad nights and inconsistent debit/credit signs. `analytics_refresh_state` stores a real view-refresh completion time. The [ERD generator](generate_erd.py) draws the published schema diagram with Pillow; its pixel coordinates are drawing instructions, not database coordinates.

## Member 2: booking, status and audit

[Transaction.jsx](../members/member2/web/Transaction.jsx) holds a selected property, nights, initial status, in-flight flag, error and receipt. The visual quote is base price × nights, but the client never sends an authoritative cost. Submitting calls POST `/api/bookings`. The button is disabled while awaiting the response. Success displays before/after wallet values and the trigger-created audit row, then updates App's actor wallet. Switching actors clears the previous receipt/error.

[Member 2 routes](../members/member2/api/routes.js) validate the request and borrow **one** SQL connection. BEGIN, the guest's `FOR UPDATE` balance read, CALL, result reads and COMMIT must all use that connection. A SQL error causes ROLLBACK; `finally` releases the connection. Only a committed response is labelled successful. The result is `{booking,balance_before,balance_after,audit}`.

[create_booking](../members/member2/sql/04_stored_procedures.sql) validates nights/status, locks the selected property's price against changes, computes the cost, and conditionally updates the guest wallet. The UPDATE's lock and balance predicate prevent competing deductions from overspending. The AFTER UPDATE trigger in [03_triggers_and_audit.sql](../members/member2/sql/03_triggers_and_audit.sql) computes `NEW - OLD`, assigns DEBIT/CREDIT and records the resulting balance. The booking insert then checks its foreign keys, CHECK rules and active-stay uniqueness. A failure undoes the debit and trigger row as part of the caller transaction. The procedure deliberately does not end a transaction inside an exception block.

SQLSTATEs are stable failure categories: `22023` is an invalid procedure argument, `P0002` a missing record, `P0001` insufficient balance, `23505` uniqueness conflict, and `23514` a CHECK violation. `api/app.js` maps the expected cases to friendly HTTP responses and hides unexpected internal details. The audit guard uses `42501` for ordinary UPDATE/DELETE/TRUNCATE attempts. Database owners can disable triggers, so that guard is not a claim of privileged-administrator tamper resistance.

[02_indexes.sql](../members/member2/sql/02_indexes.sql) contains the partial unique checked-in index and targeted property/date, guest/booking, status, audit/time and trigram search indexes. Only CHECKED_IN rows participate in active-stay uniqueness; confirmed reservations can coexist. [BookingStatusAction.jsx](../members/member2/web/BookingStatusAction.jsx) renders Check in, Complete stay or All done inside Browse. The PATCH handler checks the expected previous status in the UPDATE itself, so a stale/concurrent request cannot silently skip a state.

[Audit.jsx](../members/member2/web/Audit.jsx) filters one guest's read-only ledger by UTC calendar dates. Its cursor is encoded `[exact UTC timestamp, ID]`, with microseconds preserved as SQL text. A tuple comparison and ID tie-breaker avoid repeating neighbors. The running balance is the stored snapshot, not a sum of only the current filtered page. Opening balance is the first row's `balance_after - amount_changed`.

The [PostgreSQL seeder](../members/member2/data_generation/postgres_seeder.py) uses fixed random/Faker seeds, streams rows through COPY, and reads actual generated IDs before assigning foreign keys. Historical bookings describe previously settled history before the opening demo wallet snapshot. Alternating small wallet UPDATEs create the actual audit ledger. The connection context commits the seed together; VACUUM/ANALYZE uses a separate autocommit connection and prepares statistics/visibility for index evaluation. `cur` means the database cursor, `conn` the connection, and `rng` the repeatable random-number generator.

## Member 3: window analytics and materialized summaries

[06_window_analytics.sql](../members/member3/sql/06_window_analytics.sql) defines a reusable SQL function accepting inclusive UTC dates and selected property IDs. The API caps its request period to ninety days; the function itself has no such application cap. Its CTEs form four stages:

1. `selected` limits properties before calendar expansion.
2. `daily` aggregates only matching bookings with raw timestamp range predicates that can use the property/date index.
3. `calendar` creates a row per selected property/day, including six warm-up days.
4. `moving` zero-fills missing days and averages the current row plus six preceding rows.

Filtering warm-up dates after calculating windows guarantees a full seven-day denominator even on the first visible day. DENSE_RANK compares properties on the same day using unrounded averages; only presentation values are rounded. Zero-filled calendar days distinguish a seven-day average from the average of seven booking events.

[05_materialized_views.sql](../members/member3/sql/05_materialized_views.sql) precomputes lifetime bookings, **actual nights** and gross booked revenue, retaining properties with no stays through LEFT JOIN/COALESCE. A populated view and unfiltered unique property index support concurrent refresh. An advisory transaction lock serializes the application's refresh requests. The completion timestamp and refreshed data commit together. A refresh still reads global source data; it is not constant-time merely because subsequent lookups are quick.

[Member 3 routes](../members/member3/api/routes.js) choose an explicit property or a default cohort of twelve properties by materialized lifetime revenue. Independent reads load live window series, property summaries, global totals and refresh state concurrently. Those four reads are not advertised as one cross-query snapshot. [Analytics.jsx](../members/member3/web/Analytics.jsx) selects the end-date rows for the ranked table and requests a reread after refresh. [LineChart.jsx](../members/member3/web/LineChart.jsx) plots four series; `xForDate` maps date positions into SVG pixels and `yForRevenue` inverts the downward SVG axis. It draws SQL results rather than recalculating their financial meaning.

## Member 4: map, facets and catalogs

[MapView.jsx](../members/member4/web/MapView.jsx) separates committed `origin` coordinates from editable `draft` coordinates. Three refs retain the DOM container, Leaflet instance and replaceable data layer. One effect installs a fifteen-second poll timer; another creates/removes the map; a third replaces markers/circles whenever results/origin change. Polling does not accumulate duplicate layers. Map clicks and submitted valid coordinates update the origin; Add pin writes a new session then rereads results.

[Member 4 routes](../members/member4/api/routes.js) validate numeric coordinates and age windows, build an absolute recent-date cutoff and execute bounded results with a database execution timeout. GeoJSON coordinates are **longitude, latitude**; Leaflet marker coordinates are **latitude, longitude**. The map's circle and MongoDB query both use 5,000 metres.

[geospatial.cjs](../members/member4/mongo/geospatial.cjs) provides two pure builders. `nearbyPipeline` starts with indexed $geoNear, relies on its distance ordering, limits the nearest list, then projects fields. The result limit does not bound all keys/candidates examined by the spatial engine. `hotspotsPipeline` groups **all** recent pins in the radius before limiting cells. `floor(coordinate × 200)` assigns a grid cell; count measures occupancy, mean coordinates position its marker, min distance belongs to the nearest member pin, and max date reports its latest activity. Grid width varies with latitude and is not a DBSCAN algorithm.

[review-facets.cjs](../members/member4/mongo/review-facets.cjs) places a property/date $match before $facet so the compound index selects scope first. The rating branch counts integer stars. The tag branch unwinds each tag and counts it, so tag counts need not sum to review count. The average/count branch covers all matched reviews, independently of the ten top tags. The API adds missing zero-count star buckets. [Reviews.jsx](../members/member4/web/Reviews.jsx) displays these results and handles empty summary arrays; nested amenities are displayed by their actual keys/arrays.

[MongoDB setup](../members/member4/mongo/01_collections_and_indexes.js) creates missing collections or updates existing validators without deleting documents. [mongo_schema_map.json](mongo_schema_map.json) contains BSON validation models: SearchSessions requires a GeoJSON Point and BSON date; PropertyReviews requires IDs, integer stars, tags and a review date; PropertyAmenities requires a property ID and string arrays while permitting nested amenity groups. The indexes serve spherical search, two-hour expiry, property/date review filtering and one catalog per property. JSON intentionally has no comments: it must remain valid machine-readable input to setup.

The [MongoDB seeder](../members/member4/data_generation/mongo_seeder.py) loads real PostgreSQL IDs, refuses nonempty document targets and streams batches of at most 5,000. Mongo inserts are separate writes; it is not a distributed transaction. A later batch failure can leave earlier batches present. `replenish_sessions.py` appends fresh telemetry with a unique run prefix when TTL expiry leaves an old demo without pins. It does not reset wallets/bookings/reviews/catalogs.

## Shared tooling, configuration and proof

- `scripts/setup.sh` changes to its repository root, exports `.env`, applies SQL in numbered dependency order, installs document validators/indexes, then seeds PostgreSQL before MongoDB. `set -euo pipefail` and psql's `ON_ERROR_STOP` make failures visible. Setup targets a fresh database; it is not a migration/reset operation.
- Root `sql/` files forward through psql's relative `\ir`; root `mongo/` scripts use mongosh `load()` so shell globals remain available. Seeder wrappers use `runpy` with `__main__` to retain existing CLI names. These adapters keep old commands while each member owns one canonical implementation.
- `api/server.js` creates pooled SQL and Mongo clients from environment configuration, bounds connection/query waits, listens on loopback and closes clients after terminating the listener. `scripts/dev.mjs` starts API/Vite children and forwards termination. `vite.config.js` retains the existing root, proxy and production output paths.
- `package.json` maps dev, build, start, test and db:setup to those entry points. Its dependency versions/lockfile are not changed by the readability pass. `.env.example` explains sample connection/listener settings; active `.env` files are excluded from submission. Compose's named volumes persist data; its health probes check real engine readiness.
- `scripts/capture_performance.py` reads the preserved inherited query, compares a separate same-scope query for result equality, and records both human-readable and JSON EXPLAIN output. It then launches `capture_mongo.js`, which captures raw before/after explain shapes under common cutoffs. No helper forces index choices or fabricates timings.
- `scripts/build_reports.py` reads those historical files, formats tables/excerpts and refreshes only README's generated proof suffix. The long Markdown templates remain documentation content, not executable SQL. Historical measurements retain the versions/capture times of the original runs.
- `scripts/package_submission.py` requires honest final metadata/clean Git state outside review mode, excludes runtime/dependency/secret/dump files, includes canonical member SQL, stamps archive-only README metadata and checks the strict size/ZIP integrity conditions.
- `tests/helpers.js` creates one real-engine test server on an available port. Member cases test outcomes through HTTP/database queries. `tests/database_checks.py` rolls back SQL fixtures, uses savepoints for expected errors, checks live indexes/linkage and inspects saved proof. Its telemetry-volume check should run soon after seeding/replenishment because TTL intentionally reduces that count.

## Formatting conventions

JavaScript/React/CSS/JSON/YAML use two spaces; Python/SQL/shell use four spaces. Chained state/data declarations are expanded and complex blocks have comments describing intent, inputs, outputs and failure behavior. `.editorconfig` and `.prettierrc.json` preserve these rules. Python is formatted with Black at an 88-character target; Prettier 3.6.2 formats the web/config sources. Raw performance logs, database data, generated screenshots/video, dependencies and the lockfile are not reformatted.

The source comments are the primary explanation. This guide supplies the cross-file map; it does not replace comments beside the implementation. JSON schema fields are explained here instead of using invalid JSON comments.
