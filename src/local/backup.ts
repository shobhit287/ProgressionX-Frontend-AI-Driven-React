// Full-database backup / restore as a single JSON file. This is the only
// safety net for data that lives on one phone — the profile page surfaces
// it, and `scripts/extract-backup.mjs` produces the same format from a
// Postgres dump of the old server.

import {
  db, ALL_TABLES,
  type DietPlanRow, type ProfileRow, type SessionExerciseRow, type SessionRow,
  type SetRow, type SplitExerciseRow, type SplitRow, type WeightLogRow,
} from '@/db/db';
import { DomainError } from './errors';

export const BACKUP_FORMAT = 'progressionx-backup';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  profile: ProfileRow | null;
  splits: SplitRow[];
  splitExercises: SplitExerciseRow[];
  sessions: SessionRow[];
  sessionExercises: SessionExerciseRow[];
  sets: SetRow[];
  weightLogs: WeightLogRow[];
  dietPlan: DietPlanRow | null;
}

export async function exportBackup(): Promise<BackupFile> {
  return db.transaction('r', [...ALL_TABLES].map((t) => db.table(t)), async () => ({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    profile: (await db.profile.get('me')) ?? null,
    splits: await db.splits.toArray(),
    splitExercises: await db.splitExercises.toArray(),
    sessions: await db.sessions.toArray(),
    sessionExercises: await db.sessionExercises.toArray(),
    sets: await db.sets.toArray(),
    weightLogs: await db.weightLogs.toArray(),
    dietPlan: (await db.dietPlan.toCollection().first()) ?? null,
  }));
}

export function backupFilename(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `progressionx-backup-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}

export function validateBackup(raw: unknown): BackupFile {
  if (!raw || typeof raw !== 'object') throw new DomainError('Not a valid backup file', 400);
  const b = raw as Partial<BackupFile>;
  if (b.format !== BACKUP_FORMAT) throw new DomainError('Not a ProgressionX backup file', 400);
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) {
    throw new DomainError('This backup was made by a newer version of the app', 400);
  }
  const arr = <T,>(v: unknown, name: string): T[] => {
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) throw new DomainError(`Backup field "${name}" is malformed`, 400);
    return v as T[];
  };
  return {
    format: BACKUP_FORMAT,
    version: b.version,
    exportedAt: typeof b.exportedAt === 'string' ? b.exportedAt : new Date(0).toISOString(),
    profile: (b.profile as ProfileRow | null) ?? null,
    splits: arr<SplitRow>(b.splits, 'splits'),
    splitExercises: arr<SplitExerciseRow>(b.splitExercises, 'splitExercises'),
    sessions: arr<SessionRow>(b.sessions, 'sessions'),
    sessionExercises: arr<SessionExerciseRow>(b.sessionExercises, 'sessionExercises'),
    sets: arr<SetRow>(b.sets, 'sets'),
    weightLogs: arr<WeightLogRow>(b.weightLogs, 'weightLogs'),
    dietPlan: (b.dietPlan as DietPlanRow | null) ?? null,
  };
}

export interface ImportSummary {
  sessions: number;
  sets: number;
  splits: number;
  weightLogs: number;
}

/** Replace everything on the device with the backup's contents. */
export async function importBackup(raw: unknown): Promise<ImportSummary> {
  const b = validateBackup(raw);
  await db.transaction('rw', [...ALL_TABLES].map((t) => db.table(t)), async () => {
    for (const t of ALL_TABLES) await db.table(t).clear();
    if (b.profile) await db.profile.put({ ...b.profile, id: 'me' });
    await db.splits.bulkAdd(b.splits);
    await db.splitExercises.bulkAdd(b.splitExercises);
    await db.sessions.bulkAdd(b.sessions);
    await db.sessionExercises.bulkAdd(b.sessionExercises);
    await db.sets.bulkAdd(b.sets);
    await db.weightLogs.bulkAdd(b.weightLogs);
    if (b.dietPlan) await db.dietPlan.put(b.dietPlan);
  });
  return {
    sessions: b.sessions.length,
    sets: b.sets.length,
    splits: b.splits.length,
    weightLogs: b.weightLogs.length,
  };
}

export async function hasAnyData(): Promise<boolean> {
  return (await db.profile.count()) > 0;
}

/** Ask the browser not to evict our IndexedDB under storage pressure.
 *  Returns the resulting persisted state (false if unsupported/denied). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function isStoragePersisted(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persisted) return false;
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}
