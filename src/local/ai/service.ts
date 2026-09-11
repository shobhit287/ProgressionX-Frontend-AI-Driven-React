// Port of ai_service.py + the AI half of diet_service.py. Every method
// gathers context from IndexedDB and calls Groq directly.

import { db, type DayName, type ExerciseType } from '@/db/db';
import type {
  AIAnalysisResponse, GeneratedDay, GeneratedExercise, SessionCoachResponse,
  SessionPlanResponse, WeeklyScheduleResponse, WorkoutSessionDetail,
} from '@/types';
import { notFound } from '../errors';
import { addDays, dateKeyOf, toDateKey } from '../dates';
import { getProfileRow } from '../profile';
import { exerciseAnalytics, sessionAnalytics } from '../analytics';
import { latestWeightKg, listWeightLogs, weightAnalytics } from '../weightLogs';
import { loadDetail, loadExercises } from '../sessions';
import { getDietPlan } from '../diet';
import { generate, generateJson, generateWithHistory } from './groq';
import * as P from './prompts';

interface DateRange {
  fromDate?: string;
  toDate?: string;
}

function asAnalysis(parsed: Record<string, unknown>): AIAnalysisResponse {
  const analysis = typeof parsed.analysis === 'string' ? parsed.analysis : '';
  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.filter((s): s is string => typeof s === 'string')
    : [];
  return { analysis, suggestions };
}

// ── analysis ─────────────────────────────────────────────────────────

export async function analyzeSessions(range: DateRange & { splitId?: string; question?: string } = {}): Promise<AIAnalysisResponse> {
  const user = await getProfileRow();
  const sessions = await sessionAnalytics(range);
  const parsed = await generateJson(
    P.buildSessionAnalysisPrompt(user, sessions, range.question),
    P.ANALYSIS_SYSTEM_INSTRUCTION,
  );
  return asAnalysis(parsed);
}

export async function analyzeExercise(input: DateRange & { exerciseName: string; question?: string }): Promise<AIAnalysisResponse> {
  const user = await getProfileRow();
  const { dataPoints, personalRecord } = await exerciseAnalytics(input.exerciseName, input);
  const parsed = await generateJson(
    P.buildExerciseAnalysisPrompt(user, input.exerciseName, dataPoints, personalRecord, input.question),
    P.ANALYSIS_SYSTEM_INSTRUCTION,
  );
  return asAnalysis(parsed);
}

export async function analyzeWeight(range: DateRange & { question?: string } = {}): Promise<AIAnalysisResponse> {
  const user = await getProfileRow();
  const analytics = await weightAnalytics(range);
  const parsed = await generateJson(
    P.buildWeightAnalysisPrompt(user, analytics, range.question),
    P.ANALYSIS_SYSTEM_INSTRUCTION,
  );
  return asAnalysis(parsed);
}

export async function analyzeSplit(question: string): Promise<AIAnalysisResponse> {
  const user = await getProfileRow();
  const splits = await db.splits.toArray();
  const allEx = await db.splitExercises.toArray();
  const splitsData: P.SplitForPrompt[] = splits.map((s) => ({
    day: s.day,
    name: s.name,
    description: s.description,
    exercises: allEx
      .filter((e) => e.splitId === s.id)
      .sort((a, b) => a.displayOrder - b.displayOrder),
  }));
  const parsed = await generateJson(
    P.buildSplitAnalysisPrompt(user, splitsData, await latestWeightKg(), question),
    P.SPLIT_ANALYSIS_SYSTEM_INSTRUCTION,
    400,
  );
  return asAnalysis(parsed);
}

// ── chat ─────────────────────────────────────────────────────────────

export async function fitnessChat(question: string, history: { role: string; content: string }[] = []): Promise<{ answer: string }> {
  const user = await getProfileRow();
  const fourWeeksAgo = toDateKey(addDays(new Date(), -28));
  const recent = await sessionAnalytics({ fromDate: fourWeeksAgo });
  const wa = await weightAnalytics({ fromDate: fourWeeksAgo });
  const answer = await generateWithHistory(
    P.buildFitnessChatPrompt(user, recent, wa.entries ? wa : null, question),
    P.FITNESS_CHAT_SYSTEM_INSTRUCTION,
    history,
    512,
  );
  return { answer };
}

// ── session coach / plan ─────────────────────────────────────────────

/** Last 5 completed sessions (≤ 5 weeks old) for the split, newest first. */
async function recentHistoryForSplit(splitId: string, excludeId: string): Promise<WorkoutSessionDetail[]> {
  const cutoff = toDateKey(addDays(new Date(), -35));
  const rows = (await db.sessions
    .where('splitId').equals(splitId)
    .filter((s) => s.status === 'completed' && s.id !== excludeId && dateKeyOf(s.startedAt) >= cutoff)
    .reverse()
    .sortBy('startedAt')).slice(0, 5);
  return Promise.all(rows.map(async (r) => ({ ...r, exercises: await loadExercises(r.id) })));
}

export async function sessionCoach(sessionId: string, question: string): Promise<SessionCoachResponse> {
  const session = await db.sessions.get(sessionId);
  if (!session) return { answer: 'Session not found.' };
  const user = await getProfileRow();
  const detail = await loadDetail(sessionId);
  const splitExercises = await db.splitExercises.where('splitId').equals(session.splitId).sortBy('displayOrder');
  const past = await recentHistoryForSplit(session.splitId, sessionId);
  const answer = await generate(
    P.buildSessionCoachPrompt(user, detail, past, question, splitExercises),
    P.SESSION_COACH_SYSTEM_INSTRUCTION,
    600,
  );
  return { answer };
}

function numberFrom(v: unknown, integer: boolean): number {
  if (typeof v === 'number') return integer ? Math.trunc(v) : v;
  if (typeof v === 'string') {
    const m = integer ? /(\d+)/.exec(v) : /(\d+\.?\d*)/.exec(v);
    return m ? Number(m[1]) : 0;
  }
  return 0;
}

function parseSessionPlan(raw: string): SessionPlanResponse {
  try {
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.includes('\n') ? cleaned.slice(cleaned.indexOf('\n') + 1) : cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3).trim();
    }
    const parsed = JSON.parse(cleaned) as { exercises?: unknown; note?: unknown };
    const exercisesRaw = Array.isArray(parsed.exercises) ? parsed.exercises : [];
    const exercises = exercisesRaw
      .filter((ex): ex is Record<string, unknown> => !!ex && typeof ex === 'object')
      .map((ex) => {
        const setsRaw = Array.isArray(ex.sets) ? ex.sets : [];
        const sets = setsRaw
          .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
          .map((s, i) => ({
            setNumber: numberFrom(s.setNumber ?? s.set_number, true) || i + 1,
            weightKg: numberFrom(s.weightKg ?? s.weight, false),
            reps: numberFrom(s.reps, true),
            isWarmup: Boolean(s.isWarmup ?? s.is_warmup ?? s.warmup ?? false),
          }));
        return {
          exerciseName: String(ex.exerciseName ?? ex.name ?? 'Unknown Exercise'),
          sets,
        };
      });
    return { exercises, note: typeof parsed.note === 'string' ? parsed.note : '' };
  } catch {
    return {
      exercises: [],
      note: 'Could not generate plan. Ask the AI coach for individual exercise advice.',
    };
  }
}

export async function generateSessionPlan(sessionId: string): Promise<SessionPlanResponse> {
  const session = await db.sessions.get(sessionId);
  if (!session) return { exercises: [], note: 'Session not found.' };
  const user = await getProfileRow();
  const splitExercises = await db.splitExercises.where('splitId').equals(session.splitId).sortBy('displayOrder');
  if (!splitExercises.length) return { exercises: [], note: 'No exercises in this split.' };
  const past = await recentHistoryForSplit(session.splitId, sessionId);
  const raw = await generate(
    P.buildSessionPlanPrompt(user, splitExercises, past),
    P.SESSION_PLAN_SYSTEM_INSTRUCTION,
    1500,
  );
  return parseSessionPlan(raw);
}

// ── schedule generation ──────────────────────────────────────────────

const DAYS: DayName[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function sanitizeExerciseType(v: unknown): ExerciseType {
  const s = typeof v === 'string' ? v.toLowerCase() : '';
  return (['standard', 'superset', 'dropset', 'giant_set'] as const).includes(s as ExerciseType)
    ? (s as ExerciseType)
    : 'standard';
}

function sanitizeSupersetGroup(v: unknown, type: unknown): number | undefined {
  const t = typeof type === 'string' ? type.toLowerCase() : 'standard';
  if (t !== 'superset' && t !== 'giant_set') return undefined;
  if (v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function normalizeExercises(raw: unknown): GeneratedExercise[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((ex): ex is Record<string, unknown> => !!ex && typeof ex === 'object')
    .map((ex, i) => {
      const type = ex.exerciseType ?? ex.exercise_type;
      return {
        name: String(ex.name ?? 'Exercise'),
        displayOrder: numberFrom(ex.displayOrder ?? ex.display_order, true) || i + 1,
        defaultSets: numberFrom(ex.defaultSets ?? ex.default_sets, true) || 3,
        exerciseType: sanitizeExerciseType(type),
        supersetGroup: sanitizeSupersetGroup(ex.supersetGroup ?? ex.superset_group, type),
        restSeconds: numberFrom(ex.restSeconds ?? ex.rest_seconds, true) || 90,
        notes: typeof ex.notes === 'string' ? ex.notes : null,
      } as GeneratedExercise & { supersetGroup?: number };
    });
}

function normalizeDay(d: Record<string, unknown>, day: DayName): GeneratedDay {
  const isRest = Boolean(d.isRest ?? d.is_rest);
  return {
    day,
    name: typeof d.name === 'string' && d.name ? d.name : day.charAt(0).toUpperCase() + day.slice(1),
    description: typeof d.description === 'string' ? d.description : '',
    isRest,
    exercises: isRest ? [] : normalizeExercises(d.exercises),
  };
}

export async function generateWeeklySchedule(preferences?: string): Promise<WeeklyScheduleResponse> {
  const user = await getProfileRow();
  const parsed = await generateJson(
    P.buildWeeklySchedulePrompt(user, preferences),
    P.WEEKLY_SCHEDULE_SYSTEM_INSTRUCTION,
    3000,
  );
  const rawDays = Array.isArray(parsed.days) ? parsed.days : [];
  const byDay = new Map<string, Record<string, unknown>>();
  for (const d of rawDays) {
    if (d && typeof d === 'object') {
      const key = String((d as Record<string, unknown>).day ?? '').trim().toLowerCase();
      if (DAYS.includes(key as DayName)) byDay.set(key, d as Record<string, unknown>);
    }
  }
  const cutting = user.goal === 'cutting';
  const days: GeneratedDay[] = DAYS.map((day) => {
    if (day === 'sunday') {
      return {
        day,
        name: cutting ? 'Active Recovery — Walking' : 'Rest Day',
        description: cutting ? '20-40 minute easy walk' : 'Full rest',
        isRest: true,
        exercises: [],
      };
    }
    return normalizeDay(byDay.get(day) ?? {}, day);
  });
  return { days };
}

export async function customizeSplit(splitId: string, preferences?: string): Promise<GeneratedDay> {
  const user = await getProfileRow();
  const target = await db.splits.get(splitId);
  if (!target) throw notFound('Split');
  const all = await db.splits.toArray();
  const targetExercises = await db.splitExercises.where('splitId').equals(splitId).sortBy('displayOrder');
  const parsed = await generateJson(
    P.buildSplitCustomizationPrompt(user, all, target, targetExercises, preferences),
    P.SPLIT_CUSTOMIZATION_SYSTEM_INSTRUCTION,
    1500,
  );
  return normalizeDay(parsed, target.day);
}

// ── diet ─────────────────────────────────────────────────────────────

async function dietContexts(): Promise<{ userCtx: string; weightCtx: string }> {
  const user = await getProfileRow();
  const twoMonthsAgo = toDateKey(addDays(new Date(), -60));
  let weightCtx: string;
  try {
    const analytics = await weightAnalytics({ fromDate: twoMonthsAgo });
    const logs = (await listWeightLogs({ fromDate: twoMonthsAgo, pageSize: 30 })).items.slice().reverse();
    weightCtx = P.dietWeightContext(analytics, logs);
  } catch {
    weightCtx = '\nNo weight logs available.\n';
  }
  return { userCtx: P.dietUserContext(user), weightCtx };
}

export async function dietChat(question: string, history: { role: string; content: string }[] = []): Promise<{ answer: string }> {
  const { userCtx, weightCtx } = await dietContexts();
  const plan = await getDietPlan();
  const dietCtx = plan ? `\nCurrent diet plan:\n${plan.content}\n` : '\nNo diet plan saved yet.\n';
  const answer = await generateWithHistory(
    `${userCtx}${dietCtx}${weightCtx}\nUser's question: ${question}`,
    P.DIET_CHAT_SYSTEM_INSTRUCTION,
    history,
    600,
  );
  return { answer };
}

export async function generateDiet(preferences?: string): Promise<{ diet: string }> {
  const { userCtx, weightCtx } = await dietContexts();
  const plan = await getDietPlan();
  const existingCtx = plan
    ? `\nUser's current diet (for reference, they may want improvements):\n${plan.content}\n`
    : '';
  let prompt = `${userCtx}${weightCtx}${existingCtx}\nGenerate a complete daily diet plan for this user. `;
  if (preferences) prompt += `User preferences/restrictions: ${preferences}\n`;
  const diet = await generate(prompt, P.DIET_GENERATE_SYSTEM_INSTRUCTION, 1200);
  return { diet };
}
