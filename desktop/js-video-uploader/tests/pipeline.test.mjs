import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateVideo } from "./load-auth.mjs";

test("local video selection accepts supported non-empty files and rejects unsafe inputs", async () => {
  const root = await mkdtemp(join(tmpdir(), "js-uploader-test-"));
  try {
    const valid = join(root, "training.mp4");
    const empty = join(root, "empty.mov");
    const unsupported = join(root, "notes.txt");
    await writeFile(valid, Buffer.from("video-fixture"));
    await writeFile(empty, Buffer.alloc(0));
    await writeFile(unsupported, Buffer.from("not-video"));
    assert.deepEqual(await validateVideo(valid), { path: valid, name: "training.mp4", size: 13 });
    await assert.rejects(validateVideo(empty), /empty or unavailable/);
    await assert.rejects(validateVideo(unsupported), /supported video/);
    await assert.rejects(validateVideo(""), /supported video/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
