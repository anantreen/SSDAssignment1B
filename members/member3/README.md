# Member 3 — Analytics, windows and materialized summaries

Figma screen: **06 Analytics**.

| Area | Source |
|---|---|
| Analytics screen, totals, date controls and ranked table | [web/Analytics.jsx](web/Analytics.jsx) |
| Seven-day revenue SVG chart | [web/LineChart.jsx](web/LineChart.jsx) |
| Analytics GET and refresh POST routes | [api/routes.js](api/routes.js) |
| Materialized property summary and concurrent refresh | [sql/05_materialized_views.sql](sql/05_materialized_views.sql) |
| CTEs, seven-day windows and DENSE_RANK | [sql/06_window_analytics.sql](sql/06_window_analytics.sql) |
| Existing moving-average and refresh tests | [tests/workflows.cases.js](tests/workflows.cases.js) |

The UTC calendar, six-day warm-up, selected-property cohort, ranks, chart markup and real refresh timestamp are unchanged. SQL source is byte-identical to the version before the split. See [performance and complexity](../../docs/performance_and_complexity.md).

Run the existing root commands. Root sql/ entry points still work in their original setup order. See [the complete ownership map](../README.md).

Implementation explanations: [code walkthrough](../../docs/code_walkthrough.md). Source comments document this member's state, handlers, database operations and failure paths.
