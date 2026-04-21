// User
export type TrainingType = 'hypertrophy' | 'strength' | 'powerbuilding' | 'endurance' | 'general_fitness';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type UserRole = 'user' | 'superadmin';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  weight: number;
  height: number;
  goal: 'bulking' | 'cutting' | 'maintenance';
  gender: 'male' | 'female' | 'other';
  trainingType: TrainingType;
  experienceLevel: ExperienceLevel;
  activityLevel?: string;
  mobileNumber?: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// AI Generated Weekly Schedule
export interface GeneratedExercise {
  name: string;
  displayOrder: number;
  defaultSets: number;
  exerciseType: 'standard' | 'superset' | 'dropset' | 'giant_set';
  restSeconds: number;
  notes?: string | null;
}

export interface GeneratedDay {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  name: string;
  description?: string | null;
  isRest: boolean;
  exercises: GeneratedExercise[];
}

export interface WeeklyScheduleResponse {
  days: GeneratedDay[];
}

// Auth
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

// WorkoutSplit
export interface WorkoutSplit {
  id: string;
  name: string;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  userId: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// SplitExercise
export interface SplitExercise {
  id: string;
  splitId: string;
  name: string;
  displayOrder: number;
  defaultSets: number;
  exerciseType: 'standard' | 'superset' | 'dropset' | 'giant_set';
  supersetGroup?: number;
  notes?: string;
  restSeconds: number;
  createdAt: string;
  updatedAt: string;
}

// ExerciseSet
export interface ExerciseSet {
  id: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  repsInReserve?: number;
  isWarmup: boolean;
  isDropset: boolean;
  description?: string;
  parentSetId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// SessionExercise
export interface SessionExercise {
  id: string;
  exerciseName: string;
  displayOrder: number;
  exerciseType: 'standard' | 'superset' | 'dropset' | 'giant_set';
  supersetGroup?: number;
  sets: ExerciseSet[];
}

// WorkoutSession
export interface WorkoutSession {
  id: string;
  splitId: string;
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSessionDetail extends WorkoutSession {
  exercises: SessionExercise[];
}

export interface SessionDateItem {
  id: string;
  startedAt: string;
  status: 'in_progress' | 'completed' | 'abandoned';
}

// Paginated
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}

// Analytics
export interface SessionDataPoint {
  date: string;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  avgRir?: number;
  durationSeconds?: number;
  exerciseCount: number;
}

export interface ExerciseDataPoint {
  date: string;
  sessionId: string;
  maxWeight: number;
  totalVolume: number;
  totalReps: number;
  totalSets: number;
  estimated1Rm: number;
  avgRir?: number;
}

export interface PersonalRecord {
  weight: number;
  reps: number;
  estimated1Rm: number;
  date: string;
  exerciseName?: string;
}

export interface DashboardSummary {
  weekSessions: number;
  currentStreak: number;
  totalSessions: number;
  personalRecords: PersonalRecord[];
}

// Weight Log
export interface WeightLog {
  id: string;
  weightKg: number;
  waistCm?: number;
  bodyFatPct?: number;
  description?: string;
  loggedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyAverage {
  weekStart: string;
  averageWeight: number;
  entries: number;
}

export interface WeightAnalytics {
  weeklyAverages: WeeklyAverage[];
  rateOfChange: number;
  totalChange: number;
  entries: number;
}

// AI Analysis
export interface AIAnalysisResponse {
  analysis: string;
  suggestions: string[];
}

export interface SessionCoachResponse {
  answer: string;
}

export interface FitnessChatResponse {
  answer: string;
}

// AI Session Plan
export interface PlannedSet {
  setNumber: number;
  weightKg: number;
  reps: number;
  isWarmup: boolean;
}

export interface PlannedExercise {
  exerciseName: string;
  sets: PlannedSet[];
}

export interface SessionPlanResponse {
  exercises: PlannedExercise[];
  note: string;
}

// Admin
export interface AdminDashboard {
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalSessions: number;
  sessionsToday: number;
  avgSessionDuration: number | null;
  totalLlmCallsToday: number;
  totalLlmCallsMonth: number;
  totalTokensMonth: number;
}

export interface ActiveHourBucket {
  hour: number;
  dayOfWeek: number;
  count: number;
}

export interface ActiveHoursData {
  buckets: ActiveHourBucket[];
  peakHour: number;
  peakDay: number;
}

export interface LlmEndpointBreakdown {
  endpoint: string;
  count: number;
  avgDurationMs: number | null;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface LlmDailyCount {
  date: string;
  count: number;
  tokens: number;
}

export interface LlmTopUser {
  userId: string;
  email: string;
  name: string;
  callCount: number;
}

export interface LlmUsageData {
  totalCalls: number;
  totalErrors: number;
  errorRate: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  avgDurationMs: number | null;
  byEndpoint: LlmEndpointBreakdown[];
  daily: LlmDailyCount[];
  topUsers: LlmTopUser[];
}

export interface AdminUserItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  goal: string;
  trainingType: string;
  experienceLevel: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastActive: string | null;
  totalSessions: number;
  totalLlmCalls: number;
}

export interface AdminUsersData {
  items: AdminUserItem[];
  total: number;
  page: number;
  pageSize: number;
}
