import assert from 'node:assert/strict';
import test from 'node:test';
import { loadRoute } from './load-route-test.mjs';
const { repositoryAuthoringVideo, isLegacyRepositoryVideo } = loadRoute('lib/video/repository-authoring.ts', {});
test('new notes never create an externally supplied video pair', () => {
  assert.equal(JSON.stringify(repositoryAuthoringVideo()), '{"provider":"","provider_video_id":""}');
  assert.equal(JSON.stringify(repositoryAuthoringVideo({ video_provider: null, video_id: null })), '{"provider":"","provider_video_id":""}');
});
test('editing preserves the existing managed Mux identifier without mutation', () => {
  const item = Object.freeze({ video_provider: 'mux', video_id: 'existingPlayback123' });
  const result = repositoryAuthoringVideo(item);
  assert.equal(result.provider, 'mux');
  assert.equal(result.provider_video_id, item.video_id);
  assert.equal(isLegacyRepositoryVideo(item), false);
});
test('legacy YouTube and unknown providers cannot be authored', () => {
  for (const provider of ['youtube', 'vimeo', 'cloudflare', 'YouTube']) {
    const item = { video_provider: provider, video_id: 'abcdefghijk' };
    assert.equal(isLegacyRepositoryVideo(item), true);
    assert.throws(() => repositoryAuthoringVideo(item), /read-only/);
  }
});
test('incomplete or mismatched video pairs fail closed', () => {
  for (const item of [
    { video_provider: 'mux', video_id: null },
    { video_provider: null, video_id: 'abcdefghijk' },
  ]) assert.throws(() => repositoryAuthoringVideo(item), /read-only/);
});
