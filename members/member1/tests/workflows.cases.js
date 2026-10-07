/**
 * Member 1 integration regression cases.
 *
 * Each check names the behavior under test and asserts real HTTP/database results.
 * Fixtures come from tests/helpers.js; these cases keep their previous assertions.
 */

import assert from "node:assert/strict";
import { check, request } from "../../../tests/helpers.js";

// Regression: keyset browsing returns bounded non-overlapping pages and detail records.
check(
  "keyset browsing returns bounded non-overlapping pages and detail records",
  async () => {
    const a = await request("/api/properties?limit=5");
    assert.equal(a.data.items.length, 5);
    const b = await request(`/api/properties?limit=5&after=${a.data.next}`);
    assert.equal(b.data.items.length, 5);
    assert.ok(b.data.items[0].id > a.data.items.at(-1).id);
    const detail = await request(`/api/properties/${a.data.items[0].id}`);
    assert.equal(detail.status, 200);
    assert.equal((await request("/api/properties?limit=100000")).status, 400);
    assert.equal(
      (await request("/api/properties?search=does-not-exist")).data.items.length,
      0,
    );
  },
);
