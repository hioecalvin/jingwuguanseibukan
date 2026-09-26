import assert from "node:assert/strict";
import test from "node:test";
import { allVisibleMembers } from "./security-pagination.mjs";

function clientFor(responses) {
  const ranges = [];
  const query = { select: () => query, order: () => query, range: async (start, end) => { ranges.push([start, end]); return responses.shift(); } };
  return { from: () => query, ranges };
}

test("scope checks inspect every page, including a server-capped page", async () => {
  const client = clientFor([{ data: [{ id: 1 }], count: 2 }, { data: [{ id: 2 }], count: 2 }]);
  assert.deepEqual(await allVisibleMembers(client), [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(client.ranges, [[0, 99], [1, 100]]);
});

test("truncation, count drift, and query errors cannot pass scope checks", async () => {
  for (const responses of [
    [{ data: [], count: 1 }],
    [{ data: [], count: null }],
    [{ data: [], count: 0, error: { code: "42501" } }],
    [{ data: [{ id: 1 }], count: 2 }, { data: [{ id: 2 }], count: 3 }],
  ]) await assert.rejects(allVisibleMembers(clientFor(responses)));
});
