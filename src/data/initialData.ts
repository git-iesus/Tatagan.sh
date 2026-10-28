import exercisesRaw from './exercises.json';
import {
  Exercise,
  Routine,
  RoutineFolder,
  CompletedWorkout,
  BodyMeasurement,
  UserProfile,
} from '../types';

export const DEFAULT_REST_SECONDS = 60;

export const EXERCISES: Exercise[] = exercisesRaw as Exercise[];

export const EXERCISES_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((ex) => [ex.id, ex])
);

export function getExerciseById(id: string): Exercise {
  return (
    EXERCISES_BY_ID[id] || {
      id,
      title: 'Exercício Personalizado',
      title_en: 'Custom Exercise',
      priority: 1,
      muscle_group: 'full_body',
      exercise_type: 'weight_reps',
      equipment: 'other',
      video_url: null,
      thumbnail_url: null,
      instructions: null,
    }
  );
}

export const INITIAL_USER_PROFILE: UserProfile = {
  username: 'atleta_tatagan',
  displayName: 'Atleta Tatagan.sh',
};

export const INITIAL_FOLDERS: RoutineFolder[] = [
  { id: 'folder-ppl', name: 'Push / Pull / Legs (Hipertrofia)' },
  { id: 'folder-strength', name: 'Tatagan.sh • Força & Estética' },
];

export const INITIAL_ROUTINES: Routine[] = [
  {
    id: 'routine-push-a',
    title: 'Push A • Peito, Ombros & Tríceps',
    folderId: 'folder-ppl',
    notes: 'Foco em progressão de carga no Supino Reto. Descanso padrão de 60s.',
    lastPerformed: 'Rotina Oficial',
    exercises: [
      {
        id: 'we-1',
        exerciseId: '79D0BB3A', // Supino Reto (Barra)
        notes: 'Escápulas retraídas, pausa de 1s no peito.',
        restTimerSeconds: 60,
        sets: [
          { id: 's-1', type: 'warmup', weightKg: 60, reps: 12, rpe: 6, completed: false },
          { id: 's-2', type: 'normal', weightKg: 90, reps: 8, rpe: 8, completed: false },
          { id: 's-3', type: 'normal', weightKg: 95, reps: 8, rpe: 8.5, completed: false },
          { id: 's-4', type: 'normal', weightKg: 100, reps: 6, rpe: 9.5, completed: false },
        ],
      },
      {
        id: 'we-2',
        exerciseId: '07B38369', // Supino Inclinado (Halter)
        notes: 'Banco a 30 graus, amplitude máxima.',
        restTimerSeconds: 60,
        sets: [
          { id: 's-5', type: 'normal', weightKg: 34, reps: 10, rpe: 8, completed: false },
          { id: 's-6', type: 'normal', weightKg: 36, reps: 10, rpe: 8.5, completed: false },
          { id: 's-7', type: 'normal', weightKg: 36, reps: 8, rpe: 9, completed: false },
        ],
      },
      {
        id: 'we-3',
        exerciseId: '6AC96645', // Desenvolvimento (Halter)
        notes: 'Core travado, sem arquear a lombar.',
        restTimerSeconds: 60,
        sets: [
          { id: 's-8', type: 'normal', weightKg: 26, reps: 10, rpe: 8, completed: false },
          { id: 's-9', type: 'normal', weightKg: 28, reps: 8, rpe: 9, completed: false },
          { id: 's-10', type: 'normal', weightKg: 28, reps: 8, rpe: 9.5, completed: false },
        ],
      },
      {
        id: 'we-4',
        exerciseId: '422B08F1', // Elevação Lateral (Halter)
        notes: 'Cotovelos levemente flexionados, subir até a linha dos ombros.',
        restTimerSeconds: 60,
        sets: [
          { id: 's-11', type: 'normal', weightKg: 14, reps: 15, rpe: 8.5, completed: false },
          { id: 's-12', type: 'normal', weightKg: 14, reps: 15, rpe: 9, completed: false },
          { id: 's-13', type: 'dropset', weightKg: 10, reps: 15, rpe: 10, completed: false },
        ],
      },
      {
        id: 'we-5',
        exerciseId: '875F585F', // Tríceps Testa (Barra)
        notes: 'Barra W, manter cotovelos fechados.',
        restTimerSeconds: 60,
        sets: [
          { id: 's-14', type: 'normal', weightKg: 35, reps: 12, rpe: 8, completed: false },
          { id: 's-15', type: 'normal', weightKg: 37.5, reps: 10, rpe: 9, completed: false },
          { id: 's-16', type: 'failure', weightKg: 37.5, reps: 9, rpe: 10, completed: false },
        ],
      },
    ],
  },
  {
    id: 'routine-pull-a',
    title: 'Pull A • Costas, Dorsais & Bíceps',
    folderId: 'folder-ppl',
    notes: 'Foco em puxadas verticais e espessura de dorsais.',
    lastPerformed: 'Rotina Oficial',
    exercises: [
      {
        id: 'we-20',
        exerciseId: '6A6C31A5', // Puxada Alta (Cabo)
        notes: 'Pegada aberta pronada, puxar em direção à clavícula.',
        restTimerSeconds: 60,
        sets: [
          { id: 's-201', type: 'warmup', weightKg: 50, reps: 12, completed: false },
          { id: 's-202', type: 'normal', weightKg: 75, reps: 10, completed: false },
          { id: 's-203', type: 'normal', weightKg: 80, reps: 8, completed: false },
          { id: 's-204', type: 'normal', weightKg: 80, reps: 8, completed: false },
        ],
      },
      {
        id: 'we-21',
        exerciseId: '55E6546F', // Remada Curvada (Barra)
        notes: 'Tronco a 45 graus, puxar no umbigo.',
        restTimerSeconds: 60,
        sets: [
          { id: 's-205', type: 'normal', weightKg: 80, reps: 10, completed: false },
          { id: 's-206', type: 'normal', weightKg: 85, reps: 8, completed: false },
          { id: 's-207', type: 'normal', weightKg: 90, reps: 8, completed: false },
        ],
      },
      {
        id: 'we-22',
        exerciseId: '1DF4A847', // Remada Sentada (Máquina)
        notes: 'Segurar 1s no pico da contração.',
        restTimerSeconds: 60,
        sets: [
          { id: 's-208', type: 'normal', weightKg: 70, reps: 12, completed: false },
          { id: 's-209', type: 'normal', weightKg: 75, reps: 10, completed: false },
          { id: 's-210', type: 'normal', weightKg: 75, reps: 10, completed: false },
        ],
      },
      {
        id: 'we-23',
        exerciseId: 'A5AC6449', // Rosca Direta (Barra)
        notes: 'Sem roubar com o tronco.',
        restTimerSeconds: 60,
        sets: [
          { id: 's-211', type: 'normal', weightKg: 35, reps: 10, completed: false },
          { id: 's-212', type: 'normal', weightKg: 40, reps: 8, completed: false },
          { id: 's-213', type: 'normal', weightKg: 40, reps: 8, completed: false },
        ],
      },
    ],
  },
  {
    id: 'routine-legs-a',
    title: 'Legs A • Quadríceps, Posterior & Glúteos',
    folderId: 'folder-ppl',
    notes: 'Aquecer bem joelhos e quadril antes do Agachamento Livre.',
    lastPerformed: 'Rotina Oficial',
    exercises: [
      {
        id: 'we-30',
        exerciseId: 'D04AC939', // Agachamento (Barra)
        notes: 'Profundidade abaixo de 90 graus.',
        restTimerSeconds: 60,
        sets: [
          { id: 's-301', type: 'warmup', weightKg: 60, reps: 10, completed: false },
          { id: 's-302', type: 'normal', weightKg: 110, reps: 8, completed: false },
          { id: 's-303', type: 'normal', weightKg: 120, reps: 6, completed: false },
          { id: 's-304', type: 'normal', weightKg: 125, reps: 5, completed: false },
        ],
      },
      {
        id: 'we-31',
        exerciseId: 'C7973E0E', // Leg Press 45º (Máquina)
        notes: 'Pés na largura dos ombros, descer controlado.',
        restTimerSeconds: 60,
        sets: [
          { id: 's-305', type: 'normal', weightKg: 240, reps: 12, completed: false },
          { id: 's-306', type: 'normal', weightKg: 280, reps: 10, completed: false },
          { id: 's-307', type: 'normal', weightKg: 300, reps: 10, completed: false },
        ],
      },
      {
        id: 'we-32',
        exerciseId: 'B8127AD1', // Mesa Flexora (Máquina)
        notes: 'Manter quadril colado no banco.',
        restTimerSeconds: 60,
        sets: [
          { id: 's-308', type: 'normal', weightKg: 55, reps: 12, completed: false },
          { id: 's-309', type: 'normal', weightKg: 60, reps: 10, completed: false },
          { id: 's-310', type: 'failure', weightKg: 60, reps: 9, completed: false },
        ],
      },
    ],
  },
];

// Histórico de treinos inicia ZERADO para refletir apenas registros factuais do usuário
export const INITIAL_WORKOUT_HISTORY: CompletedWorkout[] = [];

export const INITIAL_MEASUREMENTS: BodyMeasurement[] = [];
