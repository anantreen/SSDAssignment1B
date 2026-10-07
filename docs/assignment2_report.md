# Assignment 2 — StaySpot front-end design report

The folder is named **StaySpot2**; the product is branded **StaySpot**. Inherited commit history remains intact. The backend is a standalone copy of the corrected Assignment 1 implementation, with the same SQL function and shared MongoDB pipeline builders used by the API.

## Requirement audit

| Requirement | Status and evidence |
|---|---|
| Understand and run inherited system | Specific handover_note.md distinguishes working foundations from inherited failures; seeded corrected backend runs |
| Preserve Assignment 1 Git history | Local Git copy retains original history and origin source attribution; create/publish the team's actual GitHub fork separately |
| Document every backend change | Handover note and Assignment 1 report enumerate schema, workflow, indexing, seeding, validation and proof corrections |
| API sketch before UI code | docs/api_endpoints.md created before screens; inputs/outputs and workflow mapping retained |
| Users and goals | Guest and property-manager/analyst journeys in docs/design/users_and_style.md |
| Wireframes before implementation | Six SVG wireframes in docs/design/, one per required screen |
| Consistent visual design | Forest green, paper, terracotta; shared cards/buttons/forms/tables/dialogs; native fonts |
| Browse all three entities | Properties, guests and bookings; bounded cursor pages, search/status filters and per-record detail dialogs |
| No all-record browser load | Server fetches limit+1, max 50; properties page 8, tables 20; actor/property selectors paged |
| Transaction workflow | PostgreSQL CALL create_booking within BEGIN/COMMIT; before/after wallet and trigger audit displayed |
| Friendly transaction failures | Insufficient balance and second active stay shown in browser and API tests; failing writes roll back |
| Read-only audit, date filter, running balance | Chronological timestamp/id cursor; opening and running balances preserve stored ledger snapshots |
| Seven-day chart and ranked table | Same Part A revenue_analytics function; top 12 cohort table, top four chart, real DENSE_RANK ties |
| Materialized summaries and refresh | Actual nights/revenue/bookings totals, last-completed refresh timestamp, concurrent refresh button |
| Map with selectable origin and 5 km radius | Leaflet map click or latitude/longitude form; geo query radius enforced by MongoDB |
| Nearest results and live changes | 100 pins sorted by distance, 25 grid hotspots; 15-second polling and add-pin action |
| Review charts from $facet | Indexed property-scoped rating distribution, tag frequencies and overall property average |
| Flexible catalog readable | Nested amenities groups, house rules and accessibility shown as readable sections |
| Loading/empty/error states | Shared resource state and retry UI; empty results explain filters; friendly API errors |
| Responsive laptop/phone | Normal laptop viewport and 390 × 844 phone checks; all six nav destinations visible, no page overflow |
| Simple actor switching | Paged guest search in header dialog updates actor name, wallet and actor-specific views |
| Booking status progression | CONFIRMED → CHECKED_IN → COMPLETED; UI and tests demonstrate uniqueness-slot release |
| Thoughtful tests | Twelve API integration cases and eight real-engine database checks pass; failure/concurrency/window/date behavior covered |
| Reproducible setup | README, npm lockfile, env example, setup script, Docker services; local verification .env ignored |
| Short demo and screenshots | Captioned live-browser screen walkthrough and recorded screenshots; demo method disclosed |
| Tech choices and assumptions | README and design document explain React/Vite, Express, PostgreSQL/MongoDB, Leaflet, inline SVG |
| Contribution table and final team metadata | Editable template provided; actual members/roll numbers/contributions pending |
| GitHub fork URL and final commit | Pending user's team repository/fork; final packaging stamps a real committed HEAD |
| Prescribed ZIP filename, strict <20 MB, exclusions | Final packaging requires team number, cleans dependency/cache/build/dump files and checks size; review ZIP supplied separately |
| Moodle submission and viva | Pending team action; not claimed |

## Application architecture

React enters through web/src/main.jsx; feature screens and reusable UI are grouped under members/member1 through members/member4. Express enters through api/app.js, which registers the four members’ unchanged route handlers; api/server.js manages database connections and serves the production Vite build. The browser never holds database credentials. PostgreSQL owns financial integrity and analytics; MongoDB runs the exact shared $geoNear/$facet builders imported by the original JS workflow scripts.

API code validates IDs, nights, date periods, pagination and coordinates; SQL values are parameterized. Booking costs supplied by clients cannot override the database price. A per-guest lock makes before/after wallet reporting consistent; row updates serialize competing deductions. Error codes become short messages instead of internal SQL stack traces. Local-demo identity switching is intentionally not authentication.

## Front-end quality and complexity

Lists use keyset cursors rather than increasingly expensive OFFSET values. Filters reset page history; limit+1 identifies another page without COUNT(*) on every request. Selected actor/catalog pages are also bounded. Audit cursors retain microsecond timestamps and an ID tie-breaker so neighboring rows do not repeat. PostgreSQL DATE values remain calendar strings, preventing timezone shifts in the chart and latest-day rank selection.

Default analytics outputs at most 12 × 90 day rows, plus 12 summary rows, and the chart draws only four series. Map output is at most 100 pins and 25 clusters; processing nearby candidates is still performed in MongoDB. Reviews process all matching reviews for the selected property/date scope, not a statistical sample. UI render time is O(page rows) for browsing, O(CW) for analytics, O(100+25) output markers for the map, and O(5+10+catalog fields) for review presentation. Database work is analyzed separately in [performance_and_complexity.md](performance_and_complexity.md).

## Evidence and limits

See performance/api_test_results.txt, performance/database_test_results.txt, performance/build_results.txt, raw explain files and docs/browser_verification.md. Tests append a handful of dedicated demo guests/bookings and fresh pins; PostgreSQL window fixtures roll back. The initial seed independently meets all count thresholds. Counts in later snapshots may exceed those thresholds.

The demo walkthrough is generated from actual browser captures of the tested live app, with captions; it is not mislabeled as a continuous recording. OpenStreetMap tiles require internet, while query results come from local MongoDB. TTL intentionally expires telemetry; replenish_sessions.py appends fresh sessions without resetting financial records. Setup targets empty databases and does not silently overwrite an inherited running instance. The user/team still must fill metadata, publish the fork, commit the final version, choose the exact Moodle filename, and complete their viva.

## Four-member source split

The follow-up organization moves existing UI functions, route registrations, SQL/MongoDB scripts, seeders and test cases into four source folders matching the user's responsibility and Figma-screen table. Root entry points remain compatible. Shared CSS and SQL content are unchanged; generated pipeline documents and before/after rendered HTML/API responses are compared directly. See [the ownership map](../members/README.md) and [verification evidence](../performance/member_split_verification.txt).
