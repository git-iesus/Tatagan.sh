import { WorkoutExercise, Exercise } from '../types';

export const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Peito',
  lats: 'Dorsais',
  upper_back: 'Costas Superiores',
  lower_back: 'Lombar',
  back: 'Costas',
  shoulders: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearms: 'Antebraços',
  quadriceps: 'Quadríceps',
  hamstrings: 'Posterior de Coxa',
  glutes: 'Glúteos',
  calves: 'Panturrilhas',
  abdominals: 'Abdômen',
  traps: 'Trapézio',
  abductors: 'Abdutores',
  adductors: 'Adutores',
  neck: 'Pescoço',
  cardio: 'Cardio',
  full_body: 'Corpo Inteiro',
  other: 'Outros',
};

export const MUSCLE_LABELS_PT = MUSCLE_LABELS;

export const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'Barra',
  dumbbell: 'Halter',
  machine: 'Máquina',
  cable: 'Cabo',
  bodyweight: 'Peso Corporal',
  kettlebell: 'Kettlebell',
  resistance_band: 'Elástico',
  suspension: 'Suspensão',
  plate: 'Anilha',
  none: 'Peso Corporal',
  other: 'Outros',
};

export const EQUIPMENT_LABELS_PT = EQUIPMENT_LABELS;

export const FRONT_MUSCLES: string[] = [
  'abdominals',
  'abductors',
  'adductors',
  'biceps',
  'calves',
  'chest',
  'forearms',
  'neck',
  'quadriceps',
  'shoulders',
  'traps',
];

export const BACK_MUSCLES: string[] = [
  'abductors',
  'calves',
  'forearms',
  'glutes',
  'hamstrings',
  'lats',
  'lowerback',
  'neck',
  'shoulders',
  'traps',
  'triceps',
  'upperback',
];

export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}min`;
  }
  if (mins > 0) {
    return `${mins}min ${secs}s`;
  }
  return `${secs}s`;
}

export function formatTimerMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export const formatClock = formatTimerMMSS;

export function calculateOneRepMax(weightKg: number, reps: number): number {
  if (!weightKg || !reps || reps <= 0) return 0;
  if (reps === 1) return Math.round(weightKg);
  return Math.round(weightKg * (1 + reps / 30));
}

export function calculateExercisesVolume(exercises: WorkoutExercise[]): number {
  let vol = 0;
  for (const ex of exercises) {
    for (const s of ex.sets) {
      if (s.completed) {
        vol += (s.weightKg || 0) * (s.reps || 0);
      }
    }
  }
  return Math.round(vol);
}

export function calculateExercisesCompletedSets(exercises: WorkoutExercise[]): number {
  let count = 0;
  for (const ex of exercises) {
    for (const s of ex.sets) {
      if (s.completed) count += 1;
    }
  }
  return count;
}

export function computeMuscleDistributionFromExercises(
  exercises: WorkoutExercise[],
  catalog: Record<string, Exercise>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ex of exercises) {
    const meta = catalog[ex.exerciseId];
    if (!meta) continue;
    const completed = ex.sets.filter((s) => s.completed).length || ex.sets.length;
    const key = meta.muscle_group;
    counts[key] = (counts[key] || 0) + completed;
  }
  return counts;
}

export interface PlateResult {
  weight: number;
  countPerSide: number;
  color: string;
  heightPct: number;
}

const AVAILABLE_PLATES = [
  { weight: 25, color: '#E34B37', heightPct: 100 },
  { weight: 20, color: '#008CFF', heightPct: 96 },
  { weight: 15, color: '#F59E0B', heightPct: 86 },
  { weight: 10, color: '#2ACC58', heightPct: 76 },
  { weight: 5, color: '#F2F4F7', heightPct: 62 },
  { weight: 2.5, color: '#4A4A4A', heightPct: 52 },
  { weight: 1.25, color: '#AEB3B7', heightPct: 44 },
];

export function calculatePlates(targetWeightKg: number, barWeightKg = 20): {
  plates: PlateResult[];
  achievedWeight: number;
  perSideWeight: number;
} {
  const remainingTotal = Math.max(0, targetWeightKg - barWeightKg);
  let perSide = remainingTotal / 2;
  const result: PlateResult[] = [];

  for (const p of AVAILABLE_PLATES) {
    const count = Math.floor((perSide + 0.001) / p.weight);
    if (count > 0) {
      result.push({
        weight: p.weight,
        countPerSide: count,
        color: p.color,
        heightPct: p.heightPct,
      });
      perSide -= count * p.weight;
    }
  }

  const achievedPerSide = result.reduce((acc, r) => acc + r.weight * r.countPerSide, 0);
  return {
    plates: result,
    achievedWeight: barWeightKg + achievedPerSide * 2,
    perSideWeight: achievedPerSide,
  };
}

export function generateWarmupSets(workingWeightKg: number, barWeightKg = 20): Array<{
  weightKg: number;
  reps: number;
  pct: number;
  label: string;
}> {
  const roundTo2_5 = (v: number) => Math.max(barWeightKg, Math.round(v / 2.5) * 2.5);
  if (workingWeightKg <= barWeightKg) {
    return [{ weightKg: barWeightKg, reps: 10, pct: 50, label: 'Barra Vazia (50%)' }];
  }
  return [
    { weightKg: barWeightKg, reps: 10, pct: Math.round((barWeightKg / workingWeightKg) * 100), label: 'Aquecimento Articular (Barra)' },
    { weightKg: roundTo2_5(workingWeightKg * 0.5), reps: 8, pct: 50, label: 'Série de Aproximação 1 (50%)' },
    { weightKg: roundTo2_5(workingWeightKg * 0.7), reps: 5, pct: 70, label: 'Série de Aproximação 2 (70%)' },
    { weightKg: roundTo2_5(workingWeightKg * 0.85), reps: 3, pct: 85, label: 'Aclimatização de Carga (85%)' },
  ];
}

export interface VolumeComparison {
  name: string;
  article: string;
  weightKg: number;
  asset: string;
  description: string;
}

export const VOLUME_COMPARISONS: VolumeComparison[] = [
  { name: 'Moto Esportiva', article: 'uma', weightKg: 250, asset: '/assets/volume/motorcycle.png', description: 'O peso de uma motocicleta esportiva!' },
  { name: 'Grande Tubarão Branco', article: 'um', weightKg: 1100, asset: '/assets/volume/shark.png', description: 'O peso de um tubarão branco adulto!' },
  { name: 'Carro Esportivo', article: 'um', weightKg: 1500, asset: '/assets/volume/car.png', description: 'Você levantou um carro inteiro hoje!' },
  { name: 'Caminhonete Pickup', article: 'uma', weightKg: 2500, asset: '/assets/volume/pickuptruck.png', description: 'O equivalente a uma picape pesada!' },
  { name: 'Van de Carga', article: 'uma', weightKg: 3500, asset: '/assets/volume/van.png', description: 'O peso de uma van comercial lotada!' },
  { name: 'Helicóptero', article: 'um', weightKg: 4800, asset: '/assets/volume/helicopter.png', description: 'O peso de um helicóptero de resgate!' },
  { name: 'Elefante Africano', article: 'um', weightKg: 6000, asset: '/assets/volume/elephant.png', description: 'O equivalente a um elefante africano!' },
  { name: 'Tiranossauro Rex', article: 'um', weightKg: 8000, asset: '/assets/volume/trex.png', description: 'Você levantou o peso de um T-Rex!' },
  { name: 'Caminhão Pesado', article: 'um', weightKg: 11000, asset: '/assets/volume/truck.png', description: 'O equivalente a um caminhão de carga!' },
  { name: 'Ônibus Urbano', article: 'um', weightKg: 14000, asset: '/assets/volume/bus.png', description: 'O peso de um ônibus inteiro!' },
  { name: 'Iate de Luxo', article: 'um', weightKg: 20000, asset: '/assets/volume/yacht.png', description: 'O equivalente a um iate de luxo!' },
  { name: 'Caça Supersônico', article: 'um', weightKg: 28000, asset: '/assets/volume/jet.png', description: 'O peso de um jato militar!' },
  { name: 'Avião Comercial', article: 'um', weightKg: 45000, asset: '/assets/volume/airplane.png', description: 'O peso de um avião comercial!' },
];

export function getVolumeComparison(volumeKg: number): VolumeComparison {
  let chosen = VOLUME_COMPARISONS[0];
  for (const item of VOLUME_COMPARISONS) {
    if (volumeKg >= item.weightKg * 0.7) {
      chosen = item;
    }
  }
  return chosen;
}

const MUSCLE_HEATMAP_KEY: Record<string, string> = {
  chest: 'chest',
  lats: 'lats',
  upper_back: 'upperback',
  lower_back: 'lowerback',
  back: 'upperback',
  shoulders: 'shoulders',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'forearms',
  quadriceps: 'quadriceps',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  calves: 'calves',
  abdominals: 'abdominals',
  traps: 'traps',
  abductors: 'abductors',
  adductors: 'adductors',
  neck: 'neck',
};

export function normalizeMuscleKeyForAsset(muscle: string): string {
  return MUSCLE_HEATMAP_KEY[muscle] || muscle;
}
