import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';
import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';

test('shared shell skip link moves keyboard focus to content', async ({ page, browserName }, testInfo) => {
  await page.goto(`${NAV_ORIGIN}/profile`);
  await expect(page.getByRole('heading', { name: 'Navigation component fixture' })).toBeVisible();
  // macOS Safari's full-item keyboard shortcut is Option/Alt+Tab. Do not
  // assume that shortcut changes the Windows/Linux WebKit port's settings.
  // https://support.apple.com/guide/safari/keyboard-shortcuts-and-gestures-cpsh003/mac
  const nextItem = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
  await page.keyboard.press(nextItem);
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeInViewport();
  const outline = await page.getByRole('link', { name: 'Skip to content' }).evaluate(el => getComputedStyle(el).outlineStyle);
  expect(outline).toBe('solid');
  await page.screenshot({ path: testInfo.outputPath('skip-link-focused.png') });
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await page.keyboard.press(nextItem);
  await expect(page.getByRole('button', { name: 'Content action' })).toBeFocused();
});

test('mobile modal contains focus, closes with Escape and restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${NAV_ORIGIN}/profile`);
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  await menu.click();
  const dialog = page.getByRole('dialog', { name: 'Jingwuguan Seibukan', exact: true });
  await expect(dialog).toBeVisible();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('link', { name: 'Subscription', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  for (let index = 0; index < 9; index++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
});

test('desktop resize closes a mobile modal and releases background interaction', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${NAV_ORIGIN}/profile`);
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Content action' }).click();
  // WebKit does not focus a button on pointer activation. Assert the actual
  // effect to prove the background is interactive, independently of focus.
  await expect(page.getByRole('status')).toHaveText('Content action activated');
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');
});

for (const role of ['member', 'admin', 'super_admin']) {
  test(`${role} navigation presentation has scoped links, current-page state and no automated accessibility violations`, async ({ page }, testInfo) => {
    await page.goto(`${NAV_ORIGIN}/profile?role=${role}`);
    await expect(page.getByRole('heading', { name: 'Navigation component fixture' })).toBeVisible();
    if (page.viewportSize()!.width < 1024) await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Profile', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('link', { name: 'Members', exact: true })).toHaveCount(role === 'member' ? 0 : 1);
    await expect(page.getByRole('link', { name: 'Classes', exact: true })).toHaveCount(role === 'super_admin' ? 1 : 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(scan.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${role}-navigation.png`), fullPage: true });
  });
}

test('reduced-motion preference removes long transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${NAV_ORIGIN}/profile`);
  await expect(page.getByRole('heading', { name: 'Navigation component fixture' })).toBeVisible();
  const durations = await page.locator('a').evaluateAll(elements => elements.map(el => parseFloat(getComputedStyle(el).transitionDuration)));
  expect(durations.every(duration => duration <= 0.001)).toBe(true);
});

test('account disclosure supports keyboard dismissal and shows sign-out failure without claiming success', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${NAV_ORIGIN}/profile`);
  const trigger = page.getByRole('button', { name: 'Account menu', exact: true });
  await trigger.click();
  const menu = page.getByRole('region', { name: 'Account menu', exact: true });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Sign out', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await menu.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(menu.getByRole('button', { name: 'Signing out...', exact: true })).toBeDisabled();
  await expect(menu.getByRole('alert')).toHaveText('Unable to sign out. Please try again.');
  await expect(menu.getByRole('button', { name: 'Sign out', exact: true })).toBeEnabled();
  await expect(page).toHaveURL(`${NAV_ORIGIN}/profile`);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
});
