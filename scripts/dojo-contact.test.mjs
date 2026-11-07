import assert from 'node:assert/strict';
import test from 'node:test';
import { loadRoute } from './load-route-test.mjs';
const { safeGoogleMapsUrl, dojoPhoneLink } = loadRoute('lib/dojo-contact.ts', {});

test('allows Maps long links and supported share links', () => {
 for (const url of ['https://www.google.com/maps/place/Dojo/@1,2,3z', 'https://google.com/maps?q=dojo', 'https://maps.google.com/?q=dojo', 'https://maps.app.goo.gl/Ab12?g_st=ic', 'https://goo.gl/maps/Ab12']) assert.equal(safeGoogleMapsUrl(url), url);
});
test('rejects executable URLs, credentials, ports, lookalike hosts and non-Maps paths', () => {
 for (const url of [null, '', 'javascript:alert(1)', 'http://google.com/maps', '//google.com/maps', 'https://google.com.evil.example/maps', 'https://google.com@evil.example/maps', 'https://evil.example@google.com/maps', 'https://google.com:443/maps', 'https://google.com/search?q=dojo', 'https://google.com/mapsfoo', 'https://google.com\\@evil.example/maps', 'https://maps.app.goo.gl/', 'https://goo.gl/Ab12', 'https://google.com/maps\n', 'https://google.com/maps\x01', 'https://google.com/maps/'+'a'.repeat(2048)]) assert.equal(safeGoogleMapsUrl(url), null, String(url));
});
test('phone links preserve only valid phone digits and an optional leading plus', () => {
 assert.equal(dojoPhoneLink('+62 (812) 345-678'), 'tel:+62812345678');
 assert.equal(dojoPhoneLink('0812 345'), 'tel:0812345');
 for (const phone of [null, '', '( )', '12', '+1', 'javascript:alert(1)', '123;ext=1', '123\n']) assert.equal(dojoPhoneLink(phone), null);
});
test('Maps path traversal and generic redirect endpoints cannot be saved as map links', () => {
 for (const url of ['https://www.google.com/maps/../url?q=https://example.invalid', 'https://google.com/maps/%2E%2e/url', 'https://maps.google.com/url?q=https://example.invalid']) assert.equal(safeGoogleMapsUrl(url), null);
});
