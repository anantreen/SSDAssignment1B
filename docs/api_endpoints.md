# API sketch (before UI implementation)

JSON responses. Demo actors are selected explicitly; real login is outside the brief. IDs and amounts are validated server-side; values use query parameters, never SQL interpolation. Errors return `{error, code}`. Lists use `limit` (1–50), opaque `after` cursors and `{items,next}`; no total-count query per page.

| Method and path | Input | Output / database workflow |
|---|---|---|
| GET /api/health | — | PostgreSQL and MongoDB connectivity |
| GET /api/guests | search, after, limit | Guest page with wallet balances |
| GET /api/guests/:id | guest ID | Guest detail |
| GET /api/properties | search, after, limit | Property page |
| GET /api/properties/:id | property ID | Property detail |
| GET /api/bookings | guest_id, status, search (numeric booking ID), after, limit | Booking page joined with guest/property names |
| GET /api/bookings/:id | booking ID | Booking detail |
| POST /api/bookings | guest_id, property_id, nights, status | BEGIN → CALL create_booking → COMMIT; before/after wallet, new booking and trigger audit |
| PATCH /api/bookings/:id/status | status | CONFIRMED → CHECKED_IN → COMPLETED; unique-index conflicts return 409 |
| GET /api/audit | guest_id, from, to, after, limit | Read-only chronological ledger with opening/running balances |
| GET /api/analytics | from, to (≤90 days), optional property_id | revenue_analytics SQL function, dense ranks across displayed properties, materialized-view summary and refresh timestamp |
| POST /api/analytics/refresh | — | refresh_property_summary(), concurrent refresh and actual timestamp |
| GET /api/search | latitude, longitude, minutes (1–120) | $geoNear nearest pins (100) and grid clusters (25), strict 5 km radius |
| POST /api/search | latitude, longitude | New search session; appears on next poll |
| GET /api/reviews | property_id | Shared $facet pipeline (past year), five rating buckets, top tags, average and flexible PropertyAmenities document |

Booking totals are base_price × nights calculated inside PostgreSQL. Errors distinguish insufficient funds, unknown records, invalid inputs and a second active check-in. Analytics includes six warm-up days and UTC calendar dates. Actor switching uses paged search rather than loading every guest.
