# Assignment 1 — StaySpot database design report

Project 3: Vacation Rental & Experiences. Source https://github.com/git-adityamishra/27_a1, inherited main `774fbd2f33463c3e88352bdb0b7988165c65abcf`. This report describes the corrected implementation; it does not claim ownership of inherited work. Team metadata must be filled before submission.

## Requirement audit

| Requirement | Status and evidence |
|---|---|
| guests, properties, bookings, wallet_audit_logs with PK/FK/CHECK | Implemented in sql/01_schema_ddl.sql; schema tests pass |
| Financial and geographic constraints | NOT NULL, nonnegative wallet, positive prices/costs, action/sign consistency, coordinate ranges |
| Automated wallet trigger | sql/03_triggers_and_audit.sql; all 100,000 seed audit entries originate from wallet updates |
| Immutable audit history | UPDATE/DELETE/TRUNCATE guards; ordinary-DML mutation tests pass |
| One checked-in stay per guest | idx_active_stay partial unique index exactly matches CHECKED_IN; concurrent/conflict rollback checked |
| Atomic booking and graceful rollback | create_booking procedure + caller transaction; price calculated in DB; no invalid COMMIT inside exception block |
| Materialized total nights and gross revenue | Actual nights field and SUM(nights); unique property index and concurrent refresh function |
| Seven-day average with CTE/windows | revenue_analytics; zero-revenue days, six-day warm-up, per-day DENSE_RANK across selected properties |
| PropertyAmenities, PropertyReviews, SearchSessions | All collections have JSON Schema validators; nested flexible catalog included |
| 2dsphere and 2-hour TTL | idx_sessions_geo_recent and expireAfterSeconds=7200; verified against live index definitions |
| 5 km recent search hotspot workflow | Shared $geoNear builders; closest pins plus all-candidate grid clustering |
| Review $facet distribution, tags, average | Indexed property/date match; integer stars; $unwind tags; all scoped reviews contribute |
| ≥50,000 bookings and ≥100,000 audit rows | Seeded and counted in performance/postgres_execution_stats.json |
| ≥500,000 geospatial pings | Seeded and counted in performance/mongo_execution_stats.json; TTL intentionally expires old telemetry |
| ERD and Mongo schema map | docs/relational_erd.png and docs/mongo_schema_map.json reflect corrected code |
| Workflow files and seeders in required folders | sql/, mongo/, data_generation/ retained; extra reusable builders and tests supplied |
| Real EXPLAIN proof, indexes and no heavy scans | Default planner; optimized SQL index paths, GEO_NEAR_2DSPHERE / IXSCAN; raw logs and README excerpts |
| Assumptions and reproducible setup | README plus scripts/setup.sh, Docker DB services and isolated verification |
| ZIP <20 MB, no dumps/dependencies/caches | Packaging script enforces this; review archive is not final submission metadata |
| Team repository URL + exact final commit | Source URL retained; finalize and stamp the user's submission URL/committed HEAD at packaging |
| Team number, roll numbers, contributions | Pending user metadata; source repo name alone is not treated as confirmation |
| Moodle submission and viva | User/team action; not performed or claimed |

## Model and consistency

PostgreSQL owns wallets, properties, booking state and the ledger. MongoDB owns flexible amenities, property-scoped reviews and temporary search sessions. IDs in MongoDB are generated from actual relational IDs; cross-database foreign keys are not automatically enforced by MongoDB. No distributed transaction is needed for the four required workflows because the financial transaction writes only PostgreSQL.

A booking uses current base_price × nights and starts CONFIRMED or CHECKED_IN. A conditional wallet UPDATE acquires a row lock and checks enough funds. Its AFTER UPDATE trigger writes the signed debit; then the booking insert enforces FK/CHECK/partial uniqueness. A raised error aborts the caller's transaction, including any trigger row, so the API does not show a false success. CONFIRMED → CHECKED_IN → COMPLETED demonstrates the index; confirmed reservations are allowed concurrently as specified.

Nights are an explicit integer because counting bookings is not a correct substitute. Gross booked revenue includes all three listed statuses; no cancellation/refund workflow is specified. Seeded historical bookings represent already settled stays before the demo's opening wallet snapshot. The generated wallet ledger itself is consistent with actual updates and final balances, rather than fabricated independent balance_after numbers.

Analytics uses UTC booking-creation calendar days. It pads six prior days so the average always represents seven days, including zeros. Ranks compare properties on each output day; equal raw averages share rank. The default scope is intentionally bounded, with an explicit list of selected properties; a full-history report must still process all requested output rows.

## Optimization and measurements

See [performance_and_complexity.md](performance_and_complexity.md) for separate theoretical bounds, measured scope, index assumptions and raw before/after timings. Same-scope legacy SQL and optimized output were compared for exact equality. No claim treats the smaller bounded result as an equivalent all-history speedup. Global materialized refresh remains a full-data operation.

## Validation

Eight live-engine database checks passed (performance/database_test_results.txt). They verify scale, financial checks, transaction rollback, active-stay uniqueness, ledger immutability, exact nights, live MongoDB indexes/validations, cross-database IDs and optimized plan index paths. Assignment 2 additionally tests twelve API cases against the same corrected backend.

## Remaining submission steps

Confirm the assignment/team mapping; populate team metadata, create the actual team repository/fork, commit and push the final work, package with the prescribed team filename and submit to Moodle. The packaging script refuses to claim an uncommitted code tree is a final commit. Privileged database owners can bypass triggers; a fresh-database teaching demo is not presented as a deployed migration or production identity system.
