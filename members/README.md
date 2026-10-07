# Four-member code organization

This is one StaySpot application. Each member has a source folder containing their UI, API handlers and database work. Start/build/test commands run from the repository root. The split preserves the existing screens, CSS, endpoint URLs, request/response shapes, SQL logic and MongoDB query builders.

| Member | Responsibility | Figma screens (user's mapping) | Folder |
|---|---|---|---|
| **Member 1** | Browse + Property Details + shared React components + PostgreSQL schema understanding | **00 Foundations & Users**, **01 Browse**, **02 Property Details** | [member1](member1/README.md) |
| **Member 2** | Booking + Status Transition + Wallet Audit + stored procedure/index/trigger | **03 Transaction / Book Stay**, **04 Booking Status & Constraint**, **05 Wallet Audit Trail** | [member2](member2/README.md) |
| **Member 3** | Analytics + window functions + Materialized View | **06 Analytics** | [member3](member3/README.md) |
| **Member 4** | Map + Reviews + MongoDB pipelines | **07 Map / Search Hotspots**, **08 Reviews & Amenities** | [member4](member4/README.md) |

```text
members/
├── member1/
│   ├── web/                 App, Browse, PropertyDetails
│   │   ├── components/      Alert, DataState, Heading, HouseArt, Modal, Pager, Picker, Pill
│   │   ├── hooks/           useData
│   │   └── lib/             API client, query parameters, display formatting
│   ├── api/                 Health, guest/property browsing and booking read routes
│   ├── sql/                 PostgreSQL table schema
│   └── tests/               Existing browse/page/detail tests
├── member2/
│   ├── web/                 Transaction, BookingStatusAction, Audit
│   ├── api/                 Booking creation, status transitions, audit routes
│   ├── sql/                 Indexes, wallet trigger, immutable ledger, booking procedure
│   ├── data_generation/     PostgreSQL seeder
│   └── tests/               Existing financial/status/audit tests
├── member3/
│   ├── web/                 Analytics, LineChart
│   ├── api/                 Analytics and materialized refresh routes
│   ├── sql/                 Materialized view and SQL window analytics
│   └── tests/               Existing moving-average and refresh tests
└── member4/
    ├── web/                 MapView, Reviews
    ├── api/                 Search pins, hotspots, reviews/catalog routes
    ├── mongo/               Validators/indexes, geo builders, facet builders, shell workflows
    ├── data_generation/     MongoDB seeder
    └── tests/               Existing geospatial and review tests
```

The stable entry points are web/src/main.jsx, api/app.js and api/server.js. The stylesheet stays in web/src/style.css. API validation/query helpers live in api/shared/. Existing numbered sql/ scripts forward with psql's relative \ir command; mongo/ scripts forward with mongosh load(), and mongo/pipelines.cjs re-exports Member 4's builders. Existing seeder filenames and npm test continue to delegate to the appropriate member code. There is one implementation per feature, rather than four copied applications.

Member 1's Browse renders Member 2's BookingStatusAction, and all screens reuse Member 1's components/helpers. Members 3 and 4 keep their database work beside their screen/route implementations. The folders describe the user's assigned responsibilities; they do not invent names, roll numbers or completed personal contribution claims.

Verification: [member split evidence](../performance/member_split_verification.txt), [API test results](../performance/api_test_results.txt), [build results](../performance/build_results.txt).

Read the [code walkthrough](../docs/code_walkthrough.md) alongside the expanded source comments and function docstrings. The documentation pass preserves the supplied four-member allocation.
