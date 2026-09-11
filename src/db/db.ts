// Local IndexedDB store (via Dexie). This replaces the FastAPI + Postgres
// backend entirely — every row lives on the device.
//
// Records are stored in the same camelCase shape the UI types expect, so
// the local services can hand them straight to the pages. Timestamps are
// UTC ISO strings (`toISOString()`), which sort correctly as plain strings
// in Dexie indexes. Calendar-only fields (`loggedAt`) are 'YYYY-MM-DD'.

import Dexie, { type EntityTable } from 'dexie';
import type {
  ExperienceLevel,
  TrainingType,
} from '@/types';

export type DayName =
  | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type ExerciseType = 'standard' | 'superset' | 'dropset' | 'giant_set';
export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface ProfileRow {
  id: 'me';
  firstName: string;
  lastName: string;
  email: string;
  age?: number | null;
  weight?: number | null;
  height?: number | null;
  goal?: 'bulking' | 'cutting' | 'maintenance' | null;
  gender?: 'male' | 'female' | 'other' | null;
  trainingType: TrainingType;
  experienceLevel: ExperienceLevel;
  activityLevel?: string;
  mobileNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SplitRow {
  id: string;
  name: string;
  day: DayName;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SplitExerciseRow {
  id: string;
  splitId: string;
  name: string;
  displayOrder: number;
  defaultSets: number;
  exerciseType: ExerciseType;
  supersetGroup?: number;
  notes?: string;
  restSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRow {
  id: string;
  splitId: string;
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  status: SessionStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionExerciseRow {
  id: string;
  sessionId: string;
  // NULL once the source split exercise is deleted — the sync logic then
  // drops this row from any in-progress session.
  splitExerciseId?: string | null;
  exerciseName: string;
  displayOrder: number;
  exerciseType: ExerciseType;
  supersetGroup?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SetRow {
  id: string;
  sessionExerciseId: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  repsInReserve?: number;
  isWarmup: boolean;
  isDropset: boolean;
  description?: string;
  parentSetId?: string | null;
  restSeconds?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeightLogRow {
  id: string;
  weightKg: number;
  waistCm?: number;
  bodyFatPct?: number;
  description?: string;
  loggedAt: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface DietPlanRow {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export class ProgressionXDB extends Dexie {
  profile!: EntityTable<ProfileRow, 'id'>;
  splits!: EntityTable<SplitRow, 'id'>;
  splitExercises!: EntityTable<SplitExerciseRow, 'id'>;
  sessions!: EntityTable<SessionRow, 'id'>;
  sessionExercises!: EntityTable<SessionExerciseRow, 'id'>;
  sets!: EntityTable<SetRow, 'id'>;
  weightLogs!: EntityTable<WeightLogRow, 'id'>;
  dietPlan!: EntityTable<DietPlanRow, 'id'>;

  constructor() {
    super('progressionx');
    this.version(1).stores({
      profile: 'id',
      splits: 'id, day',
      splitExercises: 'id, splitId, [splitId+displayOrder]',
      sessions: 'id, splitId, status, startedAt, [splitId+startedAt]',
      sessionExercises: 'id, sessionId, splitExerciseId',
      sets: 'id, sessionExerciseId, [sessionExerciseId+setNumber], parentSetId',
      weightLogs: 'id, loggedAt',
      dietPlan: 'id',
    });
  }
}

export const db = new ProgressionXDB();

export const ALL_TABLES = [
  'profile',
  'splits',
  'splitExercises',
  'sessions',
  'sessionExercises',
  'sets',
  'weightLogs',
  'dietPlan',
] as const;

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
