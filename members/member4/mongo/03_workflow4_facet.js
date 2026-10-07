/**
 * Execute Workflow 4 independently of the browser.
 * Select property 1 and its last-year reviews. The builder runs one indexed
 * matching stage followed by the three analytics branches of $facet.
 * Run from the repository root so the shared module path resolves.
 */

const { reviewPipeline } = require(process.cwd() + "/mongo/pipelines.cjs");
const input = {
  propertyId: 1,
  since: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
};
printjson(db.PropertyReviews.aggregate(reviewPipeline(input)).toArray());
