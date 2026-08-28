import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('landing explains the job and reaches the demo', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Send proof. Plan the next visit.');
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByText('Willow Street').first()).toBeVisible();
});

test('mobile navigation and footer links have 44px touch targets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const targets = await page.locator('.wordmark, .nav a, .footer-links a').evaluateAll(elements =>
    elements
      .filter(element => getComputedStyle(element).display !== 'none')
      .map(element => {
        const box = element.getBoundingClientRect();
        return { text: element.textContent?.trim(), width: box.width, height: box.height };
      }),
  );
  for (const target of targets) {
    expect(target.width, `${target.text} width`).toBeGreaterThanOrEqual(44);
    expect(target.height, `${target.text} height`).toBeGreaterThanOrEqual(44);
  }
});

test('@claim:demo-sandbox demo reset creates a fresh isolated workspace', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByText('Willow Street').first()).toBeVisible();
  const first = await page.evaluate(() => sessionStorage.getItem('demo:workspace'));
  expect(first).toBeTruthy();
  expect(await page.evaluate(() => localStorage.getItem('real:workspace'))).toBeNull();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('Willow Street').first()).toBeVisible();
  const second = await page.evaluate(() => sessionStorage.getItem('demo:workspace'));
  expect(second).not.toBe(first);
  expect(await page.evaluate(() => localStorage.getItem('real:workspace'))).toBeNull();
});

test('@claim:no-account clients open proof without an account', async ({ page, browser }) => {
  await page.goto('/demo');
  await page.getByRole('link', { name: 'Open client view' }).click();
  const proofUrl = page.url();
  const fresh = await browser.newContext();
  const clientPage = await fresh.newPage();
  await clientPage.goto(proofUrl);
  await expect(clientPage.getByRole('heading', { level: 1 })).toHaveText('Review your completed visit');
  await expect(clientPage.getByText('Kitchen after the visit')).toBeVisible();
  await fresh.close();
});

test('proof shows its 14-day expiry date', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('link', { name: 'Open client view' }).click();
  const text = await page.locator('.proof-client .meta').innerText();
  const dates = text.match(/[A-Z][a-z]{2} \d{1,2}, \d{4}/g)!;
  expect(dates).toHaveLength(2);
  const completed = new Date(dates[0]);
  const expires = new Date(dates[1]);
  expect(Math.round((expires.getTime() - completed.getTime()) / 86400000)).toBe(14);
});

test('@claim:next-visit-export chosen extras reach the next-visit CSV', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('link', { name: 'Open client view' }).click();
  await page.getByText('Inside refrigerator').click();
  await page.getByRole('button', { name: 'Save reply and extras' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reply is saved');
  await page.goto('/demo');
  await expect(page.locator('.next-visit')).toContainText('Inside refrigerator');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export next-visit CSV' }).click();
  const file = await download;
  const csv = await (await import('node:fs/promises')).readFile(await file.path() as string, 'utf8');
  expect(csv).toContain('next_visit,client,location,extra,detail,price');
  expect(csv).toContain('Inside refrigerator');
  expect(csv).toContain('28.00');
});

test('@claim:configurable-extras a business can add a client extra', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Manage extras' }).click();
  await page.getByLabel('Extra name').fill('Wipe baseboards');
  await page.getByLabel('Price in dollars').fill('22');
  await page.getByLabel('What the technician will do').fill('Wipe baseboards in the main rooms');
  await page.getByRole('button', { name: 'Add client choice' }).click();
  await expect(page.getByRole('heading', { name: 'Manage next-visit extras' })).toBeVisible();
  await expect(page.getByText('Wipe baseboards', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to visits' }).click();
  await page.getByRole('link', { name: 'Open client view' }).click();
  await expect(page.getByText('Wipe baseboards', { exact: true })).toBeVisible();
});

test('@claim:paid-license checkout registration and license restore use Sociobot billing', async ({ page, request }) => {
  await page.route('https://api.sociobot.in/api/v1/products/service-proof-loop/verify?license=*', route => route.fulfill({ json: { valid: true, reason: 'ok', expires_at: null } }));
  await page.goto('/#pricing');
  await expect(page.locator('.price')).toContainText('$59');
  await expect(page.locator('.price')).toContainText('one-time purchase');
  await expect(page.getByRole('link', { name: /Buy the business license/ })).toHaveAttribute('href', 'https://api.sociobot.in/api/v1/products/service-proof-loop/checkout');
  const products = await request.get('https://api.sociobot.in/api/v1/products');
  expect(products.ok()).toBeTruthy();
  const registered = (await products.json()).data.find((product: {slug: string}) => product.slug === 'service-proof-loop');
  expect(registered).toMatchObject({ price_minor: 5900, currency: 'USD' });
  const checkout = await request.get('https://api.sociobot.in/api/v1/products/service-proof-loop/checkout', { maxRedirects: 0 });
  expect(checkout.status()).toBe(303);
  expect(checkout.headers().location).toMatch(/^https:\/\/checkout\.dodopayments\.com\//);
  await page.getByLabel('Have a license?').fill('sample-license-token');
  await page.getByRole('button', { name: 'Verify license' }).click();
  await expect(page.getByText('License active on this browser.')).toBeVisible();
});

test('@claim:rate-limit API traffic is limited per forwarded client', async ({ request }) => {
  const responses = await Promise.all(Array.from({ length: 45 }, () => request.post('/api/demo', { headers: { 'x-forwarded-for': '198.51.100.44' } })));
  const blocked = responses.find(response => response.status() === 429);
  expect(blocked).toBeTruthy();
  expect(blocked!.headers()['retry-after']).toBe('1');
});

test('technician can record a visit and receive a proof link', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Record a visit' }).click();
  await page.getByRole('button', { name: 'Create proof link' }).click();
  await expect(page.getByText('Cedar Lane').first()).toBeVisible();
  await expect(page.getByLabel('Private proof link')).toHaveValue(/\/proof\//);
});

test('@claim:same-origin-demo demo sends data only to this service', async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', request => origins.add(new URL(request.url()).origin));
  await page.goto('/demo');
  await expect(page.getByText('Willow Street').first()).toBeVisible();
  expect([...origins]).toEqual(['http://127.0.0.1:4173']);
});

test('@a11y landing and client proof have no serious axe findings', async ({ page }) => {
  await page.goto('/');
  let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter(v => ['serious','critical'].includes(v.impact || ''))).toEqual([]);
  await page.goto('/demo');
  await page.getByRole('link', { name: 'Open client view' }).click();
  results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter(v => ['serious','critical'].includes(v.impact || ''))).toEqual([]);
});

test('@a11y dark treatment, keyboard focus, touch targets, and 200% text reflow', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/demo');
  await page.getByRole('link', { name: 'Open client view' }).click();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter(v => ['serious','critical'].includes(v.impact || ''))).toEqual([]);
  const status = page.getByLabel('Accept the work');
  await page.keyboard.press('Tab');
  await expect(status).toBeFocused();
  expect(await status.evaluate(input => getComputedStyle(input.nextElementSibling!).outlineStyle)).not.toBe('none');
  const rating = page.getByLabel('4');
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowLeft');
  await expect(rating).toBeFocused();
  expect(await rating.evaluate(input => getComputedStyle(input.nextElementSibling!).outlineStyle)).not.toBe('none');
  await page.goto('/demo');
  for (const control of [page.getByRole('button', { name: 'Reset demo' }), page.getByRole('link', { name: 'Start for real' })]) {
    expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await page.goto('/');
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  );
});

test('@claim:no-tracking landing and demo load no third-party resources', async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', request => origins.add(new URL(request.url()).origin));
  await page.goto('/');
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page.getByText('Willow Street').first()).toBeVisible();
  expect([...origins]).toEqual(['http://127.0.0.1:4173']);
});

test('valid deep links return 200 and unknown routes return 404', async ({ request }) => {
  for (const path of ['/', '/demo', '/app', '/privacy', '/terms', '/proof/example-token']) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
  expect((await request.get('/definitely-missing')).status()).toBe(404);
});

test('security response policy and primary flows have no console errors', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  for (const path of ['/', '/demo', '/privacy', '/terms']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  expect(errors).toEqual([]);
  const response = await request.get('/');
  expect(response.headers()['content-security-policy']).toContain("default-src 'self'");
  expect(response.headers()['strict-transport-security']).toContain('max-age=31536000');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
});

test('offline state and unknown route give a clear next step', async ({ page, context }) => {
  await page.goto('/');
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByText('You are offline. Reconnect to load or save visit proof.')).toBeVisible();
  await context.setOffline(false);
  await page.goto('/not-a-page');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This tray is empty');
  await expect(page.getByRole('link', { name: 'Return home' })).toBeVisible();
});
