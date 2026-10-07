# Member 1 — Browse, Property Details and shared foundations

Figma screens: **00 Foundations & Users**, **01 Browse**, **02 Property Details**.

| Area | Source |
|---|---|
| App layout, navigation and demo actor switching | [web/App.jsx](web/App.jsx) |
| Browse properties, guests and bookings | [web/Browse.jsx](web/Browse.jsx) |
| Property/record detail dialog | [web/PropertyDetails.jsx](web/PropertyDetails.jsx) |
| Shared cards/forms/status/error/paging/dialog behavior | [web/components/](web/components/) |
| Shared data hook | [web/hooks/useData.js](web/hooks/useData.js) |
| API client and formatting/query helpers | [web/lib/](web/lib/) |
| Browsing and detail endpoints | [api/routes.js](api/routes.js) |
| PostgreSQL schema understanding | [sql/01_schema_ddl.sql](sql/01_schema_ddl.sql), [ERD](../../docs/relational_erd.png) |
| Existing browse tests | [tests/workflows.cases.js](tests/workflows.cases.js) |

The existing visual foundations are in [style.css](../../web/src/style.css) and [users_and_style.md](../../docs/design/users_and_style.md). The stylesheet is unchanged. Browse imports the status action from Member 2; all other members import the shared React helpers from this folder.

Run npm run dev, npm run build and npm test from the repository root. See [the complete ownership map](../README.md).

Implementation explanations: [code walkthrough](../../docs/code_walkthrough.md). Source comments document this member's state, handlers, database operations and failure paths.
