import { test, expect, devices } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ context }, testInfo) => {
  const hash = [...testInfo.testId].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 0);
  await context.setExtraHTTPHeaders({
    'x-forwarded-for': `198.18.${(hash >>> 8) % 256}.${hash % 254 + 1}`,
  });
});

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

test('mobile inline links have 44px touch targets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const targets = [];
  for (const [path, selector] of [
    ['/', '.price-sheet .touch-link'],
    ['/privacy', '.legal .touch-link'],
    ['/terms', '.legal .touch-link'],
  ]) {
    await page.goto(path);
    for (const link of await page.locator(selector).all()) {
      targets.push({ text: (await link.textContent())?.trim(), box: await link.boundingBox() });
    }
  }
  await page.goto('/demo');
  await page.getByRole('link', { name: 'Open client view' }).click();
  const report = page.getByRole('link', { name: 'Report a link sent in error' });
  targets.push({ text: await report.textContent(), box: await report.boundingBox() });

  expect(targets).toHaveLength(5);
  for (const target of targets) {
    expect(target.box?.width, `${target.text} width`).toBeGreaterThanOrEqual(44);
    expect(target.box?.height, `${target.text} height`).toBeGreaterThanOrEqual(44);
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

test('@claim:proof-page-privacy private proof HTML and API responses cannot be indexed or stored', async ({ page, request }) => {
  await page.goto('/demo');
  await page.getByRole('link', { name: 'Open client view' }).click();
  const proofUrl = page.url();
  const proofHtml = await request.get(proofUrl);
  expect(proofHtml.headers()['x-robots-tag']).toBe('noindex, nofollow, noarchive');
  expect(proofHtml.headers()['cache-control']).toBe('private, no-store');
  const html = await proofHtml.text();
  expect(html).toContain('<meta name="robots" content="noindex, nofollow, noarchive">');
  expect(html).not.toContain('rel="canonical"');
  const token = new URL(proofUrl).pathname.split('/').pop()!;
  const apiProof = await request.get(`/api/proof/${token}`);
  expect(apiProof.ok()).toBeTruthy();
  expect(apiProof.headers()['x-robots-tag']).toBe('noindex, nofollow, noarchive');
  expect(apiProof.headers()['cache-control']).toBe('private, no-store');
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
  let extrasReads = 0;
  await page.route('**/api/extras', route => {
    if (route.request().method() === 'GET' && ++extrasReads > 1) return route.abort();
    return route.continue();
  });
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Manage extras' }).click();
  await page.getByLabel('Extra name').fill('Wipe baseboards');
  await page.getByLabel('Price in dollars').fill('22');
  await page.getByLabel('What the technician will do').fill('Wipe baseboards in the main rooms');
  await page.getByRole('button', { name: 'Add extra' }).click();
  await expect(page.getByRole('heading', { name: 'Manage next-visit extras' })).toBeVisible();
  await expect(page.getByText('Wipe baseboards', { exact: true })).toBeVisible();
  expect(extrasReads).toBe(1);
  await page.getByRole('button', { name: 'Back to visits' }).click();
  await page.getByRole('link', { name: 'Open client view' }).click();
  await expect(page.getByText('Wipe baseboards', { exact: true })).toBeVisible();
});

test('@claim:paid-license Sociobot billing starts the $59 checkout and Dodo hosts the payment page', async ({ browser, request }, testInfo) => {
  test.slow();
  const products = await request.get('https://api.sociobot.in/api/v1/products');
  expect(products.ok()).toBeTruthy();
  const registered = (await products.json()).data.find((product: {slug: string}) => product.slug === 'service-proof-loop');
  expect(registered).toMatchObject({ price_minor: 5900, currency: 'USD' });
  const checkout = await request.get('https://api.sociobot.in/api/v1/products/service-proof-loop/checkout', { maxRedirects: 0 });
  expect(checkout.status()).toBe(303);
  expect(checkout.headers().location).toMatch(/^https:\/\/checkout\.dodopayments\.com\//);

  const device = testInfo.project.name === 'mobile-chromium'
    ? { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } }
    : devices['Desktop Chrome'];
  const isolatedContext = await browser.newContext({
    ...device,
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173',
    extraHTTPHeaders: { 'x-forwarded-for': `198.18.250.${testInfo.project.name === 'mobile-chromium' ? 2 : 1}` },
  });
  try {
    let verifyRequests = 0;
    await isolatedContext.route('https://api.sociobot.in/api/v1/products/service-proof-loop/verify?license=*', async route => {
      verifyRequests += 1;
      await new Promise(resolve => setTimeout(resolve, 7_500));
      await route.fulfill({ json: { valid: true, reason: 'ok', expires_at: null } });
    });
    const page = await isolatedContext.newPage();
    await page.goto('/#pricing');
    await page.locator('#license-form[data-license-state="ready"]').waitFor({ state: 'visible', timeout: 0 });
    expect(await page.evaluate(() => localStorage.length)).toBe(0);
    await expect(page.locator('.price')).toContainText('$59');
    await expect(page.locator('.price')).toContainText('one-time purchase');
    await expect(page.getByRole('heading', { name: 'Keep creating proof links' })).toBeVisible();
    await expect(page.getByText('After three free visits, one $59 license covers one business workspace.')).toBeVisible();
    await expect(page.locator('main')).not.toContainText(/unlimited/i);
    await expect(page.getByRole('link', { name: /Buy the business license/ })).toHaveAttribute('href', 'https://api.sociobot.in/api/v1/products/service-proof-loop/checkout');
    await page.goto('/privacy');
    await expect(page.getByText('Sociobot billing starts checkout. Dodo hosts the payment page and handles payment card details.')).toBeVisible();
    await expect(page.getByText('Your browser stores the license token. The service stores only its hash when the license covers a workspace.')).toBeVisible();
    expect(await page.locator('input').evaluateAll(inputs => inputs.every(input => !['cc-number', 'cc-csc', 'cc-exp'].includes(input.autocomplete)))).toBeTruthy();
    await page.goto('/terms');
    await expect(page.getByText('The business license costs $59 as a one-time purchase. One license applies to one business workspace.')).toBeVisible();
    await expect(page.getByText('Sociobot billing starts checkout. Dodo hosts the payment page. See that page for purchase terms.')).toBeVisible();
    await page.goto('/#pricing');
    const licenseForm = page.locator('#license-form');
    await page.locator('#license-form[data-license-state="ready"]').waitFor({ state: 'visible', timeout: 0 });
    await page.getByLabel('Have a license?').fill('sample-license-token');
    const verificationResponse = page.waitForResponse(response => response.url().includes('/verify?license=sample-license-token'));
    await page.getByRole('button', { name: 'Verify license' }).click();
    await expect(licenseForm).toHaveAttribute('data-license-state', 'checking');
    await expect(page.getByRole('button', { name: 'Checking license…' })).toBeDisabled();
    expect((await verificationResponse).status()).toBe(200);
    await page.waitForFunction(() => document.querySelector('#license-form')?.getAttribute('data-license-state') === 'active', undefined, { timeout: 0 });
    await expect(page.locator('#license-note')).toHaveText('License verified. It covers one business workspace.');
    await expect(page.getByRole('button', { name: 'Verify license' })).toBeEnabled();
    expect(verifyRequests).toBe(1);
    expect(await page.evaluate(() => ({
      token: localStorage.getItem('sb_license:service-proof-loop'),
      valid: localStorage.getItem('sb_license_valid:service-proof-loop'),
      checked: localStorage.getItem('sb_license_check:service-proof-loop'),
    }))).toMatchObject({ token: 'sample-license-token', valid: 'true', checked: expect.any(String) });

    await page.evaluate(() => {
      localStorage.setItem('sb_license:service-proof-loop', 'revoked-license-token');
      localStorage.setItem('sb_license_valid:service-proof-loop', 'false');
      localStorage.setItem('sb_license_check:service-proof-loop', String(Date.now()));
    });
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#license-form')?.getAttribute('data-license-state') === 'inactive', undefined, { timeout: 0 });
    await expect(page.locator('#license-note')).toHaveText('License no longer active. Check the token or buy the plan.');
    expect(verifyRequests).toBe(1);
  } finally {
    await isolatedContext.close();
  }
});

test('@claim:privacy-data-flow visit data, replies, and extras follow the stated product path', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('link', { name: 'Open client view' }).click();
  await expect(page.getByText('Maya Chen, here is the work Elena recorded at Willow Street.')).toBeVisible();
  await page.getByText('Inside refrigerator').click();
  await page.getByLabel('Comment').fill('Please include the refrigerator next time.');
  await page.getByRole('button', { name: 'Save reply and extras' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Your reply is saved' })).toBeVisible();
  await page.goto('/demo');
  await expect(page.locator('.visit-heading .state')).toContainText('accepted');
  await expect(page.locator('.next-visit')).toContainText('Inside refrigerator');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export next-visit CSV' }).click();
  const file = await download;
  const csv = await (await import('node:fs/promises')).readFile(await file.path() as string, 'utf8');
  expect(csv).toContain('Willow Street');
  expect(csv).toContain('Inside refrigerator');
});

test('@claim:rate-limit API traffic is limited per forwarded client', async ({ request }) => {
  const responses = await Promise.all(Array.from({ length: 45 }, () => request.get('/api/not-found', { headers: { 'x-forwarded-for': '198.51.100.44' } })));
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

test('@claim:photo-upload a technician can add a consented photo to proof', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Record a visit' }).click();
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAFAgIACxW2OAAAAABJRU5ErkJggg==', 'base64');
  const photo = (name: string) => ({ name, mimeType: 'image/png', buffer: pixel });
  await page.getByLabel('Proof photos').setInputFiles([
    photo('one.png'), photo('two.png'), photo('three.png'), photo('four.png'),
  ]);
  await page.getByRole('button', { name: 'Create proof link' }).click();
  await expect(page.getByText('Use up to three photos under 1 MB each.')).toBeVisible();
  await page.getByLabel('Proof photos').setInputFiles({
    name: 'too-large.png', mimeType: 'image/png', buffer: Buffer.alloc(1_000_001),
  });
  await page.getByRole('button', { name: 'Create proof link' }).click();
  await expect(page.getByText('Use up to three photos under 1 MB each.')).toBeVisible();
  await page.getByLabel('Proof photos').setInputFiles([
    photo('kitchen-after.png'), photo('bathroom-after.png'), photo('entry-after.png'),
  ]);
  await page.getByRole('button', { name: 'Create proof link' }).click();
  await expect(page.getByText('Cedar Lane').first()).toBeVisible();
  await page.getByRole('link', { name: 'Open client view' }).click();
  for (const name of ['kitchen-after.png', 'bathroom-after.png', 'entry-after.png']) {
    const savedPhoto = page.getByAltText(`Proof photo: ${name}`);
    await expect(savedPhoto).toBeVisible();
    await expect(savedPhoto).toHaveAttribute('src', /^data:image\/png;base64,/);
  }
});

test('@claim:problem-rating a client problem and rating return to the workspace', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('link', { name: 'Open client view' }).click();
  await page.getByText('Report a problem', { exact: true }).click();
  await page.getByText('2', { exact: true }).click();
  await page.getByLabel('Comment').fill('Please check the entry glass next time.');
  await page.getByRole('button', { name: 'Save reply and extras' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reply is saved');
  await expect(page.getByText('The team can now see your problem report and rating.')).toBeVisible();
  await page.goto('/demo');
  await expect(page.locator('.visit-heading .state')).toHaveText('problem');
  await expect(page.getByLabel('Client rating 2 out of 5')).toBeVisible();
});

test('@claim:same-origin-demo demo sends data only to this service', async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', request => origins.add(new URL(request.url()).origin));
  await page.goto('/demo');
  await expect(page.getByText('Willow Street').first()).toBeVisible();
  expect([...origins]).toEqual([new URL(page.url()).origin]);
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
  const statusBounds = await status.evaluate(input => {
    const box = input.getBoundingClientRect();
    const visible = input.nextElementSibling!.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom, visibleTop: visible.top, visibleBottom: visible.bottom, viewport: innerHeight };
  });
  expect(statusBounds.top).toBeGreaterThanOrEqual(0);
  expect(statusBounds.bottom).toBeLessThanOrEqual(statusBounds.viewport);
  expect(statusBounds.visibleTop).toBeGreaterThanOrEqual(0);
  expect(statusBounds.visibleBottom).toBeLessThanOrEqual(statusBounds.viewport);
  const rating = page.getByLabel('4');
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowLeft');
  await expect(rating).toBeFocused();
  expect(await rating.evaluate(input => getComputedStyle(input.nextElementSibling!).outlineStyle)).not.toBe('none');
  const ratingBounds = await rating.evaluate(input => {
    const box = input.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom, viewport: innerHeight };
  });
  expect(ratingBounds.top).toBeGreaterThanOrEqual(0);
  expect(ratingBounds.bottom).toBeLessThanOrEqual(ratingBounds.viewport);
  await page.getByRole('button', { name: 'Save reply and extras' }).focus();
  await page.keyboard.press('Enter');
  const savedHeading = page.getByRole('heading', { level: 1, name: 'Your reply is saved' });
  await expect(savedHeading).toBeFocused();
  await expect(page.locator('#announcer')).toHaveText('Your reply is saved');
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
  expect([...origins]).toEqual([new URL(page.url()).origin]);
});

test('valid deep links return 200 and the real 404 includes social metadata', async ({ request }) => {
  for (const path of ['/', '/demo', '/app', '/privacy', '/terms', '/proof/example-token']) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
  const missing = await request.get('/definitely-missing');
  expect(missing.status()).toBe(404);
  const html = await missing.text();
  expect(html).toContain('<meta property="og:title" content="Page not found — Service Proof Loop">');
  expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
  expect(html).toContain('https://service-proof-loop.sociobot.in/assets/social.jpg');
});

test('each route has matching server and rendered social metadata', async ({ page, request }) => {
  const routes = [
    ['/demo', 'Demo — Service Proof Loop', 'Try a complete proof-to-next-visit loop with isolated sample data.'],
    ['/app', 'Start — Service Proof Loop', 'Create a local business workspace for completed visits.'],
    ['/privacy', 'Privacy — Service Proof Loop', 'How Service Proof Loop handles visit proof and client replies.'],
    ['/terms', 'Terms — Service Proof Loop', 'Terms for using Service Proof Loop.'],
  ] as const;
  for (const [path, title, description] of routes) {
    const response = await request.get(path);
    const html = await response.text();
    expect(html).toContain(`<title>${title}</title>`);
    expect(html).toContain(`<meta property="og:title" content="${title}">`);
    expect(html).toContain(`<meta name="twitter:title" content="${title}">`);
    expect(html).toContain(`<meta property="og:description" content="${description}">`);
    expect(html).toContain(`<meta property="og:url" content="https://service-proof-loop.sociobot.in${path}">`);
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', title);
    await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute('content', description);
  }
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
  const response = await page.goto('/not-a-page');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page does not exist');
  await expect(page.getByRole('link', { name: 'Return home' })).toBeVisible();
  await expect(page.locator('header')).toBeVisible();
  await expect(page.locator('footer')).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
});
