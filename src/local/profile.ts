import { db, nowIso, type ProfileRow } from '@/db/db';
import type { User } from '@/types';

/** The single local user, in the `User` shape the pages expect. */
export function toUser(p: ProfileRow): User {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    age: p.age ?? null,
    weight: p.weight ?? null,
    height: p.height ?? null,
    goal: p.goal ?? null,
    gender: p.gender ?? null,
    trainingType: p.trainingType,
    experienceLevel: p.experienceLevel,
    activityLevel: p.activityLevel,
    mobileNumber: p.mobileNumber,
    email: p.email,
    role: 'user',
    isActive: true,
    isProfileComplete: true,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export async function getProfile(): Promise<User | null> {
  const row = await db.profile.get('me');
  return row ? toUser(row) : null;
}

/** Raw row — for the AI prompt builders. */
export async function getProfileRow(): Promise<ProfileRow> {
  const row = await db.profile.get('me');
  if (!row) throw new Error('No profile set up yet');
  return row;
}

export type ProfileInput = Partial<Omit<ProfileRow, 'id' | 'createdAt' | 'updatedAt'>>;

export async function createProfile(input: ProfileInput): Promise<User> {
  const now = nowIso();
  const row: ProfileRow = {
    id: 'me',
    firstName: input.firstName ?? '',
    lastName: input.lastName ?? '',
    email: input.email ?? '',
    age: input.age ?? null,
    weight: input.weight ?? null,
    height: input.height ?? null,
    goal: input.goal ?? null,
    gender: input.gender ?? null,
    trainingType: input.trainingType ?? 'hypertrophy',
    experienceLevel: input.experienceLevel ?? 'beginner',
    activityLevel: input.activityLevel,
    mobileNumber: input.mobileNumber,
    createdAt: now,
    updatedAt: now,
  };
  await db.profile.put(row);
  return toUser(row);
}

export async function updateProfile(patch: ProfileInput): Promise<User> {
  const existing = await db.profile.get('me');
  if (!existing) return createProfile(patch);
  const row: ProfileRow = { ...existing, ...patch, id: 'me', updatedAt: nowIso() };
  await db.profile.put(row);
  return toUser(row);
}
