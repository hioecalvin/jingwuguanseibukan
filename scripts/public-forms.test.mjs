import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

for (const [page, expectedControls] of [["login", 2], ["register", 9]]) {
  test(`${page} controls have unique IDs and associated labels`, () => {
    const source = fs.readFileSync(`app/${page}/page.tsx`, "utf8");
    const labels = [...source.matchAll(/<label\s[^>]*htmlFor="([^"]+)"/g)].map(match => match[1]);
    const controls = [...source.matchAll(/<(?:input|select)\b[^>]*>/g)].map(match => match[0]);
    assert.equal(controls.length, expectedControls);
    const ids = controls.map(control => control.match(/\bid="([^"]+)"/)?.[1]);
    assert.equal(new Set(ids).size, expectedControls);
    for (const id of ids) assert.ok(id && labels.includes(id));
    assert.match(source, /role="(?:status|alert)"/);
    assert.match(source, /aria-busy=\{loading\}/);
  });
}
