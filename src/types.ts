export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abdominals'
  | 'forearms'
  | 'lats'
  | 'traps'
  | 'lower_back'
  | 'upper_back'
  | 'abductors'
  | 'adductors'
  | 'neck'
  | 'cardio'
  | 'full_body'
  | 'other';

export type EquipmentCategory =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'resistance_band'
  | 'suspension'
  | 'plate'
  | 'other'
  | 'none';

export type SetType = 'normal' | 'warmup' | 'dropset' | 'failure';

export interface Exercise {
  id: string;
  title: string;
  title_en: string;
  priority: number;
  muscle_group: MuscleGroup | string;
  exercise_type: string;
  equipment: EquipmentCategory | string;
  video_url: string | null;
  video_url_female?: string | null;
  image_url?: string | null;
  thumbnail_url: string | null;
  thumbnail_url_female?: string | null;
  aliases?: string;
  instructions: string | null;
}

export interface WorkoutSet {
  id: string;
  type: SetType;
  weightKg: number | null;
  reps: number | null;
  rpe?: number | null;
  durationSeconds?: number | null;
  distanceKm?: number | null;
  completed: boolean;
  isPR?: boolean;
  previous?: string;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  notes: string;
  restTimerSeconds: number;
  supersetGroup?: number | null;
  sets: WorkoutSet[];
}

export interface RoutineFolder {
  id: string;
  name: string;
}

export interface Routine {
  id: string;
  title: string;
  folderId: string;
  notes?: string;
  lastPerformed?: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutComment {
  id: string;
  username: string;
  avatar: string;
  text: string;
  createdAt: string;
}

export interface CompletedWorkout {
  id: string;
  title: string;
  date: string;
  timestamp: number;
  durationSeconds: number;
  volumeKg: number;
  totalSets: number;
  prCount: number;
  notes?: string;
  likes: number;
  likedByMe: boolean;
  comments: WorkoutComment[];
  user: {
    username: string;
    displayName: string;
    avatar: string;
    isPro?: boolean;
    gymName?: string;
  };
  exercises: WorkoutExercise[];
}

export interface BodyMeasurement {
  id: string;
  date: string;
  weightKg: number;
  bodyFatPct?: number;
  chestCm?: number;
  waistCm?: number;
  armsCm?: number;
  thighsCm?: number;
}

export interface UserProfile {
  username: string;
  displayName: string;
}
