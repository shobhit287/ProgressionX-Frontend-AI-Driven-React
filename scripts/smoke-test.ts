// End-to-end check of the local data layer against a real backup file,
// run in Node with an in-memory IndexedDB:
//
//   npx tsx --tsconfig tsconfig.app.json scripts/smoke-test.ts <backup.json>
//
// Imports the backup, then walks the same services the pages call —
// dashboard summary, analytics, session lifecycle, sets, backup round-trip.

import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';

import { db } from '@/db/db';
import { exportBackup, importBackup } from '@/local/backup';
import { getProfile } from '@/local/profile';
import { getTodaySplit, listSplits } from '@/local/splits';
import { allExerciseNames, listBySplit } from '@/local/splitExercises';
import { dashboardSummary, exerciseAnalytics, sessionAnalytics } from '@/local/analytics';
import { listWeightLogs, weightAnalytics } from '@/local/weightLogs';
import {
  abandonSession, backfillSession, completeSession, getActiveSession, getPreviousSession,
  getSession, listSessions, previousSetsMap, reopenSession, sessionDatesBySplit, startSession,
} from '@/local/sessions';
import { addSet, deleteSet, updateSet } from '@/local/sets';
import { buildSessionCoachPrompt, buildSessionPlanPrompt } from '@/local/ai/prompts';
import { getProfileRow } from '@/local/profile';

let failures = 0;
function check(cond: unknown, msg: string) {
  if (cond) console.log(`  ok   ${msg}`);
  else { console.log(`  FAIL ${msg}`); failures++; }
}

async function main() {
  const file = process.argv[2];
  if (!file) { console.error('usage: smoke-test.ts <backup.json>'); process.exit(1); }
  const raw = JSON.parse(readFileSync(file, 'utf8'));

  console.log('import');
  const summary = await importBackup(raw);
  check(summary.sessions === raw.sessions.length, `imported ${summary.sessions} sessions`);
  check(summary.sets === raw.sets.length, `imported ${summary.sets} sets`);

  console.log('profile / splits');
  const me = await getProfile();
  check(me?.firstName === raw.profile.firstName, `profile is ${me?.firstName} ${me?.lastName}`);
  const splits = await listSplits();
  check(splits.length === raw.splits.length, `${splits.length} splits`);
  const names = await allExerciseNames();
  check(names.length > 0 && names.slice().sort((a, b) => a.localeCompare(b)).join() === names.join(), `${names.length} distinct exercise names, sorted`);
  const today = await getTodaySplit();
  console.log(`  info today's split: ${today ? `${today.name} (${today.day})` : 'none (rest day)'}`);

  console.log('analytics');
  const dash = await dashboardSummary();
  check(dash.totalSessions === raw.sessions.filter((s: { status: string }) => s.status === 'completed').length,
    `dashboard totalSessions = ${dash.totalSessions}`);
  check(dash.personalRecords.length >= 0, `dashboard PRs (last 30d) = ${dash.personalRecords.length}, streak = ${dash.currentStreak}`);
  const sa = await sessionAnalytics();
  check(sa.length === dash.totalSessions, `session analytics has ${sa.length} points`);
  check(sa.every((p) => p.totalVolume >= 0 && p.totalSets >= 0), 'session points have non-negative volume/sets');
  const topName = names[0];
  const ea = await exerciseAnalytics(topName);
  console.log(`  info ${topName}: ${ea.dataPoints.length} sessions, PR = ${ea.personalRecord ? `${ea.personalRecord.weight}kg x ${ea.personalRecord.reps} (e1RM ${ea.personalRecord.estimated1Rm})` : 'none'}`);
  const wa = await weightAnalytics();
  check(wa.entries === raw.weightLogs.length, `weight analytics entries = ${wa.entries}, total change ${wa.totalChange}kg, ${wa.rateOfChange}kg/wk`);
  const wl = await listWeightLogs({ pageSize: 5 });
  check(wl.items.length === Math.min(5, wl.total) && wl.items[0].loggedAt >= wl.items[wl.items.length - 1].loggedAt, 'weight log list is newest-first and paginated');

  console.log('session history');
  const page = await listSessions({ page: 1, pageSize: 10 });
  check(page.total === raw.sessions.length && page.items.length === 10, `list page 1 of ${page.totalPages} (${page.total} total)`);
  check(page.items[0].startedAt >= page.items[9].startedAt, 'list is newest-first');
  const split0 = splits[0];
  const dates = await sessionDatesBySplit(split0.id);
  console.log(`  info ${split0.name}: ${dates.length} sessions`);
  const latest = page.items.find((s) => s.status === 'completed')!;
  const detail = await getSession(latest.id);
  check(detail.exercises.length > 0, `detail for ${latest.startedAt.slice(0, 10)} has ${detail.exercises.length} exercises`);
  check(detail.exercises.every((e, i, arr) => i === 0 || arr[i - 1].displayOrder <= e.displayOrder), 'exercises ordered by displayOrder');
  check(detail.exercises.every((e) => e.sets.every((s, i, arr) => i === 0 || arr[i - 1].setNumber < s.setNumber)), 'sets ordered by setNumber');
  const prev = await getPreviousSession(latest.id);
  check(prev === null || prev.startedAt < latest.startedAt, `previous session = ${prev ? prev.startedAt.slice(0, 10) : 'none'}`);
  const prevMap = await previousSetsMap(latest.id);
  check(typeof prevMap === 'object', `previous-sets map has ${Object.keys(prevMap).length} exercises`);

  console.log('session lifecycle');
  check((await getActiveSession()) === null, 'no active session after import');
  const exSplit = splits.find((s) => s.id === split0.id)!;
  const exList = await listBySplit(exSplit.id);
  const started = await startSession(exSplit.id);
  check(started.status === 'in_progress' && started.exercises.length === exList.length, `started session with ${started.exercises.length} exercises`);
  const active = await getActiveSession();
  check(active?.id === started.id, 'getActive returns it');
  const ex0 = started.exercises[0];
  const s1 = await addSet(started.id, ex0.id, { weightKg: 40, reps: 10, isWarmup: true });
  const s2 = await addSet(started.id, ex0.id, { weightKg: 60, reps: 8, repsInReserve: 2 });
  const s3 = await addSet(started.id, ex0.id, { weightKg: 45, reps: 8, isDropset: true });
  check(s1.setNumber === 1 && s2.setNumber === 2 && s3.setNumber === 3, 'set numbers 1,2,3');
  check(s1.restSeconds === null && typeof s2.restSeconds === 'number', 'rest derived on 2nd set, null on first');
  check(s3.parentSetId === s2.id && s3.restSeconds === null, 'dropset auto-linked to top set, no rest');
  const s2b = await updateSet(started.id, s2.id, { reps: 9 });
  check(s2b.reps === 9, 'updateSet');
  await deleteSet(started.id, s1.id);
  const afterDel = await getSession(started.id);
  const nums = afterDel.exercises[0].sets.map((s) => s.setNumber);
  check(nums.join() === '1,2', `renumbered after delete: ${nums.join(',')}`);

  const user = await getProfileRow();
  const coachPrompt = buildSessionCoachPrompt(user, afterDel, prev ? [prev] : [], 'next weight?', await db.splitExercises.where('splitId').equals(exSplit.id).sortBy('displayOrder'));
  check(coachPrompt.includes('[TOP OF DROPSET]') && coachPrompt.includes('↘ drop:'), 'coach prompt renders dropset chain');
  const planPrompt = buildSessionPlanPrompt(user, exList as never, prev ? [prev] : []);
  check(planPrompt.includes("TODAY'S SPLIT PLAN"), 'plan prompt builds');

  const done = await completeSession(started.id, 'smoke');
  check(done.status === 'completed' && typeof done.durationSeconds === 'number', 'completeSession');
  const reopened = await reopenSession(started.id);
  check(reopened.status === 'in_progress', 'reopenSession (same day)');
  const abandoned = await abandonSession(started.id);
  check(abandoned.status === 'abandoned', 'abandonSession');
  let threw = false;
  try { await addSet(started.id, ex0.id, { weightKg: 1, reps: 1 }); } catch { threw = true; }
  check(threw, 'abandoned session rejects new sets');

  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toISOString().slice(0, 10);
  const bf = await backfillSession(exSplit.id, yKey);
  check(bf.status === 'completed' && bf.notes?.startsWith('Backfilled'), `backfill for ${yKey}`);
  threw = false;
  try { await backfillSession(exSplit.id, yKey); } catch { threw = true; }
  check(threw, 'duplicate backfill rejected');

  console.log('backup round-trip');
  const out = await exportBackup();
  check(out.sessions.length === raw.sessions.length + 2, `export has ${out.sessions.length} sessions (orig + started + backfill)`);
  const again = await importBackup(JSON.parse(JSON.stringify(out)));
  check(again.sessions === out.sessions.length, 're-import matches');

  console.log(failures ? `\n${failures} FAILED` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
