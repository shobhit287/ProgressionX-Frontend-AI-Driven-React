// Port of weight_log_service.py.

import { db, newId, nowIso, type WeightLogRow } from '@/db/db';
import type { PaginatedResponse, WeeklyAverage, WeightAnalytics, WeightLog } from '@/types';
import { notFound } from './errors';
import { daysBetween, mondayOf, parseDateKey, toDateKey, todayKey } from './dates';

export function toWeightLog(row: WeightLogRow): WeightLog {
  return { ...row };
}

export interface WeightLogFilters {
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
}

async function inRange(from?: string, to?: string): Promise<WeightLogRow[]> {
  const f = from?.slice(0, 10);
  const t = to?.slice(0, 10);
  const rows = await db.weightLogs.orderBy('loggedAt').toArray();
  return rows.filter((r) => (!f || r.loggedAt >= f) && (!t || r.loggedAt <= t));
}

export async function listWeightLogs(filters: WeightLogFilters = {}): Promise<PaginatedResponse<WeightLog>> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  // Newest first for the list, as the backend did.
  const rows = (await inRange(filters.fromDate, filters.toDate)).reverse();
  const total = rows.length;
  return {
    items: rows.slice((page - 1) * pageSize, page * pageSize).map(toWeightLog),
    total,
    page,
    pageSize,
    totalPages: total ? Math.ceil(total / pageSize) : 0,
  };
}

export interface DetailedWeightEntry {
  date: string;
  weight_kg: number;
  waist_cm?: number;
  body_fat_pct?: number;
  note?: string;
}

export interface WeightAnalyticsFull extends WeightAnalytics {
  detailedEntries: DetailedWeightEntry[];
}

export async function weightAnalytics(filters: Omit<WeightLogFilters, 'page' | 'pageSize'> = {}): Promise<WeightAnalyticsFull> {
  const logs = await inRange(filters.fromDate, filters.toDate);
  if (!logs.length) {
    return { weeklyAverages: [], rateOfChange: 0, totalChange: 0, entries: 0, detailedEntries: [] };
  }

  const weekly = new Map<string, number[]>();
  for (const log of logs) {
    const wk = toDateKey(mondayOf(parseDateKey(log.loggedAt)));
    weekly.set(wk, [...(weekly.get(wk) ?? []), log.weightKg]);
  }
  const weeklyAverages: WeeklyAverage[] = [...weekly.keys()].sort().map((weekStart) => {
    const ws = weekly.get(weekStart)!;
    return {
      weekStart,
      averageWeight: Math.round((ws.reduce((a, b) => a + b, 0) / ws.length) * 100) / 100,
      entries: ws.length,
    };
  });

  let totalChange = 0;
  let rateOfChange = 0;
  if (logs.length >= 2) {
    const first = logs[0];
    const last = logs[logs.length - 1];
    totalChange = Math.round((last.weightKg - first.weightKg) * 100) / 100;
    const span = daysBetween(parseDateKey(first.loggedAt), parseDateKey(last.loggedAt));
    if (span > 0) rateOfChange = Math.round((totalChange / (span / 7)) * 100) / 100;
  }

  const detailedEntries: DetailedWeightEntry[] = logs.map((l) => ({
    date: l.loggedAt,
    weight_kg: l.weightKg,
    ...(l.waistCm !== undefined && l.waistCm !== null ? { waist_cm: l.waistCm } : {}),
    ...(l.bodyFatPct !== undefined && l.bodyFatPct !== null ? { body_fat_pct: l.bodyFatPct } : {}),
    ...(l.description ? { note: l.description } : {}),
  }));

  return { weeklyAverages, rateOfChange, totalChange, entries: logs.length, detailedEntries };
}

export async function createWeightLog(input: {
  weightKg: number;
  waistCm?: number;
  bodyFatPct?: number;
  description?: string;
  loggedAt?: string;
}): Promise<WeightLog> {
  const now = nowIso();
  const row: WeightLogRow = {
    id: newId(),
    weightKg: input.weightKg,
    waistCm: input.waistCm,
    bodyFatPct: input.bodyFatPct,
    description: input.description,
    loggedAt: input.loggedAt ? input.loggedAt.slice(0, 10) : todayKey(),
    createdAt: now,
    updatedAt: now,
  };
  await db.weightLogs.add(row);
  return toWeightLog(row);
}

export async function deleteWeightLog(id: string): Promise<void> {
  if (!(await db.weightLogs.get(id))) throw notFound('Weight log');
  await db.weightLogs.delete(id);
}

export async function latestWeightKg(): Promise<number | null> {
  const row = await db.weightLogs.orderBy('loggedAt').last();
  return row ? row.weightKg : null;
}
