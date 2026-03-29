// src/lib/constants/programme-data.ts
// Seed data for the 12-week periodised programme.
// Block A = weeks 1-4, Block B = weeks 5-8, Block C = weeks 9-12
// Training days: Mon (1), Tue (2), Thu (4), Fri (5)

export interface BlockSeed {
  name: string
  description: string
  week_start: number
  week_end: number
  focus: string
  rep_range_compounds: string
  rep_range_accessories: string
  sort_order: number
  days: DaySeed[]
}

export interface DaySeed {
  day_of_week: number
  name: string
  emphasis: string
  sort_order: number
  exercises: ExerciseSeed[]
}

export interface ExerciseSeed {
  exercise_name: string
  sets: number
  reps_min: number
  reps_max: number
  tempo: string
  rest_seconds: number
  rest_category: 'short' | 'moderate' | 'long'
  coach_note: string
  muscle_groups: string[]
  is_timed: boolean
  time_seconds: number | null
  sort_order: number
}

export const PROGRAMME: BlockSeed[] = [
  {
    name: 'Block A',
    description: 'Anatomical Hypertrophy — higher reps, building work capacity',
    week_start: 1,
    week_end: 4,
    focus: 'Anatomical Hypertrophy',
    rep_range_compounds: '8-10',
    rep_range_accessories: '10-15',
    sort_order: 1,
    days: [
      {
        day_of_week: 1,
        name: 'Lower Body A — Quad & Calf Focus',
        emphasis: 'Quad & Calf Focus',
        sort_order: 1,
        exercises: [
          {
            exercise_name: 'Barbell Back Squat',
            sets: 4, reps_min: 8, reps_max: 10,
            tempo: '3-1-1-0', rest_seconds: 180, rest_category: 'long',
            coach_note: 'Primary quad builder. Focus on full depth and controlled eccentric.',
            muscle_groups: ['quads', 'glutes', 'hamstrings'], is_timed: false, time_seconds: null, sort_order: 1,
          },
          {
            exercise_name: 'Bulgarian Split Squat',
            sets: 3, reps_min: 10, reps_max: 12,
            tempo: '2-0-1-0', rest_seconds: 120, rest_category: 'moderate',
            coach_note: 'Unilateral quad and glute work. Rear foot elevated on bench.',
            muscle_groups: ['quads', 'glutes'], is_timed: false, time_seconds: null, sort_order: 2,
          },
          {
            exercise_name: 'Leg Press',
            sets: 3, reps_min: 10, reps_max: 15,
            tempo: '2-0-1-0', rest_seconds: 120, rest_category: 'moderate',
            coach_note: 'High-foot placement for glute emphasis; low for quads.',
            muscle_groups: ['quads', 'glutes'], is_timed: false, time_seconds: null, sort_order: 3,
          },
          {
            exercise_name: 'Leg Extension',
            sets: 3, reps_min: 12, reps_max: 15,
            tempo: '2-1-1-0', rest_seconds: 90, rest_category: 'short',
            coach_note: 'Quad isolation. Focus on peak contraction.',
            muscle_groups: ['quads'], is_timed: false, time_seconds: null, sort_order: 4,
          },
          {
            exercise_name: 'Standing Calf Raise',
            sets: 4, reps_min: 12, reps_max: 15,
            tempo: '2-1-2-0', rest_seconds: 60, rest_category: 'short',
            coach_note: 'Full range of motion — stretch at bottom, pause at top.',
            muscle_groups: ['calves'], is_timed: false, time_seconds: null, sort_order: 5,
          },
        ],
      },
      {
        day_of_week: 2,
        name: 'Upper Body A — Chest & Shoulder Focus',
        emphasis: 'Chest & Shoulder Focus',
        sort_order: 2,
        exercises: [
          {
            exercise_name: 'Barbell Bench Press',
            sets: 4, reps_min: 8, reps_max: 10,
            tempo: '3-1-1-0', rest_seconds: 180, rest_category: 'long',
            coach_note: 'Primary horizontal push. Retract scapula, controlled touch to chest.',
            muscle_groups: ['chest', 'triceps', 'front_delts'], is_timed: false, time_seconds: null, sort_order: 1,
          },
          {
            exercise_name: 'Incline Dumbbell Press',
            sets: 3, reps_min: 10, reps_max: 12,
            tempo: '2-0-1-0', rest_seconds: 120, rest_category: 'moderate',
            coach_note: 'Upper chest emphasis. 30-45 degree incline.',
            muscle_groups: ['chest', 'front_delts'], is_timed: false, time_seconds: null, sort_order: 2,
          },
          {
            exercise_name: 'Seated Dumbbell Shoulder Press',
            sets: 3, reps_min: 10, reps_max: 12,
            tempo: '2-0-1-0', rest_seconds: 120, rest_category: 'moderate',
            coach_note: 'Overhead pressing strength.',
            muscle_groups: ['front_delts', 'lateral_delts', 'triceps'], is_timed: false, time_seconds: null, sort_order: 3,
          },
          {
            exercise_name: 'Cable Lateral Raise',
            sets: 3, reps_min: 12, reps_max: 15,
            tempo: '2-1-2-0', rest_seconds: 90, rest_category: 'short',
            coach_note: 'Shoulder width. Cables provide constant tension throughout range.',
            muscle_groups: ['lateral_delts'], is_timed: false, time_seconds: null, sort_order: 4,
          },
          {
            exercise_name: 'Tricep Rope Pushdown',
            sets: 3, reps_min: 12, reps_max: 15,
            tempo: '2-1-1-0', rest_seconds: 90, rest_category: 'short',
            coach_note: 'Elbow isolation. Elbows stay tucked at sides.',
            muscle_groups: ['triceps'], is_timed: false, time_seconds: null, sort_order: 5,
          },
        ],
      },
      {
        day_of_week: 4,
        name: 'Lower Body B — Hamstring & Glute Focus',
        emphasis: 'Hamstring & Glute Focus',
        sort_order: 3,
        exercises: [
          {
            exercise_name: 'Romanian Deadlift',
            sets: 4, reps_min: 8, reps_max: 10,
            tempo: '3-1-1-0', rest_seconds: 180, rest_category: 'long',
            coach_note: 'Hip hinge pattern. Feel stretch in hamstrings, maintain neutral spine.',
            muscle_groups: ['hamstrings', 'glutes', 'lower_back'], is_timed: false, time_seconds: null, sort_order: 1,
          },
          {
            exercise_name: 'Hip Thrust',
            sets: 3, reps_min: 10, reps_max: 12,
            tempo: '2-1-1-0', rest_seconds: 120, rest_category: 'moderate',
            coach_note: 'Primary glute builder. Drive through heels, squeeze at top.',
            muscle_groups: ['glutes', 'hamstrings'], is_timed: false, time_seconds: null, sort_order: 2,
          },
          {
            exercise_name: 'Leg Curl (Lying)',
            sets: 3, reps_min: 10, reps_max: 12,
            tempo: '2-1-2-0', rest_seconds: 90, rest_category: 'short',
            coach_note: 'Hamstring isolation. Full contraction and slow negative.',
            muscle_groups: ['hamstrings'], is_timed: false, time_seconds: null, sort_order: 3,
          },
          {
            exercise_name: 'Sumo Deadlift',
            sets: 3, reps_min: 8, reps_max: 10,
            tempo: '2-0-1-0', rest_seconds: 180, rest_category: 'long',
            coach_note: 'Wide stance, toes out. Targets inner thigh and glutes more than conventional.',
            muscle_groups: ['glutes', 'hamstrings', 'adductors'], is_timed: false, time_seconds: null, sort_order: 4,
          },
          {
            exercise_name: 'Seated Calf Raise',
            sets: 4, reps_min: 12, reps_max: 15,
            tempo: '2-1-2-0', rest_seconds: 60, rest_category: 'short',
            coach_note: 'Targets soleus (bent knee). Add to standing calf work.',
            muscle_groups: ['calves'], is_timed: false, time_seconds: null, sort_order: 5,
          },
        ],
      },
      {
        day_of_week: 5,
        name: 'Upper Body B — Back & Bicep Focus',
        emphasis: 'Back & Bicep Focus',
        sort_order: 4,
        exercises: [
          {
            exercise_name: 'Barbell Row',
            sets: 4, reps_min: 8, reps_max: 10,
            tempo: '2-1-1-0', rest_seconds: 180, rest_category: 'long',
            coach_note: 'Primary horizontal pull. Retract scapula at top, control the negative.',
            muscle_groups: ['lats', 'rhomboids', 'biceps', 'rear_delts'], is_timed: false, time_seconds: null, sort_order: 1,
          },
          {
            exercise_name: 'Pull-Up / Lat Pulldown',
            sets: 3, reps_min: 8, reps_max: 10,
            tempo: '2-1-1-0', rest_seconds: 120, rest_category: 'moderate',
            coach_note: "Vertical pull for lat width. Use Lat Pulldown if can't do bodyweight pull-ups.",
            muscle_groups: ['lats', 'biceps'], is_timed: false, time_seconds: null, sort_order: 2,
          },
          {
            exercise_name: 'Seated Cable Row',
            sets: 3, reps_min: 10, reps_max: 12,
            tempo: '2-1-2-0', rest_seconds: 90, rest_category: 'short',
            coach_note: 'Mid-back thickness. Squeeze shoulder blades together at peak contraction.',
            muscle_groups: ['lats', 'rhomboids', 'biceps'], is_timed: false, time_seconds: null, sort_order: 3,
          },
          {
            exercise_name: 'Face Pull',
            sets: 3, reps_min: 15, reps_max: 20,
            tempo: '2-1-1-0', rest_seconds: 90, rest_category: 'short',
            coach_note: 'Shoulder health and rear delt development. Pull to face level.',
            muscle_groups: ['rear_delts', 'rotator_cuff'], is_timed: false, time_seconds: null, sort_order: 4,
          },
          {
            exercise_name: 'Barbell Curl',
            sets: 3, reps_min: 10, reps_max: 12,
            tempo: '2-1-2-0', rest_seconds: 90, rest_category: 'short',
            coach_note: 'Bicep mass builder. No swinging — strict form.',
            muscle_groups: ['biceps'], is_timed: false, time_seconds: null, sort_order: 5,
          },
        ],
      },
    ],
  },
  {
    name: 'Block B',
    description: 'Strength Hypertrophy — heavier loads, lower reps',
    week_start: 5,
    week_end: 8,
    focus: 'Strength Hypertrophy',
    rep_range_compounds: '5-7',
    rep_range_accessories: '8-12',
    sort_order: 2,
    days: [],
  },
  {
    name: 'Block C',
    description: 'Strength — maximal strength focus, lower reps',
    week_start: 9,
    week_end: 12,
    focus: 'Strength',
    rep_range_compounds: '3-5',
    rep_range_accessories: '10-15',
    sort_order: 3,
    days: [],
  },
]
