/**
 * Capture genuine MongoDB executionStats for comparable before/after query shapes.
 * Run from the repository root with mongosh connected to the desired database.
 * Baselines retain the same property/date/radius scope but use the older stage order.
 * JSON contains raw engine output and current counts; do not hand-edit measured plans.
 */

const fs = require("node:fs");
const { nearbyPipeline, hotspotsPipeline, reviewPipeline } = require(
  process.cwd() + "/mongo/pipelines.cjs",
);
// Use one common clock so every compared pipeline gets exactly the same cutoff.
const now = new Date();
const since = new Date(now.getTime() - 3600000);
const reviewSince = new Date(now.getTime() - 365 * 86400000);
const input = { longitude: 78.4867, latitude: 17.385, since };
const near = nearbyPipeline(input);
const hotspots = hotspotsPipeline(input);
const review = reviewPipeline({ propertyId: 1, since: reviewSince });
// The legacy comparator sorts the entire nearest scope before retaining 100 pins.
const legacyGeo = [
  near[0],
  near[2],
  { $sort: { distance_meters: 1 } },
  { $limit: 100 },
];
// Same property/date semantics, but placing selection inside each facet makes the
// initial stage read the entire collection. The optimized match moves BEFORE facet.
const legacyReview = [
  {
    $facet: Object.fromEntries(
      Object.entries(review[2].$facet).map(([name, stages]) => [
        name,
        [review[0], ...stages],
      ]),
    ),
  },
];
// Let MongoDB choose plans normally: no hint and no fabricated scan statistics.
const explains = {};
for (const [name, collection, pipeline] of [
  ["workflow_3_before", db.SearchSessions, legacyGeo],
  ["workflow_3_geoNear_stats", db.SearchSessions, near],
  ["workflow_3_hotspots_stats", db.SearchSessions, hotspots],
  ["workflow_4_before", db.PropertyReviews, legacyReview],
  ["workflow_4_facet_stats", db.PropertyReviews, review],
])
  explains[name] = collection.explain("executionStats").aggregate(pipeline);
// Counts document seed scale at capture time; TTL may reduce sessions afterward.
const result = {
  captured_at: now,
  counts: {
    SearchSessions: db.SearchSessions.countDocuments({}),
    PropertyReviews: db.PropertyReviews.countDocuments({}),
    PropertyAmenities: db.PropertyAmenities.countDocuments({}),
  },
  ...explains,
};
// EJSON preserves BSON-specific values inside a valid saved JSON artifact.
fs.writeFileSync(
  "performance/mongo_execution_stats.json",
  EJSON.stringify(result, null, 2),
);
print("MongoDB executionStats captured");
