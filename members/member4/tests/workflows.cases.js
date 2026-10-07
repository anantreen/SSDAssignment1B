/**
 * Member 4 integration regression cases.
 *
 * Each check names the behavior under test and asserts real HTTP/database results.
 * Fixtures come from tests/helpers.js; these cases keep their previous assertions.
 */

import assert from "node:assert/strict";
import { check, request, mongo } from "../../../tests/helpers.js";

// Regression: geoNear stays inside five kilometres; new pins appear in subsequent
// reads.
check(
  "geoNear stays inside five kilometres; new pins appear in subsequent reads",
  async () => {
    const added = await request("/api/search", "POST", {
      latitude: 17.385,
      longitude: 78.4867,
    });
    assert.equal(added.status, 201);
    const r = await request("/api/search?latitude=17.385&longitude=78.4867&minutes=60");
    assert.equal(r.status, 200);
    assert.ok(r.data.nearest.length > 0 && r.data.nearest.length <= 100);
    assert.ok(r.data.nearest.every((x) => x.distance_meters <= 5000));
    assert.ok(r.data.nearest.some((x) => x.session_id === added.data.session_id));
    assert.ok(
      r.data.nearest.every(
        (x, i, a) => i === 0 || x.distance_meters >= a[i - 1].distance_meters,
      ),
    );
    assert.ok(r.data.hotspots.length <= 25);
  },
);
// Regression: facet returns five star buckets matching average counts and a flexible
// catalog.
check(
  "facet returns five star buckets matching average counts and a flexible catalog",
  async () => {
    const r = await request("/api/reviews?property_id=1");
    assert.equal(r.status, 200);
    assert.equal(r.data.ratingDistributions.length, 5);
    assert.equal(
      r.data.ratingDistributions.reduce((s, r) => s + r.count, 0),
      r.data.overallAverage[0].totalReviews,
    );
    assert.ok(r.data.amenities.house_rules.length > 0);
    assert.ok(r.data.frequentTags.length <= 10);
    await assert.rejects(
      mongo.collection("PropertyReviews").insertOne({
        property_id: 1,
        guest_id: 1,
        rating: 3.5,
        location_tags: [],
        timestamp: new Date(),
      }),
      (e) => e.code === 121,
    );
  },
);
