/**
 * Keep the existing setup command while Member 4 owns the documented validator/index
 * code.
 * This file delegates inside mongosh; it does not create a second set of collection
 * rules.
 */

// Compatibility entry point: same mongosh command and database behavior.
load("members/member4/mongo/01_collections_and_indexes.js");
