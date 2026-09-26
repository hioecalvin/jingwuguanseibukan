import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { loadRoute } from "./load-route-test.mjs";

const youtube = loadRoute("lib/video/youtube.ts", {});

test("YouTube input accepts exact supported HTTPS hosts and raw IDs", () => {
  const id = "dQw4w9WgXcQ";
  for (const input of [
    id,
    `https://www.youtube.com/watch?v=${id}`,
    `https://m.youtube.com/watch?v=${id}&feature=share`,
    `https://youtu.be/${id}?si=unit-test`,
    `https://www.youtube.com/shorts/${id}`,
    `https://youtube.com/embed/${id}`,
    `https://youtube.com/live/${id}`,
  ]) {
    assert.equal(youtube.extractYouTubeVideoId(input), id, input);
  }
});

test("YouTube input rejects lookalike hosts, insecure URLs, credentials and invalid IDs", () => {
  for (const input of [
    "https://notyoutube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.example.org/watch?v=dQw4w9WgXcQ",
    "http://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=too-short",
    "https://youtu.be/dQw4w9WgXcQ/extra",
    "javascript:alert(1)",
  ]) {
    assert.equal(youtube.extractYouTubeVideoId(input), null, input);
  }
});

test("embed URLs use the privacy-enhanced origin and only validated IDs", () => {
  assert.equal(
    youtube.getYouTubeEmbedUrl("dQw4w9WgXcQ"),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0",
  );
  assert.equal(youtube.getYouTubeEmbedUrl("bad/id"), null);
});

test("member and admin YouTube frames use the hardened embed contract", () => {
  for (const relativePath of [
    "../app/admin/content/page.tsx",
    "../app/(member)/repository/[classId]/[rankId]/[tierId]/page.tsx",
  ]) {
    const source = fs.readFileSync(
      new URL(relativePath, import.meta.url),
      "utf8",
    );
    assert.match(source, /referrerPolicy="strict-origin-when-cross-origin"/);
    assert.match(source, /sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"/);
    assert.match(source, /allowFullScreen/);
  }
});

test("historical migration 031 preflights existing data without rewriting content", () => {
  const sql = fs.readFileSync(
    new URL("../supabase/migrations/031_youtube_only_repository_video.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /lock table public\.content in share row exclusive mode/i);
  assert.match(sql, /existing content is not compatible with YouTube-only playback/i);
  assert.match(sql, /video_provider <> 'youtube'/i);
  assert.match(sql, /video_id !~ '\^\[A-Za-z0-9_-\]\{11\}\$'/i);
  assert.match(sql, /add constraint content_youtube_video_pair_check/i);
  assert.match(sql, /validate constraint content_youtube_video_pair_check/i);
  assert.doesNotMatch(sql, /(?:update|delete from)\s+public\.content/i);
  assert.doesNotMatch(sql, /(?:update|delete from)\s+supabase_migrations/i);
});

test("migration 032 rejects incomplete YouTube pairs without rewriting content", () => {
  const sql = fs.readFileSync(
    new URL("../supabase/migrations/032_enforce_complete_youtube_video_pairs.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /lock table public\.content in share row exclusive mode/i);
  assert.match(sql, /existing content is not compatible with complete YouTube video pairs/i);
  assert.match(sql, /video_provider is not null\s+and video_id is not null/i);
  assert.match(sql, /video_provider = 'youtube'/i);
  assert.match(sql, /video_id ~ '\^\[A-Za-z0-9_-\]\{11\}\$'/i);
  assert.match(sql, /add constraint content_youtube_video_pair_check/i);
  assert.match(sql, /validate constraint content_youtube_video_pair_check/i);
  assert.doesNotMatch(sql, /(?:update|delete from)\s+public\.content/i);
  assert.doesNotMatch(sql, /(?:update|delete from)\s+supabase_migrations/i);
});
