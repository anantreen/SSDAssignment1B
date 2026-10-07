/**
 * CommonJS export adapter: retain existing import paths and builder names.
 * Canonical geospatial/facet implementations are documented beside Member 4.
 * Re-exporting functions avoids separate API and shell-query implementations.
 */

// Shared exports keep the API and independent mongosh workflows on identical builders.
const { nearbyPipeline, hotspotsPipeline } = require("./geospatial.cjs");
const { reviewPipeline } = require("./review-facets.cjs");
module.exports = { nearbyPipeline, hotspotsPipeline, reviewPipeline };
