# Member 2 — Booking, status and wallet audit

Figma screens: **03 Transaction / Book Stay**, **04 Booking Status & Constraint**, **05 Wallet Audit Trail**.

| Area | Source |
|---|---|
| Booking form and wallet before/after | [web/Transaction.jsx](web/Transaction.jsx) |
| Check in / Complete stay action rendered inside Browse | [web/BookingStatusAction.jsx](web/BookingStatusAction.jsx) |
| Read-only wallet ledger and date filters | [web/Audit.jsx](web/Audit.jsx) |
| Booking POST, status PATCH and audit GET routes | [api/routes.js](api/routes.js) |
| Partial/secondary indexes | [sql/02_indexes.sql](sql/02_indexes.sql) |
| Audit trigger and immutable ledger | [sql/03_triggers_and_audit.sql](sql/03_triggers_and_audit.sql) |
| Atomic booking procedure | [sql/04_stored_procedures.sql](sql/04_stored_procedures.sql) |
| PostgreSQL data generation | [data_generation/postgres_seeder.py](data_generation/postgres_seeder.py) |
| Existing transaction/status/audit tests | [tests/workflows.cases.js](tests/workflows.cases.js) |

Procedure inputs, row locks, debit/trigger behavior, rollback, status progression and error messages are unchanged. Shared UI and HTTP validation helpers are imported instead of copied.

Run the existing root commands. The old sql/ and data_generation/ filenames remain executable compatibility entry points. See [the complete ownership map](../README.md).

Implementation explanations: [code walkthrough](../../docs/code_walkthrough.md). Source comments document this member's state, handlers, database operations and failure paths.
