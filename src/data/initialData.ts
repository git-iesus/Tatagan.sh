import exercisesRaw from './exercises.json';
import {
  Exercise,
  Routine,
  RoutineFolder,
  CompletedWorkout,
  BodyMeasurement,
  CoachMessage,
} from '../types';

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

export const INITIAL_FOLDERS: RoutineFolder[] = [
  { id: 'folder-ppl', name: 'Push / Pull / Legs (Hipertrofia)' },
  { id: 'folder-coach', name: 'Hevy Coach • Força & Estética' },
];

export const INITIAL_ROUTINES: Routine[] = [
  {
    id: 'routine-push-a',
    title: 'Push A • Peito, Ombros & Tríceps',
    folderId: 'folder-ppl',
    notes: 'Foco em progressão de carga no Supino Reto. Descanso de 120s nos compostos.',
    lastPerformed: 'Há 2 dias',
    exercises: [
      {
        id: 'we-1',
        exerciseId: '79D0BB3A', // Supino Reto (Barra)
        notes: 'Escápulas retraídas, pausa de 1s no peito.',
        restTimerSeconds: 120,
        sets: [
          { id: 's-1', type: 'warmup', weightKg: 60, reps: 12, rpe: 6, completed: false, previous: '60kg x 12' },
          { id: 's-2', type: 'normal', weightKg: 90, reps: 8, rpe: 8, completed: false, previous: '90kg x 8' },
          { id: 's-3', type: 'normal', weightKg: 95, reps: 8, rpe: 8.5, completed: false, previous: '92.5kg x 8' },
          { id: 's-4', type: 'normal', weightKg: 100, reps: 6, rpe: 9.5, completed: false, previous: '95kg x 6' },
        ],
      },
      {
        id: 'we-2',
        exerciseId: '07B38369', // Supino Inclinado (Halter)
        notes: 'Banco a 30 graus, amplitude máxima.',
        restTimerSeconds: 90,
        sets: [
          { id: 's-5', type: 'normal', weightKg: 34, reps: 10, rpe: 8, completed: false, previous: '34kg x 10' },
          { id: 's-6', type: 'normal', weightKg: 36, reps: 10, rpe: 8.5, completed: false, previous: '34kg x 10' },
          { id: 's-7', type: 'normal', weightKg: 36, reps: 8, rpe: 9, completed: false, previous: '36kg x 8' },
        ],
      },
      {
        id: 'we-3',
        exerciseId: '6AC96645', // Desenvolvimento (Halter)
        notes: 'Core travado, sem arquear a lombar.',
        restTimerSeconds: 90,
        sets: [
          { id: 's-8', type: 'normal', weightKg: 26, reps: 10, rpe: 8, completed: false, previous: '26kg x 10' },
          { id: 's-9', type: 'normal', weightKg: 28, reps: 8, rpe: 9, completed: false, previous: '26kg x 9' },
          { id: 's-10', type: 'normal', weightKg: 28, reps: 8, rpe: 9.5, completed: false, previous: '28kg x 8' },
        ],
      },
      {
        id: 'we-4',
        exerciseId: '422B08F1', // Elevação Lateral (Halter)
        notes: 'Cotovelos levemente flexionados, subir até a linha dos ombros.',
        restTimerSeconds: 60,
        sets: [
          { id: 's-11', type: 'normal', weightKg: 14, reps: 15, rpe: 8.5, completed: false, previous: '14kg x 15' },
          { id: 's-12', type: 'normal', weightKg: 14, reps: 15, rpe: 9, completed: false, previous: '14kg x 14' },
          { id: 's-13', type: 'dropset', weightKg: 10, reps: 15, rpe: 10, completed: false, previous: '10kg x 15' },
        ],
      },
      {
        id: 'we-5',
        exerciseId: '875F585F', // Tríceps Testa (Barra)
        notes: 'Barra W, manter cotovelos fechados.',
        restTimerSeconds: 75,
        sets: [
          { id: 's-14', type: 'normal', weightKg: 35, reps: 12, rpe: 8, completed: false, previous: '35kg x 12' },
          { id: 's-15', type: 'normal', weightKg: 37.5, reps: 10, rpe: 9, completed: false, previous: '35kg x 10' },
          { id: 's-16', type: 'failure', weightKg: 37.5, reps: 9, rpe: 10, completed: false, previous: '35kg x 9' },
        ],
      },
    ],
  },
  {
    id: 'routine-pull-a',
    title: 'Pull A • Costas, Dorsais & Bíceps',
    folderId: 'folder-ppl',
    notes: 'Foco em puxadas verticais e espessura de dorsais.',
    lastPerformed: 'Há 4 dias',
    exercises: [
      {
        id: 'we-20',
        exerciseId: '6A6C31A5', // Puxada Alta (Cabo)
        notes: 'Pegada aberta pronada, puxar em direção à clavícula.',
        restTimerSeconds: 90,
        sets: [
          { id: 's-201', type: 'warmup', weightKg: 50, reps: 12, completed: false, previous: '50kg x 12' },
          { id: 's-202', type: 'normal', weightKg: 75, reps: 10, completed: false, previous: '75kg x 10' },
          { id: 's-203', type: 'normal', weightKg: 80, reps: 8, completed: false, previous: '75kg x 9' },
          { id: 's-204', type: 'normal', weightKg: 80, reps: 8, completed: false, previous: '80kg x 8' },
        ],
      },
      {
        id: 'we-21',
        exerciseId: '55E6546F', // Remada Curvada (Barra)
        notes: 'Tronco a 45 graus, puxar no umbigo.',
        restTimerSeconds: 120,
        sets: [
          { id: 's-205', type: 'normal', weightKg: 80, reps: 10, completed: false, previous: '80kg x 10' },
          { id: 's-206', type: 'normal', weightKg: 85, reps: 8, completed: false, previous: '85kg x 8' },
          { id: 's-207', type: 'normal', weightKg: 90, reps: 8, completed: false, previous: '85kg x 8' },
        ],
      },
      {
        id: 'we-22',
        exerciseId: '1DF4A847', // Remada Sentada (Máquina)
        notes: 'Segurar 1s no pico da contração.',
        restTimerSeconds: 90,
        sets: [
          { id: 's-208', type: 'normal', weightKg: 70, reps: 12, completed: false, previous: '70kg x 12' },
          { id: 's-209', type: 'normal', weightKg: 75, reps: 10, completed: false, previous: '75kg x 10' },
          { id: 's-210', type: 'normal', weightKg: 75, reps: 10, completed: false, previous: '75kg x 10' },
        ],
      },
      {
        id: 'we-23',
        exerciseId: 'A5AC6449', // Rosca Direta (Barra)
        notes: 'Sem roubar com o tronco.',
        restTimerSeconds: 75,
        sets: [
          { id: 's-211', type: 'normal', weightKg: 35, reps: 10, completed: false, previous: '35kg x 10' },
          { id: 's-212', type: 'normal', weightKg: 40, reps: 8, completed: false, previous: '37.5kg x 8' },
          { id: 's-213', type: 'normal', weightKg: 40, reps: 8, completed: false, previous: '40kg x 8' },
        ],
      },
      {
        id: 'we-24',
        exerciseId: '7E3BC8B6', // Rosca Martelo (Halter)
        notes: 'Foco em braquial e antebraço.',
        restTimerSeconds: 60,
        sets: [
          { id: 's-214', type: 'normal', weightKg: 18, reps: 12, completed: false, previous: '18kg x 12' },
          { id: 's-215', type: 'normal', weightKg: 20, reps: 10, completed: false, previous: '18kg x 10' },
          { id: 's-216', type: 'dropset', weightKg: 14, reps: 12, completed: false, previous: '14kg x 12' },
        ],
      },
    ],
  },
  {
    id: 'routine-legs-a',
    title: 'Legs A • Quadríceps, Posterior & Glúteos',
    folderId: 'folder-ppl',
    notes: 'Aquecer bem joelhos e quadril antes do Agachamento Livre.',
    lastPerformed: 'Há 5 dias',
    exercises: [
      {
        id: 'we-30',
        exerciseId: 'D04AC939', // Agachamento (Barra)
        notes: 'Profundidade abaixo de 90 graus.',
        restTimerSeconds: 150,
        sets: [
          { id: 's-301', type: 'warmup', weightKg: 60, reps: 10, completed: false, previous: '60kg x 10' },
          { id: 's-302', type: 'normal', weightKg: 110, reps: 8, completed: false, previous: '110kg x 8' },
          { id: 's-303', type: 'normal', weightKg: 120, reps: 6, completed: false, previous: '115kg x 6' },
          { id: 's-304', type: 'normal', weightKg: 125, reps: 5, completed: false, previous: '120kg x 5' },
        ],
      },
      {
        id: 'we-31',
        exerciseId: 'C7973E0E', // Leg Press 45º (Máquina)
        notes: 'Pés na largura dos ombros, descer controlado.',
        restTimerSeconds: 120,
        sets: [
          { id: 's-305', type: 'normal', weightKg: 240, reps: 12, completed: false, previous: '240kg x 12' },
          { id: 's-306', type: 'normal', weightKg: 280, reps: 10, completed: false, previous: '260kg x 10' },
          { id: 's-307', type: 'normal', weightKg: 300, reps: 10, completed: false, previous: '280kg x 10' },
        ],
      },
      {
        id: 'we-32',
        exerciseId: 'B8127AD1', // Mesa Flexora (Máquina)
        notes: 'Manter quadril colado no banco.',
        restTimerSeconds: 75,
        sets: [
          { id: 's-308', type: 'normal', weightKg: 55, reps: 12, completed: false, previous: '55kg x 12' },
          { id: 's-309', type: 'normal', weightKg: 60, reps: 10, completed: false, previous: '60kg x 10' },
          { id: 's-310', type: 'failure', weightKg: 60, reps: 9, completed: false, previous: '60kg x 9' },
        ],
      },
      {
        id: 'we-33',
        exerciseId: '75A4F6C4', // Cadeira Extensora (Máquina)
        notes: 'Pico de contração de 1s no topo.',
        restTimerSeconds: 75,
        sets: [
          { id: 's-311', type: 'normal', weightKg: 70, reps: 15, completed: false, previous: '70kg x 15' },
          { id: 's-312', type: 'normal', weightKg: 75, reps: 12, completed: false, previous: '75kg x 12' },
          { id: 's-313', type: 'dropset', weightKg: 55, reps: 15, completed: false, previous: '50kg x 15' },
        ],
      },
    ],
  },
  {
    id: 'routine-upper-coach',
    title: 'Upper Power • Hevy Coach Protocol',
    folderId: 'folder-coach',
    notes: 'Prescrição semanal do Hevy Coach: manter RPE entre 8 e 9.',
    lastPerformed: 'Há 6 dias',
    exercises: [
      {
        id: 'we-40',
        exerciseId: '50DFDFAB', // Supino Inclinado (Barra)
        notes: 'Controle excêntrico de 3 segundos.',
        restTimerSeconds: 120,
        sets: [
          { id: 's-401', type: 'normal', weightKg: 80, reps: 8, completed: false, previous: '80kg x 8' },
          { id: 's-402', type: 'normal', weightKg: 85, reps: 6, completed: false, previous: '82.5kg x 6' },
          { id: 's-403', type: 'normal', weightKg: 85, reps: 6, completed: false, previous: '85kg x 6' },
        ],
      },
      {
        id: 'we-41',
        exerciseId: '729237D1', // Barra Fixa (Com Peso)
        notes: 'Cinto com anilha presa.',
        restTimerSeconds: 120,
        sets: [
          { id: 's-404', type: 'normal', weightKg: 15, reps: 8, completed: false, previous: '15kg x 8' },
          { id: 's-405', type: 'normal', weightKg: 20, reps: 6, completed: false, previous: '15kg x 7' },
          { id: 's-406', type: 'normal', weightKg: 20, reps: 6, completed: false, previous: '20kg x 6' },
        ],
      },
      {
        id: 'we-42',
        exerciseId: 'F1E57334', // Remada Serrote (Halter)
        notes: 'Alongar bem a escápula na descida.',
        restTimerSeconds: 90,
        sets: [
          { id: 's-407', type: 'normal', weightKg: 42, reps: 10, completed: false, previous: '40kg x 10' },
          { id: 's-408', type: 'normal', weightKg: 44, reps: 8, completed: false, previous: '42kg x 8' },
          { id: 's-409', type: 'normal', weightKg: 44, reps: 8, completed: false, previous: '44kg x 8' },
        ],
      },
    ],
  },
];

export const INITIAL_WORKOUT_HISTORY: CompletedWorkout[] = [
  {
    id: 'w-hist-1',
    title: 'Push A • Peito, Ombros & Tríceps',
    date: 'Hoje, 14:20',
    durationSeconds: 3840,
    volumeKg: 8640,
    totalSets: 16,
    prCount: 3,
    notes: 'Novo PR de 100kg x 6 no Supino Reto! Pump absurdo hoje 🔥',
    likes: 24,
    likedByMe: true,
    user: {
      username: 'iesus_candido',
      displayName: 'Iesus Candido',
      avatar: 'IC',
      isPro: true,
      gymName: 'Ironberg CT',
    },
    comments: [
      {
        id: 'c-1',
        username: 'coach_marcos',
        avatar: 'CM',
        text: 'Execução impecável nos 100kg! Semana que vem subimos para 102.5kg 💪',
        createdAt: 'Há 1h',
      },
      {
        id: 'c-2',
        username: 'lucas_fit',
        avatar: 'LF',
        text: 'Monstro demais! 100kg no supino é marco histórico!',
        createdAt: 'Há 35min',
      },
    ],
    exercises: [
      {
        id: 'hwe-1',
        exerciseId: '79D0BB3A',
        notes: 'PR histórico!',
        restTimerSeconds: 120,
        sets: [
          { id: 'hs-1', type: 'warmup', weightKg: 60, reps: 12, completed: true },
          { id: 'hs-2', type: 'normal', weightKg: 90, reps: 8, completed: true },
          { id: 'hs-3', type: 'normal', weightKg: 95, reps: 8, completed: true, isPR: true },
          { id: 'hs-4', type: 'normal', weightKg: 100, reps: 6, completed: true, isPR: true },
        ],
      },
      {
        id: 'hwe-2',
        exerciseId: '07B38369',
        notes: '',
        restTimerSeconds: 90,
        sets: [
          { id: 'hs-5', type: 'normal', weightKg: 34, reps: 10, completed: true },
          { id: 'hs-6', type: 'normal', weightKg: 36, reps: 10, completed: true, isPR: true },
          { id: 'hs-7', type: 'normal', weightKg: 36, reps: 8, completed: true },
        ],
      },
      {
        id: 'hwe-3',
        exerciseId: '6AC96645',
        notes: '',
        restTimerSeconds: 90,
        sets: [
          { id: 'hs-8', type: 'normal', weightKg: 26, reps: 10, completed: true },
          { id: 'hs-9', type: 'normal', weightKg: 28, reps: 8, completed: true },
          { id: 'hs-10', type: 'normal', weightKg: 28, reps: 8, completed: true },
        ],
      },
      {
        id: 'hwe-4',
        exerciseId: '422B08F1',
        notes: '',
        restTimerSeconds: 60,
        sets: [
          { id: 'hs-11', type: 'normal', weightKg: 14, reps: 15, completed: true },
          { id: 'hs-12', type: 'normal', weightKg: 14, reps: 15, completed: true },
          { id: 'hs-13', type: 'dropset', weightKg: 10, reps: 15, completed: true },
        ],
      },
      {
        id: 'hwe-5',
        exerciseId: '875F585F',
        notes: '',
        restTimerSeconds: 75,
        sets: [
          { id: 'hs-14', type: 'normal', weightKg: 35, reps: 12, completed: true },
          { id: 'hs-15', type: 'normal', weightKg: 37.5, reps: 10, completed: true },
          { id: 'hs-16', type: 'failure', weightKg: 37.5, reps: 9, completed: true },
        ],
      },
    ],
  },
  {
    id: 'w-hist-2',
    title: 'Pull A • Costas, Dorsais & Bíceps',
    date: 'Há 2 dias',
    durationSeconds: 3420,
    volumeKg: 7920,
    totalSets: 15,
    prCount: 2,
    notes: 'Remada curvada com 90kg muito sólida. Grip aguentou firme.',
    likes: 18,
    likedByMe: false,
    user: {
      username: 'iesus_candido',
      displayName: 'Iesus Candido',
      avatar: 'IC',
      isPro: true,
      gymName: 'Ironberg CT',
    },
    comments: [],
    exercises: [
      {
        id: 'hwe-20',
        exerciseId: '6A6C31A5',
        notes: '',
        restTimerSeconds: 90,
        sets: [
          { id: 'hs-201', type: 'normal', weightKg: 75, reps: 10, completed: true },
          { id: 'hs-202', type: 'normal', weightKg: 80, reps: 8, completed: true, isPR: true },
          { id: 'hs-203', type: 'normal', weightKg: 80, reps: 8, completed: true },
        ],
      },
      {
        id: 'hwe-21',
        exerciseId: '55E6546F',
        notes: '',
        restTimerSeconds: 120,
        sets: [
          { id: 'hs-204', type: 'normal', weightKg: 85, reps: 8, completed: true },
          { id: 'hs-205', type: 'normal', weightKg: 90, reps: 8, completed: true, isPR: true },
          { id: 'hs-206', type: 'normal', weightKg: 90, reps: 7, completed: true },
        ],
      },
      {
        id: 'hwe-22',
        exerciseId: 'A5AC6449',
        notes: '',
        restTimerSeconds: 75,
        sets: [
          { id: 'hs-207', type: 'normal', weightKg: 40, reps: 8, completed: true },
          { id: 'hs-208', type: 'normal', weightKg: 40, reps: 8, completed: true },
          { id: 'hs-209', type: 'normal', weightKg: 40, reps: 7, completed: true },
        ],
      },
    ],
  },
  {
    id: 'w-hist-3',
    title: 'Legs Heavy • Agachamento & Terra',
    date: 'Há 4 dias',
    durationSeconds: 4320,
    volumeKg: 12450,
    totalSets: 14,
    prCount: 2,
    notes: 'Dia de perna pesado! Levantamos o equivalente a um Caminhão Pesado 🚛',
    likes: 31,
    likedByMe: true,
    user: {
      username: 'iesus_candido',
      displayName: 'Iesus Candido',
      avatar: 'IC',
      isPro: true,
      gymName: 'Ironberg CT',
    },
    comments: [
      {
        id: 'c-3',
        username: 'amanda_strong',
        avatar: 'AS',
        text: '12.4 toneladas de volume em um treino! Sinistro!',
        createdAt: 'Há 4 dias',
      },
    ],
    exercises: [
      {
        id: 'hwe-30',
        exerciseId: 'D04AC939',
        notes: '',
        restTimerSeconds: 150,
        sets: [
          { id: 'hs-301', type: 'normal', weightKg: 115, reps: 8, completed: true },
          { id: 'hs-302', type: 'normal', weightKg: 125, reps: 5, completed: true, isPR: true },
          { id: 'hs-303', type: 'normal', weightKg: 125, reps: 5, completed: true },
        ],
      },
      {
        id: 'hwe-31',
        exerciseId: 'C6272009',
        notes: '',
        restTimerSeconds: 150,
        sets: [
          { id: 'hs-304', type: 'normal', weightKg: 140, reps: 6, completed: true },
          { id: 'hs-305', type: 'normal', weightKg: 160, reps: 5, completed: true, isPR: true },
        ],
      },
      {
        id: 'hwe-32',
        exerciseId: 'C7973E0E',
        notes: '',
        restTimerSeconds: 120,
        sets: [
          { id: 'hs-306', type: 'normal', weightKg: 280, reps: 10, completed: true },
          { id: 'hs-307', type: 'normal', weightKg: 300, reps: 10, completed: true },
          { id: 'hs-308', type: 'normal', weightKg: 300, reps: 10, completed: true },
        ],
      },
    ],
  },
  {
    id: 'w-community-1',
    title: 'Glutes & Posterior Power',
    date: 'Há 3 horas',
    durationSeconds: 3180,
    volumeKg: 6890,
    totalSets: 14,
    prCount: 2,
    notes: 'Elevação Pélvica com 140kg hoje! Sincronizado via Apple Watch Live Sync ⌚',
    likes: 42,
    likedByMe: false,
    user: {
      username: 'amanda_strong',
      displayName: 'Amanda Costa',
      avatar: 'AC',
      isPro: true,
      gymName: 'Smart Fit Paulista',
    },
    comments: [],
    exercises: [
      {
        id: 'cwe-1',
        exerciseId: 'D57C2EC7', // Elevação Pélvica (Barra)
        notes: '',
        restTimerSeconds: 120,
        sets: [
          { id: 'cs-1', type: 'normal', weightKg: 120, reps: 10, completed: true },
          { id: 'cs-2', type: 'normal', weightKg: 140, reps: 8, completed: true, isPR: true },
          { id: 'cs-3', type: 'normal', weightKg: 140, reps: 8, completed: true },
        ],
      },
      {
        id: 'cwe-2',
        exerciseId: 'B8127AD1', // Mesa Flexora
        notes: '',
        restTimerSeconds: 90,
        sets: [
          { id: 'cs-4', type: 'normal', weightKg: 50, reps: 12, completed: true },
          { id: 'cs-5', type: 'normal', weightKg: 55, reps: 10, completed: true, isPR: true },
        ],
      },
    ],
  },
];

export const INITIAL_MEASUREMENTS: BodyMeasurement[] = [
  { id: 'm-1', date: '01 Set', weightKg: 80.8, bodyFatPct: 14.8, chestCm: 104, armsCm: 39.5, waistCm: 82 },
  { id: 'm-2', date: '15 Set', weightKg: 81.2, bodyFatPct: 14.4, chestCm: 105, armsCm: 40.0, waistCm: 81.5 },
  { id: 'm-3', date: '01 Out', weightKg: 81.9, bodyFatPct: 14.0, chestCm: 106, armsCm: 40.4, waistCm: 81.0 },
  { id: 'm-4', date: '15 Out', weightKg: 82.4, bodyFatPct: 13.6, chestCm: 106.5, armsCm: 40.8, waistCm: 80.5 },
  { id: 'm-5', date: '27 Out', weightKg: 82.8, bodyFatPct: 13.2, chestCm: 107.2, armsCm: 41.2, waistCm: 80.0 },
];

export const INITIAL_COACH_MESSAGES: CoachMessage[] = [
  {
    id: 'cm-1',
    sender: 'coach',
    text: 'Fala Iesus! Analisei seu último treino Push A pelo Hevy Coach. Seu 1RM estimado no Supino Reto subiu para 120kg (+5kg neste mês)!',
    timestamp: '14:25',
  },
  {
    id: 'cm-2',
    sender: 'coach',
    text: 'Ajustei sua rotina Pull A para incluir 1 série extra na Puxada Alta e reduzi o descanso na Rosca Martelo para 60s. Como está a recuperação articular?',
    timestamp: '14:26',
  },
  {
    id: 'cm-3',
    sender: 'user',
    text: 'Zero dor no ombro! A calculadora de aquecimento ajudou muito antes das séries principais.',
    timestamp: '14:30',
  },
];
