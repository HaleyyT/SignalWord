import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const origin = process.env.SIGNALWORD_VIEWER_TEST_URL ?? 'http://127.0.0.1:4176';
const server = process.env.SIGNALWORD_VIEWER_TEST_URL ? null : await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { host: '127.0.0.1', port: 4176, strictPort: true } });
await server?.listen();
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.SIGNALWORD_CHROME_PATH ? { executablePath: process.env.SIGNALWORD_CHROME_PATH } : {}) });
  for (const colorScheme of ['dark', 'light']) {
    for (const width of [320, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme, reducedMotion: 'reduce' });
      const errors = [];
      const privateRequests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (/\/v1\/|supabase/.test(request.url())) privateRequests.push(request.url()); });
      await page.goto(origin);
      await page.getByRole('heading', { level: 1, name: 'Private phrase. Trusted response.' }).waitFor();
      // React may mount the image after the initial document load event.
      // Wait for its real network load instead of racing a hosted CDN response.
      await page.waitForFunction(() => {
        const img = document.querySelector('.home-photo img');
        return img?.complete && img.naturalWidth > 0;
      });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px overflow`);
      await page.keyboard.press('Tab');
      await page.getByRole('link', { name: 'Skip to content' }).press('Enter');
      assert.equal(new URL(page.url()).hash, '#main');
      await page.getByText('Does SignalWord contact emergency services?', { exact: true }).click();
      assert.equal(await page.locator('details[open]').count(), 1);
      await page.getByText('Can I download the app now?', { exact: true }).click();
      await page.getByRole('link', { name: 'support@signalword.app' }).waitFor();
      assert.deepEqual(errors, []);
      assert.deepEqual(privateRequests, [], 'Home must never access private APIs');
      await page.screenshot({ path: `/tmp/signalword-home-${colorScheme}-${width}.png`, fullPage: true });
      await page.getByRole('navigation', { name: 'Footer navigation' }).getByRole('link', { name: 'Privacy' }).click();
      assert.equal(new URL(page.url()).pathname, '/privacy');
      await page.close();
    }
  }
  console.log('PASS homepage navigation, FAQ, keyboard entry, image, no private requests, light/dark and 320/768/1440px layouts.');
} finally { await browser?.close(); await server?.close(); }
