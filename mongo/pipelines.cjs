/**
 * CommonJS export adapter: retain existing import paths and builder names.
 * Canonical geospatial/facet implementations are documented beside Member 4.
 * Re-exporting functions avoids separate API and shell-query implementations.
 */

// Compatibility entry point; canonical implementations belong to Member 4.
module.exports = require("../members/member4/mongo/pipelines.cjs");
