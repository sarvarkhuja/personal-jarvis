// src/types/index.ts

export interface Profile {
  id: string
  email: string | null
  display_name: string | null
  height_cm: number | null
  target_weight_kg: number | null
  programme_start_date: string // ISO date
  unit_preference: 'kg' | 'lbs'
  created_at: string
  updated_at: string
}

export interface Block {
  id: string
  name: string            // 'Block A', 'Block B', 'Block C'
  description: string | null
  week_start: number      // 1, 5, 9
  week_end: number        // 4, 8, 12
  focus: string | null
  rep_range_compounds: string | null
  rep_range_accessories: string | null
  sort_order: number
  created_at: string
}

export interface ProgrammeDay {
  id: string
  block_id: string
  day_of_week: number     // 1=Mon, 2=Tue, 4=Thu, 5=Fri
  name: string
  emphasis: string | null
  sort_order: number
  created_at: string
}

export interface ProgrammeExercise {
  id: string
  programme_day_id: string
  exercise_name: string
  sets: number
  reps_min: number
  reps_max: number
  tempo: string | null
  rest_seconds: number
  rest_category: 'short' | 'moderate' | 'long'
  coach_note: string | null
  muscle_groups: string[]
  is_timed: boolean
  time_seconds: number | null
  sort_order: number
  created_at: string
}

export interface WorkoutSession {
  id: string
  user_id: string
  programme_day_id: string | null
  block_id: string | null
  week_number: number
  session_date: string
  started_at: string | null
  finished_at: string | null
  duration_minutes: number | null
  is_deload: boolean
  notes: string | null
  created_at: string
}

export interface WorkoutSet {
  id: string
  session_id: string
  programme_exercise_id: string | null
  exercise_name: string
  set_number: number
  weight_kg: number | null
  reps_completed: number | null
  rir: number | null
  status: 'completed' | 'failed' | 'skipped' | 'warmup'
  is_pr: boolean
  notes: string | null
  created_at: string
}

export interface BodyMetrics {
  id: string
  user_id: string
  date: string
  weight_kg: number | null
  waist_cm: number | null
  arm_cm: number | null
  leg_cm: number | null
  forearm_cm: number | null
  calf_cm: number | null
  notes: string | null
  created_at: string
}

export interface NutritionLog {
  id: string
  user_id: string
  date: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  supplements_used: string[]
  notes: string | null
  created_at: string
}

export interface PersonalRecord {
  id: string
  user_id: string
  exercise_name: string
  weight_kg: number
  reps: number
  estimated_1rm: number | null
  achieved_date: string
  session_id: string | null
  created_at: string
}

export interface ProgrammePosition {
  weekNumber: number       // 1–12
  blockName: 'A' | 'B' | 'C'
  isDeloadWeek: boolean
  dayOfWeek: number        // 0=Sun, 1=Mon, ...
  isTrainingDay: boolean
  daysElapsed: number
}

export interface Expense {
  id: string
  user_id: string
  amount_pence: number
  currency: string
  category: 'food' | 'transport' | 'shopping' | 'entertainment' | 'health' | 'other'
  description: string | null
  date: string
  created_at: string
}

export interface Goal {
  id: string
  user_id: string
  title: string
  description: string | null
  target_value: number | null
  current_value: number
  unit: string | null
  deadline: string | null
  status: 'active' | 'completed' | 'paused'
  created_at: string
}

export interface FocusArea {
  id: string
  user_id: string
  name: string
  emoji: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface FocusCheckin {
  id: string
  user_id: string
  focus_area_id: string
  date: string
  created_at: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  emoji: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface HabitCompletion {
  id: string
  user_id: string
  habit_id: string
  date: string
  created_at: string
}

export interface DisciplineScore {
  id: string
  user_id: string
  date: string
  score: number
  notes: string | null
  created_at: string
}
