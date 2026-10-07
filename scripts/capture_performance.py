"""Capture real PostgreSQL plans and launch the corresponding MongoDB explain capture.

Both text and JSON plans are retained: text is readable and JSON supplies metrics.
Original all-history output and bounded output have different scopes. A separate
same-scope legacy shape is compared for exact results before timing is reported.
EXPLAIN ANALYZE actually executes each read query; index choices are not forced.
"""

import json
import os
import subprocess
from pathlib import Path
from datetime import datetime, timezone
import psycopg

# Resolve paths from this script so output always belongs to the same repository.
root = Path(__file__).resolve().parents[1]
out = root / "performance"
out.mkdir(exist_ok=True)
# Read the inherited query from the preserved Git commit, not an edited current file.
original = subprocess.check_output(
    [
        "git",
        "show",
        "774fbd2f33463c3e88352bdb0b7988165c65abcf:sql/06_window_analytics.sql",
    ],
    cwd=root,
    text=True,
)
baseline = "\n".join(
    line.rstrip()
    for line in original[original.index("WITH DateRange AS") :].splitlines()
)
# Control the comparison: same IDs, date range, zero-filled days and daily rank
# semantics.
# Only the legacy join shape differs from the optimized installed SQL function.
comparable = """
             WITH dates AS
                 (SELECT generate_series(((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date-35)::timestamp, ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date)::timestamp,interval '1 day')::date AS DAY),
                  calendar AS
                 (SELECT p.id,
                         d.day
                  FROM properties p
                  CROSS JOIN dates d
                  WHERE p.id=ANY(ARRAY[1, 2, 3, 4, 5])),
                  daily AS
                 (SELECT c.id,
                         c.day,
                         COALESCE(SUM(b.total_cost), 0) AS revenue
                  FROM calendar c
                  LEFT JOIN bookings b ON b.property_id=c.id
                  AND (b.created_at AT TIME ZONE 'UTC')::date=c.day
                  GROUP BY c.id,
                           c.day),
                  moving AS
                 (SELECT id,
                         DAY,
                         revenue,
                         AVG(revenue) OVER(PARTITION BY id
                                           ORDER BY DAY ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS avg7
                  FROM daily)
             SELECT id,
                    DAY,
                    revenue,
                    ROUND(avg7, 2),
                    DENSE_RANK() OVER(PARTITION BY DAY
                                      ORDER BY avg7 DESC)
             FROM moving
             WHERE DAY >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date-29
             ORDER BY DAY,
                      id
             """
# Keep workload names stable because build_reports.py reads these JSON dictionary keys.
queries = {
    "legacy_all_history": baseline,
    "legacy_same_scope": comparable,
    "optimized_workflow_2": """
            SELECT *
            FROM revenue_analytics((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date-29, (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date, ARRAY[1, 2, 3, 4, 5])
            """,
    "property_summary": "SELECT * FROM mv_property_summary WHERE property_id=1",
    "audit_page": "SELECT * FROM wallet_audit_logs WHERE guest_id=1 ORDER BY timestamp,id LIMIT 21",
}
summary = {"captured_at": datetime.now(timezone.utc).isoformat(), "postgres": {}}
# A standalone autocommit connection avoids leaving a long transaction open during
# profiling.
with psycopg.connect(os.environ["DATABASE_URL"], autocommit=True) as conn:
    # Check same-scope results, not only timing.
    old = conn.execute(comparable).fetchall()
    new = conn.execute(queries["optimized_workflow_2"]).fetchall()
    assert old == new, "Legacy and optimized same-scope results differ"
    summary["same_scope_results_equal"] = True
    version = conn.execute("SELECT version()").fetchone()[0]
    summary["postgres_version"] = version
    lines = [version, "Planner defaults unchanged; no enable_seqscan override."]
    for name, sql in queries.items():
        # Capture human-readable planner/actual/buffer detail and a second
        # JSON-formatted execution.
        # The two timings can differ because they are separate runs with changing cache
        # state.
        textplan = "\n".join(
            row[0] for row in conn.execute("EXPLAIN (ANALYZE, BUFFERS, VERBOSE) " + sql)
        )
        plan = conn.execute(
            "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + sql
        ).fetchone()[0][0]
        summary["postgres"][name] = {
            "execution_ms": plan["Execution Time"],
            "rows": plan["Plan"]["Actual Rows"],
            "plan": plan,
        }
        lines += ["\n" + name, sql, textplan]
    # The table names are fixed local constants; capture actual seeded relational row
    # counts.
    for table in ["guests", "properties", "bookings", "wallet_audit_logs"]:
        summary.setdefault("counts", {})[table] = conn.execute(
            "SELECT count(*) FROM " + table
        ).fetchone()[0]
    (out / "postgres_explain_analyzes.txt").write_text("\n".join(lines) + "\n")
(out / "postgres_execution_stats.json").write_text(json.dumps(summary, indent=2) + "\n")
# Pass arguments as a list, propagate mongosh failures, and retain its independent raw
# explains.
subprocess.run(
    [
        "mongosh",
        os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        + "/"
        + os.environ.get("MONGO_DB", "stayspot"),
        "--quiet",
        "-f",
        "scripts/capture_mongo.js",
    ],
    cwd=root,
    check=True,
)
print("Saved real SQL and MongoDB before/after reports in performance/")
