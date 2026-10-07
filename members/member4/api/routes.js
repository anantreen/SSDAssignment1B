/**
 * Member 4 API handlers.
 *
 * GET nearest pins/hotspots, POST a demo search pin and GET review facets/catalog.
 * Pure Member 4 builders are shared with the independent mongosh workflows.
 * Coordinates, age windows and output limits are validated or bounded before
 * aggregation.
 */

import { integer, number, route } from "../../../api/shared/http.js";
import { randomUUID } from "node:crypto";
import pipelines from "../mongo/pipelines.cjs";
const { nearbyPipeline, hotspotsPipeline, reviewPipeline } = pipelines;

/**
 * Register this member's endpoints on the shared Express instance.
 * @param {import("express").Express} app Existing router/listener host.
 * @param {{pool: import("pg").Pool, mongo: import("mongodb").Db}} dependencies
 */
export function registerMember4Routes(app, { pool, mongo }) {
  app.get(
    "/api/search",
    route(async (req, res) => {
      const longitude = number(req.query.longitude, "Longitude", -180, 180);
      const latitude = number(req.query.latitude, "Latitude", -90, 90);
      const minutes = integer(req.query.minutes ?? 60, "Recent minutes", 1, 120);
      // Convert the requested age into an absolute cutoff; TTL deletion alone is
      // asynchronous.
      const input = {
        longitude,
        latitude,
        since: new Date(Date.now() - minutes * 60000),
      };
      // The nearest list is bounded; hotspot aggregation considers all qualifying
      // recent local pins.
      // maxTimeMS bounds database execution, not a guaranteed total HTTP latency.
      const [nearest, hotspots] = await Promise.all([
        mongo
          .collection("SearchSessions")
          .aggregate(nearbyPipeline(input), { maxTimeMS: 10000 })
          .toArray(),
        mongo
          .collection("SearchSessions")
          .aggregate(hotspotsPipeline(input), { maxTimeMS: 10000 })
          .toArray(),
      ]);
      res.json({
        nearest,
        hotspots,
        origin: { longitude, latitude },
        radius: 5000,
        checked_at: new Date().toISOString(),
      });
    }),
  );
  app.post(
    "/api/search",
    route(async (req, res) => {
      const longitude = number(req.body?.longitude, "Longitude", -180, 180);
      const latitude = number(req.body?.latitude, "Latitude", -90, 90);
      // Insert GeoJSON [longitude, latitude] and a real Date required by the TTL index.
      const doc = {
        session_id: randomUUID(),
        user_device: "Web",
        location: { type: "Point", coordinates: [longitude, latitude] },
        created_at: new Date(),
      };
      const result = await mongo.collection("SearchSessions").insertOne(doc);
      res.status(201).json({ ...doc, _id: result.insertedId });
    }),
  );
  app.get(
    "/api/reviews",
    route(async (req, res) => {
      const propertyId = integer(req.query.property_id, "Property");
      // Query the review analytics and flexible catalog independently for the same
      // property ID.
      const [facets, amenities] = await Promise.all([
        mongo
          .collection("PropertyReviews")
          .aggregate(
            reviewPipeline({
              propertyId,
              since: new Date(Date.now() - 365 * 86400000),
            }),
            { maxTimeMS: 10000 },
          )
          .toArray(),
        mongo.collection("PropertyAmenities").findOne({ property_id: propertyId }),
      ]);
      const facet = facets[0] ?? {
        ratingDistributions: [],
        frequentTags: [],
        overallAverage: [],
      };
      // Return all five star buckets, even if an empty/missing group was not emitted by
      // $facet.
      facet.ratingDistributions = [1, 2, 3, 4, 5].map((r) => ({
        _id: r,
        count: facet.ratingDistributions.find((x) => x._id === r)?.count ?? 0,
      }));
      res.json({ ...facet, amenities, property_id: propertyId });
    }),
  );
}
