import { readFileSync } from 'node:fs';
import { normalizeOrg, formatReset, badgeFor, summarize, levelFor, hasChatUsage, describeError } from '../lib.js';

const snap = JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url)));
let fails = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fails++; console.log(`  x ${name}\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`); }
  else console.log(`  ok ${name}`);
};

console.log('levelFor');
eq('49% -> ok', levelFor(49, 'normal'), 'ok');
eq('76% + warning -> warn', levelFor(76, 'warning'), 'warn');
eq('95% -> crit', levelFor(95, 'normal'), 'crit');
eq('30% but server says warning -> warn', levelFor(30, 'warning'), 'warn');

console.log('\nnormalizeOrg - enterprise org (empty limits[])');
const ent = normalizeOrg(snap.orgs[0].usage);
eq('no limit rows', ent.rows.length, 0);
eq('credit 25%', ent.credit.percent, 25);
eq('used 12.50', Math.round(ent.credit.used * 100) / 100, 12.5);
eq('limit 50', ent.credit.limit, 50);

console.log('\nnormalizeOrg - team org (uses limits[])');
const t21 = normalizeOrg(snap.orgs[1].usage);
eq('3 rows', t21.rows.length, 3);
eq('labels', t21.rows.map((r) => r.label), ['5-hour session', 'Weekly · all models', 'Weekly · Fable']);
eq('percents', t21.rows.map((r) => r.percent), [50, 49, 67]);
eq('levels', t21.rows.map((r) => r.level), ['ok', 'ok', 'ok']);
eq('is_active carried through', t21.rows.map((r) => r.active), [false, false, true]);
eq('credits disabled -> null', t21.credit, null);

const t54 = normalizeOrg(snap.orgs[2].usage);
eq('severity=warning -> warn', t54.rows[2].level, 'warn');

console.log('\nnormalizeOrg - fallback path (no limits[], only five_hour)');
const fb = normalizeOrg({ five_hour: { utilization: 12.6, resets_at: null }, seven_day: null, limits: [] });
eq('one fallback row', fb.rows.map((r) => [r.label, r.percent]), [['5-hour session', 13]]);

console.log('\nformatReset');
const base = Date.parse('2026-09-11T01:48:00Z');
eq('1h 12m', formatReset('2026-09-11T03:00:00Z', base), 'resets in 1h 12m');
eq('4d 5h', formatReset('2026-09-15T07:00:00Z', base), 'resets in 4d 5h');
eq('past -> resetting now', formatReset('2026-09-10T00:00:00Z', base), 'resetting now');
eq('null -> null', formatReset(null, base), null);

console.log('\nhasChatUsage - drop Console (API-only) organizations');
eq('only chat orgs survive', snap.orgList.filter(hasChatUsage).map((o) => o.name),
  ['Personal', 'No Capabilities Field']);
eq('chat org kept', hasChatUsage({ capabilities: ['chat', 'claude_max'] }), true);
eq('team org kept', hasChatUsage({ capabilities: ['raven', 'chat'] }), true);
eq('enterprise org kept', hasChatUsage({
  capabilities: ['raven_enterprise', 'raven', 'chat', 'compliance_logging', 'compliance_api', 'analytics_api'],
}), true);
eq('api-only org dropped', hasChatUsage({ capabilities: ['api'] }), false);
eq('missing capabilities -> fail open', hasChatUsage({ name: 'x' }), true);
eq('empty capabilities -> fail open', hasChatUsage({ capabilities: [] }), true);
eq('null org -> fail open', hasChatUsage(null), true);

console.log('\ndescribeError - 401/403/404 are facts, not failures');
eq('403 -> muted', describeError({ error: 'HTTP 403', status: 403 }),
  { level: 'muted', note: 'No usage access for this organization (HTTP 403)' });
eq('401 -> muted', describeError({ error: 'HTTP 401', status: 401 }).level, 'muted');
eq('404 -> muted', describeError({ error: 'HTTP 404', status: 404 }).note,
  'No usage data for this organization (HTTP 404)');
eq('500 -> crit', describeError({ error: 'HTTP 500', status: 500 }),
  { level: 'crit', note: "Couldn't load usage \u2014 HTTP 500" });
eq('no status -> crit', describeError({ error: 'boom' }).level, 'crit');

console.log('\nbadgeFor / summarize');
eq('max 76, warn', badgeFor(snap.orgs), { text: '76', level: 'warn' });
eq('empty array is safe', badgeFor([]), { text: '', level: 'ok' });
eq('errored org', summarize({ name: 'x', error: 'boom' }), "couldn't load");
eq('403 org -> no usage data', summarize({ name: 'x', error: 'HTTP 403', status: 403 }), 'no usage data');
eq('errored org never reaches the badge', badgeFor(snap.orgs), { text: '76', level: 'warn' });
eq('enterprise org', summarize(snap.orgs[0]), 'credits 25%');

console.log(fails ? `\nFAILED: ${fails}` : '\nAll assertions passed');
process.exit(fails ? 1 : 0);
