// Diet plan storage (the AI parts live in ./ai/service.ts).

import { db, newId, nowIso, type DietPlanRow } from '@/db/db';

export interface DietPlan {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export async function getDietPlan(): Promise<DietPlan | null> {
  const row = await db.dietPlan.toCollection().first();
  return row ? { ...row } : null;
}

export async function saveDietPlan(content: string): Promise<DietPlan> {
  const existing = await db.dietPlan.toCollection().first();
  const now = nowIso();
  const row: DietPlanRow = existing
    ? { ...existing, content, updatedAt: now }
    : { id: newId(), content, createdAt: now, updatedAt: now };
  await db.dietPlan.put(row);
  return { ...row };
}

export async function deleteDietPlan(): Promise<void> {
  await db.dietPlan.clear();
}
