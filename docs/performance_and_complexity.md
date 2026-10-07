# Performance and time complexity report

Measured at 2026-10-07T07:57:02.767095+00:00. PostgreSQL 16 and MongoDB 8 on this machine; seeded data and raw plans are included as scripts/logs, never database dumps. These are observations, not latency guarantees. Planner defaults were left unchanged. Cold/warm cache differences and selective spatial bounds affect timing.

## PostgreSQL measurements

| Query | Execution time (ms) | Result rows | Meaning |
|---|---:|---:|---|
| Original all-history workflow | 1135.021 | 732,000 | Every property × all historical calendar days |
| Original join shape, same bounded scope | 0.943 | 150 | 5 properties, 30 output days + 6 warm-up days |
| Optimized workflow 2, same scope | 0.323 | 150 | Index timestamp bounds + pre-aggregation |
| Materialized property lookup | 0.004 | 1 | Unique property index |
| One guest audit page | 0.009 | 21 | Guest/time index and a bounded page |

Same-scope query results were checked for exact equality. The all-history and bounded queries have different output sizes and are **not** a fair speedup ratio. The old all-history dense rank was also per property across days; the corrected rank compares properties on the same day. The comparable baseline uses corrected rank semantics and UTC dates.

## MongoDB measurements

| Query (same selection semantics) | Before ms | After ms | Documents examined before → after |
|---|---:|---:|---|
| Nearest 100 recent search pins | 538 | 6 | 2,535 → 1,146 |
| Property 1 review facets | 259 | 0 | 50,000 → 28 |

The before geospatial pipeline redundantly sorts distance before its limit. The new nearest-pins pipeline relies on $geoNear ordering and limits before projection. The clustering pipeline separately considers all matching recent pins inside 5 km; it does not pretend that a 100-pin sample represents all hotspots. It groups approximately 0.5 km cells (angular grid, not DBSCAN), returns the top 25, and uses an indexed geo/time query.

The before review comparator puts the identical property/date match inside each facet branch, making the initial $facet read the collection. The new pipeline puts that match before $facet, so idx_reviews_property_time retrieves only the selected property's recent reviews. Counts and average still cover every review in that selected scope. The inherited repository's original pipeline was unscoped across all properties; the UI explicitly chooses a property.

MongoDB times are rounded to integer milliseconds: a reported 0 ms means below timer resolution, **not zero cost**. Cursor time may not include all later aggregation work; complete stage statistics are in mongo_execution_stats.json.

## Complexity analysis

Let B be all bookings, P all properties, D historical days, C selected properties, W requested days plus six warm-up days, b matching bookings, N search sessions, K spatial candidates examined, R reviews, r matching reviews, t mean tags per review, T distinct tags, and L the page size. Index storage is separate from working memory.

| Operation | Time cost | Working space | Why |
|---|---|---|---|
| Original all-history SQL | O(B log B + PD log(PD)) in a sort-based plan | O(B + PD) before spill | Expands every property/day; transforms dates and sorts history |
| Optimized SQL window report | O(C log B + b log b + CW log(CW)) conservative sort bound | O(b + CW) before spill | Index bounds restrict bookings; aggregate before joining the bounded calendar; windows linear after sorting |
| Same-scope legacy date join | O(C log B + B_C + CW log(CW)) for indexed property probes | O(B_C + CW) | B_C is all-history bookings of the selected properties; DATE transformation prevents timestamp range pruning |
| Atomic booking | O(log P + log G + log B + log A) index operations plus lock wait | O(1) row state | Server-priced debit, FK/index checks and audit insert; contention is not a Big-O guarantee |
| Materialized lookup | O(log P) | O(1) | Unique index; full refresh still reads O(B + P) and may sort, and is not a constant-time operation |
| Keyset page | O(log N + L) without text/filter overhead | O(L) | Seek from cursor, fetch limit+1; deep OFFSET and repeated total counts are avoided |
| Guest audit page | O(log A + L) | O(L) | Composite timestamp/id cursor; saved balances avoid rescanning older ledger rows |
| Nearest pins | Spatial-index typical O(log N + K), worst case O(N) | Candidate buffer is engine-dependent; output O(100) | A 2dsphere index is not a guaranteed logarithmic worst-case tree; LIMIT does not bound keys examined to 100 |
| Hotspot cells | Spatial lookup + O(K + H log H) conservative bound | O(H) groups plus engine buffers | H occupied cells; top-k sorting may reduce sorting cost |
| Indexed review facets | O(log R + r + rt + T log T) conservative sort bound | O(T) groups plus facet buffers | Index match is selective; processing qualifying reviews/tags is inherently linear |
| Batched seed generation | O(number of generated records), plus database index maintenance | O(batch size + guest/property IDs) | COPY for SQL, bulk inserts for Mongo; audits come from real updates |

Text search can still inspect many records when a very short/common search matches broadly. Keyset bounds limit output, not every possible query's scan work. TTL expiration is asynchronous; the geospatial time predicate enforces recency even before the TTL monitor deletes documents. Mongo $facet has a 100 MB stage limit and cannot use allowDiskUse to bypass that limit.

## Reproduction

From the repository root with DATABASE_URL, MONGO_URL and MONGO_DB exported:

```bash
python scripts/capture_performance.py
python tests/database_checks.py
```

Raw SQL text plans: [postgres_explain_analyzes.txt](../performance/postgres_explain_analyzes.txt). Raw SQL JSON: [postgres_execution_stats.json](../performance/postgres_execution_stats.json). Raw MongoDB explains: [mongo_execution_stats.json](../performance/mongo_execution_stats.json).

## Primary references

- [PostgreSQL transaction management](https://www.postgresql.org/docs/16/plpgsql-transactions.html): the caller owns transaction boundaries; exception blocks cannot terminate transactions.
- [PostgreSQL concurrent materialized refresh](https://www.postgresql.org/docs/16/sql-refreshmaterializedview.html): a populated view and a unique index are required.
- [MongoDB $geoNear](https://www.mongodb.com/docs/v8.0/reference/operator/aggregation/geonear/): first stage, geospatial index and distance ordering.
- [MongoDB $facet](https://www.mongodb.com/docs/v8.0/reference/operator/aggregation/facet/): early indexed filtering, stage memory limits.
