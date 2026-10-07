# Member 4 — Map, reviews and MongoDB

Figma screens: **07 Map / Search Hotspots**, **08 Reviews & Amenities**.

| Area | Source |
|---|---|
| Interactive search map and polling | [web/MapView.jsx](web/MapView.jsx) |
| Review charts and flexible amenities | [web/Reviews.jsx](web/Reviews.jsx) |
| Search GET/POST and reviews GET routes | [api/routes.js](api/routes.js) |
| $geoNear nearest pins and hotspot cells | [mongo/geospatial.cjs](mongo/geospatial.cjs) |
| Indexed $facet review analytics | [mongo/review-facets.cjs](mongo/review-facets.cjs) |
| Shared builder exports | [mongo/pipelines.cjs](mongo/pipelines.cjs) |
| Collection validators, 2dsphere/TTL/review indexes | [mongo/01_collections_and_indexes.js](mongo/01_collections_and_indexes.js) |
| Independent shell workflows | [mongo/02_workflow3_geonear.js](mongo/02_workflow3_geonear.js), [mongo/03_workflow4_facet.js](mongo/03_workflow4_facet.js) |
| MongoDB data generation | [data_generation/mongo_seeder.py](data_generation/mongo_seeder.py) |
| Existing geo/review tests | [tests/workflows.cases.js](tests/workflows.cases.js) |

The 5 km radius, explicit recency, nearest-pin limit/order, grid aggregation, polling, review facets and catalog presentation are unchanged. Splitting the pure builders preserves their exact generated query documents. The API and legacy mongo/ workflow entry points reuse these builders.

Run npm commands and mongosh scripts from the repository root, as before. See [the complete ownership map](../README.md).

Implementation explanations: [code walkthrough](../../docs/code_walkthrough.md). Source comments document this member's state, handlers, database operations and failure paths.
