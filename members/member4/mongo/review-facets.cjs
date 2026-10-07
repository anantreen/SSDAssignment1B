/**
 * Pure Workflow 4 builder for one property's review analytics.
 * The matching stage is intentionally before $facet so property/time indexes
 * can select the scope before any rating/tag/average branch processes records.
 */

/**
 * Produce rating counts, up to ten tag counts, and the average of all matched reviews.
 * propertyId must be an existing positive integer; since must be a Date supplied
 * by the caller. API validation and collection validators enforce those inputs.
 */
function reviewPipeline({ propertyId, since }) {
  return [
    { $match: { property_id: propertyId, timestamp: { $gte: since } } },
    // Facet branches need only ratings and tags, so avoid carrying review text.
    { $project: { _id: 0, rating: 1, location_tags: 1 } },
    {
      $facet: {
        // Integer-star validation guarantees at most five groups. Empty
        // stars are filled by the API, since $group emits only present values.
        ratingDistributions: [
          { $group: { _id: "$rating", count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ],
        // $unwind creates one row for each tag. A review with three tags
        // contributes once to each tag; tag totals need not equal review count.
        frequentTags: [
          { $unwind: "$location_tags" },
          { $group: { _id: "$location_tags", count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 10 },
        ],
        // The average covers this entire selected scope, not just top tags.
        // An empty scope yields no summary row; the UI handles that case.
        overallAverage: [
          {
            $group: {
              _id: null,
              averageRating: { $avg: "$rating" },
              totalReviews: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              averageRating: { $round: ["$averageRating", 2] },
              totalReviews: 1,
            },
          },
        ],
      },
    },
  ];
}

module.exports = { reviewPipeline };
