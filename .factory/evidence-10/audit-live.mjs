import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';

const base = 'https://service-proof-loop.sociobot.in';
const browser = await chromium.launch({ headless: true });
const report = {};

for (const profile of [
  { name: 'desktop', width: 1440, height: 900, ip: '203.0.113.210' },
  { name: 'mobile', width: 390, height: 844, ip: '203.0.113.211' },
]) {
  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height },
    reducedMotion: 'reduce',
    extraHTTPHeaders: { 'x-forwarded-for': profile.ip },
  });
  const page = await context.newPage();
  const requests = [];
  const consoleErrors = [];
  const pageErrors = [];
  page.on('request', request => requests.push({ method: request.method(), url: request.url() }));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));

  const landingResponse = await page.goto(base, { waitUntil: 'networkidle' });
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const landing = await page.evaluate(() => ({
    title: document.title,
    lang: document.documentElement.lang,
    h1: [...document.querySelectorAll('h1')].map(node => node.textContent?.trim()),
    mainCount: document.querySelectorAll('main').length,
    sampleAction: [...document.querySelectorAll('a,button')].some(node => node.textContent?.trim() === 'Try it with sample data'),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    reducedMotion: [...document.querySelectorAll('*')].reduce((max, node) => {
      const style = getComputedStyle(node);
      const parse = value => Math.max(...value.split(',').map(item => item.trim().endsWith('ms') ? Number.parseFloat(item) : Number.parseFloat(item) * 1000));
      return Math.max(max, parse(style.animationDuration), parse(style.transitionDuration));
    }, 0),
  }));
  landing.status = landingResponse?.status();
  landing.headers = landingResponse?.headers();
  landing.axeSeriousCritical = axe.violations.filter(item => ['serious', 'critical'].includes(item.impact || '')).map(item => item.id);

  const focusStops = [];
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press('Tab');
    focusStops.push(await page.evaluate(() => {
      const node = document.activeElement;
      const style = getComputedStyle(node);
      return {
        tag: node?.tagName,
        text: node?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 60),
        outline: `${style.outlineWidth} ${style.outlineStyle} ${style.outlineColor}`,
      };
    }));
  }

  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await page.waitForTimeout(2500);
  const demo = await page.evaluate(() => ({
    url: location.href,
    banner: document.body.innerText.includes('Demo — sample data, nothing is saved'),
    sampleVisible: document.body.innerText.includes('Willow Street'),
    accessError: document.body.innerText.includes('Your workspace access is not valid'),
    sessionKeys: Object.keys(sessionStorage),
    localKeys: Object.keys(localStorage),
    h1: [...document.querySelectorAll('h1')].map(node => node.textContent?.trim()),
  }));
  await page.screenshot({ path: `.factory/evidence-10/live-${profile.name}-demo.png`, fullPage: true });

  report[profile.name] = {
    landing,
    focusStops,
    demo,
    requestOrigins: [...new Set(requests.map(request => new URL(request.url).origin))],
    requests,
    consoleErrors,
    pageErrors,
    cookies: await context.cookies(),
  };
  await context.close();
}

await browser.close();
await writeFile('.factory/evidence-10/live-browser-audit.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
