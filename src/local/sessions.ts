// Port of workout_session_service.py + the session parts of
// exercise_set_service.py (previous-sets map).

import {
  db, newId, nowIso,
  type SessionExerciseRow, type SessionRow, type SetRow,
} from '@/db/db';
import type {
  ExerciseSet, PaginatedResponse, SessionDateItem, SessionExercise,
  WorkoutSession, WorkoutSessionDetail,
} from '@/types';
import type { PreviousSetsMap } from '@/api/sets';
import { DomainError, notFound } from './errors';
import { dateKeyOf, parseDateKey, secondsBetween, todayKey } from './dates';

export function toSession(row: SessionRow): WorkoutSession {
  return { ...row };
}

export function toSet(row: SetRow): ExerciseSet {
  return { ...row };
}

/** Session + exercises (by displayOrder) + sets (by setNumber). */
export async function loadDetail(sessionId: string): Promise<WorkoutSessionDetail> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw notFound('Workout session');
  const exercises = await loadExercises(sessionId);
  return { ...toSession(session), exercises };
}

export async function loadExercises(sessionId: string): Promise<SessionExercise[]> {
  const exRows = await db.sessionExercises.where('sessionId').equals(sessionId).sortBy('displayOrder');
  if (!exRows.length) return [];
  const setRows = await db.sets.where('sessionExerciseId').anyOf(exRows.map((e) => e.id)).toArray();
  const setsByEx = new Map<string, SetRow[]>();
  for (const s of setRows) {
    const list = setsByEx.get(s.sessionExerciseId) ?? [];
    list.push(s);
    setsByEx.set(s.sessionExerciseId, list);
  }
  return exRows.map((ex) => ({
    id: ex.id,
    exerciseName: ex.exerciseName,
    displayOrder: ex.displayOrder,
    exerciseType: ex.exerciseType,
    supersetGroup: ex.supersetGroup,
    sets: (setsByEx.get(ex.id) ?? []).sort((a, b) => a.setNumber - b.setNumber).map(toSet),
  }));
}

async function seedExercisesFromSplit(sessionId: string, splitId: string, now: string): Promise<void> {
  const splitExercises = await db.splitExercises.where('splitId').equals(splitId).sortBy('displayOrder');
  const rows: SessionExerciseRow[] = splitExercises.map((ex) => ({
    id: newId(),
    sessionId,
    splitExerciseId: ex.id,
    exerciseName: ex.name,
    displayOrder: ex.displayOrder,
    exerciseType: ex.exerciseType,
    supersetGroup: ex.supersetGroup,
    createdAt: now,
    updatedAt: now,
  }));
  if (rows.length) await db.sessionExercises.bulkAdd(rows);
}

async function findActiveRow(): Promise<SessionRow | undefined> {
  return db.sessions.where('status').equals('in_progress').first();
}

async function autoComplete(row: SessionRow, notes: string, now: string): Promise<void> {
  await db.sessions.put({
    ...row,
    status: 'completed',
    completedAt: now,
    durationSeconds: secondsBetween(row.startedAt, now),
    notes,
    updatedAt: now,
  });
}

export async function startSession(splitId: string): Promise<WorkoutSessionDetail> {
  const id = await db.transaction('rw', db.sessions, db.sessionExercises, db.splitExercises, db.splits, async () => {
    if (!(await db.splits.get(splitId))) throw notFound('Split');
    const now = nowIso();

    const active = await findActiveRow();
    if (active) {
      const isPreviousDay = dateKeyOf(active.startedAt) < dateKeyOf(now);
      await autoComplete(
        active,
        isPreviousDay
          ? 'Auto-completed (previous session replaced by new start)'
          : 'Auto-completed (new session started)',
        now,
      );
    }

    const row: SessionRow = {
      id: newId(),
      splitId,
      startedAt: now,
      status: 'in_progress',
      createdAt: now,
      updatedAt: now,
    };
    await db.sessions.add(row);
    await seedExercisesFromSplit(row.id, splitId, now);
    return row.id;
  });
  return loadDetail(id);
}

/** Create a COMPLETED session dated to a past day so the user can log a
 *  workout they did but never recorded. */
export async function backfillSession(splitId: string, date: string): Promise<WorkoutSessionDetail> {
  const id = await db.transaction('rw', db.sessions, db.sessionExercises, db.splitExercises, db.splits, async () => {
    const targetKey = date.slice(0, 10);
    if (targetKey > todayKey()) throw new DomainError('Cannot backfill a future date', 400);
    if (!(await db.splits.get(splitId))) throw notFound('Split');

    const sameDay = await db.sessions
      .where('splitId').equals(splitId)
      .filter((s) => dateKeyOf(s.startedAt) === targetKey)
      .first();
    if (sameDay) throw new DomainError('A session already exists for this split on that date', 409);

    // Noon local — sorts cleanly between same-day entries from other splits.
    const startedAt = parseDateKey(targetKey);
    startedAt.setHours(12, 0, 0, 0);
    const startedIso = startedAt.toISOString();
    const now = nowIso();

    const row: SessionRow = {
      id: newId(),
      splitId,
      startedAt: startedIso,
      completedAt: startedIso,
      status: 'completed',
      notes: 'Backfilled — logged after the fact',
      createdAt: now,
      updatedAt: now,
    };
    await db.sessions.add(row);
    await seedExercisesFromSplit(row.id, splitId, now);
    return row.id;
  });
  return loadDetail(id);
}

/** Bring an in-progress session's exercise list in line with its split
 *  (adds new, removes deleted, syncs name/type/order). True if changed. */
async function syncSplitExercises(session: SessionRow): Promise<boolean> {
  const current = await db.splitExercises.where('splitId').equals(session.splitId).sortBy('displayOrder');
  const currentIds = new Set(current.map((e) => e.id));
  const existing = await db.sessionExercises.where('sessionId').equals(session.id).toArray();
  const now = nowIso();
  let changed = false;

  const toRemove = existing.filter((se) => !se.splitExerciseId || !currentIds.has(se.splitExerciseId));
  if (toRemove.length) {
    const ids = toRemove.map((se) => se.id);
    await db.sets.where('sessionExerciseId').anyOf(ids).delete();
    await db.sessionExercises.bulkDelete(ids);
    changed = true;
  }

  const byId = new Map(current.map((e) => [e.id, e]));
  const updates: SessionExerciseRow[] = [];
  for (const se of existing) {
    if (!se.splitExerciseId) continue;
    const src = byId.get(se.splitExerciseId);
    if (!src) continue;
    if (
      se.exerciseName !== src.name
      || se.displayOrder !== src.displayOrder
      || se.exerciseType !== src.exerciseType
      || (se.supersetGroup ?? undefined) !== (src.supersetGroup ?? undefined)
    ) {
      updates.push({
        ...se,
        exerciseName: src.name,
        displayOrder: src.displayOrder,
        exerciseType: src.exerciseType,
        supersetGroup: src.supersetGroup,
        updatedAt: now,
      });
    }
  }
  if (updates.length) {
    await db.sessionExercises.bulkPut(updates);
    changed = true;
  }

  const have = new Set(existing.map((se) => se.splitExerciseId).filter(Boolean));
  const fresh = current.filter((e) => !have.has(e.id));
  if (fresh.length) {
    let maxOrder = existing.reduce((m, se) => Math.max(m, se.displayOrder), 0);
    await db.sessionExercises.bulkAdd(fresh.map((ex) => ({
      id: newId(),
      sessionId: session.id,
      splitExerciseId: ex.id,
      exerciseName: ex.name,
      displayOrder: ++maxOrder,
      exerciseType: ex.exerciseType,
      supersetGroup: ex.supersetGroup,
      createdAt: now,
      updatedAt: now,
    })));
    changed = true;
  }
  return changed;
}

/** The in-progress session, or null. A session left open from a previous
 *  calendar day is auto-completed here rather than returned. */
export async function getActiveSession(): Promise<WorkoutSessionDetail | null> {
  const id = await db.transaction('rw', db.sessions, db.sessionExercises, db.sets, db.splitExercises, async () => {
    const active = await findActiveRow();
    if (!active) return null;
    const now = nowIso();
    if (dateKeyOf(active.startedAt) < dateKeyOf(now)) {
      await autoComplete(active, 'Auto-completed (session from previous day)', now);
      return null;
    }
    await syncSplitExercises(active);
    return active.id;
  });
  return id ? loadDetail(id) : null;
}

export async function getSession(id: string): Promise<WorkoutSessionDetail> {
  await db.transaction('rw', db.sessions, db.sessionExercises, db.sets, db.splitExercises, async () => {
    const row = await db.sessions.get(id);
    if (!row) throw notFound('Workout session');
    if (row.status === 'in_progress') await syncSplitExercises(row);
  });
  return loadDetail(id);
}

/** Most recent COMPLETED session for the same split that has logged sets. */
async function findPreviousCompletedRow(sessionId: string): Promise<SessionRow | null> {
  const current = await db.sessions.get(sessionId);
  if (!current) throw notFound('Workout session');
  const candidates = (await db.sessions
    .where('splitId').equals(current.splitId)
    .filter((s) => s.status === 'completed' && s.id !== sessionId)
    .reverse()
    .sortBy('startedAt')).slice(0, 10);
  for (const c of candidates) {
    const exIds = await db.sessionExercises.where('sessionId').equals(c.id).primaryKeys();
    if (!exIds.length) continue;
    const n = await db.sets.where('sessionExerciseId').anyOf(exIds).count();
    if (n > 0) return c;
  }
  return null;
}

export async function getPreviousSession(sessionId: string): Promise<WorkoutSessionDetail | null> {
  const prev = await findPreviousCompletedRow(sessionId);
  return prev ? loadDetail(prev.id) : null;
}

export interface SessionListFilters {
  page?: number;
  pageSize?: number;
  status?: string;
  splitId?: string;
  fromDate?: string;
  toDate?: string;
}

export async function listSessions(filters: SessionListFilters = {}): Promise<PaginatedResponse<WorkoutSession>> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const from = filters.fromDate?.slice(0, 10);
  const to = filters.toDate?.slice(0, 10);

  let rows = await db.sessions.orderBy('startedAt').reverse().toArray();
  rows = rows.filter((s) => {
    if (filters.splitId && s.splitId !== filters.splitId) return false;
    if (filters.status && s.status !== filters.status) return false;
    const key = dateKeyOf(s.startedAt);
    if (from && key < from) return false;
    if (to && key > to) return false;
    return true;
  });
  const total = rows.length;
  const items = rows.slice((page - 1) * pageSize, page * pageSize).map(toSession);
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function sessionDatesBySplit(splitId: string, limit = 500): Promise<SessionDateItem[]> {
  const rows = await db.sessions.where('splitId').equals(splitId).reverse().sortBy('startedAt');
  return rows.slice(0, limit).map((s) => ({ id: s.id, startedAt: s.startedAt, status: s.status }));
}

export async function completeSession(id: string, notes?: string): Promise<WorkoutSession> {
  const row = await db.sessions.get(id);
  if (!row) throw notFound('Workout session');
  if (row.status !== 'in_progress') throw new DomainError('Session is not in progress', 400);
  const now = nowIso();
  const updated: SessionRow = {
    ...row,
    status: 'completed',
    completedAt: now,
    durationSeconds: secondsBetween(row.startedAt, now),
    ...(notes !== undefined ? { notes } : {}),
    updatedAt: now,
  };
  await db.sessions.put(updated);
  return toSession(updated);
}

export async function abandonSession(id: string): Promise<WorkoutSession> {
  const row = await db.sessions.get(id);
  if (!row) throw notFound('Workout session');
  if (row.status !== 'in_progress') throw new DomainError('Session is not in progress', 400);
  const now = nowIso();
  const updated: SessionRow = {
    ...row,
    status: 'abandoned',
    completedAt: now,
    durationSeconds: secondsBetween(row.startedAt, now),
    updatedAt: now,
  };
  await db.sessions.put(updated);
  return toSession(updated);
}

/** Restore a same-day session to in-progress after an accidental
 *  abandon / complete. */
export async function reopenSession(id: string): Promise<WorkoutSession> {
  const row = await db.sessions.get(id);
  if (!row) throw notFound('Session');
  if (row.status === 'in_progress') return toSession(row);
  if (dateKeyOf(row.startedAt) !== todayKey()) {
    throw new DomainError("Only today's session can be reopened", 400);
  }
  const active = await findActiveRow();
  if (active && active.id !== id) {
    throw new DomainError(
      'Another session is already in progress. Complete or abandon it before reopening this one.',
      400,
    );
  }
  const updated: SessionRow = {
    ...row,
    status: 'in_progress',
    completedAt: undefined,
    durationSeconds: undefined,
    updatedAt: nowIso(),
  };
  await db.sessions.put(updated);
  return toSession(updated);
}

export async function deleteSession(id: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.sessionExercises, db.sets, async () => {
    if (!(await db.sessions.get(id))) throw notFound('Workout session');
    const exIds = await db.sessionExercises.where('sessionId').equals(id).primaryKeys();
    if (exIds.length) await db.sets.where('sessionExerciseId').anyOf(exIds).delete();
    await db.sessionExercises.where('sessionId').equals(id).delete();
    await db.sessions.delete(id);
  });
}

/** { lowercased exercise name → previous session's sets }, for the PREV
 *  hints on the active-session page. Snake_case keys are what the page
 *  already reads. */
export async function previousSetsMap(sessionId: string): Promise<PreviousSetsMap> {
  const prev = await findPreviousCompletedRow(sessionId);
  if (!prev) return {};
  const exercises = await loadExercises(prev.id);
  const out: PreviousSetsMap = {};
  for (const ex of exercises) {
    const childCount = new Map<string, number>();
    for (const s of ex.sets) {
      if (s.parentSetId) childCount.set(s.parentSetId, (childCount.get(s.parentSetId) ?? 0) + 1);
    }
    out[ex.exerciseName.toLowerCase()] = ex.sets
      .slice()
      .sort((a, b) => a.setNumber - b.setNumber)
      .map((s) => ({
        set_number: s.setNumber,
        weight_kg: s.weightKg,
        reps: s.reps,
        reps_in_reserve: s.repsInReserve ?? null,
        is_warmup: s.isWarmup,
        is_dropset: s.isDropset,
        had_drops: (childCount.get(s.id) ?? 0) > 0,
        description: s.description ?? null,
        rest_seconds: s.restSeconds ?? null,
      }));
  }
  return out;
}
