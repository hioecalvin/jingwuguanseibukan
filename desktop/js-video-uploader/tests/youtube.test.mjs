import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { uploadToYouTube } from "./load-auth.mjs";

const request = {
  videoPath: "ignored",
  classId: "class-id",
  rankId: "rank-id",
  tierId: "tier-id",
  title: "Aikido fundamentals",
  description: "Training reference",
  section: "Ukemi",
  sortOrder: 10,
  privacyStatus: "unlisted",
};

async function withVideo(run) {
  const root = await mkdtemp(join(tmpdir(), "js-youtube-test-"));
  const path = join(root, "processed.mp4");
  await writeFile(path, Buffer.from("processed-video"));
  try { await run(path); }
  finally { await rm(root, { recursive: true, force: true }); }
}

test("resumable upload sends guarded metadata and returns the validated video ID", async () => {
  await withVideo(async path => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (input, init) => {
      calls.push({ input: String(input), init });
      if (calls.length === 1) return new Response("", {
        status: 200,
        headers: { location: "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=session-1" },
      });
      return new Response(JSON.stringify({ id: "abcdefghijk" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    try {
      const progress = [];
      const id = await uploadToYouTube(path, "memory-only-token", request, "Aikido", "5th Kyu", "Basics", new AbortController().signal, (percent, message) => progress.push({ percent, message }));
      assert.equal(id, "abcdefghijk");
      assert.equal(calls.length, 2);
      assert.equal(calls[0].input, "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet%2Cstatus");
      assert.equal(calls[0].init.headers.Authorization, "Bearer memory-only-token");
      const metadata = JSON.parse(calls[0].init.body);
      assert.equal(metadata.status.privacyStatus, "unlisted");
      assert.equal(metadata.status.embeddable, true);
      assert.match(metadata.snippet.description, /Section: Ukemi/);
      assert.match(metadata.snippet.description, /Aikido · 5th Kyu · Basics/);
      assert.equal(calls[1].init.headers["Content-Range"], "bytes 0-14/15");
      assert.deepEqual(progress.at(-1), { percent: 100, message: "YouTube upload complete" });
    } finally { globalThis.fetch = originalFetch; }
  });
});

test("resumable upload rejects a deceptive non-Google upload address", async () => {
  await withVideo(async path => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("", {
      status: 200,
      headers: { location: "https://evilgoogleapis.com/upload/youtube/v3/videos?upload_id=stolen" },
    });
    try {
      await assert.rejects(
        uploadToYouTube(path, "token", request, "Aikido", "5th Kyu", "Basics", new AbortController().signal, () => undefined),
        /untrusted upload address/,
      );
    } finally { globalThis.fetch = originalFetch; }
  });
});

test("resumable upload rejects malformed video identifiers", async () => {
  await withVideo(async path => {
    const originalFetch = globalThis.fetch;
    let call = 0;
    globalThis.fetch = async () => {
      call += 1;
      if (call === 1) return new Response("", {
        status: 200,
        headers: { location: "https://www.googleapis.com/upload/youtube/v3/videos?upload_id=session-2" },
      });
      return new Response(JSON.stringify({ id: "not valid" }), { status: 200 });
    };
    try {
      await assert.rejects(
        uploadToYouTube(path, "token", request, "Aikido", "5th Kyu", "Basics", new AbortController().signal, () => undefined),
        /invalid video identifier/,
      );
    } finally { globalThis.fetch = originalFetch; }
  });
});
