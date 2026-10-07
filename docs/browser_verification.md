# Browser verification — 7 October 2026

Verified in Chrome against live PostgreSQL/MongoDB seeded data at http://127.0.0.1:3000, with a phone viewport of 390 × 844 as well as the normal laptop viewport.

| Check | Observed result |
|---|---|
| Browse properties, detail | Paged cards and a detail dialog show database records |
| Insufficient funds | 365-night attempt shows a friendly error; guest balance unchanged |
| Successful booking | One-night checked-in stay debits ₹5,089 and shows its trigger-created audit |
| Second check-in | Friendly active-stay error; previous wallet balance retained |
| Booking status | Newly created booking advances from CHECKED_IN to COMPLETED |
| Actor switching | Guest #2 selected from a paged actor search; name and wallet update |
| Audit trail | Read-only signed changes and actual running balance; date controls and next-page cursor |
| Analytics | 12 dense ranks, tie ranks, seven-day SVG chart, real materialized refresh timestamp |
| Map | OpenStreetMap tiles, 5 km circle, grid hotspots, 100 distance-sorted pins; added pin appears without reload |
| Reviews | 28 matched reviews for property #1; five rating buckets, tags, average and nested amenities |
| Phone layout | Six destinations accessible; stacked sections; document width equals viewport width |

Screenshots are in docs/screenshots/. The captioned demo is assembled from those actual live-browser captures; it is a screen walkthrough rather than a continuous screen recording. API/database test logs supply additional transactional proof. Team members should record their own narrated live demonstration for the final viva/submission if required by their grader.
