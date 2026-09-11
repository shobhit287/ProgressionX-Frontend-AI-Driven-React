#!/usr/bin/env node
// Convert a Postgres dump of the old ProgressionX server into the app's
// backup JSON (the same format the Backup page exports/imports).
//
//   node scripts/extract-backup.mjs <dump> --email <user email> [--out <file>]
//
// <dump> may be a pg_dump custom-format archive (.dump / the misnamed
// backup.sql) — pg_restore must be installed — or already-plain SQL from
// `pg_restore --data-only -f out.sql archive`.
//
// One user's rows are extracted (the app is single-user). Enums are
// lowercased, timestamps become UTC ISO strings, and `restSeconds` is
// derived from set timestamps the same way the server's migration did.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

// ── args ─────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
if (!argv.length || argv.includes('-h') || argv.includes('--help')) {
  console.log('usage: node scripts/extract-backup.mjs <dump> --email <email> [--out <file>]');
  process.exit(argv.length ? 0 : 1);
}
const dumpPath = argv[0];
const flag = (name) => {
  const i = argv.indexOf(name);
  return i !== -1 ? argv[i + 1] : undefined;
};
const email = flag('--email');
const outPath = flag('--out') || 'progressionx-backup.json';
if (!existsSync(dumpPath)) fail(`dump not found: ${dumpPath}`);

// ── read dump as plain COPY text ─────────────────────────────────────

function findPgRestore() {
  const candidates = ['pg_restore'];
  if (process.platform === 'win32') {
    for (const v of [18, 17, 16, 15, 14]) {
      candidates.push(join('C:\\Program Files\\PostgreSQL', String(v), 'bin', 'pg_restore.exe'));
    }
  }
  for (const c of candidates) {
    try {
      execFileSync(c, ['--version'], { stdio: 'ignore' });
      return c;
    } catch { /* try next */ }
  }
  return null;
}

function readDumpText(path) {
  const head = readFileSync(path, { encoding: null }).subarray(0, 5).toString('latin1');
  if (head.startsWith('PGDMP')) {
    const pgr = findPgRestore();
    if (!pgr) fail('this is a pg_dump custom-format archive and pg_restore is not installed');
    return execFileSync(pgr, ['--data-only', '-f', '-', path], {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 512,
    });
  }
  return readFileSync(path, 'utf8');
}

// ── COPY parser ──────────────────────────────────────────────────────

function unescapeCopy(field) {
  if (field === '\\N') return null;
  if (!field.includes('\\')) return field;
  return field.replace(/\\(.)/g, (_, c) => (
    { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', '\\': '\\' }[c] ?? c
  ));
}

/** { tableName: [ {col: value, ...}, ... ] } */
function parseCopyBlocks(text) {
  const tables = {};
  const lines = text.split('\n');
  let cur = null;
  for (const raw of lines) {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (!cur) {
      const m = /^COPY public\.(\w+) \(([^)]+)\) FROM stdin;$/.exec(line);
      if (m) {
        cur = { name: m[1], cols: m[2].split(',').map((c) => c.trim()), rows: [] };
        tables[cur.name] = cur.rows;
      }
      continue;
    }
    if (line === '\\.') { cur = null; continue; }
    const parts = line.split('\t');
    const row = {};
    cur.cols.forEach((c, i) => { row[c] = unescapeCopy(parts[i] ?? '\\N'); });
    cur.rows.push(row);
  }
  return tables;
}

// ── value conversions ────────────────────────────────────────────────

const lower = (v) => (v === null || v === undefined ? undefined : String(v).toLowerCase());
const bool = (v) => v === 't' || v === 'true';
const num = (v) => (v === null || v === undefined || v === '' ? undefined : Number(v));
const int = (v) => (v === null || v === undefined || v === '' ? undefined : parseInt(v, 10));
const str = (v) => (v === null || v === undefined ? undefined : v);

/** '2026-04-06 19:20:19.002941+05:30' → '2026-04-06T14:50:19.002Z' */
function isoUtc(v) {
  if (v === null || v === undefined) return undefined;
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?([+-]\d{2}(?::?\d{2})?|Z)?$/.exec(v);
  if (!m) {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) fail(`unparseable timestamp: ${v}`);
    return d.toISOString();
  }
  const ms = (m[3] ?? '').padEnd(3, '0').slice(0, 3);
  let tz = m[4] ?? 'Z';
  if (/^[+-]\d{2}$/.test(tz)) tz += ':00';
  if (/^[+-]\d{4}$/.test(tz)) tz = `${tz.slice(0, 3)}:${tz.slice(3)}`;
  const d = new Date(`${m[1]}T${m[2]}.${ms}${tz}`);
  if (Number.isNaN(d.getTime())) fail(`unparseable timestamp: ${v}`);
  return d.toISOString();
}

const dateOnly = (v) => (v === null || v === undefined ? undefined : String(v).slice(0, 10));

function prune(obj) {
  for (const k of Object.keys(obj)) if (obj[k] === undefined) delete obj[k];
  return obj;
}

// ── main ─────────────────────────────────────────────────────────────

const tables = parseCopyBlocks(readDumpText(dumpPath));
const users = tables.users ?? [];
if (!users.length) fail('no users table in dump');

let user;
if (email) {
  user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) fail(`no user with email ${email}. Users in dump:\n  ${users.map((u) => u.email).join('\n  ')}`);
} else if (users.length === 1) {
  user = users[0];
} else {
  fail(`dump has ${users.length} users — pass --email to pick one:\n  ${users.map((u) => u.email).join('\n  ')}`);
}
const uid = user.id;

const profile = prune({
  id: 'me',
  firstName: user.first_name,
  lastName: user.last_name,
  email: user.email,
  age: int(user.age) ?? null,
  weight: num(user.weight) ?? null,
  height: int(user.height) ?? null,
  goal: lower(user.goal) ?? null,
  gender: lower(user.gender) ?? null,
  trainingType: lower(user.training_type) ?? 'hypertrophy',
  experienceLevel: lower(user.experience_level) ?? 'beginner',
  activityLevel: str(user.activity_level),
  mobileNumber: str(user.mobile_number),
  createdAt: isoUtc(user.created_at),
  updatedAt: isoUtc(user.updated_at),
});

const splits = (tables.workout_splits ?? [])
  .filter((r) => r.user_id === uid)
  .map((r) => prune({
    id: r.id,
    name: r.name,
    day: lower(r.day),
    description: str(r.description),
    createdAt: isoUtc(r.created_at),
    updatedAt: isoUtc(r.updated_at),
  }));
const splitIds = new Set(splits.map((s) => s.id));

const splitExercises = (tables.split_exercises ?? [])
  .filter((r) => splitIds.has(r.split_id))
  .map((r) => prune({
    id: r.id,
    splitId: r.split_id,
    name: r.name,
    displayOrder: int(r.display_order) ?? 0,
    defaultSets: int(r.default_sets) ?? 3,
    exerciseType: lower(r.exercise_type) ?? 'standard',
    supersetGroup: int(r.superset_group),
    notes: str(r.notes),
    restSeconds: int(r.rest_seconds) ?? 90,
    createdAt: isoUtc(r.created_at),
    updatedAt: isoUtc(r.updated_at),
  }));

const sessions = (tables.workout_sessions ?? [])
  .filter((r) => r.user_id === uid)
  .map((r) => prune({
    id: r.id,
    splitId: r.split_id,
    startedAt: isoUtc(r.started_at),
    completedAt: isoUtc(r.completed_at),
    durationSeconds: int(r.duration_seconds),
    status: lower(r.status),
    notes: str(r.notes),
    createdAt: isoUtc(r.created_at),
    updatedAt: isoUtc(r.updated_at),
  }));
const sessionIds = new Set(sessions.map((s) => s.id));

const sessionExercises = (tables.session_exercises ?? [])
  .filter((r) => sessionIds.has(r.session_id))
  .map((r) => prune({
    id: r.id,
    sessionId: r.session_id,
    splitExerciseId: r.split_exercise_id ?? null,
    exerciseName: r.exercise_name,
    displayOrder: int(r.display_order) ?? 0,
    exerciseType: lower(r.exercise_type) ?? 'standard',
    supersetGroup: int(r.superset_group),
    createdAt: isoUtc(r.created_at),
    updatedAt: isoUtc(r.updated_at),
  }));
const seIds = new Set(sessionExercises.map((s) => s.id));

const sets = (tables.exercise_sets ?? [])
  .filter((r) => seIds.has(r.session_exercise_id))
  .map((r) => prune({
    id: r.id,
    sessionExerciseId: r.session_exercise_id,
    setNumber: int(r.set_number) ?? 0,
    weightKg: num(r.weight_kg) ?? 0,
    reps: int(r.reps) ?? 0,
    repsInReserve: int(r.reps_in_reserve),
    isWarmup: bool(r.is_warmup),
    isDropset: bool(r.is_dropset),
    description: str(r.description),
    parentSetId: r.parent_set_id ?? null,
    restSeconds: 'rest_seconds' in r ? (int(r.rest_seconds) ?? null) : null,
    createdAt: isoUtc(r.created_at),
    updatedAt: isoUtc(r.updated_at),
  }));

// Derive restSeconds where the dump predates that column: gap since the
// previous set (by setNumber) of the same exercise; skip first sets,
// dropset drops, and implausible gaps (> 1 h).
if (!('rest_seconds' in ((tables.exercise_sets ?? [])[0] ?? {}))) {
  const byEx = new Map();
  for (const s of sets) byEx.set(s.sessionExerciseId, [...(byEx.get(s.sessionExerciseId) ?? []), s]);
  for (const list of byEx.values()) {
    list.sort((a, b) => a.setNumber - b.setNumber);
    for (let i = 1; i < list.length; i++) {
      const s = list[i];
      if (s.parentSetId) continue;
      const gap = (new Date(s.createdAt) - new Date(list[i - 1].createdAt)) / 1000;
      if (gap >= 0 && gap <= 3600) s.restSeconds = Math.round(gap);
    }
  }
}

const weightLogs = (tables.weight_logs ?? [])
  .filter((r) => r.user_id === uid)
  .map((r) => prune({
    id: r.id,
    weightKg: num(r.weight_kg) ?? 0,
    waistCm: num(r.waist_cm),
    bodyFatPct: num(r.body_fat_pct),
    description: str(r.description),
    loggedAt: dateOnly(r.logged_at),
    createdAt: isoUtc(r.created_at),
    updatedAt: isoUtc(r.updated_at),
  }));

const dietRow = (tables.diet_plans ?? []).find((r) => r.user_id === uid);
const dietPlan = dietRow
  ? {
    id: dietRow.id ?? randomUUID(),
    content: dietRow.content ?? '',
    createdAt: isoUtc(dietRow.created_at),
    updatedAt: isoUtc(dietRow.updated_at),
  }
  : null;

const backup = {
  format: 'progressionx-backup',
  version: 1,
  exportedAt: new Date().toISOString(),
  profile,
  splits,
  splitExercises,
  sessions,
  sessionExercises,
  sets,
  weightLogs,
  dietPlan,
};

writeFileSync(outPath, JSON.stringify(backup, null, 2));

const dates = sessions.map((s) => s.startedAt).sort();
console.log(`user:            ${profile.firstName} ${profile.lastName} <${profile.email}>`);
console.log(`splits:          ${splits.length} (${splitExercises.length} exercises)`);
console.log(`sessions:        ${sessions.length} (${sessionExercises.length} exercise rows, ${sets.length} sets)`);
console.log(`weight logs:     ${weightLogs.length}`);
console.log(`diet plan:       ${dietPlan ? 'yes' : 'no'}`);
if (dates.length) console.log(`session range:   ${dates[0].slice(0, 10)} → ${dates[dates.length - 1].slice(0, 10)}`);
console.log(`written:         ${outPath}`);

function fail(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}
