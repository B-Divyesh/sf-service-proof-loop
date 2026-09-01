import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const base = 'https://service-proof-loop.sociobot.in';
const outDir = new URL('./', import.meta.url);
const browser = await chromium.launch({ headless: true });
const report = { generatedAt: new Date().toISOString(), base, views: {}, demo: {}, routes: {}, links: {}, navigation: {} };

function demoStorage(raw) {
  if (!raw) return { present: false };
  const value = JSON.parse(raw);
  return { present: true, workspaceId: value.workspace_id, demo: value.demo, expiresAt: value.expires_at, hasAccessToken: Boolean(value.access_token) };
}

function redactProofUrl(value) {
  return value?.replace(/(\/proof\/)[^?]+/, '$1<redacted>') || null;
}

async function pageFacts(page) {
  return page.evaluate(() => {
    const metas = Object.fromEntries([...document.querySelectorAll('meta[name],meta[property]')].map((node) => [node.getAttribute('name') || node.getAttribute('property'), node.getAttribute('content')]));
    const visibleAboveFold = [...document.querySelectorAll('body *')]
      .filter((node) => {
        if (node.children.length || !(node instanceof HTMLElement)) return false;
        const style = getComputedStyle(node);
        const box = node.getBoundingClientRect();
        return style.visibility !== 'hidden' && style.display !== 'none' && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth && (node.textContent || '').trim();
      })
      .map((node) => ({ tag: node.tagName.toLowerCase(), text: (node.textContent || '').trim(), top: Math.round(node.getBoundingClientRect().top), bottom: Math.round(node.getBoundingClientRect().bottom) }));
    const copyUnits = [...document.querySelectorAll('h1,h2,h3,p,li,button,a,legend,label')]
      .filter((node) => !node.querySelector('h1,h2,h3,p,li,button,a,legend,label'))
      .map((node) => ({ tag: node.tagName.toLowerCase(), text: (node.textContent || '').replace(/\s+/g, ' ').trim() }))
      .filter((item) => item.text);
    return {
      title: document.title,
      lang: document.documentElement.lang,
      h1: [...document.querySelectorAll('h1')].map((node) => node.textContent?.trim()),
      mainCount: document.querySelectorAll('main').length,
      description: metas.description,
      canonical: document.querySelector('link[rel=canonical]')?.href,
      ogTitle: metas['og:title'],
      ogDescription: metas['og:description'],
      ogImage: metas['og:image'],
      twitterCard: metas['twitter:card'],
      favicon: document.querySelector('link[rel=icon]')?.href,
      appleTouchIcon: document.querySelector('link[rel=apple-touch-icon]')?.href,
      visibleAboveFold,
      copyUnits,
      bodyText: document.body.innerText,
    };
  });
}

for (const [name, viewport] of Object.entries({ mobile: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } })) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleMessages = [];
  const requests = [];
  page.on('console', (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on('request', (request) => requests.push({ method: request.method(), url: request.url(), resourceType: request.resourceType() }));
  const response = await page.goto(base + '/', { waitUntil: 'networkidle' });
  report.views[name] = { status: response?.status(), ...(await pageFacts(page)), consoleMessages, requests };
  await page.screenshot({ path: new URL(`first-read-${name}.png`, outDir).pathname, fullPage: false });
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => localStorage.setItem('real:workspace', 'review-sentinel'));
  const page = await context.newPage();
  const requests = [];
  page.on('request', (request) => requests.push({ method: request.method(), url: request.url() }));
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const beforeClickStorage = await page.evaluate(() => ({ real: localStorage.getItem('real:workspace'), demo: sessionStorage.getItem('demo:workspace') }));
  const beforeClick = { href: page.url(), realWorkspaceUnchanged: beforeClickStorage.real === 'review-sentinel', demo: demoStorage(beforeClickStorage.demo) };
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await page.getByText('Willow Street').first().waitFor();
  const afterClickStorage = await page.evaluate(() => ({ real: localStorage.getItem('real:workspace'), demo: sessionStorage.getItem('demo:workspace') }));
  const afterClick = { ...(await pageFacts(page)), url: page.url(), storage: { realWorkspaceUnchanged: afterClickStorage.real === 'review-sentinel', demo: demoStorage(afterClickStorage.demo) } };
  const proofHref = await page.getByRole('link', { name: 'Open client view' }).getAttribute('href');
  const proofPage = await context.newPage();
  const proofResponse = await proofPage.goto(new URL(proofHref, base).href, { waitUntil: 'networkidle' });
  const proofFacts = await proofPage.evaluate(() => ({
    title: document.title,
    canonical: document.querySelector('link[rel=canonical]')?.href || null,
    robots: document.querySelector('meta[name=robots]')?.content || null,
    referrer: document.querySelector('meta[name=referrer]')?.content || null,
    h1: [...document.querySelectorAll('h1')].map((node) => node.textContent?.trim()),
  }));
  const proofHeaders = Object.fromEntries(Object.entries(proofResponse?.headers() || {}).filter(([name]) => ['x-robots-tag', 'referrer-policy', 'cache-control'].includes(name)));
  const proofApiResponse = await context.request.get(base + '/api' + new URL(proofHref, base).pathname);
  const proofApiBody = await proofApiResponse.json();
  const proofApiHeaders = Object.fromEntries(Object.entries(proofApiResponse.headers()).filter(([name]) => ['x-robots-tag', 'referrer-policy', 'cache-control'].includes(name)));
  await proofPage.close();
  const tokenBeforeReset = afterClickStorage.demo;
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.getByText('Willow Street').first().waitFor();
  const afterResetStorage = await page.evaluate(() => ({ real: localStorage.getItem('real:workspace'), demo: sessionStorage.getItem('demo:workspace') }));
  const afterReset = { realWorkspaceUnchanged: afterResetStorage.real === 'review-sentinel', demo: demoStorage(afterResetStorage.demo) };
  report.demo = { beforeClick, afterClick, proof: { href: redactProofUrl(proofHref), status: proofResponse?.status(), ...proofFacts, canonical: redactProofUrl(proofFacts.canonical), headers: proofHeaders, api: { status: proofApiResponse.status(), headers: proofApiHeaders, returnedFields: Object.keys(proofApiBody) } }, afterReset, resetChangedToken: tokenBeforeReset !== afterResetStorage.demo, requestOrigins: [...new Set(requests.map(({ url }) => new URL(url).origin))], requests };
  await page.screenshot({ path: new URL('demo-mobile.png', outDir).pathname, fullPage: false });
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  for (const path of ['/', '/demo', '/privacy', '/terms', '/app', '/definitely-missing']) {
    const response = await page.goto(base + path, { waitUntil: 'networkidle' });
    report.routes[path] = { status: response?.status(), ...(await pageFacts(page)) };
  }
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const hrefs = await page.locator('a[href]').evaluateAll((links) => [...new Set(links.map((link) => link.href))]);
  report.links.discovered = hrefs;
  report.links.results = [];
  for (const href of hrefs) {
    if (href.startsWith('mailto:')) {
      report.links.results.push({ href, skipped: 'mailto' });
      continue;
    }
    const response = await context.request.get(href, { maxRedirects: 0 });
    report.links.results.push({ href, status: response.status(), location: response.headers().location || null });
  }
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.getByLabel('Main navigation').getByRole('link', { name: 'Privacy' }).click();
  report.navigation.privacy = { url: page.url(), focused: await page.evaluate(() => document.activeElement?.textContent?.trim()), title: await page.title() };
  await page.goBack();
  report.navigation.back = { url: page.url(), focused: await page.evaluate(() => document.activeElement?.textContent?.trim()), scrollY: await page.evaluate(() => scrollY) };
  await context.close();
}

await browser.close();
await fs.writeFile(new URL('live-audit.json', outDir), JSON.stringify(report, null, 2) + '\n');
