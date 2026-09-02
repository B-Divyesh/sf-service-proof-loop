import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const base = 'https://service-proof-loop.sociobot.in';
const out = new URL('./', import.meta.url);
const browser = await chromium.launch({ headless: true });
const report = { generatedAt: new Date().toISOString(), base, views: {}, demo: {}, routes: {}, links: {}, navigation: {} };

const redact = (value) => value?.replace(/(\/proof\/)[^?]+/, '$1<redacted>') || null;
const storageSummary = (raw) => {
  if (!raw) return { present: false };
  const value = JSON.parse(raw);
  return { present: true, workspaceId: value.workspace_id, demo: value.demo, expiresAt: value.expires_at, hasAccessToken: Boolean(value.access_token) };
};

async function facts(page) {
  return page.evaluate(() => {
    const meta = Object.fromEntries([...document.querySelectorAll('meta[name],meta[property]')].map((el) => [el.getAttribute('name') || el.getAttribute('property'), el.getAttribute('content')]));
    const aboveFold = [...document.querySelectorAll('body *')]
      .filter((el) => {
        if (el.children.length || !(el instanceof HTMLElement)) return false;
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && box.top < innerHeight && box.bottom > 0 && box.left < innerWidth && box.right > 0 && (el.textContent || '').trim();
      })
      .map((el) => ({ tag: el.tagName.toLowerCase(), text: (el.textContent || '').replace(/\s+/g, ' ').trim(), top: Math.round(el.getBoundingClientRect().top), bottom: Math.round(el.getBoundingClientRect().bottom) }));
    const copyUnits = [...document.querySelectorAll('h1,h2,h3,p,li,button,a,legend,label')]
      .filter((el) => !el.querySelector('h1,h2,h3,p,li,button,a,legend,label'))
      .map((el) => ({ tag: el.tagName.toLowerCase(), text: (el.textContent || '').replace(/\s+/g, ' ').trim() }))
      .filter(({ text }) => text);
    return {
      title: document.title,
      lang: document.documentElement.lang,
      h1: [...document.querySelectorAll('h1')].map((el) => el.textContent.trim()),
      headings: [...document.querySelectorAll('h1,h2,h3')].map((el) => ({ level: Number(el.tagName[1]), text: el.textContent.trim() })),
      mainCount: document.querySelectorAll('main').length,
      description: meta.description,
      canonical: document.querySelector('link[rel=canonical]')?.href || null,
      ogTitle: meta['og:title'], ogDescription: meta['og:description'], ogUrl: meta['og:url'], ogImage: meta['og:image'],
      twitterTitle: meta['twitter:title'], twitterDescription: meta['twitter:description'], twitterCard: meta['twitter:card'],
      favicon: document.querySelector('link[rel=icon]')?.href || null,
      appleTouchIcon: document.querySelector('link[rel=apple-touch-icon]')?.href || null,
      aboveFold, copyUnits, bodyText: document.body.innerText,
    };
  });
}

for (const [name, viewport] of Object.entries({ mobile: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } })) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleMessages = [];
  const requests = [];
  page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
  page.on('request', (request) => requests.push({ method: request.method(), url: redact(request.url()), resourceType: request.resourceType() }));
  const response = await page.goto(base + '/', { waitUntil: 'networkidle' });
  report.views[name] = { status: response.status(), ...(await facts(page)), consoleMessages, requests };
  await page.screenshot({ path: new URL(`first-read-${name}.png`, out).pathname });
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => localStorage.setItem('real:workspace', 'review-3-sentinel'));
  const page = await context.newPage();
  const requests = [];
  page.on('request', (request) => requests.push(redact(request.url())));
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const before = await page.evaluate(() => ({ real: localStorage.getItem('real:workspace'), demo: sessionStorage.getItem('demo:workspace') }));
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await page.getByText('Willow Street').first().waitFor();
  const after = await page.evaluate(() => ({ real: localStorage.getItem('real:workspace'), demo: sessionStorage.getItem('demo:workspace') }));
  const banner = await page.getByText('Demo — sample data, nothing is saved').isVisible();
  const resetVisible = await page.getByRole('button', { name: 'Reset demo' }).isVisible();
  const startVisible = await page.getByRole('link', { name: 'Start for real' }).isVisible();
  const proofHref = await page.getByRole('link', { name: 'Open client view' }).getAttribute('href');
  const proofPage = await context.newPage();
  const proofResponse = await proofPage.goto(new URL(proofHref, base).href, { waitUntil: 'networkidle' });
  const proofApi = await context.request.get(base + '/api' + new URL(proofHref, base).pathname);
  const headerNames = ['cache-control', 'x-robots-tag', 'referrer-policy'];
  const pickHeaders = (headers) => Object.fromEntries(Object.entries(headers).filter(([name]) => headerNames.includes(name)));
  const proofFacts = await proofPage.evaluate(() => ({ canonical: document.querySelector('link[rel=canonical]')?.href || null, robots: document.querySelector('meta[name=robots]')?.content || null }));
  await proofPage.close();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.getByText('Willow Street').first().waitFor();
  const reset = await page.evaluate(() => ({ real: localStorage.getItem('real:workspace'), demo: sessionStorage.getItem('demo:workspace') }));
  report.demo = {
    url: page.url(), banner, resetVisible, startVisible,
    initialRealUntouched: before.real === 'review-3-sentinel', afterRealUntouched: after.real === 'review-3-sentinel', resetRealUntouched: reset.real === 'review-3-sentinel',
    initialDemo: storageSummary(before.demo), afterDemo: storageSummary(after.demo), resetDemo: storageSummary(reset.demo), resetChangedToken: after.demo !== reset.demo,
    requestOrigins: [...new Set(requests.map((url) => new URL(url).origin))],
    proof: { href: redact(proofHref), status: proofResponse.status(), ...proofFacts, headers: pickHeaders(proofResponse.headers()), apiStatus: proofApi.status(), apiHeaders: pickHeaders(proofApi.headers()) },
    screen: await facts(page),
  };
  await page.screenshot({ path: new URL('demo-mobile.png', out).pathname });
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const paths = ['/', '/demo', '/app', '/privacy', '/terms', '/definitely-missing'];
  const discovered = new Set();
  for (const path of paths) {
    const response = await page.goto(base + path, { waitUntil: 'networkidle' });
    report.routes[path] = { status: response.status(), ...(await facts(page)) };
    for (const href of await page.locator('a[href]').evaluateAll((links) => links.map((link) => link.href))) discovered.add(href);
  }
  report.links.discovered = [...discovered];
  report.links.results = [];
  for (const href of discovered) {
    if (href.startsWith('mailto:')) { report.links.results.push({ href, skipped: 'mailto' }); continue; }
    const response = await context.request.get(href, { maxRedirects: 0 });
    report.links.results.push({ href: redact(href), status: response.status(), location: redact(response.headers().location) });
  }
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.getByLabel('Main navigation').getByRole('link', { name: 'Privacy' }).click();
  report.navigation.afterRoute = { url: page.url(), focused: await page.evaluate(() => document.activeElement?.textContent?.trim()), title: await page.title() };
  await page.goBack();
  report.navigation.afterBack = { url: page.url(), focused: await page.evaluate(() => document.activeElement?.textContent?.trim()), scrollY: await page.evaluate(() => scrollY) };
  await context.close();
}

await browser.close();
await fs.writeFile(new URL('live-audit.json', out), JSON.stringify(report, null, 2) + '\n');
