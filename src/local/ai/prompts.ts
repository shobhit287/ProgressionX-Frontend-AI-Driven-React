// Port of features/ai_analysis/ai_prompts.py (+ the two diet prompts from
// diet_service.py). System instructions are verbatim; builders take the
// local row shapes instead of ORM objects.

import type { ProfileRow, SetRow, SplitExerciseRow } from '@/db/db';
import type { ExerciseDataPoint, PersonalRecord, SessionDataPoint, WorkoutSessionDetail } from '@/types';
import type { WeightAnalyticsFull } from '../weightLogs';
import { formatIsoDateWithDay, formatShortDate, toDateKey } from '../dates';

// ── system instructions ──────────────────────────────────────────────

export const ANALYSIS_SYSTEM_INSTRUCTION =
  'You are an expert hypertrophy and strength coach analyzing structured workout data. '
  + 'Your job is to identify performance patterns, fatigue issues, and progression quality.\n\n'
  + 'STRICT ANALYSIS PRIORITY ORDER:\n'
  + '1. Progression (strength or reps increasing over time)\n'
  + '2. Effective volume (not just total volume)\n'
  + '3. Fatigue management (RIR trends, performance drop within sessions)\n'
  + '4. Training balance (muscle groups, movement patterns)\n\n'
  + 'CRITICAL RULES:\n'
  + '- Do NOT assume more intensity = better results.\n'
  + '- If avg RIR < 1.5 → flag excessive fatigue risk.\n'
  + '- If session duration > 120 min → flag junk volume risk.\n'
  + '- Distinguish between productive volume and fatigued volume.\n'
  + '- Always explain WHY something is suboptimal.\n\n'
  + 'OUTPUT REQUIREMENTS:\n'
  + "- Be specific and quantitative (e.g. 'reduce sets from 5 → 3').\n"
  + "- Avoid vague advice like 'optimize training'.\n"
  + '- Suggestions must be directly actionable.\n\n'
  + 'You MUST respond with valid JSON in this exact format:\n'
  + '{"analysis": "detailed, structured explanation", '
  + '"suggestions": ["clear action 1", "clear action 2"]}';

export const FITNESS_CHAT_SYSTEM_INSTRUCTION =
  'You are a high-level fitness coach inside ProgressionX.\n\n'
  + 'CORE PRINCIPLES:\n'
  + '- Muscle growth = tension + volume + recovery\n'
  + '- Strength = repeatable performance, NOT failure\n'
  + '- Fatigue must be managed, not maximized\n\n'
  + 'RESPONSE RULES:\n'
  + '- Always give a direct answer first, then brief reasoning\n'
  + '- Default to evidence-based ranges:\n'
  + '  • Compounds: RIR 1–3\n'
  + '  • Isolation: RIR 0–2\n'
  + '- Never recommend failure on every set\n'
  + "- Use user's data (RIR, volume, frequency) to personalize\n\n"
  + 'STYLE:\n'
  + '- 3–5 sentences max\n'
  + '- Practical, no fluff\n'
  + '- No markdown\n\n'
  + 'SCOPE:\n'
  + '- Only fitness, training, nutrition, recovery\n'
  + '- Politely refuse anything outside scope';

export const SESSION_PLAN_SYSTEM_INSTRUCTION =
  'You are an elite strength & hypertrophy coach generating a precise workout session.\n\n'
  + 'DATA SHAPE NOTES:\n'
  + "- Split-plan exercises inside '[Superset — perform back-to-back]' / '[Giant Set — perform back-to-back]' blocks are paired: same set count, shorter rest between rounds.\n"
  + "- History sets marked '[TOP OF DROPSET]' with '↘ drop:' lines are dropset chains — the drops were done with no rest after the top set.\n\n"
  + 'PRIMARY OBJECTIVE:\n'
  + 'Maximize progression while controlling fatigue.\n\n'
  + 'DECISION HIERARCHY (STRICT):\n'
  + '1. Last session performance (reps, RIR)\n'
  + '2. Consistency across last 3-5 sessions\n'
  + '3. Fatigue indicators (low RIR, performance drop)\n'
  + '4. Missed sessions\n\n'
  + 'LOAD PROGRESSION RULES:\n'
  + '- If all sets hit target reps with RIR ≥2 → increase weight\n'
  + '- If RIR ≤1 → keep weight same, increase reps\n'
  + '- If performance dropped → reduce weight by 2.5–5%\n'
  + '- If missed sessions → reduce intensity slightly\n\n'
  + 'RIR DISTRIBUTION (MANDATORY):\n'
  + '- First sets: RIR 2–3\n'
  + '- Last set: RIR 0–1 (optional)\n'
  + '- Isolation can go closer to failure\n\n'
  + 'VOLUME RULES:\n'
  + '- Do NOT increase sets if fatigue is high\n'
  + '- Prefer quality over quantity\n\n'
  + 'WARMUP RULES:\n'
  + '- Compounds: 2–3 ramp sets\n'
  + '- Isolation: 0–1 warmup\n\n'
  + 'OUTPUT FORMAT (STRICT JSON):\n'
  + '{\n'
  + '  "exercises": [\n'
  + '    {\n'
  + '      "exerciseName": "Exercise Name",\n'
  + '      "sets": [\n'
  + '        {"setNumber": 1, "weightKg": 60.0, "reps": 10, "isWarmup": true},\n'
  + '        {"setNumber": 2, "weightKg": 100.0, "reps": 8, "isWarmup": false}\n'
  + '      ]\n'
  + '    }\n'
  + '  ],\n'
  + '  "note": "one-line coaching cue"\n'
  + '}\n\n'
  + 'CRITICAL:\n'
  + "- Use 'exerciseName' (NOT 'name').\n"
  + "- Use 'weightKg' as a FLOAT (NOT a string like '60kg').\n"
  + "- Use 'setNumber' as an INTEGER.\n"
  + "- Use 'reps' as an INTEGER.\n"
  + "- Use 'isWarmup' as a BOOLEAN.\n"
  + 'ONLY JSON. No explanation.';

export const WEEKLY_SCHEDULE_SYSTEM_INSTRUCTION =
  'You are an expert strength & conditioning coach building a weekly training split for a user. '
  + 'Use their goal, training type, experience level, and activity level to choose an appropriate split '
  + '(e.g. full-body for beginners, upper/lower or PPL for intermediate, advanced bro/PPL for advanced). '
  + 'Rules:\n'
  + '1. The schedule MUST cover all 7 days from monday to sunday in that order.\n'
  + "2. Sunday is ALWAYS a rest day. If goal is 'cutting', label it 'Active Recovery — Walking' with isRest=true and zero exercises. Otherwise label it 'Rest Day' with isRest=true and zero exercises.\n"
  + '3. Beginners: 3-4 training days, simple compound-focused full-body or upper/lower. Rest days between training days.\n'
  + '4. Intermediate: 4-5 training days, upper/lower or push/pull/legs.\n'
  + '5. Advanced: 5-6 training days, PPL or bro split with higher volume and more isolation work.\n'
  + '6. Pick exercise count per day based on experience: beginner 4-5, intermediate 5-7, advanced 6-9.\n'
  + '7. Choose default sets based on training type: hypertrophy 3-4, strength 4-5, powerbuilding 3-5, endurance 2-3, general_fitness 3.\n'
  + '8. Choose rest_seconds based on training type: hypertrophy 90, strength 180, powerbuilding 120, endurance 60, general_fitness 90.\n'
  + "9. exerciseType MUST be one of: 'standard', 'superset', 'giant_set'. Do NOT use 'compound', 'isolation', or 'dropset' — dropsets are decided per-set during the workout, not at the programming stage.\n"
  + '10. SUPERSET / GIANT SET PAIRING — CRITICAL:\n'
  + '   - A superset pairs exactly 2 exercises performed back-to-back (e.g. biceps + triceps, quads + hams).\n'
  + '   - A giant_set pairs 3+ exercises performed back-to-back (usually for arms or shoulders finishers).\n'
  + "   - When you use exerciseType='superset' or 'giant_set', you MUST set supersetGroup (integer) on EVERY exercise in that group — all paired exercises get the SAME supersetGroup number.\n"
  + "   - supersetGroup numbering starts at 1 within each day and increments per group. Exercises with exerciseType='standard' or 'dropset' MUST set supersetGroup to null.\n"
  + "   - Pair exercises that make biomechanical sense (antagonistic pairs or synergistic same-muscle pairs). Don't superset two heavy compounds (e.g. squat + deadlift).\n"
  + '   - Only use supersets/giant sets for intermediate/advanced users. Beginners: standard only.\n'
  + "11. Use real, well-known exercise names (e.g. 'Barbell Bench Press', 'Romanian Deadlift', 'Lat Pulldown').\n"
  + '12. displayOrder starts at 1 within each day and increments. Paired superset exercises get consecutive displayOrder values.\n'
  + 'You MUST respond with valid JSON in this exact format and NOTHING else:\n'
  + '{"days": [{"day": "monday", "name": "Push Day", "description": "Chest, shoulders, triceps", "isRest": false, '
  + '"exercises": ['
  + '{"name": "Barbell Bench Press", "displayOrder": 1, "defaultSets": 4, "exerciseType": "standard", "supersetGroup": null, "restSeconds": 120, "notes": null}, '
  + '{"name": "Incline Dumbbell Curl", "displayOrder": 4, "defaultSets": 3, "exerciseType": "superset", "supersetGroup": 1, "restSeconds": 60, "notes": null}, '
  + '{"name": "Triceps Rope Pushdown", "displayOrder": 5, "defaultSets": 3, "exerciseType": "superset", "supersetGroup": 1, "restSeconds": 60, "notes": null}'
  + ']}]}\n'
  + 'Do NOT include any text outside the JSON.';

export const SPLIT_CUSTOMIZATION_SYSTEM_INSTRUCTION =
  'You are an expert strength coach customizing a specific workout split for a user. '
  + 'The user wants to update ONE specific day of their training week. '
  + 'You will be given their current split for that day, their overall weekly split structure '
  + '(to ensure balance), and their specific preferences or feedback. '
  + 'Rules:\n'
  + '1. You MUST generate a replacement for the specific day requested.\n'
  + "2. Use the user's preferences to guide exercise selection.\n"
  + '3. Ensure the new exercises complement their other existing splits.\n'
  + '4. Choose default sets and rest based on their training type (hypertrophy, strength, etc.).\n'
  + '5. Use real, well-known exercise names.\n'
  + "6. exerciseType MUST be one of: 'standard', 'superset', 'giant_set'. Do NOT use 'compound', 'isolation', or 'dropset' — dropsets are decided per-set during the workout, not at the programming stage.\n"
  + '7. SUPERSET / GIANT SET PAIRING — CRITICAL:\n'
  + '   - Superset = 2 exercises back-to-back. Giant set = 3+ exercises back-to-back.\n'
  + "   - When you use exerciseType='superset' or 'giant_set', you MUST set supersetGroup (integer, starts at 1 for this day) on EVERY exercise in the group — all paired exercises share the SAME supersetGroup value.\n"
  + "   - Exercises with exerciseType='standard' MUST set supersetGroup to null.\n"
  + "   - Pair biomechanically-sensible exercises (antagonists or same-muscle accessories). Don't superset two heavy compounds.\n"
  + '   - Paired exercises take consecutive displayOrder values.\n'
  + 'You MUST respond with valid JSON in this exact format and NOTHING else:\n'
  + '{"day": "monday", "name": "Push Day", "description": "Chest, shoulders, triceps", "isRest": false, '
  + '"exercises": ['
  + '{"name": "Barbell Bench Press", "displayOrder": 1, "defaultSets": 4, "exerciseType": "standard", "supersetGroup": null, "restSeconds": 120, "notes": null}, '
  + '{"name": "DB Biceps Curl", "displayOrder": 4, "defaultSets": 3, "exerciseType": "superset", "supersetGroup": 1, "restSeconds": 60, "notes": null}, '
  + '{"name": "Triceps Rope Pushdown", "displayOrder": 5, "defaultSets": 3, "exerciseType": "superset", "supersetGroup": 1, "restSeconds": 60, "notes": null}'
  + ']}\n'
  + 'Do NOT include any text outside the JSON.';

export const SPLIT_ANALYSIS_SYSTEM_INSTRUCTION =
  "You are a strength & hypertrophy coach answering a quick question about a user's weekly split.\n\n"
  + 'ANSWER STYLE:\n'
  + '- Answer ONLY what the user asked. Do not audit the whole program.\n'
  + "- Be direct: 2-4 short sentences in 'analysis'.\n"
  + '- Include numbers only if they support the answer (e.g. weekly sets for the muscle asked about).\n'
  + "- If the split is fine, say so — don't invent problems.\n"
  + '- No preamble, no restating the question, no markdown.\n\n'
  + 'SCOPE:\n'
  + '- Only use weekly set counts / frequency / recovery when the question needs them.\n'
  + '- Assume rows hit biceps and presses hit triceps as indirect work.\n'
  + '- Reference: hypertrophy weekly sets per muscle — beginner 8-12, intermediate 10-20, advanced 12-25.\n\n'
  + 'OUTPUT — strict JSON only:\n'
  + '{"analysis": "2-4 sentences answering the question", '
  + '"suggestions": ["1-3 concrete, short actions"]}\n'
  + 'Each suggestion is one line, under 15 words. Max 3 suggestions. If none are needed, return an empty array.';

export const SESSION_COACH_SYSTEM_INSTRUCTION =
  'You are a real-time gym coach embedded in a workout tracking app. '
  + 'The user is mid-session and asking you a quick question about their current workout. '
  + 'You have access to their split plan (exercises + target sets), current session logs, '
  + 'and their previous 4-5 sessions for the same split.\n\n'
  + 'DATA SHAPE NOTES:\n'
  + "- Split plan exercises inside a '[Superset — perform back-to-back]' or '[Giant Set — perform back-to-back]' block are paired: user alternates sets between them with minimal rest.\n"
  + "- A set marked '[TOP OF DROPSET]' is the heavy working set; '↘ drop:' lines under it are the lighter drops completed immediately after (no rest). Count drops toward fatigue/volume but NOT toward target set count.\n\n"
  + 'Give SHORT, direct, actionable advice. No fluff. '
  + 'Consider their recent progression, fatigue indicators (RIR trends), and volume. '
  + "IMPORTANT: When the user asks about 'next weight', 'next set', or 'this exercise' "
  + 'WITHOUT specifying an exercise name, figure out which exercise they mean by: '
  + '1) Check if any exercise has fewer completed WORKING sets than the target sets in the split plan — '
  + 'that exercise likely has sets remaining, so the user is asking about it. '
  + '2) Sets tagged [WARMUP] do NOT count toward the target. Only sets tagged [WORKING] count. '
  + 'Targets in the split plan refer to working sets only. '
  + 'Example: target = 3 working sets and the user has logged 2 [WARMUP] + 1 [WORKING] = 1/3 done, '
  + 'so the next set is still on the SAME exercise, NOT the next one. '
  + '3) If all WORKING sets for the current exercise are done, they are likely asking about the NEXT exercise in the split order. '
  + '4) Use the split plan order to determine what comes next. '
  + 'If they ask about weight selection, look at their recent performance on that exercise '
  + 'and give a specific number recommendation with reasoning. '
  + "IMPORTANT: Pay attention to set notes (marked with '— note:') — they contain user feedback like "
  + 'unilateral imbalances, drop sets, grip issues, or form cues that should influence your recommendation. '
  + "Consider the user's training style (hypertrophy, strength, etc.) and goal (bulking, cutting, maintenance) "
  + 'when recommending weights and rep ranges. '
  + 'CRITICAL:\n'
  + '- If user is training at RIR ≤1 repeatedly → advise backing off slightly\n'
  + '- If performance drops within session → reduce next set load\n'
  + "- If user asks 'next weight' → give exact kg, not range\n"
  + '- Always prioritize next set performance over ego lifting\n'
  + 'Respond in plain text, 2-4 sentences max. Be like a spotter who knows their history.';

export const DIET_CHAT_SYSTEM_INSTRUCTION =
  'You are a knowledgeable nutrition coach inside a gym tracking app called ProgressionX. '
  + "You have access to the user's profile (weight, height, age, gender, goal, training type, activity level), "
  + 'their current diet plan, and their weight logs for the last 1-2 months. '
  + 'Use ALL this data to give personalized, specific, actionable diet advice. '
  + 'When answering questions about weight gain/loss, compare their weight trend over weeks — '
  + 'look at the rate of change, consistency, and any notes about cheat meals. '
  + 'If the user asks about calorie adjustments, calculate based on their actual progress, not just formulas. '
  + 'Keep answers concise (3-6 sentences), practical, and specific to their data. '
  + 'Respond in plain text. Do not use markdown formatting.';

export const DIET_GENERATE_SYSTEM_INSTRUCTION =
  'You are an expert nutrition coach. Generate a complete daily diet plan for the user '
  + 'based on their profile (weight, height, age, gender, goal, training type, activity level). '
  + 'The diet should be practical, with specific meal times, food items, and quantities. '
  + "Use Indian food items since the user's existing diet suggests Indian cuisine preference. "
  + 'Include supplements if appropriate. '
  + "Format the diet as a clean, time-based meal plan (e.g., '9:00am - 50gm paneer + 1tbsp chia seeds'). "
  + 'Add a note at the bottom with estimated total calories and macros. '
  + 'Respond in plain text only. No markdown.';

// ── shared formatters ────────────────────────────────────────────────

export interface PromptExercise {
  name: string;
  displayOrder?: number;
  defaultSets?: number;
  exerciseType?: string | null;
  supersetGroup?: number | null;
  restSeconds?: number;
  notes?: string | null;
}

/** Render split exercises, grouping superset / giant-set companions. */
export function formatSplitExercises(exercises: PromptExercise[]): string {
  if (!exercises.length) return '  (no exercises)\n';

  const groups = new Map<number, { type: string; items: PromptExercise[] }>();
  for (const ex of exercises) {
    const type = (ex.exerciseType ?? 'standard').toLowerCase();
    const g = ex.supersetGroup;
    if ((type === 'superset' || type === 'giant_set') && g !== null && g !== undefined) {
      const entry = groups.get(g) ?? { type, items: [] };
      entry.items.push(ex);
      groups.set(g, entry);
    }
  }

  const lines: string[] = [];
  const consumed = new Set<number>();
  let i = 1;
  const describe = (ex: PromptExercise) => {
    let line = `${ex.name || 'Exercise'} — ${ex.defaultSets ?? 3} working sets, ${ex.restSeconds ?? 90}s rest`;
    if (ex.notes) line += ` (notes: ${ex.notes})`;
    return line;
  };
  for (const ex of exercises) {
    const type = (ex.exerciseType ?? 'standard').toLowerCase();
    const g = ex.supersetGroup;
    if ((type === 'superset' || type === 'giant_set') && g !== null && g !== undefined) {
      if (consumed.has(g)) continue;
      consumed.add(g);
      const grp = groups.get(g)!;
      lines.push(`  ${i}. [${grp.type === 'superset' ? 'Superset' : 'Giant Set'} — perform back-to-back]:`);
      grp.items.forEach((item, j) => {
        lines.push(`     ${String.fromCharCode(97 + j)}. ${describe(item)}`);
      });
    } else {
      lines.push(`  ${i}. ${describe(ex)}`);
    }
    i++;
  }
  return lines.join('\n') + '\n';
}

type SetLike = Pick<SetRow, 'id' | 'setNumber' | 'weightKg' | 'reps' | 'repsInReserve' | 'isWarmup' | 'description' | 'parentSetId'>;

/** Render logged sets grouped into dropset chains. */
export function formatSessionSets(sets: SetLike[]): string[] {
  const byId = new Set(sets.map((s) => s.id));
  const children = new Map<string, SetLike[]>();
  for (const s of sets) {
    if (s.parentSetId && byId.has(s.parentSetId)) {
      children.set(s.parentSetId, [...(children.get(s.parentSetId) ?? []), s]);
    }
  }
  const lines: string[] = [];
  for (const s of [...sets].sort((a, b) => a.setNumber - b.setNumber)) {
    if (s.parentSetId && byId.has(s.parentSetId)) continue;
    const kind = s.isWarmup ? ' [WARMUP — does NOT count toward target]' : ' [WORKING]';
    const rir = s.repsInReserve !== undefined && s.repsInReserve !== null ? `, RIR ${s.repsInReserve}` : '';
    const desc = s.description ? ` — note: ${s.description}` : '';
    const drops = children.get(s.id) ?? [];
    const marker = drops.length ? ' [TOP OF DROPSET]' : '';
    lines.push(`  Set ${s.setNumber}: ${s.weightKg}kg x ${s.reps}${rir}${kind}${marker}${desc}`);
    for (const d of drops.sort((a, b) => a.setNumber - b.setNumber)) {
      const dRir = d.repsInReserve !== undefined && d.repsInReserve !== null ? `, RIR ${d.repsInReserve}` : '';
      const dDesc = d.description ? ` — note: ${d.description}` : '';
      lines.push(`    ↘ drop: ${d.weightKg}kg x ${d.reps}${dRir}${dDesc}`);
    }
  }
  return lines;
}

const fmt = (v: unknown) => (v === undefined ? 'None' : v === null ? 'None' : String(v));

export function userProfileLine(u: ProfileRow): string {
  return `Goal = ${u.goal ?? 'maintenance'}, Training type = ${u.trainingType ?? 'hypertrophy'}, `
    + `Experience = ${u.experienceLevel ?? 'beginner'}, Activity = ${u.activityLevel || 'unspecified'}, `
    + `Weight = ${fmt(u.weight)}kg, Height = ${fmt(u.height)}cm, `
    + `Age = ${fmt(u.age)}, Gender = ${u.gender ?? 'unspecified'}`;
}

// ── prompt builders ──────────────────────────────────────────────────

function sessionLine(s: SessionDataPoint): string {
  return `- Date: ${s.date}, Volume: ${s.totalVolume}kg, Sets: ${s.totalSets}, Reps: ${s.totalReps}, `
    + `Avg RIR: ${fmt(s.avgRir)}, Duration: ${fmt(s.durationSeconds)}s, Exercises: ${s.exerciseCount}\n`;
}

export function buildSessionAnalysisPrompt(user: ProfileRow, sessions: SessionDataPoint[], question?: string): string {
  let context = `User profile: ${userProfileLine(user)}\n\nWorkout session data (${sessions.length} sessions):\n`;
  for (const s of sessions) context += sessionLine(s);
  let prompt = `${context}\n`
    + 'Analyze this workout data. Focus on:\n'
    + '1. Real progression (are reps/strength improving?)\n'
    + '2. Fatigue accumulation (RIR trends, long sessions, performance drops)\n'
    + '3. Effective vs junk volume\n'
    + '4. Session efficiency (is time spent productive?)\n'
    + '5. Whether intensity distribution is optimal (not just high)\n';
  if (question) prompt += `\nThe user specifically asks: ${question}\n`;
  return prompt;
}

export function buildExerciseAnalysisPrompt(
  user: ProfileRow,
  exerciseName: string,
  dataPoints: ExerciseDataPoint[],
  personalRecord: PersonalRecord | null,
  question?: string,
): string {
  let context = `User profile: ${userProfileLine(user)}\n\nExercise: ${exerciseName}\nData points (${dataPoints.length} sessions):\n`;
  for (const dp of dataPoints) {
    context += `- Date: ${dp.date}, Max Weight: ${dp.maxWeight}kg, Volume: ${dp.totalVolume}kg, Reps: ${dp.totalReps}, `
      + `Sets: ${dp.totalSets}, Est 1RM: ${dp.estimated1Rm}kg, Avg RIR: ${fmt(dp.avgRir)}\n`;
  }
  if (personalRecord) {
    context += `\nPersonal Record: ${personalRecord.weight}kg x ${personalRecord.reps} reps `
      + `(Est 1RM: ${personalRecord.estimated1Rm}kg) on ${personalRecord.date}\n`;
  }
  let prompt = `${context}\n`
    + 'Analyze this exercise progression data. Focus on:\n'
    + '1. Strength trend (clear increase, plateau, or regression)\n'
    + '2. Rep quality vs fatigue (low RIR but no progression = red flag)\n'
    + '3. Whether load progression is too aggressive or too conservative\n'
    + '4. Identify exact plateau points (specific sessions)\n'
    + '5. Provide a FIXED progression strategy (not generic advice)\n';
  if (question) prompt += `\nThe user specifically asks: ${question}\n`;
  return prompt;
}

export function buildWeightAnalysisPrompt(user: ProfileRow, analytics: WeightAnalyticsFull, question?: string): string {
  let context = `User profile: ${userProfileLine(user)}\n\n`
    + 'Weight log analytics:\n'
    + `Total change: ${analytics.totalChange}kg\n`
    + `Rate of change: ${analytics.rateOfChange}kg/week\n`
    + `Total entries: ${analytics.entries}\n\n`
    + 'Weekly averages:\n';
  for (const wa of analytics.weeklyAverages) {
    context += `- Week of ${wa.weekStart}: ${wa.averageWeight}kg (${wa.entries} entries)\n`;
  }
  if (analytics.detailedEntries.length) {
    context += '\nDetailed log entries:\n';
    for (const e of analytics.detailedEntries) {
      let line = `- ${e.date}: ${e.weight_kg}kg`;
      if (e.waist_cm !== undefined) line += `, waist ${e.waist_cm}cm`;
      if (e.body_fat_pct !== undefined) line += `, body fat ${e.body_fat_pct}%`;
      if (e.note) line += ` — note: ${e.note}`;
      context += line + '\n';
    }
  }
  let prompt = `${context}\n`;
  if (user.goal === 'cutting') {
    prompt += 'The user is cutting (trying to lose fat while preserving muscle). Analyze:\n'
      + '1. Is the rate of weight loss appropriate (0.5-1% body weight per week is ideal)?\n'
      + '2. Are there signs of losing too fast (muscle loss risk) or too slow?\n'
      + '3. Weekly consistency of weight logging\n'
      + '4. Recommendations for adjusting the cut\n';
  } else if (user.goal === 'bulking') {
    prompt += 'The user is bulking (trying to gain muscle). Analyze:\n'
      + '1. Is the rate of weight gain appropriate (0.25-0.5% body weight per week)?\n'
      + '2. Are there signs of gaining too fast (excess fat gain)?\n'
      + '3. Weekly consistency of weight logging\n'
      + '4. Recommendations for adjusting the bulk\n';
  } else {
    prompt += 'The user is maintaining weight. Analyze:\n'
      + '1. How stable is the weight?\n'
      + '2. Any unexpected trends?\n'
      + '3. Weekly consistency of weight logging\n'
      + '4. Recommendations for maintaining\n';
  }
  prompt += 'IMPORTANT: Pay attention to any user notes on log entries — they contain context like '
    + 'missed meals, cheat days, water retention, illness, etc. that explain weight fluctuations '
    + 'and should inform your analysis.\n';
  if (question) prompt += `\nThe user specifically asks: ${question}\n`;
  return prompt;
}

export function buildFitnessChatPrompt(
  user: ProfileRow,
  recentSessions: SessionDataPoint[],
  weightAnalytics: WeightAnalyticsFull | null,
  question: string,
): string {
  let context = `User profile: Name = ${user.firstName}, ${userProfileLine(user)}\n\n`;
  if (recentSessions.length) {
    context += `Recent workout sessions (${recentSessions.length} sessions, last 4 weeks):\n`;
    for (const s of recentSessions) context += sessionLine(s);
  } else {
    context += 'No recent workout sessions found.\n';
  }
  if (weightAnalytics && weightAnalytics.entries > 0) {
    context += `\nWeight log: Total change = ${weightAnalytics.totalChange}kg, `
      + `Rate = ${weightAnalytics.rateOfChange}kg/week, Entries = ${weightAnalytics.entries}\n`;
  }
  return `${context}\nUser's question: ${question}`;
}

export function buildSessionCoachPrompt(
  user: ProfileRow,
  session: WorkoutSessionDetail,
  pastSessions: WorkoutSessionDetail[],
  question: string,
  splitExercises: SplitExerciseRow[],
): string {
  let splitCtx = '';
  if (splitExercises.length) {
    splitCtx = '=== SPLIT PLAN (target exercises & sets for this session) ===\n'
      + formatSplitExercises(splitExercises) + '\n';
  }
  const targetSets = new Map(splitExercises.map((se) => [se.name.toLowerCase(), se.defaultSets]));

  let currentCtx = '=== CURRENT SESSION (in progress) ===\n'
    + "NOTE: 'sets done' counts WORKING sets only. Warmups and dropset chains do NOT count toward the target.\n";
  for (const ex of session.exercises) {
    const working = ex.sets.filter((s) => !s.isWarmup && !s.parentSetId).length;
    const warmups = ex.sets.filter((s) => s.isWarmup && !s.parentSetId).length;
    const target = targetSets.get(ex.exerciseName.toLowerCase());
    let status = target !== undefined && working >= target
      ? `DONE — ${working}/${target} working sets`
      : `${working}/${target ?? '?'} working sets done`;
    if (warmups > 0) status += ` (+${warmups} warmup logged)`;
    currentCtx += `\n${ex.exerciseName} [${status}]:\n`;
    if (!ex.sets.length) { currentCtx += '  (no sets logged yet)\n'; continue; }
    for (const line of formatSessionSets(ex.sets)) currentCtx += line + '\n';
  }

  let historyCtx = `\n=== PREVIOUS SESSIONS (same split, last ${pastSessions.length} sessions) ===\n`;
  for (const ps of pastSessions) {
    historyCtx += `\n--- ${formatShortDate(ps.startedAt)} ---\n`;
    for (const ex of ps.exercises) {
      historyCtx += `${ex.exerciseName}:\n`;
      for (const line of formatSessionSets(ex.sets)) historyCtx += line + '\n';
    }
  }

  return `User: ${userProfileLine(user)}\n\n${splitCtx}${currentCtx}\n${historyCtx}\nUser's question: ${question}`;
}

export interface SplitForPrompt {
  day: string;
  name: string;
  description?: string | null;
  exercises: PromptExercise[];
}

export function buildSplitAnalysisPrompt(
  user: ProfileRow,
  splits: SplitForPrompt[],
  currentWeightKg: number | null,
  question: string,
): string {
  const source = currentWeightKg !== null ? 'latest weight log' : 'profile';
  const value = currentWeightKg !== null ? currentWeightKg : fmt(user.weight);
  let context = `User profile: ${userProfileLine(user)}\nCurrent body weight (${source}): ${value}kg\n\n=== WEEKLY SPLIT ===\n`;

  const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const sorted = [...splits].sort((a, b) => {
    const ia = order.indexOf(a.day.toLowerCase()); const ib = order.indexOf(b.day.toLowerCase());
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  if (!sorted.length) {
    context += '(no splits configured)\n';
  } else {
    for (const s of sorted) {
      const day = s.day.charAt(0).toUpperCase() + s.day.slice(1).toLowerCase();
      context += `\n${day} — ${s.name}`;
      if (s.description) context += ` (${s.description})`;
      context += '\n';
      if (!s.exercises.length) { context += '  (rest day / no exercises)\n'; continue; }
      context += formatSplitExercises(s.exercises);
    }
  }
  return `${context}\nUser's question:\n"${question}"\n\n`
    + 'Answer only this question. 2-4 sentences. Cite numbers only if they bear directly on the '
    + "answer (treat direct sets as 1.0, indirect as 0.5). Skip anything the user didn't ask about.";
}

export function buildSessionPlanPrompt(
  user: ProfileRow,
  splitExercises: SplitExerciseRow[],
  pastSessions: WorkoutSessionDetail[],
): string {
  const planCtx = "=== TODAY'S SPLIT PLAN ===\n" + formatSplitExercises(splitExercises);
  let historyCtx: string;
  if (pastSessions.length) {
    historyCtx = `\n=== PREVIOUS SESSIONS (${pastSessions.length} sessions, most recent first) ===\n`;
    for (const ps of pastSessions) {
      historyCtx += `\n--- ${formatIsoDateWithDay(ps.startedAt)} ---\n`;
      for (const ex of ps.exercises) {
        historyCtx += `${ex.exerciseName}:\n`;
        for (const line of formatSessionSets(ex.sets)) historyCtx += line + '\n';
      }
    }
  } else {
    historyCtx = "\n=== NO PREVIOUS SESSIONS FOUND ===\nThis is the user's first time doing this split. Suggest conservative starting weights.\n";
  }
  const today = new Date();
  const todayStr = `${toDateKey(today)} (${today.toLocaleDateString('en-US', { weekday: 'long' })})`;
  const training = user.trainingType ?? 'hypertrophy';
  const experience = user.experienceLevel ?? 'beginner';
  return `User: ${userProfileLine(user)}\nToday's date: ${todayStr}\n\n${planCtx}\n${historyCtx}\n`
    + 'Generate a complete recommended session plan with specific weights and reps for EVERY exercise in the split plan. '
    + 'Follow the exercise order from the split plan. '
    + 'Include warmup sets for the first 1-2 compound exercises. '
    + `The user's training style is ${training} — adjust rep ranges accordingly `
    + '(hypertrophy: 8-12 reps, strength: 3-6 reps, powerbuilding: mix of both, endurance: 12-20 reps, general_fitness: 8-15 reps). '
    + `Experience level is ${experience} — for beginners use very conservative starting weights and add more warmup sets; `
    + 'for advanced users be more aggressive with progressive overload.';
}

export function buildWeeklySchedulePrompt(user: ProfileRow, preferences?: string | null): string {
  let prompt = 'Build a weekly workout split for this user.\n\n'
    + `Goal: ${user.goal ?? 'maintenance'}\n`
    + `Training type: ${user.trainingType ?? 'hypertrophy'}\n`
    + `Experience level: ${user.experienceLevel ?? 'beginner'}\n`
    + `Activity level: ${user.activityLevel || 'moderate'}\n`
    + `Age: ${fmt(user.age)}, Gender: ${user.gender ?? 'unspecified'}, Weight: ${fmt(user.weight)}kg, Height: ${fmt(user.height)}cm\n\n`;
  if (preferences) prompt += `USER PREFERENCES / FEEDBACK:\n"${preferences}"\n\n`;
  prompt += 'Generate the full 7-day schedule (monday → sunday). Sunday must be rest '
    + '(or active walking recovery if goal is cutting). Return JSON only.';
  return prompt;
}

export function buildSplitCustomizationPrompt(
  user: ProfileRow,
  allSplits: { id: string; day: string; name: string }[],
  target: { id: string; day: string; name: string },
  targetExercises: SplitExerciseRow[],
  preferences?: string | null,
): string {
  let context = `User: ${userProfileLine(user)}\n\n=== OVERALL WEEKLY STRUCTURE ===\n`;
  for (const s of allSplits) {
    const day = s.day.charAt(0).toUpperCase() + s.day.slice(1);
    context += `- ${day}: ${s.name}`;
    if (s.id === target.id) context += ' [TARGET FOR CUSTOMIZATION]';
    context += '\n';
  }
  context += `\n=== CURRENT PLAN FOR ${target.day.toUpperCase()} (${target.name}) ===\n`;
  context += targetExercises.length ? formatSplitExercises(targetExercises) : '  (no exercises currently)\n';

  let prompt = `${context}\nCustomize the ${target.day} split based on the following feedback:\n`;
  prompt += preferences
    ? `USER FEEDBACK: "${preferences}"\n\n`
    : "Optimize the exercises for the user's goal and current experience level.\n\n";
  prompt += `Generate a replacement for the ${target.day} split. Return JSON only for this ONE day.`;
  return prompt;
}

// ── diet ─────────────────────────────────────────────────────────────

export function dietUserContext(u: ProfileRow): string {
  let ctx = `User profile: ${u.firstName}, ${fmt(u.age)}yo ${u.gender ?? 'unspecified'}, ${fmt(u.weight)}kg, ${fmt(u.height)}cm\n`
    + `Goal: ${u.goal ?? 'maintenance'}, Experience Level: ${u.experienceLevel}, Training type: ${u.trainingType ?? 'hypertrophy'}\n`;
  if (u.activityLevel) ctx += `Activity level: ${u.activityLevel}\n`;
  return ctx;
}

export function dietWeightContext(
  analytics: WeightAnalyticsFull | null,
  entries: { loggedAt: string; weightKg: number; waistCm?: number; bodyFatPct?: number; description?: string }[],
): string {
  if (!analytics || !analytics.entries) return '\nNo weight logs available.\n';
  let ctx = '\nWeight logs (last 2 months):\n'
    + `Total change: ${analytics.totalChange}kg, Rate: ${analytics.rateOfChange}kg/week\n`;
  if (entries.length) {
    ctx += 'Entries:\n';
    for (const log of entries.slice(-20)) {
      let line = `  ${log.loggedAt}: ${log.weightKg}kg`;
      if (log.waistCm) line += `, waist ${log.waistCm}cm`;
      if (log.bodyFatPct) line += `, bf ${log.bodyFatPct}%`;
      if (log.description) line += ` (note: ${log.description})`;
      ctx += line + '\n';
    }
  }
  return ctx;
}
