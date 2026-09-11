// Port of split_exercise_service.py — CRUD on a split's exercises plus the
// propagation of edits into any in-progress session for that split.

import { db, newId, nowIso, type SessionExerciseRow, type SplitExerciseRow } from '@/db/db';
import type { SplitExercise } from '@/types';
import { notFound } from './errors';

export function toSplitExercise(row: SplitExerciseRow): SplitExercise {
  return { ...row };
}

async function assertSplit(splitId: string): Promise<void> {
  if (!(await db.splits.get(splitId))) throw notFound('Split');
}

export async function listBySplit(splitId: string): Promise<SplitExercise[]> {
  await assertSplit(splitId);
  const rows = await db.splitExercises.where('splitId').equals(splitId).sortBy('displayOrder');
  return rows.map(toSplitExercise);
}

/** Distinct exercise names across every split, sorted — for autocomplete. */
export async function allExerciseNames(): Promise<string[]> {
  const rows = await db.splitExercises.toArray();
  return Array.from(new Set(rows.map((r) => r.name))).sort((a, b) => a.localeCompare(b));
}

async function activeSessionIdsFor(splitId: string): Promise<string[]> {
  const rows = await db.sessions.where('status').equals('in_progress').toArray();
  return rows.filter((s) => s.splitId === splitId).map((s) => s.id);
}

export async function createExercise(
  splitId: string,
  payload: Partial<SplitExercise>,
): Promise<SplitExercise> {
  await assertSplit(splitId);
  const now = nowIso();
  let displayOrder = payload.displayOrder;
  if (displayOrder === undefined || displayOrder === null) {
    const existing = await db.splitExercises.where('splitId').equals(splitId).toArray();
    displayOrder = existing.reduce((m, r) => Math.max(m, r.displayOrder), 0) + 1;
  }
  const row: SplitExerciseRow = {
    id: newId(),
    splitId,
    name: payload.name ?? 'Exercise',
    displayOrder,
    defaultSets: payload.defaultSets ?? 3,
    exerciseType: payload.exerciseType ?? 'standard',
    supersetGroup: payload.supersetGroup,
    notes: payload.notes,
    restSeconds: payload.restSeconds ?? 90,
    createdAt: now,
    updatedAt: now,
  };
  await db.splitExercises.add(row);
  return toSplitExercise(row);
}

export async function updateExercise(
  splitId: string,
  id: string,
  payload: Partial<SplitExercise>,
): Promise<SplitExercise> {
  return db.transaction('rw', db.splits, db.splitExercises, db.sessions, db.sessionExercises, async () => {
    await assertSplit(splitId);
    const existing = await db.splitExercises.get(id);
    if (!existing) throw notFound('Exercise');

    const row: SplitExerciseRow = { ...existing, updatedAt: nowIso() };
    if (payload.name !== undefined) row.name = payload.name;
    if (payload.displayOrder !== undefined) row.displayOrder = payload.displayOrder;
    if (payload.defaultSets !== undefined) row.defaultSets = payload.defaultSets;
    if (payload.exerciseType !== undefined) row.exerciseType = payload.exerciseType;
    if ('supersetGroup' in payload) row.supersetGroup = payload.supersetGroup ?? undefined;
    if ('notes' in payload) row.notes = payload.notes ?? undefined;
    if (payload.restSeconds !== undefined) row.restSeconds = payload.restSeconds;
    await db.splitExercises.put(row);

    // Propagate name / type / group / order into in-progress sessions.
    const activeIds = await activeSessionIdsFor(splitId);
    if (activeIds.length) {
      const ses = await db.sessionExercises.where('splitExerciseId').equals(id).toArray();
      const updates: SessionExerciseRow[] = ses
        .filter((se) => activeIds.includes(se.sessionId))
        .map((se) => ({
          ...se,
          ...(payload.name !== undefined ? { exerciseName: payload.name } : {}),
          ...(payload.exerciseType !== undefined ? { exerciseType: payload.exerciseType } : {}),
          ...('supersetGroup' in payload ? { supersetGroup: payload.supersetGroup ?? undefined } : {}),
          ...(payload.displayOrder !== undefined ? { displayOrder: payload.displayOrder } : {}),
          updatedAt: row.updatedAt,
        }));
      if (updates.length) await db.sessionExercises.bulkPut(updates);
    }
    return toSplitExercise(row);
  });
}

export async function deleteExercise(splitId: string, id: string): Promise<void> {
  await db.transaction('rw', db.splits, db.splitExercises, db.sessions, db.sessionExercises, db.sets, async () => {
    await assertSplit(splitId);
    const existing = await db.splitExercises.get(id);
    if (!existing) throw notFound('Exercise');

    // Remove from in-progress sessions (sets included).
    const activeIds = await activeSessionIdsFor(splitId);
    if (activeIds.length) {
      const ses = (await db.sessionExercises.where('splitExerciseId').equals(id).toArray())
        .filter((se) => activeIds.includes(se.sessionId));
      if (ses.length) {
        const seIds = ses.map((s) => s.id);
        await db.sets.where('sessionExerciseId').anyOf(seIds).delete();
        await db.sessionExercises.bulkDelete(seIds);
      }
    }

    // Completed sessions keep their exercise rows but lose the FK
    // (Postgres ON DELETE SET NULL).
    const orphaned = await db.sessionExercises.where('splitExerciseId').equals(id).toArray();
    if (orphaned.length) {
      await db.sessionExercises.bulkPut(orphaned.map((se) => ({ ...se, splitExerciseId: null })));
    }

    await db.splitExercises.delete(id);

    // Close the gap in displayOrder.
    const remaining = await db.splitExercises.where('splitId').equals(splitId).sortBy('displayOrder');
    const renumbered = remaining
      .map((r, i) => ({ ...r, displayOrder: i + 1 }))
      .filter((r, i) => r.displayOrder !== remaining[i].displayOrder);
    if (renumbered.length) await db.splitExercises.bulkPut(renumbered);
  });
}

export async function reorderExercises(
  splitId: string,
  orderItems: { id: string; displayOrder: number }[],
): Promise<SplitExercise[]> {
  return db.transaction('rw', db.splits, db.splitExercises, db.sessions, db.sessionExercises, async () => {
    await assertSplit(splitId);
    const now = nowIso();
    const orderMap = new Map(orderItems.map((o) => [o.id, o.displayOrder]));

    const rows = await db.splitExercises.where('splitId').equals(splitId).toArray();
    const updated = rows
      .filter((r) => orderMap.has(r.id) && orderMap.get(r.id) !== r.displayOrder)
      .map((r) => ({ ...r, displayOrder: orderMap.get(r.id)!, updatedAt: now }));
    if (updated.length) await db.splitExercises.bulkPut(updated);

    const activeIds = await activeSessionIdsFor(splitId);
    if (activeIds.length) {
      const ses = await db.sessionExercises.where('splitExerciseId').anyOf([...orderMap.keys()]).toArray();
      const seUpdates = ses
        .filter((se) => activeIds.includes(se.sessionId) && se.splitExerciseId && orderMap.get(se.splitExerciseId) !== se.displayOrder)
        .map((se) => ({ ...se, displayOrder: orderMap.get(se.splitExerciseId!)!, updatedAt: now }));
      if (seUpdates.length) await db.sessionExercises.bulkPut(seUpdates);
    }

    const out = await db.splitExercises.where('splitId').equals(splitId).sortBy('displayOrder');
    return out.map(toSplitExercise);
  });
}
