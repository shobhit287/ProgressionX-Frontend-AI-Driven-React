// Port of analytics_service.py.

import { db, type SessionRow, type SetRow } from '@/db/db';
import type {
  DashboardSummary, ExerciseDataPoint, PersonalRecord, SessionDataPoint,
} from '@/types';
import { addDays, dateKeyOf, dayNameToWeekday, mondayOf, pyWeekday, toDateKey, todayKey } from './dates';

export interface AnalyticsRange {
  splitId?: string;
  fromDate?: string;
  toDate?: string;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Epley: weight × (1 + reps/30). */
function epley(weightKg: number, reps: number): number {
  return round1(weightKg * (1 + reps / 30));
}

function avgOrNull(values: (number | undefined | null)[]): number | undefined {
  const nums = values.filter((v): v is number => typeof v === 'number');
  if (!nums.length) return undefined;
  return round1(nums.reduce((a, b) => a + b, 0) / nums.length);
}

async function completedSessions(range: AnalyticsRange = {}): Promise<SessionRow[]> {
  const from = range.fromDate?.slice(0, 10);
  const to = range.toDate?.slice(0, 10);
  const rows = await db.sessions.where('status').equals('completed').sortBy('startedAt');
  return rows.filter((s) => {
    if (range.splitId && s.splitId !== range.splitId) return false;
    const key = dateKeyOf(s.startedAt);
    if (from && key < from) return false;
    if (to && key > to) return false;
    return true;
  });
}

interface SessionWithSets {
  session: SessionRow;
  exerciseCount: number;
  sets: (SetRow & { exerciseName: string })[];
}

async function expand(sessions: SessionRow[]): Promise<SessionWithSets[]> {
  if (!sessions.length) return [];
  const exRows = await db.sessionExercises.where('sessionId').anyOf(sessions.map((s) => s.id)).toArray();
  const setRows = exRows.length
    ? await db.sets.where('sessionExerciseId').anyOf(exRows.map((e) => e.id)).toArray()
    : [];
  const exById = new Map(exRows.map((e) => [e.id, e]));
  const bySession = new Map<string, SessionWithSets>(
    sessions.map((s) => [s.id, { session: s, exerciseCount: 0, sets: [] }]),
  );
  for (const ex of exRows) bySession.get(ex.sessionId)!.exerciseCount++;
  for (const set of setRows) {
    const ex = exById.get(set.sessionExerciseId);
    if (!ex) continue;
    bySession.get(ex.sessionId)!.sets.push({ ...set, exerciseName: ex.exerciseName });
  }
  return sessions.map((s) => bySession.get(s.id)!);
}

export async function sessionAnalytics(range: AnalyticsRange = {}): Promise<SessionDataPoint[]> {
  const rows = await expand(await completedSessions(range));
  return rows.map(({ session, exerciseCount, sets }) => ({
    date: dateKeyOf(session.startedAt),
    totalVolume: sets.reduce((a, s) => a + s.weightKg * s.reps, 0),
    totalSets: sets.length,
    totalReps: sets.reduce((a, s) => a + s.reps, 0),
    avgRir: avgOrNull(sets.map((s) => s.repsInReserve)),
    durationSeconds: session.durationSeconds,
    exerciseCount,
  }));
}

export interface ExerciseAnalyticsResult {
  dataPoints: ExerciseDataPoint[];
  personalRecord: PersonalRecord | null;
}

export async function exerciseAnalytics(
  exerciseName: string,
  range: Omit<AnalyticsRange, 'splitId'> = {},
): Promise<ExerciseAnalyticsResult> {
  const target = exerciseName.toLowerCase();
  const rows = await expand(await completedSessions(range));

  const dataPoints: ExerciseDataPoint[] = [];
  for (const { session, sets } of rows) {
    const mine = sets.filter((s) => s.exerciseName.toLowerCase() === target);
    if (!mine.length) continue;
    const maxWeight = Math.max(...mine.map((s) => s.weightKg));
    const totalReps = mine.reduce((a, s) => a + s.reps, 0);
    const totalSets = mine.length;
    dataPoints.push({
      date: dateKeyOf(session.startedAt),
      sessionId: session.id,
      maxWeight,
      totalVolume: mine.reduce((a, s) => a + s.weightKg * s.reps, 0),
      totalReps,
      totalSets,
      estimated1Rm: totalSets > 0 ? round1(maxWeight * (1 + totalReps / (totalSets * 30))) : maxWeight,
      avgRir: avgOrNull(mine.map((s) => s.repsInReserve)),
    });
  }

  // PR = best single working set by Epley, across all completed sessions
  // (not limited by the date range — mirrors the backend).
  const all = await expand(await completedSessions());
  let personalRecord: PersonalRecord | null = null;
  for (const { session, sets } of all) {
    for (const s of sets) {
      if (s.isWarmup || s.exerciseName.toLowerCase() !== target) continue;
      const e1rm = epley(s.weightKg, s.reps);
      if (!personalRecord || e1rm > personalRecord.estimated1Rm) {
        personalRecord = { weight: s.weightKg, reps: s.reps, estimated1Rm: e1rm, date: dateKeyOf(session.startedAt) };
      }
    }
  }
  return { dataPoints, personalRecord };
}

export async function dashboardSummary(): Promise<DashboardSummary> {
  const today = new Date();
  const monday = mondayOf(today);
  const sunday = addDays(monday, 6);
  const mondayKey = toDateKey(monday);
  const sundayKey = toDateKey(sunday);

  const completed = await completedSessions();
  const weekSessions = completed.filter((s) => {
    const k = dateKeyOf(s.startedAt);
    return k >= mondayKey && k <= sundayKey;
  }).length;

  // Streak: consecutive programmed training days with a completed session,
  // skipping rest days; one grace pass for "not trained yet today".
  const sessionDates = new Set(completed.map((s) => dateKeyOf(s.startedAt)));
  const splits = await db.splits.toArray();
  const exercisedSplitIds = new Set((await db.splitExercises.toArray()).map((e) => e.splitId));
  const trainingWeekdays = new Set<number>();
  for (const sp of splits) {
    if (!exercisedSplitIds.has(sp.id)) continue;
    const wd = dayNameToWeekday(sp.day);
    if (wd !== undefined) trainingWeekdays.add(wd);
  }

  let currentStreak = 0;
  if (trainingWeekdays.size) {
    let check = new Date(today);
    let gaveGrace = false;
    const todayK = todayKey();
    for (let i = 0; i < 365; i++) {
      const key = toDateKey(check);
      if (trainingWeekdays.has(pyWeekday(check))) {
        if (sessionDates.has(key)) currentStreak++;
        else if (key === todayK && !gaveGrace) gaveGrace = true;
        else break;
      }
      check = addDays(check, -1);
    }
  }

  // Best e1RM per exercise over the last 30 days, top 5.
  const thirtyAgo = toDateKey(addDays(today, -30));
  const recent = await expand(completed.filter((s) => dateKeyOf(s.startedAt) >= thirtyAgo));
  const best = new Map<string, PersonalRecord>();
  for (const { session, sets } of recent) {
    for (const s of sets) {
      if (s.isWarmup) continue;
      const e1rm = epley(s.weightKg, s.reps);
      const cur = best.get(s.exerciseName);
      if (!cur || e1rm > cur.estimated1Rm) {
        best.set(s.exerciseName, {
          exerciseName: s.exerciseName,
          weight: s.weightKg,
          reps: s.reps,
          estimated1Rm: e1rm,
          date: dateKeyOf(session.startedAt),
        });
      }
    }
  }
  const personalRecords = [...best.values()].sort((a, b) => b.estimated1Rm - a.estimated1Rm).slice(0, 5);

  return {
    weekSessions,
    currentStreak,
    totalSessions: completed.length,
    personalRecords,
  };
}
