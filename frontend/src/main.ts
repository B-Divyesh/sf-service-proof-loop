import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
const SLUG = 'service-proof-loop';
const BILLING = `https://api.sociobot.in/api/v1/products/${SLUG}`;
type Access = { workspace_id: string; access_token: string; demo: boolean; expires_at?: string };
type RequestedExtra = { name: string; detail: string; price_cents: number };
type Visit = {
  id: string; client_name: string; location_label: string; completed_at: string; next_visit_at: string;
  technician: string; response_status?: string; rating?: number; proof_token?: string; requested_extras: RequestedExtra[];
};
type Extra = { id: string; name: string; detail: string; price_cents: number };
type Proof = {
  id: string; business_name: string; client_name: string; location_label: string; completed_at: string;
  next_visit_at: string; technician: string; checklist: {label: string; done: boolean}[]; notes: string;
  photos: {url: string; caption: string}[]; response_status?: string; rating?: number; client_comment?: string;
  extras: Extra[]; requested_extras: RequestedExtra[]; expires_at: string;
};

const esc = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]!));
const money = (cents: number) => `$${(cents / 100).toFixed(0)}`;
const day = (value: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value.length === 10 ? `${value}T12:00:00` : value));
const jsonHeaders = {'content-type': 'application/json'};

function access(mode: 'demo'|'real'): Access | null {
  const storage = mode === 'demo' ? sessionStorage : localStorage;
  try { return JSON.parse(storage.getItem(`${mode}:workspace`) || 'null'); } catch { return null; }
}

function saveAccess(value: Access) {
  const mode = value.demo ? 'demo' : 'real';
  (value.demo ? sessionStorage : localStorage).setItem(`${mode}:workspace`, JSON.stringify(value));
}

async function api<T>(path: string, init: RequestInit = {}, mode?: 'demo'|'real'): Promise<T> {
  const current = mode ? access(mode) : null;
  const headers = new Headers(init.headers);
  if (current) headers.set('authorization', `Bearer ${current.access_token}`);
  const license = localStorage.getItem(`sb_license:${SLUG}`);
  if (license) headers.set('x-product-license', license);
  const response = await fetch(`/api${path}`, {...init, headers});
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'The service could not finish that. Try again.');
  return data as T;
}

function mark() {
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M13 23c0-6 5-10 11-10h8v15H24a5 5 0 0 0 0 10h16a5 5 0 0 0 0-10h-4V13h4c12 0 17 8 17 20S50 53 39 53H24C13 53 7 45 7 35c0-5 2-9 6-12Z" fill="currentColor"/><circle cx="42" cy="33" r="6" fill="#d9683b"/></svg>`;
}

function header() {
  return `<a class="skip-link" href="#main">Skip to main content</a>
    <header class="site-header">
      <a class="wordmark" href="/" data-route>${mark()}<span>Service Proof Loop</span></a>
      <nav class="nav" aria-label="Main navigation">
        <a href="/demo" data-route>Demo</a>
        <a href="/app" data-route>Workspace</a>
        <a href="/#pricing">Price</a>
        <a href="/privacy" data-route>Privacy</a>
      </nav>
    </header>`;
}

function footer() {
  return `<footer class="site-footer"><div class="shell footer-grid">
    <div><strong>Service Proof Loop</strong><p class="tiny">Send visit proof and plan the next visit.</p><p class="tiny">Original product art was generated for this service.</p></div>
    <div class="footer-links"><a href="/privacy" data-route>Privacy</a><a href="/terms" data-route>Terms</a><a href="https://sociobot.in" rel="external">Built by Param Factory <span class="sr-only">(external site)</span></a></div>
    <p class="tiny">Version 1.0.0 · Build 2026.08</p>
  </div></footer>`;
}

function page(content: string, demo = false) {
  return `${demo ? demoBanner() : ''}${header()}<main id="main" tabindex="-1">${content}</main>${footer()}<div id="announcer" class="sr-only" aria-live="polite"></div>`;
}

function demoBanner() {
  return `<aside class="demo-banner" aria-label="Demo status"><strong>Demo — sample data, nothing is saved</strong>
    <button class="ghost" id="reset-demo" type="button">Reset demo</button>
    <a class="button ghost" href="/app" data-route>Start for real</a></aside>`;
}

function landing() {
  setMeta('Service Proof Loop — Send proof after each visit', 'Send visit proof, collect client feedback, and carry approved extras into the next recurring visit.');
  app.innerHTML = page(`
    <section class="shell hero">
      <div class="hero-copy">
        <p class="eyebrow">After-visit proof for recurring services</p>
        <h1>Send proof. Plan the next visit.</h1>
        <p class="lede">For recurring service teams that need client feedback and approved extras without another customer app.</p>
        <div class="primary-row"><a class="button" href="/demo" data-route>Try it with sample data</a><small>Loads a sample visit. Nothing is saved.</small></div>
        <ul class="facts"><li>Proof links expire after 14 days.</li><li>Clients open links without an account.</li><li>Three visits free. $59 once for unlimited visits.</li></ul>
      </div>
      <div class="hero-art">
        <img src="/assets/proof-loop-hero.webp" width="1024" height="683" alt="Two porcelain trays linked by blue glaze move proof into one next-visit task." fetchpriority="high" decoding="async">
        <div class="art-note">One client choice moves into the next visit.</div>
      </div>
    </section>
    <section class="section" aria-labelledby="preview-title"><div class="shell">
      <div class="section-head"><p class="eyebrow">The product</p><div><h2 id="preview-title">See the full loop on one screen</h2><p>Crews record the visit. Clients review the proof. The office exports approved extras without typing them again.</p></div></div>
      <div class="preview-workbench" aria-label="Example visit workspace">
        <div class="preview-bar"><strong>Northstar Home Care</strong><span class="state pending">Waiting for client</span></div>
        <div class="preview-body"><aside class="visit-rail"><strong>Visits</strong><ul><li><b>Willow Street</b><br><small>Today · Elena</small></li><li>Lake Avenue<br><small>Yesterday · Sam</small></li></ul></aside>
          <div class="proof-sheet"><p class="eyebrow">Visit complete</p><h3>Maya’s visit at Willow Street</h3><p class="meta">Four checks · Two photos · Next visit Sep 11</p>
            <ul class="check-list"><li><span class="check">✓</span>Kitchen surfaces and sink</li><li><span class="check">✓</span>Two bathrooms</li><li><span class="check">✓</span>Floors vacuumed and mopped</li></ul>
            <div class="transfer"><strong>Next visit</strong><p>Inside refrigerator · Client approved · $28</p></div>
          </div>
        </div>
      </div>
    </div></section>
    <section class="section" aria-labelledby="how-title"><div class="shell">
      <div class="section-head"><p class="eyebrow">How it works</p><div><h2 id="how-title">Close the visit before work gets lost</h2></div></div>
      <div class="steps"><article><h3>Record the visit</h3><p>The technician checks the work, adds photos with consent, and sends one private link.</p></article><article><h3>Collect one clear reply</h3><p>The client accepts the work or reports a problem. They can rate it and choose extras.</p></article><article><h3>Carry work forward</h3><p>Approved extras appear beside the next date. Export them as a ready-to-use CSV.</p></article></div>
    </div></section>
    <section class="section privacy-band" aria-labelledby="limits-title"><div class="shell">
      <div class="section-head"><p class="eyebrow">Clear boundaries</p><div><h2 id="limits-title">Proof only, not another field system</h2><p>This service keeps the after-visit exchange small and clear.</p></div></div>
      <div class="limits"><div><h3>What it handles</h3><ul class="plain-list"><li>Visit checklists and consented photos</li><li>Client acceptance, problems, and ratings</li><li>Approved extras for the next visit</li></ul></div><div><h3>What it leaves alone</h3><ul class="plain-list"><li>No dispatch, payroll, or worker tracking</li><li>No home-entry codes or payment cards</li><li>No public review campaigns</li></ul></div></div>
    </div></section>
    <section class="section" id="pricing" aria-labelledby="price-title"><div class="shell"><div class="price-sheet">
      <div><p class="eyebrow">Business license</p><h2 id="price-title">Keep every recurring visit in the loop</h2><p>Add unlimited client proof links after three free visits.</p><ul class="plain-list"><li>One business workspace</li><li>Configurable client extras</li><li>Next-visit CSV exports</li></ul></div>
      <div><p class="price">$59 <small>one-time purchase</small></p><a class="button" href="${BILLING}/checkout">Buy the business license <span class="sr-only">at Sociobot checkout</span></a>
        <form class="license-form" id="license-form"><label for="license">Have a license?</label><input id="license" name="license" autocomplete="off" required><button class="secondary" type="submit">Verify license</button></form><p id="license-note" class="tiny" aria-live="polite">Sociobot is the merchant of record. Refunds are handled there.</p>
        <p class="tiny"><a class="touch-link" href="/privacy" data-route>Privacy</a> · <a class="touch-link" href="/terms" data-route>Terms</a></p></div>
    </div></div></section>`);
  bindLicense();
}

async function demo(reset = false) {
  setMeta('Demo — Service Proof Loop', 'Try a complete proof-to-next-visit loop with isolated sample data.');
  if (reset) sessionStorage.removeItem('demo:workspace');
  if (!access('demo')) {
    app.innerHTML = page(`<div class="shell loading"><div><div class="loading-mark" aria-hidden="true"></div><h1>Preparing the sample visit</h1><p>We are making an isolated workspace for this demo.</p></div></div>`, true);
    bindDemoBanner();
    try {
      saveAccess(await api<Access>('/demo', {method:'POST'}));
    } catch (error) {
      app.innerHTML = page(`<section class="shell legal"><h1>The sample could not load</h1><p class="message error">${esc(error instanceof Error ? error.message : error)}</p><button id="retry-demo">Try the demo again</button></section>`, true);
      document.querySelector('#retry-demo')?.addEventListener('click', () => demo(true));
      bindDemoBanner(); return;
    }
  }
  await workspace('demo');
}

async function workspace(mode: 'demo'|'real') {
  const current = access(mode);
  if (!current && mode === 'real') { return onboarding(); }
  setMeta(`${mode === 'demo' ? 'Demo' : 'Workspace'} — Service Proof Loop`, 'Record completed visits and carry client extras into the next visit.');
  app.innerHTML = page(`<div class="shell loading"><div><div class="loading-mark" aria-hidden="true"></div><h1>Loading visits</h1></div></div>`, mode === 'demo');
  bindDemoBanner();
  try {
    const visits = await api<Visit[]>('/visits', {}, mode);
    renderWorkspace(mode, visits);
  } catch (error) {
    app.innerHTML = page(`<section class="shell legal"><h1>Visits could not load</h1><p class="message error">${esc(error instanceof Error ? error.message : error)}</p><button id="retry-workspace">Try loading again</button></section>`, mode === 'demo');
    document.querySelector('#retry-workspace')?.addEventListener('click', () => workspace(mode)); bindDemoBanner();
  }
}

function renderWorkspace(mode: 'demo'|'real', visits: Visit[], selected = 0) {
  const visit = visits[selected];
  app.innerHTML = page(`<div class="shell app-main">
    <div class="app-title"><div><p class="eyebrow">${mode === 'demo' ? 'Sample workspace' : 'Business workspace'}</p><h1>Completed visits</h1><p class="lede">Proof, feedback, and next-visit work stay together.</p></div><div class="title-actions"><button class="secondary" id="manage-extras">Manage extras</button><button id="new-visit" ${mode === 'real' && visits.length >= 3 && !licenseActive() ? 'disabled title="The free plan includes three visits."':''}>Record a visit</button></div></div>
    ${mode === 'real' && visits.length >= 3 && !licenseActive() ? '<p class="message">The free plan includes three visits. The business plan adds unlimited visits.</p>':''}
    <div class="workspace-grid"><aside class="work-rail" aria-label="Completed visits"><strong>Recent visits</strong><ul>${visits.map((v,i) => `<li><button data-visit="${i}" class="${i === selected ? 'active':''}">${esc(v.location_label)} <span class="sr-only">${v.response_status || 'waiting'}</span></button></li>`).join('')}</ul></aside>
      <div id="visit-panel">${visit ? visitPanel(visit, mode) : emptyVisits()}</div></div>
  </div>`, mode === 'demo');
  bindDemoBanner();
  document.querySelectorAll<HTMLButtonElement>('[data-visit]').forEach(button => button.addEventListener('click', () => renderWorkspace(mode, visits, Number(button.dataset.visit))));
  document.querySelector('#new-visit')?.addEventListener('click', () => renderVisitForm(mode));
  document.querySelector('#manage-extras')?.addEventListener('click', () => manageExtras(mode));
  document.querySelector('#copy-proof')?.addEventListener('click', async () => {
    const input = document.querySelector<HTMLInputElement>('#proof-url'); if (!input) return;
    try { await navigator.clipboard.writeText(input.value); toast('Proof link copied.'); } catch { input.select(); toast('Select and copy the proof link.'); }
  });
  document.querySelector('#export-csv')?.addEventListener('click', () => exportCsv(visit.id, mode));
}

async function manageExtras(mode: 'demo'|'real') {
  setMeta('Extras — Service Proof Loop', 'Choose the extras clients can add to their next visit.');
  app.innerHTML = page(`<div class="shell loading"><div><div class="loading-mark" aria-hidden="true"></div><h1>Loading extras</h1></div></div>`, mode === 'demo'); bindDemoBanner();
  try {
    const extras = await api<Extra[]>('/extras', {}, mode);
    app.innerHTML = page(`<section class="shell app-main"><p class="eyebrow">Client choices</p><h1>Manage next-visit extras</h1><p class="lede">These choices appear on every client proof page.</p><div class="workspace-grid"><div><button class="ghost" id="back-visits">Back to visits</button></div><div><div class="panel"><h2>Current extras</h2><div class="extras">${extras.map(extra => `<div class="task-chip"><span><strong>${esc(extra.name)}</strong><br><small>${esc(extra.detail)}</small></span><strong>${money(extra.price_cents)}</strong></div>`).join('')}</div></div><form class="panel" id="extra-form"><h2>Add an extra</h2><div class="form-grid"><div class="field"><label for="extra-name">Extra name</label><input id="extra-name" name="name" maxlength="80" required></div><div class="field"><label for="extra-price">Price in dollars</label><input id="extra-price" name="price" type="number" min="0" max="1000" step="0.01" required></div><div class="field full"><label for="extra-detail">What the technician will do</label><input id="extra-detail" name="detail" maxlength="160" required></div></div><p id="form-error" aria-live="assertive"></p><div class="form-actions"><button type="submit">Add client choice</button></div></form></div></div></section>`, mode === 'demo');
    bindDemoBanner(); document.querySelector('#back-visits')?.addEventListener('click', () => workspace(mode));
    document.querySelector<HTMLFormElement>('#extra-form')?.addEventListener('submit', async event => { event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const values = new FormData(form); const button = form.querySelector<HTMLButtonElement>('button')!; button.disabled = true; button.textContent = 'Adding choice…'; try { await api('/extras', {method:'POST',headers:jsonHeaders,body:JSON.stringify({name:values.get('name'),detail:values.get('detail'),price_cents:Math.round(Number(values.get('price'))*100)})}, mode); toast('Client choice added.'); await manageExtras(mode); } catch(error) { showError(error); button.disabled = false; button.textContent = 'Add client choice'; } });
  } catch(error) { app.innerHTML = page(`<section class="shell legal"><h1>Extras could not load</h1><p class="message error">${esc(error instanceof Error ? error.message : error)}</p><button id="back-visits">Back to visits</button></section>`, mode === 'demo'); bindDemoBanner(); document.querySelector('#back-visits')?.addEventListener('click', () => workspace(mode)); }
}

function visitPanel(visit: Visit, mode: 'demo'|'real') {
  const savedToken = sessionStorage.getItem(`proof:${visit.id}`);
  const token = visit.proof_token || savedToken;
  const proofUrl = token ? `${location.origin}/proof/${token}${mode === 'demo' ? '?demo=1' : ''}` : '';
  return `<article class="panel"><div class="visit-heading"><div><span class="state ${visit.response_status ? '' : 'pending'}">${visit.response_status ? esc(visit.response_status) : 'Waiting for client'}</span><h2>${esc(visit.client_name)} · ${esc(visit.location_label)}</h2><p class="meta">Completed ${day(visit.completed_at)} by ${esc(visit.technician)}</p></div>${visit.rating ? `<strong aria-label="Client rating ${visit.rating} out of 5">${'●'.repeat(visit.rating)}<span class="sr-only"> ${visit.rating} out of 5</span></strong>` : ''}</div>
    ${token ? `<div class="field full"><label for="proof-url">Private proof link</label><input id="proof-url" value="${esc(proofUrl)}" readonly><div class="form-actions"><button id="copy-proof" class="secondary">Copy proof link</button><a class="button ghost" href="/proof/${esc(token)}${mode === 'demo' ? '?demo=1' : ''}" data-route>Open client view</a></div></div>` : `<p class="message">This proof link was already handed off. Create a new visit if the client needs another link.</p>`}
    <div class="next-visit"><h3>Next visit · ${day(visit.next_visit_at)}</h3>${visit.requested_extras.length ? visit.requested_extras.map(extra => `<div class="task-chip"><span><strong>${esc(extra.name)}</strong><br><small>${esc(extra.detail)}</small></span><strong>${money(extra.price_cents)}</strong></div>`).join('') : `<p>No extras requested yet. Client choices will appear here.</p>`}</div>
    <div class="form-actions"><button id="export-csv" class="secondary">Export next-visit CSV</button></div></article>`;
}

function emptyVisits() {
  return `<div class="panel empty"><div class="empty-mark" aria-hidden="true"></div><h2>No completed visits yet</h2><p>Record a visit to make its private client proof link.</p></div>`;
}

function onboarding() {
  setMeta('Start — Service Proof Loop', 'Create a local business workspace for completed visits.');
  app.innerHTML = page(`<section class="shell legal"><p class="eyebrow">Start for real</p><h1>Create your business workspace</h1><p class="lede">Name the service business that clients will see on proof links.</p><form id="workspace-form" class="panel measure"><div class="field"><label for="business-name">Business name</label><input id="business-name" name="name" maxlength="80" required autocomplete="organization"></div><div class="form-actions"><button type="submit">Create workspace</button></div><p class="tiny">This browser stores an access key. Save work on a device your office controls.</p><p id="form-error" aria-live="polite"></p></form></section>`);
  document.querySelector<HTMLFormElement>('#workspace-form')?.addEventListener('submit', async event => {
    event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const button = form.querySelector<HTMLButtonElement>('button')!; button.disabled = true; button.textContent = 'Creating workspace…';
    try { saveAccess(await api<Access>('/workspaces', {method:'POST', headers:jsonHeaders, body:JSON.stringify({name:new FormData(form).get('name')})})); await workspace('real'); }
    catch(error) { showError(error); button.disabled = false; button.textContent = 'Create workspace'; }
  });
}

function renderVisitForm(mode: 'demo'|'real') {
  const defaultDate = new Date(Date.now() + 14*86400000).toISOString().slice(0,10);
  app.innerHTML = page(`<section class="shell app-main"><p class="eyebrow">Technician record</p><h1>Record a completed visit</h1><p class="lede">Check the work and share only photos the client allowed.</p>
    <form id="visit-form" class="panel"><div class="form-grid">
      <div class="field"><label for="client-name">Client name</label><input id="client-name" name="client_name" maxlength="80" value="${mode === 'demo' ? 'Jordan Ellis':''}" required></div>
      <div class="field"><label for="location">Location label</label><input id="location" name="location_label" maxlength="120" value="${mode === 'demo' ? 'Cedar Lane':''}" required><small>Use a short label. Do not enter access codes.</small></div>
      <div class="field"><label for="technician">Technician name</label><input id="technician" name="technician" maxlength="80" value="${mode === 'demo' ? 'Sam':''}" required></div>
      <div class="field"><label for="next-date">Next visit date</label><input id="next-date" name="next_visit_at" type="date" value="${defaultDate}" required></div>
      <fieldset class="field full"><legend>Work completed</legend><label class="choice"><input type="checkbox" name="check" value="Kitchen surfaces and sink" checked>Kitchen surfaces and sink</label><label class="choice"><input type="checkbox" name="check" value="Bathrooms" checked>Bathrooms</label><label class="choice"><input type="checkbox" name="check" value="Floors vacuumed and mopped" checked>Floors vacuumed and mopped</label></fieldset>
      <div class="field full"><label for="notes">Visit note</label><textarea id="notes" name="notes" maxlength="600"></textarea></div>
      <div class="field full"><label for="photos">Proof photos</label><input id="photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple><small>Up to three images. Each image must stay under 1 MB.</small></div>
      <div class="field full"><label class="choice"><input type="checkbox" name="photo_consent" ${mode === 'demo' ? 'checked':''}>The client allowed photos from this visit to be shared.</label></div>
    </div><p id="form-error" aria-live="assertive"></p><div class="form-actions"><button type="submit">Create proof link</button><button class="ghost" type="button" id="cancel-visit">Cancel</button></div></form></section>`, mode === 'demo');
  bindDemoBanner();
  document.querySelector('#cancel-visit')?.addEventListener('click', () => workspace(mode));
  document.querySelector<HTMLFormElement>('#visit-form')?.addEventListener('submit', event => submitVisit(event, mode));
}

async function submitVisit(event: SubmitEvent, mode: 'demo'|'real') {
  event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const data = new FormData(form); const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const fileInput = form.elements.namedItem('photos') as HTMLInputElement; const files = [...(fileInput.files || [])];
  if (files.length > 3 || files.some(file => file.size > 1_000_000)) return showError(new Error('Use up to three photos under 1 MB each.'));
  button.disabled = true; button.textContent = 'Creating proof link…';
  try {
    const photos = await Promise.all(files.map(async file => ({url: await fileData(file), caption: `Proof photo: ${file.name}`})));
    const checks = [...form.querySelectorAll<HTMLInputElement>('input[name=check]:checked')].map(input => ({label:input.value, done:true}));
    const result = await api<{id:string; proof_token:string}>('/visits', {method:'POST', headers:jsonHeaders, body:JSON.stringify({
      client_name:data.get('client_name'), location_label:data.get('location_label'), technician:data.get('technician'), next_visit_at:data.get('next_visit_at'), notes:data.get('notes'), checklist:checks, photos, photo_consent:data.get('photo_consent') === 'on'
    })}, mode);
    sessionStorage.setItem(`proof:${result.id}`, result.proof_token); toast('Proof link created.'); await workspace(mode);
  } catch(error) { showError(error); button.disabled = false; button.textContent = 'Create proof link'; }
}

function fileData(file: File): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('A photo could not be read. Choose it again.')); reader.readAsDataURL(file); }); }

async function proof(token: string, isDemo: boolean) {
  setMeta('Visit proof — Service Proof Loop', 'Review completed work and choose any extras for the next visit.');
  app.innerHTML = page(`<div class="shell loading"><div><div class="loading-mark" aria-hidden="true"></div><h1>Loading visit proof</h1></div></div>`, isDemo); bindDemoBanner();
  try { renderProof(token, await api<Proof>(`/proof/${encodeURIComponent(token)}`), isDemo); }
  catch(error) { app.innerHTML = page(`<section class="shell legal"><h1>This proof is not available</h1><p class="message error">${esc(error instanceof Error ? error.message : error)}</p><a class="button" href="/" data-route>Return home</a></section>`, isDemo); bindDemoBanner(); }
}

function renderProof(token: string, data: Proof, isDemo: boolean, saved = false) {
  app.innerHTML = page(`<article class="proof-client"><div class="panel"><p class="eyebrow">${esc(data.business_name)} · Visit proof</p><h1>${saved || data.response_status ? 'Your reply is saved' : 'Review your completed visit'}</h1><p class="lede">${esc(data.client_name)}, here is the work ${esc(data.technician)} recorded at ${esc(data.location_label)}.</p>
    <p class="meta">Completed ${day(data.completed_at)} · Link expires ${day(data.expires_at)}</p>
    <h2>Work completed</h2><ul class="check-list">${data.checklist.map(item => `<li><span class="check">✓</span>${esc(item.label)}</li>`).join('')}</ul>
    ${data.notes ? `<div class="message"><strong>Technician note</strong><p>${esc(data.notes)}</p></div>`:''}
    ${data.photos.length ? `<div class="photo-grid">${data.photos.map(photo => `<figure><img src="${esc(photo.url)}" alt="${esc(photo.caption)}" width="800" height="560" loading="lazy" decoding="async"><figcaption>${esc(photo.caption)}</figcaption></figure>`).join('')}</div>`:''}
    ${saved || data.response_status ? responseSummary(data) : responseForm(data)}
    <p class="tiny form-section">This link should show only your visit. <a class="touch-link" href="mailto:abuse@sociobot.in?subject=Service%20Proof%20Loop%20report">Report a link sent in error</a>.</p>
  </div></article>`, isDemo);
  bindDemoBanner();
  const form = document.querySelector<HTMLFormElement>('#response-form');
  form?.addEventListener('submit', async event => {
    event.preventDefault(); const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!; const values = new FormData(form); button.disabled = true; button.textContent = 'Saving reply…';
    try {
      await api(`/proof/${encodeURIComponent(token)}/respond`, {method:'POST',headers:jsonHeaders,body:JSON.stringify({status:values.get('status'),rating:Number(values.get('rating')),comment:values.get('comment'),extra_ids:values.getAll('extras')})});
      const updated = await api<Proof>(`/proof/${encodeURIComponent(token)}`);
      renderProof(token, updated, isDemo, true);
      window.scrollTo(0, 0);
      focusPageHeading('Your reply is saved');
    } catch(error) { showError(error); button.disabled = false; button.textContent = 'Save reply and extras'; }
  });
}

function responseForm(data: Proof) {
  return `<form id="response-form"><h2>Reply to this visit</h2><fieldset><legend>Is the work complete?</legend><div class="status-options"><label><input type="radio" name="status" value="accepted" checked><span>Accept the work</span></label><label><input type="radio" name="status" value="problem"><span>Report a problem</span></label></div></fieldset>
    <fieldset class="field"><legend>Rate this visit</legend><div class="rating">${[1,2,3,4,5].map(value => `<label><input type="radio" name="rating" value="${value}" ${value === 5 ? 'checked':''}><span>${value}</span></label>`).join('')}</div></fieldset>
    <div class="field form-section"><label for="comment">Comment</label><textarea id="comment" name="comment" maxlength="600"></textarea></div>
    <fieldset class="form-section"><legend>Extras for ${day(data.next_visit_at)}</legend><p>Choose work to add to the next visit.</p><div class="extras">${data.extras.map(extra => `<label class="extra-option"><input type="checkbox" name="extras" value="${esc(extra.id)}"><span><strong>${esc(extra.name)}</strong><br><small>${esc(extra.detail)}</small></span><strong>${money(extra.price_cents)}</strong></label>`).join('')}</div></fieldset>
    <p id="form-error" aria-live="assertive"></p><div class="form-actions"><button type="submit">Save reply and extras</button></div></form>`;
}

function responseSummary(data: Proof) {
  return `<div class="message success"><h2>Thank you</h2><p>The team can now see your ${data.response_status === 'problem' ? 'problem report' : 'acceptance'} and rating.</p></div>
    <div class="next-visit"><h3>Next visit · ${day(data.next_visit_at)}</h3>${data.requested_extras.length ? data.requested_extras.map(extra => `<div class="task-chip"><span><strong>${esc(extra.name)}</strong><br>${esc(extra.detail)}</span><strong>${money(extra.price_cents)}</strong></div>`).join('') : '<p>No extras were added.</p>'}</div>`;
}

async function exportCsv(id: string, mode: 'demo'|'real') {
  try {
    const current = access(mode)!; const response = await fetch(`/api/visits/${id}/export.csv`, {headers:{authorization:`Bearer ${current.access_token}`}});
    if (!response.ok) throw new Error((await response.json()).error || 'The CSV could not download. Try again.');
    const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = 'next-visit.csv'; link.click(); URL.revokeObjectURL(url); toast('Next-visit CSV exported.');
  } catch(error) { toast(error instanceof Error ? error.message : 'The CSV could not download.'); }
}

function legal(kind: 'privacy'|'terms') {
  const privacy = kind === 'privacy';
  setMeta(`${privacy ? 'Privacy' : 'Terms'} — Service Proof Loop`, privacy ? 'How Service Proof Loop handles visit proof and client replies.' : 'Terms for using Service Proof Loop.');
  app.innerHTML = page(`<article class="shell legal measure"><p class="eyebrow">Last updated August 28, 2026</p><h1>${privacy ? 'Privacy for visit proof' : 'Terms of service'}</h1>
    ${privacy ? `<p>Service Proof Loop stores the details needed to share completed work and plan the next visit.</p><h2>What we store</h2><p>We store business names, client labels, visit notes, consented photos, ratings, comments, and chosen extras.</p><p>Do not enter door codes, payment cards, health records, or other unnecessary private details.</p><h2>How the product uses it</h2><p>Visit details appear in proof links. Client replies and chosen extras appear in the workspace and next-visit exports.</p><h2>Proof links</h2><p>Each proof link uses a random token and expires after 14 days. Anyone with the link can view its visit.</p><h2>Demo data</h2><p>Each demo uses an isolated workspace. It expires within 24 hours and never opens a real workspace.</p><h2>Billing</h2><p>Sociobot hosts checkout. Dodo handles payment card details on that checkout page.</p><h2>Your choices</h2><p>Ask the business that sent your link to correct or remove visit data. Businesses can contact support for account deletion.</p><h2>Contact</h2><p>Email <a class="touch-link" href="mailto:privacy@sociobot.in">privacy@sociobot.in</a> with privacy questions.</p>` : `<p>These terms apply when you use Service Proof Loop.</p><h2>Use the service fairly</h2><p>Use the service for lawful visit proof and client feedback. Get consent before taking or sharing photos.</p><p>Do not upload harmful content, access another workspace, or test proof links you did not receive.</p><h2>Your responsibilities</h2><p>You control what your team records. Keep workspace access keys on devices your business controls.</p><h2>Business license</h2><p>The business license costs $59 as a one-time purchase. Sociobot is the merchant of record.</p><p>Refunds follow the checkout terms and revoke the related license.</p><h2>Service limits</h2><p>This product does not provide dispatch, payments, payroll, worker tracking, or emergency communication.</p><h2>Availability</h2><p>We work to keep the service available. We cannot promise uninterrupted access or permanent storage.</p><h2>Contact</h2><p>Email <a class="touch-link" href="mailto:support@sociobot.in">support@sociobot.in</a> with service questions.</p>`}
  </article>`);
}

function notFound() {
  setMeta('Page not found — Service Proof Loop', 'Return to Service Proof Loop.');
  app.innerHTML = page(`<section class="shell legal"><p class="eyebrow">404</p><h1>This page does not exist</h1><div class="not-found-mark" aria-hidden="true"><span></span><span></span></div><p>Check the address or return to the home page.</p><a class="button" href="/" data-route>Return home</a></section>`);
}

function setMeta(title: string, description: string) {
  document.title = title; document.querySelector<HTMLMetaElement>('meta[name=description]')!.content = description;
  const canonical = document.querySelector<HTMLLinkElement>('link[rel=canonical]')!; canonical.href = `https://service-proof-loop.sociobot.in${location.pathname}`;
}

function focusPageHeading(announcement?: string) {
  const heading = document.querySelector<HTMLElement>('h1');
  const announcer = document.querySelector<HTMLElement>('#announcer');
  if (!heading) return;
  heading.tabIndex = -1;
  heading.focus({preventScroll: true});
  requestAnimationFrame(() => {
    if (announcer) announcer.textContent = announcement || heading.textContent || document.title;
  });
}

function bindDemoBanner() {
  document.querySelector('#reset-demo')?.addEventListener('click', () => demo(true));
  document.querySelector('.demo-banner a[href="/app"]')?.addEventListener('click', () => sessionStorage.removeItem('demo:workspace'));
}
function showError(error: unknown) { const node = document.querySelector('#form-error'); if (node) { node.className = 'message error'; node.textContent = error instanceof Error ? error.message : 'That could not be saved. Try again.'; node.scrollIntoView({block:'center'}); } }
function toast(message: string) { document.querySelector('.toast')?.remove(); const node = document.createElement('div'); node.className = 'toast'; node.setAttribute('role','status'); node.textContent = message; document.body.append(node); setTimeout(() => node.remove(), 3200); }

function bindLicense() {
  document.querySelector<HTMLFormElement>('#license-form')?.addEventListener('submit', async event => {
    event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const token = String(new FormData(form).get('license') || '').trim(); if (!token) return;
    localStorage.setItem(`sb_license:${SLUG}`, token); await verifyLicense(token, true);
  });
  const token = localStorage.getItem(`sb_license:${SLUG}`); const cache = localStorage.getItem(`sb_license_check:${SLUG}`);
  if (token && (!cache || Date.now() - Number(cache) > 86400000)) verifyLicense(token, false);
}
function licenseActive() { return localStorage.getItem(`sb_license_valid:${SLUG}`) === 'true'; }
async function verifyLicense(token: string, announce: boolean) {
  const note = document.querySelector('#license-note');
  try { const response = await fetch(`${BILLING}/verify?license=${encodeURIComponent(token)}`); const result = await response.json(); localStorage.setItem(`sb_license_check:${SLUG}`, String(Date.now())); localStorage.setItem(`sb_license_valid:${SLUG}`, String(Boolean(result.valid))); if (note && (announce || !result.valid)) note.textContent = result.valid ? 'License active on this browser.' : 'License no longer active. Check the token or buy the plan.'; }
  catch { if (note && announce) note.textContent = 'The license could not be checked. Check your connection and try again.'; }
}

async function route(push = false) {
  if (push) history.pushState({}, '', location.href);
  const path = location.pathname.replace(/\/$/, '') || '/';
  if (path === '/') landing();
  else if (path === '/demo') await demo();
  else if (path === '/app') await workspace('real');
  else if (path === '/privacy') legal('privacy');
  else if (path === '/terms') legal('terms');
  else if (path.startsWith('/proof/')) await proof(decodeURIComponent(path.slice(7)), new URLSearchParams(location.search).get('demo') === '1');
  else notFound();
  window.scrollTo(0,0);
  focusPageHeading();
}

document.addEventListener('click', event => {
  const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[data-route]');
  if (!link || link.origin !== location.origin || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); history.pushState({}, '', link.href); route();
});
document.addEventListener('focusin', event => {
  const control = (event.target as HTMLElement).closest('.status-options input, .rating input');
  control?.closest('label')?.scrollIntoView({block: 'center', behavior: 'instant'});
});
window.addEventListener('popstate', () => route());
window.addEventListener('offline', () => { if (document.querySelector('#offline-note')) return; const node = document.createElement('div'); node.className = 'offline'; node.id = 'offline-note'; node.setAttribute('role','status'); node.textContent = 'You are offline. Reconnect to load or save visit proof.'; document.body.append(node); });
window.addEventListener('online', () => document.querySelector('#offline-note')?.remove());

const returnedLicense = new URLSearchParams(location.search).get('license');
if (returnedLicense) { localStorage.setItem(`sb_license:${SLUG}`, returnedLicense); const url = new URL(location.href); url.searchParams.delete('license'); history.replaceState({},'',url); }
route();
