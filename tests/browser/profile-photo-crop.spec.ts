import type { Locator, Page } from '@playwright/test';
import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';
import { expect, test } from './fixtures';
import type { ProfileContactFixtureState } from './fixtures/profile-contact-supabase';

// Each pixel encodes its source coordinates, so both pan direction and zoom
// can be observed independently of the crop implementation.
async function choosePhoto(page: Page, width: number, height: number) {
  const png = await page.evaluate(({ width, height }) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d')!;
    const pixels = context.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = 4 * (y * width + x);
        pixels.data[offset] = x * 255 / (width - 1);
        pixels.data[offset + 1] = y * 255 / (height - 1);
        pixels.data[offset + 2] = 64;
        pixels.data[offset + 3] = 255;
      }
    }
    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL('image/png').split(',')[1];
  }, { width, height });
  await page.getByLabel('Choose Image').setInputFiles({
    name: 'coordinates.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64'),
  });
}

async function cropSample(preview: Locator) {
  return preview.evaluate(node => {
    const canvas = node as HTMLCanvasElement;
    const context = canvas.getContext('2d')!;
    const read = (fraction: number) => context.getImageData(canvas.width * fraction, canvas.height / 2, 1, 1).data;
    const center = read(0.5);
    return { x: center[0], y: center[1], alpha: center[3], redSpan: read(0.75)[0] - read(0.25)[0] };
  });
}

async function avatarWrites(page: Page) {
  return page.evaluate(() => {
    const state: ProfileContactFixtureState = window.__profileContactFixture;
    return { uploads: state.avatarUploads.length, updates: state.avatarUpdates.length };
  });
}

test('zoomed and repositioned preview matches the uploaded profile picture pixel for pixel', async ({ page, browserName }, testInfo) => {
  await page.route('**/fixture-avatars/**', async route => {
    const upload = await page.evaluate(() => window.__profileContactFixture.avatarUploads.at(-1)!);
    await route.fulfill({ contentType: upload.type, body: Buffer.from(upload.image.split(',')[1], 'base64') });
  });
  await page.goto(`${NAV_ORIGIN}/profile-contact`);
  await choosePhoto(page, 800, 480);
  const preview = page.getByRole('img', { name: 'Photo crop preview' });
  await expect(preview).toBeVisible();
  await expect.poll(async () => (await cropSample(preview)).alpha).toBe(255);
  const initial = await cropSample(preview);
  const zoom = page.getByRole('slider', { name: 'Zoom' });
  await zoom.focus();
  await zoom.press('End');
  await expect.poll(async () => (await cropSample(preview)).redSpan).toBeLessThan(initial.redSpan - 10);
  const zoomed = await cropSample(preview);

  await preview.scrollIntoViewIfNeeded();
  const box = (await preview.boundingBox())!;
  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + box.height / 2);
  const dx = Math.round(box.width / 4);
  const dy = Math.round(box.height / 4);
  if (browserName === 'chromium' && testInfo.project.name === 'chromium-mobile') {
    const session = await page.context().newCDPSession(page);
    try {
      await session.send('Emulation.setTouchEmulationEnabled', { enabled: true });
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx, y: y + dy }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } finally {
      await session.detach();
    }
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 4 });
    await page.mouse.up();
  }
  await expect.poll(async () => (await cropSample(preview)).x).toBeLessThan(zoomed.x - 3);
  await expect.poll(async () => (await cropSample(preview)).y).toBeLessThan(zoomed.y - 3);
  const previewPng = await preview.evaluate(node => (node as HTMLCanvasElement).toDataURL());
  expect(await avatarWrites(page)).toEqual({ uploads: 0, updates: 0 });
  await page.getByRole('button', { name: 'Save Picture' }).click();
  await expect(page.getByText('Profile picture updated successfully.')).toBeVisible();
  const avatar = page.getByRole('img', { name: 'Profile', exact: true });
  await expect(avatar).toBeVisible();
  const actual = await avatar.evaluate(async (node, expected) => {
    const image = node as HTMLImageElement;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d')!.drawImage(image, 0, 0);
    const state = window.__profileContactFixture;
    return {
      width: canvas.width, height: canvas.height,
      matchesPreview: canvas.toDataURL() === expected,
      displayedSavedUrl: image.src === state.avatarUpdates[0],
      uploadType: state.avatarUploads[0].type,
    };
  }, previewPng);
  expect(actual).toEqual({ width: 512, height: 512, matchesPreview: true, displayedSavedUrl: true, uploadType: 'image/png' });
  expect(await avatarWrites(page)).toEqual({ uploads: 1, updates: 1 });
  const savedUrl = await avatar.getAttribute('src');
  await choosePhoto(page, 320, 640);
  await expect(preview).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(preview).toHaveCount(0);
  await expect(avatar).toHaveAttribute('src', savedUrl!);
  expect(await avatarWrites(page)).toEqual({ uploads: 1, updates: 1 });
});
