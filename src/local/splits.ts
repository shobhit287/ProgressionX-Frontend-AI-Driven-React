// Port of workout_split_service.py.

import { db, newId, nowIso, type DayName, type ExerciseType, type SplitExerciseRow, type SplitRow } from '@/db/db';
import type { GeneratedDay, WorkoutSplit } from '@/types';
import { DomainError, notFound } from './errors';
import { dayNameOf } from './dates';

export function toSplit(row: SplitRow): WorkoutSplit {
  return { ...row, userId: 'me' };
}

const DAYS: DayName[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

function normalizeExerciseType(value?: string | null): ExerciseType {
  const v = (value ?? 'standard').toLowerCase();
  return (['standard', 'superset', 'dropset', 'giant_set'] as const).includes(v as ExerciseType)
    ? (v as ExerciseType)
    : 'standard';
}

/** Keep supersetGroup only on superset / giant_set rows. */
function normalizeSupersetGroup(value: unknown, type: ExerciseType): number | undefined {
  if (type !== 'superset' && type !== 'giant_set') return undefined;
  if (value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export async function listSplits(): Promise<WorkoutSplit[]> {
  const rows = await db.splits.toArray();
  return rows.map(toSplit);
}

export async function getSplit(id: string): Promise<WorkoutSplit> {
  const row = await db.splits.get(id);
  if (!row) throw notFound('Split');
  return toSplit(row);
}

export async function getTodaySplit(): Promise<WorkoutSplit | null> {
  const row = await db.splits.where('day').equals(dayNameOf(new Date())).first();
  return row ? toSplit(row) : null;
}

export async function createSplit(payload: Partial<WorkoutSplit>): Promise<WorkoutSplit> {
  if (!payload.name || !payload.day) throw new DomainError('Name and day are required', 400);
  const now = nowIso();
  const row: SplitRow = {
    id: newId(),
    name: payload.name,
    day: payload.day,
    description: payload.description,
    createdAt: now,
    updatedAt: now,
  };
  await db.splits.add(row);
  return toSplit(row);
}

export async function updateSplit(
  id: string,
  payload: Partial<WorkoutSplit>,
): Promise<WorkoutSplit> {
  const existing = await db.splits.get(id);
  if (!existing) throw notFound('Split');
  const row: SplitRow = {
    ...existing,
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.day !== undefined ? { day: payload.day } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    updatedAt: nowIso(),
  };
  await db.splits.put(row);
  return toSplit(row);
}

export async function deleteSplit(id: string): Promise<void> {
  await db.transaction('rw', db.splits, db.splitExercises, db.sessions, db.sessionExercises, db.sets, async () => {
    const existing = await db.splits.get(id);
    if (!existing) throw notFound('Split');

    // Postgres cascaded: split → split_exercises, split → sessions →
    // session_exercises → sets. Mirror that here.
    await db.splitExercises.where('splitId').equals(id).delete();
    const sessionIds = await db.sessions.where('splitId').equals(id).primaryKeys();
    if (sessionIds.length) {
      const seIds = await db.sessionExercises.where('sessionId').anyOf(sessionIds).primaryKeys();
      if (seIds.length) await db.sets.where('sessionExerciseId').anyOf(seIds).delete();
      await db.sessionExercises.where('sessionId').anyOf(sessionIds).delete();
      await db.sessions.bulkDelete(sessionIds);
    }
    await db.splits.delete(id);
  });
}

interface IncomingExercise {
  name: string;
  displayOrder?: number;
  defaultSets?: number;
  exerciseType?: string | null;
  supersetGroup?: number | null;
  restSeconds?: number;
  notes?: string | null;
}

function buildExerciseRows(splitId: string, exercises: IncomingExercise[], now: string): SplitExerciseRow[] {
  return exercises.map((ex, i) => {
    const type = normalizeExerciseType(ex.exerciseType);
    return {
      id: newId(),
      splitId,
      name: ex.name,
      displayOrder: ex.displayOrder ?? i + 1,
      defaultSets: ex.defaultSets ?? 3,
      exerciseType: type,
      supersetGroup: normalizeSupersetGroup(ex.supersetGroup, type),
      restSeconds: ex.restSeconds ?? 90,
      notes: ex.notes ?? undefined,
      createdAt: now,
      updatedAt: now,
    };
  });
}

/** Replace the full weekly schedule. Reuses existing split rows per day
 *  (preserves session → split links) and rewrites their exercises. */
export async function bulkReplaceSchedule(days: GeneratedDay[]): Promise<WorkoutSplit[]> {
  await db.transaction('rw', db.splits, db.splitExercises, async () => {
    const existing = await db.splits.toArray();
    const byDay = new Map(existing.map((s) => [s.day, s]));
    const now = nowIso();

    for (const d of days) {
      const day = String(d.day).toLowerCase() as DayName;
      if (!DAYS.includes(day)) continue;
      let split = byDay.get(day);
      if (!split) {
        split = {
          id: newId(),
          name: d.name,
          day,
          description: d.description ?? undefined,
          createdAt: now,
          updatedAt: now,
        };
        await db.splits.add(split);
        byDay.set(day, split);
      } else {
        split = { ...split, name: d.name, description: d.description ?? undefined, updatedAt: now };
        await db.splits.put(split);
        await db.splitExercises.where('splitId').equals(split.id).delete();
      }
      if (!d.isRest) {
        await db.splitExercises.bulkAdd(buildExerciseRows(split.id, d.exercises, now));
      }
    }
  });
  return listSplits();
}

/** Replace one split's name/description/exercises with an AI-generated day. */
export async function replaceSingleSplit(id: string, data: GeneratedDay): Promise<WorkoutSplit> {
  return db.transaction('rw', db.splits, db.splitExercises, async () => {
    const existing = await db.splits.get(id);
    if (!existing) throw notFound('Split');
    const now = nowIso();
    const row: SplitRow = {
      ...existing,
      name: data.name,
      description: data.description ?? undefined,
      updatedAt: now,
    };
    await db.splits.put(row);
    await db.splitExercises.where('splitId').equals(id).delete();
    if (!data.isRest) {
      await db.splitExercises.bulkAdd(buildExerciseRows(id, data.exercises, now));
    }
    return toSplit(row);
  });
}
