/**
 * Install the three document validators and query indexes before seeding MongoDB.
 * Run with mongosh from the repository root: the schema map is a repository file.
 * The `db` and `print` bindings are supplied by mongosh, not an Express request.
 */

// Validation is shared with the schema map. Apply to an empty database.
const fs = require("node:fs");
const path = require("node:path");
// JSON keeps the BSON schema machine-readable; field rationale is in
// docs/code_walkthrough.md.
const schema = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "docs/mongo_schema_map.json"), "utf8"),
);
// Existing collections get updated validation rules; absent collections are created.
// This does not delete documents. Strict rules reject invalid future writes.
for (const [name, spec] of Object.entries(schema)) {
  if (db.getCollectionNames().includes(name)) {
    db.runCommand({
      collMod: name,
      validator: { $jsonSchema: spec.validator },
      validationLevel: "strict",
    });
  } else db.createCollection(name, { validator: { $jsonSchema: spec.validator } });
}
// Use spherical coordinates plus recency metadata for the geospatial workflows.
db.SearchSessions.createIndex(
  { location: "2dsphere", created_at: -1 },
  { name: "idx_sessions_geo_recent" },
);
// Expiration is two hours after created_at and happens asynchronously in MongoDB.
db.SearchSessions.createIndex(
  { created_at: 1 },
  { expireAfterSeconds: 7200, name: "idx_sessions_ttl" },
);
// Select one property and its date range before $facet to avoid a full collection read.
db.PropertyReviews.createIndex(
  { property_id: 1, timestamp: -1 },
  { name: "idx_reviews_property_time" },
);
// One flexible amenities catalog per property; SQL owns the actual property record.
db.PropertyAmenities.createIndex(
  { property_id: 1 },
  { unique: true, name: "idx_amenities_property" },
);
print("StaySpot MongoDB validators and indexes installed");
