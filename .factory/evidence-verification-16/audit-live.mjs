import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';

const base = 'https://service-proof-loop.sociobot.in';
const browser = await chromium.launch({ headless: true });
const report = { generated_at: new Date().toISOString(), base };

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  extraHTTPHeaders: { 'x-forwarded-for': '198.18.16.16' },
});
const page = await context.newPage();
const requests = [];
const responses = [];
const consoleErrors = [];
const pageErrors = [];
page.on('request', request => requests.push({ method: request.method(), url: request.url(), type: request.resourceType() }));
page.on('response', response => responses.push({ status: response.status(), url: response.url() }));
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', error => pageErrors.push(error.message));

const homeResponse = await page.goto(`${base}/`, { waitUntil: 'networkidle' });
const homeAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
report.first_read = {
  status: homeResponse.status(),
  title: await page.title(),
  h1: await page.locator('h1').allTextContents(),
  audience: await page.locator('.lede').first().innerText(),
  primary_action: await page.getByRole('link', { name: 'Try it with sample data' }).innerText(),
  action_explanation: await page.locator('.primary-row small').innerText(),
  facts: await page.locator('.facts li').allTextContents(),
  headers: await homeResponse.allHeaders(),
  axe_serious_or_critical: homeAxe.violations.filter(item => ['serious', 'critical'].includes(item.impact || '')).map(item => item.id),
};

await page.getByRole('link', { name: 'Try it with sample data' }).click();
await page.getByText('Willow Street').first().waitFor();
const demoStorage = await page.evaluate(() => ({
  demo: JSON.parse(sessionStorage.getItem('demo:workspace')),
  real: localStorage.getItem('real:workspace'),
}));
const proofHref = await page.getByRole('link', { name: 'Open client view' }).getAttribute('href');
await page.getByRole('link', { name: 'Open client view' }).click();
await page.getByRole('heading', { level: 1, name: 'Review your completed visit' }).waitFor();
const proofUrl = page.url();
const proofDocument = await context.request.get(proofUrl);
const proofToken = new URL(proofUrl).pathname.split('/').pop();
const proofApi = await context.request.get(`${base}/api/proof/${proofToken}`);
const proofAxeLight = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

await page.emulateMedia({ colorScheme: 'dark' });
await page.reload({ waitUntil: 'networkidle' });
await page.getByRole('heading', { level: 1 }).waitFor();
const proofAxeDark = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
await page.keyboard.press('Tab');
const focusedStatus = await page.getByLabel('Accept the work').evaluate(input => {
  const visible = input.nextElementSibling;
  const style = getComputedStyle(visible);
  return {
    input_focused: document.activeElement === input,
    outline_style: style.outlineStyle,
    outline_width: style.outlineWidth,
    outline_color: style.outlineColor,
    visible_box: visible.getBoundingClientRect().toJSON(),
  };
});
await page.getByText('Inside refrigerator').click();
await page.getByLabel('Comment').fill('Please include the refrigerator next time.');
await page.getByRole('button', { name: 'Save reply and extras' }).click();
await page.getByRole('heading', { level: 1, name: 'Your reply is saved' }).waitFor();
const savedFocus = await page.evaluate(() => ({
  active_text: document.activeElement?.textContent?.trim(),
  announcement: document.querySelector('#announcer')?.textContent?.trim(),
}));
await page.goto(`${base}/demo`);
await page.getByText('Inside refrigerator', { exact: true }).waitFor();
const downloadPromise = page.waitForEvent('download');
await page.getByRole('button', { name: 'Export next-visit CSV' }).click();
const download = await downloadPromise;
const csv = await fs.readFile(await download.path(), 'utf8');

report.demo_flow = {
  banner: await page.getByText('Demo — sample data, nothing is saved').isVisible(),
  reset: await page.getByRole('button', { name: 'Reset demo' }).isVisible(),
  start_for_real: await page.getByRole('link', { name: 'Start for real' }).isVisible(),
  isolated_storage: Boolean(demoStorage.demo?.demo) && demoStorage.real === null,
  proof_href_shape: proofHref.replace(/(\/proof\/)[^?]+/, '$1<redacted>'),
  proof_document: { status: proofDocument.status(), headers: proofDocument.headers() },
  proof_api: { status: proofApi.status(), headers: proofApi.headers() },
  axe_light_serious_or_critical: proofAxeLight.violations.filter(item => ['serious', 'critical'].includes(item.impact || '')).map(item => item.id),
  axe_dark_serious_or_critical: proofAxeDark.violations.filter(item => ['serious', 'critical'].includes(item.impact || '')).map(item => item.id),
  keyboard_focus: focusedStatus,
  saved_focus: savedFocus,
  csv_has_header: csv.includes('next_visit,client,location,extra,detail,price'),
  csv_has_extra: csv.includes('Inside refrigerator'),
};

await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
await page.goto(`${base}/`);
report.reduced_motion = await page.locator('.button').first().evaluate(node => ({
  transition_duration: getComputedStyle(node).transitionDuration,
  scroll_behavior: getComputedStyle(document.documentElement).scrollBehavior,
}));

const assetUrls = [...new Set(requests.filter(item => ['script', 'stylesheet', 'image'].includes(item.type)).map(item => item.url))];
report.assets = [];
for (const url of assetUrls) {
  const response = await context.request.get(url);
  report.assets.push({
    url,
    bytes: (await response.body()).byteLength,
    cache_control: response.headers()['cache-control'] || null,
  });
}

report.network = {
  origins: [...new Set(requests.map(item => new URL(item.url).origin))],
  request_count: requests.length,
  requests: requests.map(item => ({ ...item, url: item.url.replace(/(\/proof\/)[^?]+/, '$1<redacted>') })),
  response_statuses: Object.fromEntries(Object.entries(Object.groupBy(responses, item => String(item.status))).map(([key, value]) => [key, value.length])),
  console_errors: consoleErrors,
  page_errors: pageErrors,
};
await context.close();

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, extraHTTPHeaders: { 'x-forwarded-for': '198.18.16.17' } });
const mobilePage = await mobile.newPage();
await mobilePage.goto(`${base}/`, { waitUntil: 'networkidle' });
const mobileNormal = await mobilePage.evaluate(() => ({ client_width: document.documentElement.clientWidth, scroll_width: document.documentElement.scrollWidth }));
await mobilePage.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
const mobile200 = await mobilePage.evaluate(() => ({ client_width: document.documentElement.clientWidth, scroll_width: document.documentElement.scrollWidth }));
await mobilePage.screenshot({ path: new URL('mobile-200-percent.png', import.meta.url).pathname.replace('/audit-live.mjs/mobile-200-percent.png', '/mobile-200-percent.png'), fullPage: true });
report.mobile_reflow = { normal: mobileNormal, text_200_percent: mobile200 };
await mobile.close();

await browser.close();
await fs.writeFile(new URL('live-browser-audit.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  first_read: report.first_read,
  demo_flow: report.demo_flow,
  reduced_motion: report.reduced_motion,
  assets: report.assets,
  network: { origins: report.network.origins, request_count: report.network.request_count, response_statuses: report.network.response_statuses, console_errors: report.network.console_errors, page_errors: report.network.page_errors },
  mobile_reflow: report.mobile_reflow,
}, null, 2));
