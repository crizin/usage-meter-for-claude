import { normalizeOrg, describeError, formatReset, formatAgo } from './lib.js';

const KEY = 'snapshot';
const bodyEl = document.getElementById('body');
const metaEl = document.getElementById('meta');
const refreshBtn = document.getElementById('refresh');

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function money(v, currency) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(v);
  } catch (_) {
    return `${v.toFixed(2)} ${currency}`;
  }
}

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

function renderRow({ label, percent, level, resetsAt, active }, now, subOverride) {
  const row = el('div', 'row' + (active ? ' row--active' : ''));
  const top = el('div', 'row-top');
  top.append(el('span', 'row-label', label), el('span', `row-pct ${level}`, `${percent}%`));
  const bar = el('div', 'bar');
  const fill = el('i', `lv-${level}`);
  fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  bar.append(fill);
  row.append(top, bar);
  const sub = subOverride || formatReset(resetsAt, now);
  if (sub) row.append(el('div', 'row-sub', sub));
  return row;
}

function worstLevel(rows) {
  if (rows.some((r) => r.level === 'crit')) return 'crit';
  if (rows.some((r) => r.level === 'warn')) return 'warn';
  return 'ok';
}

function renderOrg(org, now) {
  const card = el('section', 'org');
  const hd = el('div', 'org-hd');
  hd.append(el('span', 'org-name', org.name || 'Untitled organization'));

  if (org.error) {
    const { level, note } = describeError(org);
    hd.append(el('span', `dot ${level}`));
    card.append(hd, el('div', 'note', note));
    return card;
  }

  const { rows, credit } = normalizeOrg(org.usage);
  hd.append(el('span', `dot ${worstLevel(rows.concat(credit ? [credit] : []))}`));
  card.append(hd);

  if (!rows.length && !credit) {
    card.append(el('div', 'note', 'No limit data to show'));
    return card;
  }

  for (const r of rows) card.append(renderRow(r, now));

  if (credit) {
    const wrap = el('div', rows.length ? 'row credit' : 'row');
    wrap.append(
      renderRow(
        { label: 'Extra credits (monthly)', percent: credit.percent, level: credit.level, resetsAt: null },
        now,
        `${money(credit.used, credit.currency)} / ${money(credit.limit, credit.currency)}`
      )
    );
    card.append(wrap);
  }
  return card;
}

function renderState(title, desc, actionLabel, onAction) {
  const box = el('div', 'state');
  box.append(el('strong', null, title), el('span', null, desc));
  if (actionLabel) {
    const b = el('button', null, actionLabel);
    b.addEventListener('click', onAction);
    box.append(document.createElement('br'), b);
  }
  return box;
}

function render(snap) {
  const now = Date.now();
  bodyEl.replaceChildren();

  if (!snap) {
    metaEl.textContent = 'Loading…';
    bodyEl.append(el('div', 'skeleton'), el('div', 'skeleton'));
    return;
  }

  if (snap.error === 'LOGIN') {
    metaEl.textContent = formatAgo(snap.at, now);
    bodyEl.append(
      renderState('Sign in required', 'Sign in to claude.ai, then try again.', 'Open claude.ai', () =>
        chrome.tabs.create({ url: 'https://claude.ai/settings/usage' })
      )
    );
    return;
  }
  if (snap.error) {
    metaEl.textContent = formatAgo(snap.at, now);
    bodyEl.append(
      renderState("Couldn't load", 'Check your connection, or keep a claude.ai tab open and try again.', 'Retry', doRefresh)
    );
    return;
  }

  const orgs = snap.orgs || [];
  metaEl.textContent = `${formatAgo(snap.at, now)} · ${plural(orgs.length, 'organization', 'organizations')}`;
  if (!orgs.length) {
    bodyEl.append(renderState('No organizations', "Couldn't find any organizations on this account.", 'Retry', doRefresh));
    return;
  }
  for (const o of orgs) bodyEl.append(renderOrg(o, now));
}

async function load() {
  const store = await chrome.storage.local.get(KEY);
  render(store[KEY]);
}

async function doRefresh() {
  refreshBtn.classList.add('spin');
  try {
    const snap = await chrome.runtime.sendMessage({ type: 'refresh' });
    if (snap) render(snap);
    else await load();
  } catch (_) {
    await load();
  } finally {
    refreshBtn.classList.remove('spin');
  }
}

refreshBtn.addEventListener('click', doRefresh);
document.getElementById('open-settings').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://claude.ai/settings/usage' });
});

// Paint the cache first, refresh immediately, then keep countdowns live while open.
load().then(doRefresh);
setInterval(load, 30000);
