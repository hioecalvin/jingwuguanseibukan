import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { uploadToMux } from "./load-auth.mjs";

async function withVideo(run) {
  const root = await mkdtemp(join(tmpdir(), "js-mux-test-"));
  const path = join(root, "processed.mp4");
  await writeFile(path, Buffer.from("processed-video"));
  try { await run(path); }
  finally { await rm(root, { recursive: true, force: true }); }
}

test("Mux direct upload sends resumable ranges without provider credentials", async () => {
  await withVideo(async path => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (input, init) => {
      calls.push({ input: String(input), init });
      return new Response("", { status: 200 });
    };
    try {
      const progress = [];
      await uploadToMux(
        path,
        "https://storage.googleapis.com/video-storage-us-east1-uploads/upload-id?Signature=signed",
        new AbortController().signal,
        (percent, message) => progress.push({ percent, message }),
      );
      assert.equal(calls.length, 1);
      assert.equal(calls[0].init.method, "PUT");
      assert.equal(calls[0].init.headers["Content-Range"], "bytes 0-14/15");
      assert.equal(calls[0].init.headers.Authorization, undefined);
      assert.deepEqual(progress.at(-1), { percent: 100, message: "Mux upload complete" });
    } finally { globalThis.fetch = originalFetch; }
  });
});

test("Mux direct upload accepts the current regional signed-upload address", async () => {
  await withVideo(async path => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (input, init) => {
      calls.push({ input: String(input), init });
      return new Response("", { status: 200 });
    };
    try {
      await uploadToMux(
        path,
        "https://direct-uploads-oci-us-east-1.mux.com/upload/4Gg6D2w_XyZaBcDeFgHi?token=signed",
        new AbortController().signal,
        () => undefined,
      );
      assert.equal(calls.length, 1);
      assert.equal(calls[0].input, "https://direct-uploads-oci-us-east-1.mux.com/upload/4Gg6D2w_XyZaBcDeFgHi?token=signed");
      assert.equal(calls[0].init.headers.Authorization, undefined);
    } finally { globalThis.fetch = originalFetch; }
  });
});

test("Mux direct upload rejects deceptive and insecure provider addresses", async () => {
  await withVideo(async path => {
    for (const url of [
      "https://storage.googleapis.com.evil.test/video-storage-uploads/id",
      "http://storage.googleapis.com/video-storage-uploads/id",
      "https://storage.googleapis.com/unrelated-bucket/id",
      "https://direct-uploads-oci-us-east-1.mux.com.evil.test/upload/4Gg6D2w_XyZaBcDeFgHi",
      "http://direct-uploads-oci-us-east-1.mux.com/upload/4Gg6D2w_XyZaBcDeFgHi",
      "https://direct-uploads-oci-us-east-1.mux.com:8443/upload/4Gg6D2w_XyZaBcDeFgHi",
      "https://user:password@direct-uploads-oci-us-east-1.mux.com/upload/4Gg6D2w_XyZaBcDeFgHi",
      "https://direct-uploads-oci-us-east-1.mux.com/upload/too-short",
      "https://direct-uploads-oci-us-east-1.mux.com/upload/4Gg6D2w_XyZaBcDeFgHi/extra",
      "https://direct-uploads-oci-us-east-1.mux.com/upload/4Gg6D2w_XyZaBcDeFgHi#fragment",
    ]) {
      await assert.rejects(
        uploadToMux(path, url, new AbortController().signal, () => undefined),
        /untrusted Mux upload address/,
      );
    }
  });
});
