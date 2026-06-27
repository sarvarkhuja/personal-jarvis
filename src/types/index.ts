// src/types/index.ts

import type { LiftKey } from '@/lib/utils/lift-metrics'

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
  created_at: string
}

export interface WeeklyLift {
  id: string
  user_id: string
  exercise: LiftKey
  week_start: string
  weight_kg: number | null
  reps: number
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  user_id: string
  amount: number
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
  goal_id: string
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

export type ProgressPhotoPose =
  | 'front_relaxed'
  | 'front_flexed'
  | 'side'
  | 'back_relaxed'
  | 'back_flexed'

export interface ProgressPhoto {
  id: string
  user_id: string
  date: string
  pose: ProgressPhotoPose
  storage_path: string
  thumbnail_path: string | null
  created_at: string
}
