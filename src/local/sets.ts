// Port of exercise_set_service.py — add / update / delete a logged set.

import { db, newId, nowIso, type SetRow } from '@/db/db';
import type { ExerciseSet } from '@/types';
import { DomainError, notFound } from './errors';
import { toSet } from './sessions';

// Rests longer than this (seconds) almost always mean the session was
// paused and resumed, not a real inter-set rest — record null instead.
const REST_CAP_SECONDS = 3600;

export interface AddSetInput {
  weightKg: number;
  reps: number;
  repsInReserve?: number;
  isWarmup?: boolean;
  isDropset?: boolean;
  description?: string;
  parentSetId?: string;
}

export interface UpdateSetInput {
  weightKg?: number;
  reps?: number;
  repsInReserve?: number;
  isWarmup?: boolean;
  isDropset?: boolean;
  description?: string;
  parentSetId?: string | null;
}

async function assertExerciseInSession(sessionExerciseId: string, sessionId: string) {
  const ex = await db.sessionExercises.get(sessionExerciseId);
  if (!ex || ex.sessionId !== sessionId) throw notFound('Session exercise');
  return ex;
}

export async function addSet(
  sessionId: string,
  sessionExerciseId: string,
  input: AddSetInput,
): Promise<ExerciseSet> {
  return db.transaction('rw', db.sessions, db.sessionExercises, db.sets, async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) throw notFound('Workout session');
    // Live sessions and completed ones (backfill / editing) accept sets;
    // abandoned stays locked.
    if (session.status !== 'in_progress' && session.status !== 'completed') {
      throw new DomainError('Session cannot accept new sets', 400);
    }
    await assertExerciseInSession(sessionExerciseId, sessionId);

    const existing = await db.sets.where('sessionExerciseId').equals(sessionExerciseId).sortBy('setNumber');
    const setNumber = existing.reduce((m, s) => Math.max(m, s.setNumber), 0) + 1;
    const now = nowIso();

    let restSeconds: number | null = null;
    let parentSetId = input.parentSetId ?? null;

    // Rest before this set = gap since the previous set of this exercise.
    // Skipped for dropset drops (back-to-back) and for the first set.
    if (!input.isDropset && !parentSetId && existing.length) {
      const prev = existing[existing.length - 1];
      const elapsed = (new Date(now).getTime() - new Date(prev.createdAt).getTime()) / 1000;
      if (elapsed >= 0 && elapsed <= REST_CAP_SECONDS) restSeconds = Math.round(elapsed);
    }

    // Auto-link a dropset to the nearest preceding top set.
    if (input.isDropset && !parentSetId) {
      for (let i = existing.length - 1; i >= 0; i--) {
        const prior = existing[i];
        if (!prior.isDropset) { parentSetId = prior.id; break; }
        if (prior.parentSetId) { parentSetId = prior.parentSetId; break; }
      }
    }

    if (parentSetId) {
      const parent = await db.sets.get(parentSetId);
      if (!parent) throw notFound('Exercise set');
      if (parent.sessionExerciseId !== sessionExerciseId) {
        throw new DomainError('parent_set_id must reference a set on the same exercise', 400);
      }
    }

    const row: SetRow = {
      id: newId(),
      sessionExerciseId,
      setNumber,
      weightKg: input.weightKg,
      reps: input.reps,
      repsInReserve: input.repsInReserve,
      isWarmup: input.isWarmup ?? false,
      isDropset: input.isDropset ?? false,
      description: input.description,
      parentSetId,
      restSeconds,
      createdAt: now,
      updatedAt: now,
    };
    await db.sets.add(row);
    return toSet(row);
  });
}

export async function updateSet(
  sessionId: string,
  setId: string,
  input: UpdateSetInput,
): Promise<ExerciseSet> {
  return db.transaction('rw', db.sessions, db.sessionExercises, db.sets, async () => {
    if (!(await db.sessions.get(sessionId))) throw notFound('Workout session');
    const existing = await db.sets.get(setId);
    if (!existing) throw notFound('Exercise set');
    await assertExerciseInSession(existing.sessionExerciseId, sessionId);

    const row: SetRow = { ...existing, updatedAt: nowIso() };
    if (input.weightKg !== undefined) row.weightKg = input.weightKg;
    if (input.reps !== undefined) row.reps = input.reps;
    if (input.repsInReserve !== undefined) row.repsInReserve = input.repsInReserve;
    if (input.isWarmup !== undefined) row.isWarmup = input.isWarmup;
    if (input.isDropset !== undefined) row.isDropset = input.isDropset;
    if (input.description !== undefined) row.description = input.description;
    if (input.parentSetId !== undefined) row.parentSetId = input.parentSetId;
    await db.sets.put(row);
    return toSet(row);
  });
}

export async function deleteSet(sessionId: string, setId: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.sessionExercises, db.sets, async () => {
    if (!(await db.sessions.get(sessionId))) throw notFound('Workout session');
    const existing = await db.sets.get(setId);
    if (!existing) throw notFound('Exercise set');
    await assertExerciseInSession(existing.sessionExerciseId, sessionId);

    await db.sets.delete(setId);

    // Renumber remaining sets 1..n.
    const remaining = await db.sets.where('sessionExerciseId').equals(existing.sessionExerciseId).sortBy('setNumber');
    const renumbered = remaining
      .map((s, i) => ({ ...s, setNumber: i + 1 }))
      .filter((s, i) => s.setNumber !== remaining[i].setNumber);
    if (renumbered.length) await db.sets.bulkPut(renumbered);
  });
}
