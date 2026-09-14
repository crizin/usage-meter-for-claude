// Shared logic: normalizing the claude.ai usage payload + display formatters.

export const LEVELS = ['ok', 'warn', 'crit'];

/**
 * /api/organizations also lists Console (API-only) organizations, which have no chat usage at all —
 * their /usage answers 403 permission_error. Keep only organizations that can actually have usage.
 *
 * Fails open: an organization with no capabilities array is kept, so a change to the payload shape
 * can never empty the popup.
 */
export function hasChatUsage(org) {
  const caps = org && org.capabilities;
  if (!Array.isArray(caps) || !caps.length) return true;
  return caps.includes('chat');
}

/** Map a percentage (plus the server's own severity hint) onto three levels. */
export function levelFor(percent, severity) {
  let lv = percent >= 90 ? 'crit' : percent >= 70 ? 'warn' : 'ok';
  if (severity === 'warning' && lv === 'ok') lv = 'warn';
  if (severity && /crit|exceed|block|lock/i.test(severity)) lv = 'crit';
  return lv;
}

/** limits[].scope -> a human label such as "Fable" */
export function scopeLabel(scope) {
  if (!scope || typeof scope !== 'object') return null;
  const m = scope.model && (scope.model.display_name || scope.model.id);
  const s = scope.surface && (scope.surface.display_name || scope.surface.id || scope.surface);
  return [m, typeof s === 'string' ? s : null].filter(Boolean).join(' · ') || null;
}

const KIND_LABEL = { session: '5-hour session', weekly_all: 'Weekly · all models' };
const KIND_GROUP = { session: 'session', weekly_all: 'weekly', weekly_scoped: 'weekly' };

// Fallback fields for organizations that return an empty limits[] (e.g. enterprise).
const FALLBACK_FIELDS = [
  ['five_hour', '5-hour session', 'session'],
  ['seven_day', 'Weekly · all models', 'weekly'],
  ['seven_day_opus', 'Weekly · Opus', 'weekly'],
  ['seven_day_sonnet', 'Weekly · Sonnet', 'weekly'],
  ['seven_day_cowork', 'Weekly · Cowork', 'weekly'],
];

/** One usage payload -> { rows, credit } */
export function normalizeOrg(usage) {
  const rows = [];
  const limits = usage && Array.isArray(usage.limits) ? usage.limits : [];

  if (limits.length) {
    for (const l of limits) {
      const sc = scopeLabel(l.scope);
      let label = KIND_LABEL[l.kind];
      if (!label) label = l.kind === 'weekly_scoped' ? `Weekly · ${sc || 'scoped'}` : (sc || String(l.kind || 'Limit'));
      const pct = Number(l.percent) || 0;
      rows.push({
        key: `${l.kind}:${sc || ''}`,
        label,
        percent: Math.round(pct),
        resetsAt: l.resets_at || null,
        level: levelFor(pct, l.severity),
        active: !!l.is_active,
        group: l.group || KIND_GROUP[l.kind] || null,
      });
    }
  } else {
    for (const [field, label, group] of FALLBACK_FIELDS) {
      const v = usage && usage[field];
      if (!v || v.utilization == null) continue;
      const pct = Number(v.utilization) || 0;
      rows.push({
        key: field, label, percent: Math.round(pct),
        resetsAt: v.resets_at || null,
        level: levelFor(pct), active: false, group,
      });
    }
  }

  let credit = null;
  const eu = usage && usage.extra_usage;
  if (eu && eu.is_enabled && eu.utilization != null) {
    const div = Math.pow(10, eu.decimal_places == null ? 2 : eu.decimal_places);
    const pct = Number(eu.utilization) || 0;
    credit = {
      percent: Math.round(pct),
      used: (Number(eu.used_credits) || 0) / div,
      limit: (Number(eu.monthly_limit) || 0) / div,
      currency: eu.currency || 'USD',
      level: levelFor(pct),
    };
  }

  return { rows, credit };
}

/** ISO timestamp -> "resets in 1h 12m" */
export function formatReset(iso, now = Date.now()) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  let mins = Math.round((t - now) / 60000);
  if (mins <= 0) return 'resetting now';
  const days = Math.floor(mins / 1440); mins -= days * 1440;
  const hours = Math.floor(mins / 60); mins -= hours * 60;
  if (days) return `resets in ${days}d ${hours}h`;
  if (hours) return `resets in ${hours}h ${mins}m`;
  return `resets in ${mins}m`;
}

// A window opens on the first use after the previous one expired, so it started this long before resets_at.
const GROUP_WINDOW_MS = { session: 5 * 3600e3, weekly: 7 * 86400e3 };

/** Where steady use since the window opened would stand by now, as a percentage; null when unknowable */
export function paceFor(resetsAt, group, now = Date.now()) {
  const win = GROUP_WINDOW_MS[group];
  const t = Date.parse(resetsAt);
  if (!Number.isFinite(win) || !Number.isFinite(t)) return null;
  return Math.round(Math.max(0, Math.min(100, 100 - ((t - now) / win) * 100)));
}

/** "just updated" / "3m ago" */
export function formatAgo(ts, now = Date.now()) {
  if (!ts) return '—';
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return 'just updated';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

/** Choices for the badge's limit filter: [value, label shown on the options page] */
export const BADGE_LIMITS = [
  ['all', 'Highest of all limits'],
  ['session', '5-hour session only'],
  ['weekly', 'Weekly limits only (highest of them)'],
];
const BADGE_LIMIT_SHORT = { all: 'max', session: '5-hour session', weekly: 'weekly' };

/**
 * Badge preferences as stored under chrome.storage.local `badge`:
 * { show: boolean, org: 'all' | organization uuid, limit: 'all' | 'session' | 'weekly' }.
 * Anything unrecognised falls back to the default, which is the old behaviour (max of everything).
 */
export function badgePrefs(raw) {
  const show = !(raw && raw.show === false);
  const org = raw && typeof raw.org === 'string' && raw.org ? raw.org : 'all';
  const limit = raw && BADGE_LIMITS.some(([k]) => k === raw.limit) ? raw.limit : 'all';
  return { show, org, limit };
}

/** Highest limit within the preferred scope -> toolbar badge; empty text when the badge is hidden */
export function badgeFor(orgs, prefs) {
  const { show, org, limit } = badgePrefs(prefs);
  let max = null, level = 'ok';
  if (!show) return { text: '', level };
  for (const o of orgs || []) {
    if (!o || o.error) continue;
    if (org !== 'all' && o.uuid !== org) continue;
    const { rows } = normalizeOrg(o.usage);
    for (const r of rows) {
      if (limit !== 'all' && r.group !== limit) continue;
      if (max === null || r.percent > max) max = r.percent;
      if (r.level === 'crit') level = 'crit';
      else if (r.level === 'warn' && level === 'ok') level = 'warn';
    }
  }
  return { text: max === null ? '' : String(max), level };
}

/** What the badge figure is, e.g. "max" or "Team Alpha · 5-hour session" (tooltip + options page) */
export function badgeScope(orgs, prefs) {
  const { org, limit } = badgePrefs(prefs);
  const parts = [];
  if (org !== 'all') {
    const hit = (orgs || []).find((o) => o && o.uuid === org);
    parts.push(hit ? hit.name || 'Untitled organization' : 'unknown organization');
  }
  parts.push(BADGE_LIMIT_SHORT[limit]);
  return parts.join(' · ');
}

/**
 * An organization whose usage call failed -> how to present it.
 * 401/403/404 mean "there is no usage to read here", a fact about the organization rather than a
 * fault worth flagging in red. Anything else is a real failure.
 */
export function describeError(org) {
  const status = Number(org && org.status) || null;
  if (status === 401 || status === 403) {
    return { level: 'muted', note: `No usage access for this organization (HTTP ${status})` };
  }
  if (status === 404) {
    return { level: 'muted', note: 'No usage data for this organization (HTTP 404)' };
  }
  return { level: 'crit', note: `Couldn't load usage — ${(org && org.error) || 'unknown error'}` };
}

/** One-line summary for the tooltip */
export function summarize(org) {
  if (org.error) return describeError(org).level === 'muted' ? 'no usage data' : "couldn't load";
  const { rows, credit } = normalizeOrg(org.usage);
  if (!rows.length) return credit ? `credits ${credit.percent}%` : 'no limit data';
  return rows.map((r) => `${r.label} ${r.percent}%`).join(' · ');
}
