import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';

const base = 'https://service-proof-loop.sociobot.in';
const browser = await chromium.launch({ headless: true });
const evidence = {};

async function auditViewport(name, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const requests = [];
  const consoleErrors = [];
  const pageErrors = [];
  page.on('request', request => requests.push({ method: request.method(), url: request.url(), type: request.resourceType() }));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(String(error)));

  const response = await page.goto(base, { waitUntil: 'networkidle' });
  const initialAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const initial = {
    status: response.status(),
    headers: response.headers(),
    title: await page.title(),
    lang: await page.locator('html').getAttribute('lang'),
    h1: await page.locator('h1').allTextContents(),
    main_count: await page.locator('main').count(),
    horizontal_overflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    serious_or_critical_axe: initialAxe.violations.filter(item => ['serious', 'critical'].includes(item.impact || '')),
  };
  await page.screenshot({ path: new URL(`./live-${name}-cold.png`, import.meta.url).pathname, fullPage: false });

  const focus = [];
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press('Tab');
    focus.push(await page.evaluate(() => {
      const element = document.activeElement;
      const style = getComputedStyle(element);
      return {
        tag: element?.tagName,
        text: element?.textContent?.trim(),
        href: element?.getAttribute?.('href'),
        outline: `${style.outlineWidth} ${style.outlineStyle} ${style.outlineColor}`,
        boxShadow: style.boxShadow,
      };
    }));
  }

  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await page.waitForTimeout(2_000);
  const afterDemo = {
    url: page.url(),
    title: await page.title(),
    h1: await page.locator('h1').allTextContents(),
    body: await page.locator('body').innerText(),
    session_demo_present: await page.evaluate(() => Boolean(sessionStorage.getItem('demo:workspace'))),
    real_storage_present: await page.evaluate(() => Boolean(localStorage.getItem('real:workspace'))),
  };
  const demoAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  afterDemo.serious_or_critical_axe = demoAxe.violations.filter(item => ['serious', 'critical'].includes(item.impact || ''));
  await page.screenshot({ path: new URL(`./live-${name}-after-demo.png`, import.meta.url).pathname, fullPage: false });

  const origins = [...new Set(requests.map(request => new URL(request.url).origin))];
  const result = {
    initial,
    focus,
    afterDemo,
    requests,
    origins,
    consoleErrors,
    pageErrors,
    cookies: await context.cookies(),
  };
  await context.close();
  return result;
}

evidence.desktop = await auditViewport('desktop', { width: 1440, height: 900 });
evidence.mobile = await auditViewport('mobile', { width: 390, height: 844 });

const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const reducedPage = await reducedContext.newPage();
await reducedPage.goto(base, { waitUntil: 'networkidle' });
evidence.reduced_motion = await reducedPage.evaluate(() => ({
  matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
  animated_elements: [...document.querySelectorAll('*')].filter(element => {
    const style = getComputedStyle(element);
    return style.animationName !== 'none' && style.animationDuration !== '0s';
  }).map(element => ({ tag: element.tagName, animation: getComputedStyle(element).animationName, duration: getComputedStyle(element).animationDuration })),
  smooth_scroll: getComputedStyle(document.documentElement).scrollBehavior,
}));
await reducedContext.close();

await browser.close();
const output = JSON.stringify(evidence, null, 2);
await writeFile(new URL('./live-browser-audit.json', import.meta.url), output);
console.log(output);
