// Service worker: periodically collect every organization's usage, cache it, update the badge.
import { badgeFor, badgePrefs, badgeScope, hasChatUsage, summarize } from './lib.js';

const ORIGIN = 'https://claude.ai';
const KEY = 'snapshot';
const PREFS = 'badge';
const ALARM = 'refresh';
const PERIOD_MIN = 2;
const FETCH_TIMEOUT_MS = 10000;

const BADGE_BG = { ok: '#2f9e5e', warn: '#c2831f', crit: '#b42318' };

/* ---------- Path 1: call straight from the service worker (works with no claude.ai tab open) ---------- */
async function jsonDirect(path) {
  const res = await fetch(ORIGIN + path, {
    credentials: 'include',
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = new Error('HTTP ' + res.status);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function collectDirect() {
  const all = await jsonDirect('/api/organizations');
  if (!Array.isArray(all)) throw new Error('BAD_SHAPE');
  const out = [];
  for (const o of all.filter(hasChatUsage)) {
    try {
      out.push({ uuid: o.uuid, name: o.name, usage: await jsonDirect(`/api/organizations/${o.uuid}/usage`) });
    } catch (e) {
      out.push({ uuid: o.uuid, name: o.name, error: String((e && e.message) || e), status: (e && e.status) || null });
    }
  }
  return out;
}

/* ---------- Path 2: fall back to the page context of an open claude.ai tab ---------- */
// Serialized and run inside the page, so it must not reference anything outside itself.
async function pageCollector() {
  const j = async (p) => {
    const r = await fetch(p, { headers: { accept: 'application/json' } });
    if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
    return r.json();
  };
  // Same rule as hasChatUsage() in lib.js, inlined because this function is serialized into the page.
  const keep = (o) => {
    const caps = o && o.capabilities;
    return !Array.isArray(caps) || !caps.length || caps.includes('chat');
  };
  const out = [];
  for (const o of (await j('/api/organizations')).filter(keep)) {
    try {
      out.push({ uuid: o.uuid, name: o.name, usage: await j('/api/organizations/' + o.uuid + '/usage') });
    } catch (e) {
      out.push({ uuid: o.uuid, name: o.name, error: String((e && e.message) || e), status: (e && e.status) || null });
    }
  }
  return out;
}

async function collectViaTab() {
  const tabs = await chrome.tabs.query({ url: 'https://claude.ai/*' });
  if (!tabs.length) {
    const e = new Error('NO_TAB'); e.code = 'NO_TAB'; throw e;
  }
  for (const tab of tabs) {
    try {
      const [hit] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: pageCollector,
      });
      if (hit && Array.isArray(hit.result) && hit.result.length) return hit.result;
    } catch (_) { /* try the next tab */ }
  }
  const e = new Error('TAB_FAILED'); e.code = 'TAB_FAILED'; throw e;
}

/* ---------- refresh ---------- */
let inFlight = null;

async function refresh() {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    let orgs = null, source = null, error = null;
    try {
      orgs = await collectDirect();
      source = 'direct';
    } catch (e1) {
      try {
        orgs = await collectViaTab();
        source = 'tab';
      } catch (e2) {
        const unauth = e1 && (e1.status === 401 || e1.status === 403);
        if (e2 && e2.code === 'NO_TAB') error = unauth ? 'LOGIN' : 'NO_TAB';
        else error = unauth ? 'LOGIN' : 'FAILED';
      }
    }
    const snap = { at: Date.now(), orgs: orgs || [], source, error };
    const store = await chrome.storage.local.get(PREFS);
    await chrome.storage.local.set({ [KEY]: snap });
    updateBadge(snap, store[PREFS]);
    return snap;
  })();
  try { return await inFlight; } finally { inFlight = null; }
}

function updateBadge(snap, prefs) {
  try { chrome.action.setBadgeTextColor({ color: '#ffffff' }); } catch (_) {}
  const { show } = badgePrefs(prefs);
  if (snap.error || !snap.orgs.length) {
    chrome.action.setBadgeText({ text: show ? '!' : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#6b7280' });
    chrome.action.setTitle({
      title: snap.error === 'LOGIN'
        ? 'Claude usage — sign in to claude.ai'
        : "Claude usage — couldn't load",
    });
    return;
  }
  const { text, level } = badgeFor(snap.orgs, prefs);
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: BADGE_BG[level] || BADGE_BG.ok });
  const scope = badgeScope(snap.orgs, prefs);
  const head = !show ? 'Claude usage (badge hidden)'
    : text ? `Claude usage (${scope} ${text}%)` : `Claude usage (${scope}: no data)`;
  const lines = snap.orgs.map((o) => `${o.name}: ${summarize(o)}`);
  chrome.action.setTitle({ title: [head, ...lines].join('\n') });
}

// The options page changed what the badge shows: repaint from the cached snapshot, no refetch.
async function repaint() {
  const store = await chrome.storage.local.get([KEY, PREFS]);
  if (store[KEY]) updateBadge(store[KEY], store[PREFS]);
}

function ensureAlarm() {
  chrome.alarms.create(ALARM, { periodInMinutes: PERIOD_MIN });
}

chrome.runtime.onInstalled.addListener(() => { ensureAlarm(); refresh(); });
chrome.runtime.onStartup.addListener(() => { ensureAlarm(); refresh(); });
chrome.alarms.onAlarm.addListener((a) => { if (a.name === ALARM) refresh(); });
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes[PREFS]) repaint(); });

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'refresh') {
    refresh().then(sendResponse);
    return true; // async response
  }
});

ensureAlarm();
