/**
 * Pure Workflow 3 builders: create aggregation stages without opening a connection.
 * The API and mongosh scripts execute these same stage documents against
 * SearchSessions.
 * Inputs use GeoJSON [longitude, latitude], an absolute Date cutoff and bounded
 * outputs.
 */

/**
 * Return the closest recent search pins inside five kilometres.
 * $geoNear must be first and uses the collection's 2dsphere index.
 * Its native distance order removes the need for a second sorting pass.
 * The output limit does not promise that the engine examines only that many keys.
 */
function nearbyPipeline({ longitude, latitude, since, limit = 100 }) {
  return [
    {
      $geoNear: {
        near: { type: "Point", coordinates: [longitude, latitude] },
        key: "location",
        distanceField: "distance_meters",
        maxDistance: 5000,
        spherical: true,
        // TTL runs asynchronously; this predicate independently enforces recency.
        query: { created_at: { $gte: since } },
      },
    },
    // Bound the returned list before transforming its fields.
    { $limit: limit },
    { $project: { location: 1, created_at: 1, session_id: 1, distance_meters: 1 } },
  ];
}

/**
 * Group ALL matching local pins into angular grid cells, then show the top cells.
 * Unlike nearbyPipeline, this has no early 100-pin limit: clusters use the full scope.
 * A 1/200 degree cell is roughly half a kilometre near the seeded Indian cities;
 * its longitude width varies with latitude. This is grid grouping, not DBSCAN.
 */
function hotspotsPipeline({ longitude, latitude, since, limit = 25 }) {
  return [
    {
      $geoNear: {
        near: { type: "Point", coordinates: [longitude, latitude] },
        key: "location",
        distanceField: "distance_meters",
        maxDistance: 5000,
        spherical: true,
        query: { created_at: { $gte: since } },
      },
    },
    {
      $group: {
        // floor(coordinate * 200) assigns neighboring pins a stable cell ID.
        _id: {
          lon: {
            $floor: {
              $multiply: [{ $arrayElemAt: ["$location.coordinates", 0] }, 200],
            },
          },
          lat: {
            $floor: {
              $multiply: [{ $arrayElemAt: ["$location.coordinates", 1] }, 200],
            },
          },
        },
        count: { $sum: 1 },
        // Mean coordinates locate the cell's plotted marker among its actual pins.
        longitude: { $avg: { $arrayElemAt: ["$location.coordinates", 0] } },
        latitude: { $avg: { $arrayElemAt: ["$location.coordinates", 1] } },
        // This is the nearest MEMBER's distance, not the distance to the centroid.
        distance_meters: { $min: "$distance_meters" },
        latest: { $max: "$created_at" },
      },
    },
    // Cell coordinates break equal-count ties before the bounded output is returned.
    { $sort: { count: -1, "_id.lon": 1, "_id.lat": 1 } },
    { $limit: limit },
  ];
}

module.exports = { nearbyPipeline, hotspotsPipeline };
