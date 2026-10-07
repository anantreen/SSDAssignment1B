/**
 * Stable mongosh entry point for the documented Member 4 implementation.
 * load() executes in mongosh context, retaining its db/printjson globals.
 */
// Compatibility entry point: same mongosh command and database behavior.
load("members/member4/mongo/02_workflow3_geonear.js");
