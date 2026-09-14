import { badgeFor, badgeScope, badgePrefs, BADGE_LIMITS } from './lib.js';

const KEY = 'snapshot';
const PREFS = 'badge';
const showEl = document.getElementById('show');
const orgSel = document.getElementById('org');
const limitSel = document.getElementById('limit');
const badgeEl = document.getElementById('badge');
const scopeEl = document.getElementById('scope');
const hintEl = document.getElementById('hint');

let orgs = [];

function option(value, text) {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = text;
  return o;
}

function current() {
  return badgePrefs({ show: showEl.checked, org: orgSel.value, limit: limitSel.value });
}

function fillOrgs(selected) {
  orgSel.replaceChildren(option('all', 'All organizations'));
  for (const o of orgs) {
    if (!o.error) orgSel.append(option(o.uuid, o.name || 'Untitled organization'));
  }
  // Keep a saved choice visible even when the last reading no longer contains that organization.
  if (selected !== 'all' && !orgs.some((o) => o.uuid === selected)) {
    orgSel.append(option(selected, 'Organization not in the last reading'));
  }
  orgSel.value = selected;
  hintEl.hidden = orgs.length > 0;
}

function renderPreview() {
  const prefs = current();
  orgSel.disabled = limitSel.disabled = !prefs.show;
  const { text, level } = badgeFor(orgs, prefs);
  badgeEl.className = `badge ${text ? level : 'empty'}`;
  badgeEl.textContent = text || '—';
  scopeEl.textContent = !prefs.show ? 'hidden'
    : text ? badgeScope(orgs, prefs) : `${badgeScope(orgs, prefs)} — no data in the last reading`;
}

async function save() {
  await chrome.storage.local.set({ [PREFS]: current() });
  renderPreview();
}

async function load() {
  const store = await chrome.storage.local.get([KEY, PREFS]);
  orgs = (store[KEY] && store[KEY].orgs) || [];
  const prefs = badgePrefs(store[PREFS]);
  showEl.checked = prefs.show;
  limitSel.replaceChildren(...BADGE_LIMITS.map(([value, label]) => option(value, label)));
  limitSel.value = prefs.limit;
  fillOrgs(prefs.org);
  renderPreview();
}

showEl.addEventListener('change', save);
orgSel.addEventListener('change', save);
limitSel.addEventListener('change', save);

// The worker refreshes every couple of minutes; keep the organization list and preview current.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[KEY]) return;
  orgs = (changes[KEY].newValue && changes[KEY].newValue.orgs) || [];
  fillOrgs(orgSel.value);
  renderPreview();
});

load();
