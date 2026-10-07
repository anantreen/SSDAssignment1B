/**
 * Execute Workflow 3 independently of the browser.
 * The sample origin is Hyderabad, with a one-hour cutoff. Nearest pins and
 * full-scope hotspot cells are separate results of the same shared builders.
 * Run from the repository root so the shared module path resolves.
 */

const { nearbyPipeline, hotspotsPipeline } = require(
  process.cwd() + "/mongo/pipelines.cjs",
);
const input = {
  longitude: 78.4867,
  latitude: 17.385,
  since: new Date(Date.now() - 60 * 60 * 1000),
};
printjson({
  nearest: db.SearchSessions.aggregate(nearbyPipeline(input)).toArray(),
  hotspots: db.SearchSessions.aggregate(hotspotsPipeline(input)).toArray(),
});
