import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Home,
  Dumbbell,
  Library,
  User,
  Calendar,
  Plus,
  Play,
  Check,
  Clock,
  Heart,
  MessageCircle,
  Share2,
  ChevronDown,
  ChevronUp,
  Trash2,
  Pencil,
  Disc,
  Volume2,
  Sun,
  Moon,
  FolderPlus,
  Download,
  Upload,
  FileSpreadsheet,
  Scale,
  Link2,
  Info,
  Edit3,
  Flame,
  TrendingUp,
  Cloud,
  LogOut,
  RotateCcw,
  GripVertical,
  MoreVertical,
  ShieldCheck,
  X,
} from 'lucide-react';
import exercisesRaw from './data/exercises.json';
import {
  Exercise,
  CompletedWorkout,
  Routine,
  WorkoutExercise,
  WorkoutSet,
  SetType,
  BodyMeasurement,
  UserProfile,
} from './types';
import {
  DEFAULT_REST_SECONDS,
  INITIAL_ROUTINES,
  INITIAL_WORKOUT_HISTORY,
  INITIAL_MEASUREMENTS,
  INITIAL_USER_PROFILE,
} from './data/initialData';
import {
  MUSCLE_LABELS,
  EQUIPMENT_LABELS,
  calculateExercisesVolume,
  calculateExercisesCompletedSets,
  computeMuscleDistributionFromExercises,
  getVolumeComparison,
  formatDuration,
  formatTimerMMSS,
} from './utils/fitness';
import {
  playHevySound,
  HevySoundName,
  TIMER_SOUND_OPTIONS,
} from './utils/sound';
import { useDragReorder, moveItem } from './hooks/useDragReorder';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import { TataganLogo } from './components/TataganLogo';
import { MuscleHeatmap } from './components/MuscleHeatmap';
import { PlateCalculatorModal } from './components/PlateCalculatorModal';
import { ExerciseDetailModal } from './components/ExerciseDetailModal';
import { ExercisePickerModal } from './components/ExercisePickerModal';
import { WorkoutSummaryModal } from './components/WorkoutSummaryModal';
import { AuthModal } from './components/AuthModal';

type NavTab = 'feed' | 'workout' | 'week' | 'exercises' | 'profile';

interface LiveWorkoutState {
  id: string;
  title: string;
  startTime: number;
  exercises: WorkoutExercise[];
}

const STORAGE_KEYS = {
  workouts: 'tatagan_workouts_v3',
  routines: 'tatagan_routines_v3',
  customExercises: 'tatagan_custom_exercises_v3',
  measurements: 'tatagan_measurements_v3',
  userProfile: 'tatagan_user_profile_v3',
  weekStartsOn: 'tatagan_week_starts_on_v3',
  activeWorkout: 'tatagan_active_workout_v3',
  timerSound: 'tatagan_timer_sound_v3',
  theme: 'tatagan_theme_v3',
  authSession: 'tatagan_auth_session_v3',
};

const SET_TYPE_CONFIG: Record<
  SetType,
  { badge: string; label: string; color: string; bg: string }
> = {
  normal: {
    badge: '1',
    label: 'Série Normal',
    color: 'var(--hevy-text)',
    bg: 'var(--hevy-elevated)',
  },
  warmup: {
    badge: 'W',
    label: 'Aquecimento (Warm-up)',
    color: 'var(--hevy-orange)',
    bg: 'var(--hevy-orange-soft)',
  },
  dropset: {
    badge: 'D',
    label: 'Drop Set',
    color: 'var(--hevy-purple)',
    bg: 'var(--hevy-purple-soft)',
  },
  failure: {
    badge: 'F',
    label: 'Até a Falha (Failure)',
    color: 'var(--hevy-red)',
    bg: 'var(--hevy-red-soft)',
  },
};

const SET_TYPE_ORDER: SetType[] = ['normal', 'warmup', 'dropset', 'failure'];

const MAJOR_MUSCLE_GROUPS: string[] = [
  'chest',
  'lats',
  'upper_back',
  'shoulders',
  'biceps',
  'triceps',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'abdominals',
];

const REST_PRESETS = [30, 60, 90, 120, 180];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('workout');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (
      (localStorage.getItem(STORAGE_KEYS.theme) as 'dark' | 'light') || 'dark'
    );
  });
  const [timerSound, setTimerSound] = useState<HevySoundName>(() => {
    return (
      (localStorage.getItem(STORAGE_KEYS.timerSound) as HevySoundName) ||
      'boxing_bell'
    );
  });

  // Week Start Preference: 0 = Domingo, 1 = Segunda-feira
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.weekStartsOn);
    return saved === '0' ? 0 : 1;
  });

  const [showAuthModal, setShowAuthModal] = useState(false);

  // User Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.userProfile);
    return saved ? JSON.parse(saved) : INITIAL_USER_PROFILE;
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [draftDisplayName, setDraftDisplayName] = useState(
    userProfile.displayName
  );
  const [draftUsername, setDraftUsername] = useState(userProfile.username);

  // Persistent Data (Workouts start at 0 / empty array)
  const [customExercises, setCustomExercises] = useState<Exercise[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.customExercises);
    return saved ? JSON.parse(saved) : [];
  });

  const [workouts, setWorkouts] = useState<CompletedWorkout[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.workouts);
    return saved ? JSON.parse(saved) : INITIAL_WORKOUT_HISTORY;
  });

  const [routines, setRoutines] = useState<Routine[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.routines);
    return saved ? JSON.parse(saved) : INITIAL_ROUTINES;
  });

  const [measurements, setMeasurements] = useState<BodyMeasurement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.measurements);
    return saved ? JSON.parse(saved) : INITIAL_MEASUREMENTS;
  });

  // Active Live Workout State
  const [activeWorkout, setActiveWorkout] = useState<LiveWorkoutState | null>(
    () => {
      const saved = localStorage.getItem(STORAGE_KEYS.activeWorkout);
      return saved ? JSON.parse(saved) : null;
    }
  );
  const [workoutSheetExpanded, setWorkoutSheetExpanded] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Rest Timer & Passive Notification States (Melhoria 1)
  const [restRemaining, setRestRemaining] = useState<number>(0);
  const [restTotal, setRestTotal] = useState<number>(DEFAULT_REST_SECONDS);
  const [restSuggestionToast, setRestSuggestionToast] = useState<{
    exerciseTitle: string;
    restText: string;
    id: number;
  } | null>(null);

  // Active workout feedback toast & exercise menu (Melhoria 2)
  const [workoutFeedbackToast, setWorkoutFeedbackToast] = useState<string | null>(null);
  const [activeExerciseMenuId, setActiveExerciseMenuId] = useState<string | null>(null);

  // Modals State
  const [inspectExercise, setInspectExercise] = useState<Exercise | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'active' | 'routine' | null>(
    null
  );
  const [plateCalcTarget, setPlateCalcTarget] = useState<{
    exerciseInstanceId: string;
    initialWeight: number;
  } | null>(null);
  const [completedSummary, setCompletedSummary] =
    useState<CompletedWorkout | null>(null);

  // Routine Builder / Editor Modal State
  const [buildingRoutine, setBuildingRoutine] = useState<Routine | null>(null);
  const [isEditingExistingRoutine, setIsEditingExistingRoutine] =
    useState<boolean>(false);

  // Routine Drag & Drop Reordering Hook (Pointer-based, mobile touch + desktop mouse)
  const routineScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const routineExerciseIds = useMemo(
    () => buildingRoutine?.exercises.map((e) => e.id) || [],
    [buildingRoutine?.exercises]
  );
  const handleMoveRoutineExercise = useCallback(
    (fromIndex: number, toIndex: number) => {
      setBuildingRoutine((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          exercises: moveItem(prev.exercises, fromIndex, toIndex),
        };
      });
    },
    []
  );
  const {
    draggingId: routineDraggingId,
    registerItem: registerRoutineItem,
    getHandleProps: getRoutineHandleProps,
  } = useDragReorder(
    routineExerciseIds,
    handleMoveRoutineExercise,
    routineScrollContainerRef
  );

  // CSV File Input Ref
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  // Exercise Catalog Search State (Exercises Tab)
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogMuscle, setCatalogMuscle] = useState('all');
  const [catalogEquipment, setCatalogEquipment] = useState('all');

  // Feed Comment Input State
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {}
  );

  // Body Measurement Quick Input
  const [newWeightKg, setNewWeightKg] = useState('');
  const [newBodyFat, setNewBodyFat] = useState('');

  // Combine 434 official exercises + user custom exercises
  const allExercises = useMemo<Exercise[]>(() => {
    return [...customExercises, ...(exercisesRaw as Exercise[])];
  }, [customExercises]);

  const exerciseMap = useMemo<Record<string, Exercise>>(() => {
    const map: Record<string, Exercise> = {};
    allExercises.forEach((ex: Exercise) => {
      map[ex.id] = ex;
    });
    return map;
  }, [allExercises]);

  // Persist to LocalStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.timerSound, timerSound);
  }, [timerSound]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.weekStartsOn, String(weekStartsOn));
  }, [weekStartsOn]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.userProfile, JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.workouts, JSON.stringify(workouts));
  }, [workouts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.routines, JSON.stringify(routines));
  }, [routines]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.customExercises,
      JSON.stringify(customExercises)
    );
  }, [customExercises]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.measurements,
      JSON.stringify(measurements)
    );
  }, [measurements]);

  useEffect(() => {
    if (activeWorkout) {
      localStorage.setItem(
        STORAGE_KEYS.activeWorkout,
        JSON.stringify(activeWorkout)
      );
    } else {
      localStorage.removeItem(STORAGE_KEYS.activeWorkout);
    }
  }, [activeWorkout]);

  // ==================== SUPABASE REALTIME CLOUD SYNC ====================
  const {
    configured: isCloudConfigured,
    user: authUser,
    status: syncStatus,
    lastSyncedAt,
    signIn: handleSupabaseLogin,
    signUp: handleSupabaseRegister,
    signOut: handleSupabaseLogout,
    requestPasswordReset: handleSupabaseResetPassword,
    syncNow: handleForceSync,
  } = useSupabaseSync({
    state: {
      routines,
      workouts,
      customExercises,
      measurements,
      settings: {
        userProfile,
        weekStartsOn,
        timerSound,
        theme,
      },
    },
    seedState: {
      routines: INITIAL_ROUTINES,
      workouts: INITIAL_WORKOUT_HISTORY,
      customExercises: [],
      measurements: INITIAL_MEASUREMENTS,
      settings: {
        userProfile: INITIAL_USER_PROFILE,
        weekStartsOn: 1,
        timerSound: 'boxing_bell',
        theme: 'dark',
      },
    },
    applyRemoteState: useCallback((next) => {
      setRoutines(next.routines);
      setWorkouts(next.workouts);
      setCustomExercises(next.customExercises);
      setMeasurements(next.measurements);
      if (next.settings) {
        if (next.settings.userProfile) setUserProfile(next.settings.userProfile);
        if (next.settings.weekStartsOn !== undefined)
          setWeekStartsOn(next.settings.weekStartsOn);
        if (next.settings.timerSound) setTimerSound(next.settings.timerSound);
        if (next.settings.theme) setTheme(next.settings.theme);
      }
    }, []),
    resetLocalData: useCallback(() => {
      setRoutines(INITIAL_ROUTINES);
      setWorkouts(INITIAL_WORKOUT_HISTORY);
      setCustomExercises([]);
      setMeasurements(INITIAL_MEASUREMENTS);
      setUserProfile(INITIAL_USER_PROFILE);
      setWeekStartsOn(1);
      setTimerSound('boxing_bell');
    }, []),
  });

  // Live Workout Elapsed Timer
  useEffect(() => {
    if (!activeWorkout) {
      setElapsedSeconds(0);
      return;
    }
    const updateElapsed = () => {
      const diff = Math.max(
        0,
        Math.floor((Date.now() - activeWorkout.startTime) / 1000)
      );
      setElapsedSeconds(diff);
    };
    updateElapsed();
    const interval = window.setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout]);

  // Helper to format suggested rest time (e.g. "1 minuto", "1:30 min", "45s")
  const formatSuggestedRest = (seconds: number): string => {
    if (seconds <= 0) return 'Livre';
    if (seconds < 60) return `${seconds}s`;
    if (seconds === 60) return '1 minuto';
    if (seconds % 60 === 0) return `${seconds / 60} minutos`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')} min`;
  };

  // Helper to get user initials
  const getUserInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'TT';
  };

  // Helper to get previous best/recent weight & reps for an exercise
  const getPreviousSetReference = (
    exerciseId: string,
    setIndex: number
  ): string => {
    for (const w of workouts) {
      const found = w.exercises.find(
        (e: WorkoutExercise) => e.exerciseId === exerciseId
      );
      if (found && found.sets[setIndex] && found.sets[setIndex].completed) {
        const s = found.sets[setIndex];
        return `${s.weightKg ?? 0}kg × ${s.reps ?? 0}`;
      }
    }
    return '—';
  };

  // Start an empty workout or from a routine
  const startWorkout = (routine?: Routine) => {
    const clonedExercises: WorkoutExercise[] = routine
      ? routine.exercises.map((re: WorkoutExercise, idx: number) => ({
          ...re,
          id: `live-ex-${Date.now()}-${idx}`,
          restTimerSeconds: re.restTimerSeconds || DEFAULT_REST_SECONDS,
          sets: re.sets.map((s: WorkoutSet, sIdx: number) => ({
            ...s,
            id: `live-set-${Date.now()}-${idx}-${sIdx}`,
            completed: false,
          })),
        }))
      : [];

    const session: LiveWorkoutState = {
      id: `session-${Date.now()}`,
      title: routine ? routine.title : 'Treino Livre Tatagan.sh',
      startTime: Date.now(),
      exercises: clonedExercises,
    };
    setActiveWorkout(session);
    setWorkoutSheetExpanded(true);
    setRestTotal(DEFAULT_REST_SECONDS);
    playHevySound('set_complete_low');
  };

  const addExerciseToActiveWorkout = (exercise: Exercise) => {
    const defaultSets: WorkoutSet[] = [
      {
        id: `set-${Date.now()}-1`,
        type: 'normal',
        weightKg: 40,
        reps: 10,
        rpe: 8,
        completed: false,
      },
      {
        id: `set-${Date.now()}-2`,
        type: 'normal',
        weightKg: 40,
        reps: 10,
        rpe: 8.5,
        completed: false,
      },
      {
        id: `set-${Date.now()}-3`,
        type: 'normal',
        weightKg: 40,
        reps: 10,
        rpe: 9,
        completed: false,
      },
    ];

    const newEntry: WorkoutExercise = {
      id: `live-ex-${Date.now()}`,
      exerciseId: exercise.id,
      notes: '',
      restTimerSeconds: DEFAULT_REST_SECONDS, // Default 60s (01:00)
      supersetGroup: null,
      sets: defaultSets,
    };

    if (!activeWorkout) {
      setActiveWorkout({
        id: `session-${Date.now()}`,
        title: `Treino de ${MUSCLE_LABELS[exercise.muscle_group] || 'Força'}`,
        startTime: Date.now(),
        exercises: [newEntry],
      });
      setWorkoutSheetExpanded(true);
      return;
    }

    setActiveWorkout({
      ...activeWorkout,
      exercises: [...activeWorkout.exercises, newEntry],
    });
  };

  const updateSetField = (
    exerciseInstanceId: string,
    setId: string,
    updater: (s: WorkoutSet) => WorkoutSet
  ) => {
    if (!activeWorkout) return;
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex: WorkoutExercise) => {
        if (ex.id !== exerciseInstanceId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s: WorkoutSet) => (s.id === setId ? updater(s) : s)),
        };
      }),
    });
  };

  const handleToggleSetComplete = (
    exInstance: WorkoutExercise,
    setItem: WorkoutSet
  ) => {
    const nextCompleted = !setItem.completed;
    updateSetField(exInstance.id, setItem.id, (s) => ({
      ...s,
      completed: nextCompleted,
    }));

    if (nextCompleted) {
      let historicalMax = 0;
      workouts.forEach((w: CompletedWorkout) => {
        w.exercises.forEach((we: WorkoutExercise) => {
          if (we.exerciseId === exInstance.exerciseId) {
            we.sets.forEach((oldSet: WorkoutSet) => {
              if (oldSet.completed && (oldSet.weightKg || 0) > historicalMax) {
                historicalMax = oldSet.weightKg || 0;
              }
            });
          }
        });
      });

      if ((setItem.weightKg || 0) > historicalMax && (setItem.weightKg || 0) > 0) {
        playHevySound('livepr_normal');
      } else {
        playHevySound('set_complete_high');
      }

      // Notificação passiva de descanso planejado (sem cronômetro regressivo intrusivo)
      const targetRest = exInstance.restTimerSeconds || DEFAULT_REST_SECONDS;
      const meta = exerciseMap[exInstance.exerciseId];
      const toastId = Date.now();
      setRestSuggestionToast({
        exerciseTitle: meta?.title || 'Exercício',
        restText: formatSuggestedRest(targetRest),
        id: toastId,
      });

      // Desaparece sozinho após 4.5 segundos sem exigir clique nem interromper navegação
      setTimeout(() => {
        setRestSuggestionToast((curr) => (curr?.id === toastId ? null : curr));
      }, 4500);
    }
  };

  // Melhoria 2: Exclusão de Exercício Restrita à Sessão de Treino Ativa (Desvinculada do Template)
  const handleRemoveExerciseFromActiveSession = (exInstance: WorkoutExercise) => {
    if (!activeWorkout) return;
    const meta = exerciseMap[exInstance.exerciseId];
    const exName = meta?.title || 'Exercício';

    // Remove exclusivamente da sessão em andamento (activeWorkout).
    // A Rotina Padrão (Template) salva no banco de dados e no state routines NÃO sofre nenhuma alteração!
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.filter((item) => item.id !== exInstance.id),
    });

    // Feedback visual imediato reforçando que a rotina padrão não foi alterada
    setWorkoutFeedbackToast(
      `"${exName}" removido desta sessão. Sua rotina padrão não foi alterada.`
    );

    setTimeout(() => {
      setWorkoutFeedbackToast((curr) =>
        curr?.includes(exName) ? null : curr
      );
    }, 4000);
  };

  const handleCycleSetType = (exerciseInstanceId: string, setItem: WorkoutSet) => {
    const idx = SET_TYPE_ORDER.indexOf(setItem.type);
    const nextType = SET_TYPE_ORDER[(idx + 1) % SET_TYPE_ORDER.length];
    updateSetField(exerciseInstanceId, setItem.id, (s) => ({
      ...s,
      type: nextType,
    }));
  };

  const handleAddSet = (exerciseInstanceId: string) => {
    if (!activeWorkout) return;
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex: WorkoutExercise) => {
        if (ex.id !== exerciseInstanceId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet: WorkoutSet = {
          id: `set-${Date.now()}-${ex.sets.length + 1}`,
          type: 'normal',
          weightKg: lastSet ? lastSet.weightKg : 40,
          reps: lastSet ? lastSet.reps : 10,
          rpe: lastSet ? lastSet.rpe : 8,
          completed: false,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      }),
    });
  };

  const handleRemoveSet = (exerciseInstanceId: string, setId: string) => {
    if (!activeWorkout) return;
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex: WorkoutExercise) => {
        if (ex.id !== exerciseInstanceId) return ex;
        return {
          ...ex,
          sets: ex.sets.filter((s: WorkoutSet) => s.id !== setId),
        };
      }),
    });
  };

  const handleInjectWarmupSets = (
    exerciseInstanceId: string,
    warmups: { weightKg: number; reps: number }[]
  ) => {
    if (!activeWorkout) return;
    setActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex: WorkoutExercise) => {
        if (ex.id !== exerciseInstanceId) return ex;
        const warmupSetObjects: WorkoutSet[] = warmups.map((w, idx) => ({
          id: `warmup-${Date.now()}-${idx}`,
          type: 'warmup',
          weightKg: w.weightKg,
          reps: w.reps,
          rpe: 6,
          completed: false,
        }));
        return {
          ...ex,
          sets: [...warmupSetObjects, ...ex.sets],
        };
      }),
    });
  };

  const handleFinishWorkout = () => {
    if (!activeWorkout) return;
    const completedSetsCount = calculateExercisesCompletedSets(
      activeWorkout.exercises
    );
    if (completedSetsCount === 0) {
      alert(
        'Marque pelo menos 1 série como concluída (✓) antes de finalizar o treino!'
      );
      return;
    }

    let prs = 0;
    activeWorkout.exercises.forEach((ex: WorkoutExercise) => {
      let bestPrev = 0;
      workouts.forEach((w: CompletedWorkout) => {
        w.exercises.forEach((we: WorkoutExercise) => {
          if (we.exerciseId === ex.exerciseId) {
            we.sets.forEach((s: WorkoutSet) => {
              if (s.completed && (s.weightKg || 0) > bestPrev) {
                bestPrev = s.weightKg || 0;
              }
            });
          }
        });
      });
      const sessionMax = Math.max(
        0,
        ...ex.sets
          .filter((s: WorkoutSet) => s.completed)
          .map((s: WorkoutSet) => s.weightKg || 0)
      );
      if (sessionMax > bestPrev && sessionMax > 0) {
        prs += 1;
      }
    });

    const now = Date.now();
    const formattedDate = new Date(now).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    const totalVolume = calculateExercisesVolume(activeWorkout.exercises);
    const finalized: CompletedWorkout = {
      id: activeWorkout.id,
      title: activeWorkout.title,
      date: formattedDate,
      timestamp: now,
      durationSeconds: Math.max(60, elapsedSeconds),
      volumeKg: totalVolume,
      totalSets: completedSetsCount,
      prCount: prs,
      likes: 0,
      likedByMe: false,
      comments: [],
      user: {
        username: userProfile.username,
        displayName: userProfile.displayName,
        avatar: getUserInitials(userProfile.displayName),
        isPro: true,
        gymName: 'Tatagan.sh',
      },
      exercises: activeWorkout.exercises,
    };

    setWorkouts([finalized, ...workouts]);
    setActiveWorkout(null);
    setRestRemaining(0);
    setRestTotal(DEFAULT_REST_SECONDS);
    setCompletedSummary(finalized);
    setActiveTab('feed');
  };

  // Delete a workout post from history
  const handleDeleteWorkoutPost = (workoutId: string) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
  };

  // Open Routine Modal in Edit Mode (deep clone so cancel doesn't mutate)
  const handleOpenEditRoutine = (routine: Routine) => {
    const cloned: Routine = JSON.parse(JSON.stringify(routine));
    // Ensure every exercise has restTimerSeconds (defaulting to 60s)
    cloned.exercises = cloned.exercises.map((ex) => ({
      ...ex,
      restTimerSeconds: ex.restTimerSeconds || DEFAULT_REST_SECONDS,
    }));
    setIsEditingExistingRoutine(true);
    setBuildingRoutine(cloned);
  };

  // Open Routine Modal in Create Mode
  const handleOpenCreateRoutine = () => {
    setIsEditingExistingRoutine(false);
    setBuildingRoutine({
      id: `routine-${Date.now()}`,
      title: 'Nova Rotina Hipertrofia',
      folderId: 'folder-ppl',
      notes: '',
      lastPerformed: 'Criada no Tatagan.sh',
      exercises: [],
    });
  };

  // Save Routine (either updates existing routine in-place preserving `id`, or adds new routine)
  const handleSaveBuildingRoutine = () => {
    if (!buildingRoutine) return;
    if (!buildingRoutine.title.trim()) {
      alert('Informe um nome para a rotina!');
      return;
    }
    if (buildingRoutine.exercises.length === 0) {
      alert('Adicione pelo menos 1 exercício à rotina!');
      return;
    }

    if (isEditingExistingRoutine) {
      setRoutines((prev) =>
        prev.map((r) => (r.id === buildingRoutine.id ? buildingRoutine : r))
      );
    } else {
      setRoutines((prev) => [buildingRoutine, ...prev]);
    }

    setBuildingRoutine(null);
    setIsEditingExistingRoutine(false);
  };

  // ==================== CSV TEMPLATE DOWNLOAD (BUTTON A) & IMPORT (BUTTON B) ====================
  const handleDownloadCsvTemplate = () => {
    const csvRows = [
      'nome_rotina;exercicio;tipo_serie;peso_kg;repeticoes;descanso_seg;notas',
      'Treino A - Superior;Supino Reto (Barra);warmup;40;12;60;Aquecimento articular controlado',
      'Treino A - Superior;Supino Reto (Barra);normal;80;10;60;Série principal',
      'Treino A - Superior;Supino Reto (Barra);normal;85;8;60;Progressão de carga',
      'Treino A - Superior;Puxada Alta (Cabo);normal;65;10;60;Pegada aberta pronada',
      'Treino A - Superior;Puxada Alta (Cabo);normal;70;8;60;Segurar 1s na contração',
      'Treino A - Superior;Desenvolvimento (Halter);normal;24;10;60;Core firme',
      'Treino A - Superior;Elevação Lateral (Halter);dropset;12;15;60;Até a falha técnica',
    ];
    const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo_rotina_tatagan.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsvFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = String(e.target?.result || '');
      const lines = content
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        alert(
          'A planilha está vazia ou não possui linhas de exercícios preenchidas.'
        );
        return;
      }

      const headerLine = lines[0];
      const delimiter =
        headerLine.split(';').length >= headerLine.split(',').length ? ';' : ',';

      const parseRow = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            inQuotes = !inQuotes;
          } else if (ch === delimiter && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += ch;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseRow(headerLine).map((h) =>
        h
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9_]/g, '')
      );

      const idxRoutine = headers.findIndex(
        (h) => h.includes('rotina') || h.includes('routine') || h.includes('treino')
      );
      const idxExercise = headers.findIndex(
        (h) => h.includes('exercicio') || h.includes('exercise')
      );
      const idxType = headers.findIndex(
        (h) => h.includes('tipo') || h.includes('type')
      );
      const idxWeight = headers.findIndex(
        (h) => h.includes('peso') || h.includes('weight') || h.includes('kg')
      );
      const idxReps = headers.findIndex(
        (h) => h.includes('rep') || h.includes('repeticoes')
      );
      const idxRest = headers.findIndex(
        (h) => h.includes('descanso') || h.includes('rest') || h.includes('seg')
      );
      const idxNotes = headers.findIndex(
        (h) => h.includes('nota') || h.includes('obs') || h.includes('note')
      );

      const normalizeText = (s: string) =>
        s
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();

      const routinesMap = new Map<string, Map<string, WorkoutExercise>>();
      const newlyCreatedExercises: Exercise[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseRow(lines[i]);
        const routineTitle =
          (idxRoutine >= 0 ? cols[idxRoutine] : cols[0])?.trim() ||
          `Rotina Importada CSV`;
        const exerciseName = (
          idxExercise >= 0 ? cols[idxExercise] : cols[1]
        )?.trim();
        if (!exerciseName) continue;

        const rawType = normalizeText(
          (idxType >= 0 ? cols[idxType] : cols[2]) || 'normal'
        );
        let setType: SetType = 'normal';
        if (rawType.startsWith('w') || rawType.includes('aquec')) {
          setType = 'warmup';
        } else if (rawType.startsWith('d') || rawType.includes('drop')) {
          setType = 'dropset';
        } else if (rawType.startsWith('f') || rawType.includes('falha')) {
          setType = 'failure';
        }

        const rawWeight = (idxWeight >= 0 ? cols[idxWeight] : cols[3]) || '0';
        const weightKg = parseFloat(rawWeight.replace(',', '.')) || 0;
        const rawReps = (idxReps >= 0 ? cols[idxReps] : cols[4]) || '10';
        const reps = parseInt(rawReps, 10) || 10;
        const rawRest = (idxRest >= 0 ? cols[idxRest] : cols[5]) || '';
        const restSeconds =
          parseInt(rawRest, 10) > 0
            ? parseInt(rawRest, 10)
            : DEFAULT_REST_SECONDS; // Defaults to 60s (01:00)
        const notes = (idxNotes >= 0 ? cols[idxNotes] : cols[6]) || '';

        const targetNorm = normalizeText(exerciseName);
        let matchedExercise =
          allExercises.find(
            (ex) =>
              normalizeText(ex.title) === targetNorm ||
              normalizeText(ex.title_en) === targetNorm ||
              ex.id.toLowerCase() === targetNorm
          ) ||
          allExercises.find(
            (ex) =>
              normalizeText(ex.title).includes(targetNorm) ||
              targetNorm.includes(normalizeText(ex.title))
          ) ||
          newlyCreatedExercises.find(
            (ex) => normalizeText(ex.title) === targetNorm
          );

        if (!matchedExercise) {
          matchedExercise = {
            id: `csv-custom-${Date.now()}-${i}`,
            title: exerciseName,
            title_en: exerciseName,
            priority: 5,
            muscle_group: 'full_body',
            exercise_type: 'weight_reps',
            equipment: 'other',
            video_url: null,
            thumbnail_url: null,
            instructions: '1. Exercício importado via planilha CSV no Tatagan.sh.',
          };
          newlyCreatedExercises.push(matchedExercise);
        }

        if (!routinesMap.has(routineTitle)) {
          routinesMap.set(routineTitle, new Map());
        }
        const exGroup = routinesMap.get(routineTitle)!;

        if (!exGroup.has(matchedExercise.id)) {
          exGroup.set(matchedExercise.id, {
            id: `csv-we-${Date.now()}-${i}`,
            exerciseId: matchedExercise.id,
            notes,
            restTimerSeconds: restSeconds,
            supersetGroup: null,
            sets: [],
          });
        }

        const we = exGroup.get(matchedExercise.id)!;
        if (notes && !we.notes) {
          we.notes = notes;
        }
        we.sets.push({
          id: `csv-set-${Date.now()}-${i}-${we.sets.length}`,
          type: setType,
          weightKg,
          reps,
          completed: false,
        });
      }

      if (newlyCreatedExercises.length > 0) {
        setCustomExercises((prev) => [...newlyCreatedExercises, ...prev]);
      }

      const importedRoutines: Routine[] = [];
      routinesMap.forEach((exGroup, title) => {
        const exList = Array.from(exGroup.values());
        if (exList.length > 0) {
          importedRoutines.push({
            id: `routine-csv-${Date.now()}-${importedRoutines.length}`,
            title,
            folderId: 'folder-csv',
            lastPerformed: 'Importada via CSV',
            exercises: exList,
          });
        }
      });

      if (importedRoutines.length === 0) {
        alert('Nenhuma rotina válida pôde ser lida do arquivo CSV.');
        return;
      }

      setRoutines((prev) => [...importedRoutines, ...prev]);
      alert(
        `✅ ${importedRoutines.length} rotina(s) importada(s) com sucesso para o Tatagan.sh!`
      );
    };

    reader.readAsText(file, 'utf-8');
    event.target.value = '';
  };

  // Filtered Exercises for the Exercises Tab
  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return allExercises.filter((ex: Exercise) => {
      if (catalogMuscle !== 'all' && ex.muscle_group !== catalogMuscle)
        return false;
      if (catalogEquipment !== 'all' && ex.equipment !== catalogEquipment)
        return false;
      if (!q) return true;
      return (
        ex.title.toLowerCase().includes(q) ||
        ex.title_en.toLowerCase().includes(q) ||
        (MUSCLE_LABELS[ex.muscle_group] || '').toLowerCase().includes(q)
      );
    });
  }, [allExercises, catalogSearch, catalogMuscle, catalogEquipment]);

  // Factual Lifetime Profile Statistics (Starts at 0!)
  const lifetimeStats = useMemo(() => {
    const totalVolume = workouts.reduce(
      (acc: number, w: CompletedWorkout) =>
        acc + (w.volumeKg || calculateExercisesVolume(w.exercises)),
      0
    );
    const totalSets = workouts.reduce(
      (acc: number, w: CompletedWorkout) =>
        acc + (w.totalSets || calculateExercisesCompletedSets(w.exercises)),
      0
    );
    const allWorkoutExercises = workouts.flatMap(
      (w: CompletedWorkout) => w.exercises
    );
    const muscleCounts = computeMuscleDistributionFromExercises(
      allWorkoutExercises,
      exerciseMap
    );
    const equivalence =
      totalVolume > 0 ? getVolumeComparison(totalVolume) : null;
    return {
      totalVolume,
      totalSets,
      muscleCounts,
      equivalence,
    };
  }, [workouts, exerciseMap]);

  // ==================== WEEK TAB ANALYTICS ====================
  const weeklyReport = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const diffToStart = (currentDay - weekStartsOn + 7) % 7;

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diffToStart);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weekWorkouts = workouts.filter((w) => {
      const ts = w.timestamp || 0;
      return ts >= startOfWeek.getTime() && ts <= endOfWeek.getTime();
    });

    const weekVolume = weekWorkouts.reduce(
      (acc, w) => acc + (w.volumeKg || calculateExercisesVolume(w.exercises)),
      0
    );
    const weekSets = weekWorkouts.reduce(
      (acc, w) =>
        acc + (w.totalSets || calculateExercisesCompletedSets(w.exercises)),
      0
    );
    const weekDuration = weekWorkouts.reduce(
      (acc, w) => acc + w.durationSeconds,
      0
    );
    const weekPRs = weekWorkouts.reduce((acc, w) => acc + w.prCount, 0);

    const weekExercises = weekWorkouts.flatMap((w) => w.exercises);
    const weekMuscleCounts = computeMuscleDistributionFromExercises(
      weekExercises,
      exerciseMap
    );

    const weekMuscleVolume: Record<string, number> = {};
    weekExercises.forEach((ex) => {
      const meta = exerciseMap[ex.exerciseId];
      if (!meta) return;
      const m = meta.muscle_group;
      const v = ex.sets.reduce(
        (sAcc, s) =>
          s.completed ? sAcc + (s.weightKg || 0) * (s.reps || 0) : sAcc,
        0
      );
      weekMuscleVolume[m] = (weekMuscleVolume[m] || 0) + v;
    });

    const dayLabelsSun = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const dayWorkouts = weekWorkouts.filter(
        (w) =>
          (w.timestamp || 0) >= dayStart.getTime() &&
          (w.timestamp || 0) <= dayEnd.getTime()
      );
      const dayVol = dayWorkouts.reduce(
        (acc, w) => acc + (w.volumeKg || calculateExercisesVolume(w.exercises)),
        0
      );
      const isToday = d.toDateString() === now.toDateString();

      return {
        label: dayLabelsSun[d.getDay()],
        dateNum: d.getDate(),
        workoutsCount: dayWorkouts.length,
        volumeKg: dayVol,
        isToday,
      };
    });

    const untrainedMuscles = MAJOR_MUSCLE_GROUPS.filter(
      (m) => !weekMuscleCounts[m] || weekMuscleCounts[m] === 0
    );

    const rangeLabel = `${startOfWeek.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    })} — ${endOfWeek.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    })}`;

    return {
      rangeLabel,
      weekWorkouts,
      weekVolume,
      weekSets,
      weekDuration,
      weekPRs,
      weekMuscleCounts,
      weekMuscleVolume,
      days,
      untrainedMuscles,
      equivalence: weekVolume > 0 ? getVolumeComparison(weekVolume) : null,
    };
  }, [workouts, weekStartsOn, exerciseMap]);

  return (
    <div className="hevy-viewport-wrapper">
      <div className="hevy-mobile-shell">
        {/* TOP HEADER */}
        <header className="hevy-header">
          <TataganLogo theme={theme} size={25} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {/* Sound Selector */}
            <button
              type="button"
              onClick={() => {
                const idx = TIMER_SOUND_OPTIONS.findIndex(
                  (o) => o.id === timerSound
                );
                const next =
                  TIMER_SOUND_OPTIONS[(idx + 1) % TIMER_SOUND_OPTIONS.length];
                setTimerSound(next.id);
                playHevySound(next.id);
              }}
              title="Trocar som do Timer Tatagan.sh"
              style={{
                border: '1px solid var(--hevy-border)',
                background: 'var(--hevy-elevated)',
                color: 'var(--hevy-text-secondary)',
                borderRadius: 8,
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Volume2 size={16} />
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title="Alternar tema Escuro OLED / Claro"
              style={{
                border: '1px solid var(--hevy-border)',
                background: 'var(--hevy-elevated)',
                color: 'var(--hevy-text-secondary)',
                borderRadius: 8,
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* MAIN SCROLLABLE VIEWPORT */}
        <main className="hevy-scroll-area">
          {/* ==================== TAB 1: INÍCIO (HISTÓRICO DE POSTS DO USUÁRIO) ==================== */}
          {activeTab === 'feed' && (
            <div
              style={{
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div
                className="hevy-card"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(0,140,255,0.18) 0%, rgba(28,28,30,0.95) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--hevy-blue)',
                      textTransform: 'uppercase',
                    }}
                  >
                    MEU HISTÓRICO • TATAGAN.SH
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                    {workouts.length}{' '}
                    {workouts.length === 1
                      ? 'treino realizado'
                      : 'treinos realizados'}{' '}
                    • {lifetimeStats.totalVolume.toLocaleString('pt-BR')} kg
                  </div>
                </div>
                <button
                  type="button"
                  className="hevy-btn-primary"
                  style={{ padding: '8px 12px', fontSize: 12 }}
                  onClick={() => startWorkout()}
                >
                  <Plus size={15} /> Treinar
                </button>
              </div>

              {workouts.length === 0 ? (
                <div
                  className="hevy-card"
                  style={{
                    padding: '32px 18px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      backgroundColor: 'var(--hevy-blue-soft)',
                      color: 'var(--hevy-blue)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Dumbbell size={26} />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700 }}>
                    Seu histórico está zerado
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--hevy-text-secondary)',
                      maxWidth: 300,
                      lineHeight: 1.5,
                    }}
                  >
                    Cada treino que você finalizar no <strong>Tatagan.sh</strong>{' '}
                    será publicado aqui em formato de post com mapa muscular,
                    volume e recordes.
                  </p>
                  <button
                    type="button"
                    className="hevy-btn-primary"
                    style={{ marginTop: 4 }}
                    onClick={() => setActiveTab('workout')}
                  >
                    <Play size={15} /> Iniciar Meu Primeiro Treino
                  </button>
                </div>
              ) : (
                workouts.map((w: CompletedWorkout) => {
                  const vol =
                    w.volumeKg || calculateExercisesVolume(w.exercises);
                  const setsCount =
                    w.totalSets || calculateExercisesCompletedSets(w.exercises);
                  const workoutMuscles = computeMuscleDistributionFromExercises(
                    w.exercises,
                    exerciseMap
                  );
                  const eq = vol > 0 ? getVolumeComparison(vol) : null;

                  return (
                    <article
                      key={w.id}
                      className="hevy-card"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      {/* Post Header with Author, Repeat & Trash Delete Icon */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              background:
                                'linear-gradient(135deg, #008CFF, #0051A8)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 14,
                              color: '#FFF',
                            }}
                          >
                            {getUserInitials(userProfile.displayName)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>
                              {userProfile.displayName}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: 'var(--hevy-text-muted)',
                              }}
                            >
                              @{userProfile.username} • {w.date}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <button
                            type="button"
                            className="hevy-btn-secondary"
                            style={{ padding: '6px 10px', fontSize: 11 }}
                            onClick={() =>
                              startWorkout({
                                id: `from-feed-${w.id}`,
                                title: w.title,
                                folderId: 'folder-ppl',
                                exercises: w.exercises,
                              })
                            }
                          >
                            <Play size={12} /> Repetir
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteWorkoutPost(w.id)}
                            title="Excluir post do histórico"
                            style={{
                              background: 'var(--hevy-red-soft)',
                              color: 'var(--hevy-red)',
                              border: '1px solid rgba(255, 75, 75, 0.28)',
                              borderRadius: 8,
                              width: 32,
                              height: 32,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Workout Title & Metrics */}
                      <div>
                        <h3 style={{ fontSize: 17, fontWeight: 700 }}>
                          {w.title}
                        </h3>
                        {w.notes && (
                          <p
                            style={{
                              fontSize: 13,
                              color: 'var(--hevy-text-secondary)',
                              marginTop: 4,
                            }}
                          >
                            {w.notes}
                          </p>
                        )}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 8,
                            marginTop: 10,
                            padding: '10px 12px',
                            borderRadius: 10,
                            backgroundColor: 'var(--hevy-elevated)',
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 10,
                                color: 'var(--hevy-text-muted)',
                                fontWeight: 600,
                              }}
                            >
                              TEMPO
                            </div>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                marginTop: 2,
                              }}
                            >
                              {formatDuration(w.durationSeconds)}
                            </div>
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: 10,
                                color: 'var(--hevy-text-muted)',
                                fontWeight: 600,
                              }}
                            >
                              VOLUME ({setsCount} séries)
                            </div>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: 'var(--hevy-blue)',
                                marginTop: 2,
                              }}
                            >
                              {vol.toLocaleString('pt-BR')} kg
                            </div>
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: 10,
                                color: 'var(--hevy-text-muted)',
                                fontWeight: 600,
                              }}
                            >
                              RECORDES
                            </div>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: 'var(--hevy-gold)',
                                marginTop: 2,
                              }}
                            >
                              🏆 {w.prCount} PRs
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Exercise Summary List */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        {w.exercises.map((we: WorkoutExercise) => {
                          const meta = exerciseMap[we.exerciseId];
                          if (!meta) return null;
                          const completedSets = we.sets.filter(
                            (s: WorkoutSet) => s.completed
                          );
                          const bestSet = completedSets.reduce(
                            (best: WorkoutSet | undefined, cur: WorkoutSet) =>
                              (cur.weightKg || 0) > (best?.weightKg || 0)
                                ? cur
                                : best,
                            completedSets[0]
                          );
                          return (
                            <div
                              key={we.id}
                              onClick={() => setInspectExercise(meta)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                                cursor: 'pointer',
                                padding: '4px 0',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  minWidth: 0,
                                }}
                              >
                                {meta.thumbnail_url ? (
                                  <img
                                    src={meta.thumbnail_url}
                                    alt={meta.title}
                                    style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: 8,
                                      objectFit: 'cover',
                                      backgroundColor: '#FFF',
                                      flexShrink: 0,
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: 8,
                                      backgroundColor: 'var(--hevy-elevated)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 700,
                                      fontSize: 12,
                                    }}
                                  >
                                    {completedSets.length}x
                                  </div>
                                )}
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {completedSets.length} séries • {meta.title}
                                </span>
                              </div>
                              {bestSet && (
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: 'var(--hevy-text-secondary)',
                                    flexShrink: 0,
                                  }}
                                >
                                  Melhor: {bestSet.weightKg} kg × {bestSet.reps}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Volume Badge Strip */}
                      {eq && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: 10,
                            backgroundColor: 'rgba(0, 140, 255, 0.08)',
                            border: '1px solid rgba(0, 140, 255, 0.2)',
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 600 }}>
                            Equivalente a levantar {eq.article}{' '}
                            <strong>{eq.name}</strong>!
                          </span>
                          <img
                            src={eq.asset}
                            alt={eq.name}
                            style={{
                              height: 32,
                              width: 48,
                              objectFit: 'contain',
                            }}
                          />
                        </div>
                      )}

                      {/* Compact Anatomical Heatmap */}
                      <MuscleHeatmap
                        muscleCounts={workoutMuscles}
                        compact
                        showLegend={false}
                      />

                      {/* Post Actions (Like, Notes/Comment, Share) */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: 8,
                          borderTop: '1px solid var(--hevy-border)',
                        }}
                      >
                        <div style={{ display: 'flex', gap: 14 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setWorkouts((prev) =>
                                prev.map((item) =>
                                  item.id === w.id
                                    ? {
                                        ...item,
                                        likedByMe: !item.likedByMe,
                                        likes: item.likedByMe
                                          ? item.likes - 1
                                          : item.likes + 1,
                                      }
                                    : item
                                )
                              );
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: w.likedByMe
                                ? 'var(--hevy-red)'
                                : 'var(--hevy-text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            <Heart
                              size={17}
                              fill={w.likedByMe ? 'var(--hevy-red)' : 'none'}
                            />
                            {w.likes}
                          </button>
                          <span
                            style={{
                              color: 'var(--hevy-text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            <MessageCircle size={17} />
                            {w.comments.length}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setCompletedSummary(w)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--hevy-blue)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          <Share2 size={15} /> Card de Resumo
                        </button>
                      </div>

                      {/* Comments List & Quick Input */}
                      {w.comments.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                            backgroundColor: 'var(--hevy-elevated)',
                            padding: '8px 10px',
                            borderRadius: 8,
                          }}
                        >
                          {w.comments.map((c) => (
                            <div key={c.id} style={{ fontSize: 12 }}>
                              <strong>@{c.username}: </strong>
                              <span
                                style={{ color: 'var(--hevy-text-secondary)' }}
                              >
                                {c.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          type="text"
                          placeholder="Adicionar anotação a este post de treino..."
                          value={commentInputs[w.id] || ''}
                          onChange={(e) =>
                            setCommentInputs({
                              ...commentInputs,
                              [w.id]: e.target.value,
                            })
                          }
                          className="hevy-set-input"
                          style={{
                            textAlign: 'left',
                            padding: '0 10px',
                            fontSize: 13,
                            height: 34,
                          }}
                        />
                        <button
                          type="button"
                          className="hevy-btn-primary"
                          style={{ padding: '0 12px', fontSize: 12 }}
                          onClick={() => {
                            const txt = (commentInputs[w.id] || '').trim();
                            if (!txt) return;
                            setWorkouts((prev) =>
                              prev.map((item) =>
                                item.id === w.id
                                  ? {
                                      ...item,
                                      comments: [
                                        ...item.comments,
                                        {
                                          id: `c-${Date.now()}`,
                                          username: userProfile.username,
                                          avatar: getUserInitials(
                                            userProfile.displayName
                                          ),
                                          text: txt,
                                          createdAt: 'Agora',
                                        },
                                      ],
                                    }
                                  : item
                              )
                            );
                            setCommentInputs({ ...commentInputs, [w.id]: '' });
                          }}
                        >
                          Salvar
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          )}

          {/* ==================== TAB 2: WORKOUT & ROUTINES (+ EDIT & CSV) ==================== */}
          {activeTab === 'workout' && (
            <div
              style={{
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--hevy-text-secondary)',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  Início Rápido
                </div>
                <button
                  type="button"
                  className="hevy-btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: 15 }}
                  onClick={() => startWorkout()}
                >
                  <Plus size={18} /> Iniciar Treino Vazio
                </button>
              </div>

              {/* CSV Routine Import & Template Card (Buttons A and B) */}
              <div
                className="hevy-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  background:
                    'linear-gradient(135deg, rgba(0,140,255,0.12) 0%, rgba(28,28,30,0.95) 100%)',
                  borderColor: 'rgba(0,140,255,0.28)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileSpreadsheet size={18} color="var(--hevy-blue)" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      Nova Rotina via Planilha CSV
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--hevy-text-secondary)',
                      }}
                    >
                      Baixe o modelo (A), preencha seus exercícios (descanso padrão: 60s) e importe (B)
                    </div>
                  </div>
                </div>

                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleImportCsvFile}
                  style={{ display: 'none' }}
                />

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    className="hevy-btn-secondary"
                    style={{ fontSize: 12, padding: '10px 8px' }}
                    onClick={handleDownloadCsvTemplate}
                  >
                    <Download size={15} color="var(--hevy-blue)" />
                    <span>(A) Baixar Modelo</span>
                  </button>

                  <button
                    type="button"
                    className="hevy-btn-primary"
                    style={{ fontSize: 12, padding: '10px 8px' }}
                    onClick={() => csvInputRef.current?.click()}
                  >
                    <Upload size={15} />
                    <span>(B) Importar CSV</span>
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--hevy-text-secondary)',
                    textTransform: 'uppercase',
                  }}
                >
                  Minhas Rotinas ({routines.length})
                </div>
                <button
                  type="button"
                  className="hevy-btn-secondary"
                  style={{ padding: '7px 12px', fontSize: 12 }}
                  onClick={handleOpenCreateRoutine}
                >
                  <FolderPlus size={14} /> Nova Manual
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {routines.map((routine: Routine) => {
                  const routineMuscleMap = computeMuscleDistributionFromExercises(
                    routine.exercises,
                    exerciseMap
                  );

                  return (
                    <div
                      key={routine.id}
                      className="hevy-card"
                      style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 8,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: 'var(--hevy-blue)',
                              textTransform: 'uppercase',
                            }}
                          >
                            📁 {routine.lastPerformed || 'Rotina Tatagan.sh'}
                          </span>
                          <h3
                            style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}
                          >
                            {routine.title}
                          </h3>
                        </div>

                        {/* Action Icons: Pencil (Edit) immediately to the left of Trash (Delete) */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            flexShrink: 0,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenEditRoutine(routine)}
                            style={{
                              background: 'var(--hevy-elevated)',
                              border: '1px solid var(--hevy-border)',
                              borderRadius: 8,
                              color: 'var(--hevy-blue)',
                              width: 32,
                              height: 32,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Editar rotina"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setRoutines((prev) =>
                                prev.filter((r) => r.id !== routine.id)
                              )
                            }
                            style={{
                              background: 'var(--hevy-elevated)',
                              border: '1px solid var(--hevy-border)',
                              borderRadius: 8,
                              color: 'var(--hevy-text-muted)',
                              width: 32,
                              height: 32,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Excluir rotina"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--hevy-text-secondary)',
                          lineHeight: 1.5,
                        }}
                      >
                        {routine.exercises
                          .map(
                            (re: WorkoutExercise) =>
                              `${
                                exerciseMap[re.exerciseId]?.title || 'Exercício'
                              } (${re.sets.length}x • ${
                                re.restTimerSeconds || DEFAULT_REST_SECONDS
                              }s)`
                          )
                          .join(' • ')}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {Object.entries(routineMuscleMap).map(([m, c]) => (
                          <span
                            key={m}
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: 999,
                              backgroundColor: 'var(--hevy-elevated)',
                              color: 'var(--hevy-text-secondary)',
                            }}
                          >
                            {MUSCLE_LABELS[m] || m}: {c} séries
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="hevy-btn-primary"
                        style={{ width: '100%', marginTop: 4 }}
                        onClick={() => startWorkout(routine)}
                      >
                        <Play size={15} /> Iniciar Rotina
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== TAB 3: WEEK (RELATÓRIO SEMANAL & IMPACTO NO FÍSICO) ==================== */}
          {activeTab === 'week' && (
            <div
              style={{
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div
                className="hevy-card"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(0,140,255,0.22) 0%, rgba(18,18,20,0.98) 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--hevy-blue)',
                        textTransform: 'uppercase',
                      }}
                    >
                      RELATÓRIO DA SEMANA • TATAGAN.SH
                    </div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                      {weeklyReport.rangeLabel}
                    </h2>
                  </div>

                  {/* Toggle: Domingo vs Segunda-feira */}
                  <div
                    style={{
                      display: 'inline-flex',
                      backgroundColor: 'rgba(0,0,0,0.45)',
                      borderRadius: 9,
                      padding: 3,
                      border: '1px solid var(--hevy-border)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setWeekStartsOn(0)}
                      style={{
                        border: 'none',
                        padding: '5px 9px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor:
                          weekStartsOn === 0
                            ? 'var(--hevy-blue)'
                            : 'transparent',
                        color:
                          weekStartsOn === 0
                            ? '#FFF'
                            : 'var(--hevy-text-secondary)',
                      }}
                    >
                      Domingo
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeekStartsOn(1)}
                      style={{
                        border: 'none',
                        padding: '5px 9px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor:
                          weekStartsOn === 1
                            ? 'var(--hevy-blue)'
                            : 'transparent',
                        color:
                          weekStartsOn === 1
                            ? '#FFF'
                            : 'var(--hevy-text-secondary)',
                      }}
                    >
                      Segunda
                    </button>
                  </div>
                </div>

                {/* 7-Day Frequency Strip */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: 6,
                    paddingTop: 4,
                  }}
                >
                  {weeklyReport.days.map((d, idx) => {
                    const trained = d.workoutsCount > 0;
                    return (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: trained
                            ? 'rgba(42, 204, 88, 0.16)'
                            : 'rgba(255,255,255,0.04)',
                          border: d.isToday
                            ? '1.5px solid var(--hevy-blue)'
                            : trained
                            ? '1px solid rgba(42, 204, 88, 0.4)'
                            : '1px solid var(--hevy-border)',
                          borderRadius: 10,
                          padding: '8px 4px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: d.isToday
                              ? 'var(--hevy-blue)'
                              : 'var(--hevy-text-secondary)',
                          }}
                        >
                          {d.label}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>
                          {d.dateNum}
                        </span>
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            backgroundColor: trained
                              ? 'var(--hevy-green)'
                              : 'var(--hevy-elevated)',
                            color: trained ? '#FFF' : 'var(--hevy-text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {trained ? '✓' : '–'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 4 Key Weekly Metrics */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.35)',
                      padding: '9px 6px',
                      borderRadius: 10,
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        color: 'var(--hevy-text-muted)',
                        fontWeight: 700,
                      }}
                    >
                      TREINOS
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'var(--hevy-green)',
                        marginTop: 2,
                      }}
                    >
                      {weeklyReport.weekWorkouts.length}
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.35)',
                      padding: '9px 6px',
                      borderRadius: 10,
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        color: 'var(--hevy-text-muted)',
                        fontWeight: 700,
                      }}
                    >
                      VOLUME
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'var(--hevy-blue)',
                        marginTop: 2,
                      }}
                    >
                      {weeklyReport.weekVolume.toLocaleString('pt-BR')}kg
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.35)',
                      padding: '9px 6px',
                      borderRadius: 10,
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        color: 'var(--hevy-text-muted)',
                        fontWeight: 700,
                      }}
                    >
                      SÉRIES
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'var(--hevy-text)',
                        marginTop: 2,
                      }}
                    >
                      {weeklyReport.weekSets}
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.35)',
                      padding: '9px 6px',
                      borderRadius: 10,
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        color: 'var(--hevy-text-muted)',
                        fontWeight: 700,
                      }}
                    >
                      TEMPO
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'var(--hevy-gold)',
                        marginTop: 2,
                      }}
                    >
                      {formatDuration(weeklyReport.weekDuration)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Anatomical Physique Impact Map for the Present Week */}
              <div
                className="hevy-card"
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Flame size={18} color="var(--hevy-blue)" />
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>
                      Impacto no Físico na Semana Atual
                    </h3>
                    <p
                      style={{
                        fontSize: 11,
                        color: 'var(--hevy-text-secondary)',
                      }}
                    >
                      Músculos ativados pelos treinos acumulados desde{' '}
                      {weekStartsOn === 0 ? 'domingo' : 'segunda-feira'}
                    </p>
                  </div>
                </div>

                <MuscleHeatmap
                  muscleCounts={weeklyReport.weekMuscleCounts}
                  showLegend={false}
                />
              </div>

              {/* Detailed Muscle Hypertrophy Stimulus Breakdown */}
              <div
                className="hevy-card"
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={18} color="var(--hevy-green)" />
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>
                      Resultado Físico por Grupamento Muscular
                    </h3>
                    <p
                      style={{
                        fontSize: 11,
                        color: 'var(--hevy-text-secondary)',
                      }}
                    >
                      Análise de volume semanal efetivo (meta de hipertrofia: 10
                      a 20 séries/semana)
                    </p>
                  </div>
                </div>

                {Object.keys(weeklyReport.weekMuscleCounts).length === 0 ? (
                  <div
                    style={{
                      padding: '18px 12px',
                      borderRadius: 10,
                      backgroundColor: 'var(--hevy-elevated)',
                      textAlign: 'center',
                      fontSize: 13,
                      color: 'var(--hevy-text-secondary)',
                    }}
                  >
                    Nenhum estímulo muscular registrado nesta semana ainda.
                    Finalize um treino para visualizar o relatório de impacto no
                    físico!
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    {Object.entries(weeklyReport.weekMuscleCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([muscle, sets]) => {
                        const mVol = weeklyReport.weekMuscleVolume[muscle] || 0;
                        const pct = Math.min(100, Math.round((sets / 14) * 100));
                        let statusLabel = 'Ativação / Manutenção';
                        let statusColor = 'var(--hevy-orange)';
                        if (sets >= 10) {
                          statusLabel = 'Estímulo Forte de Hipertrofia';
                          statusColor = 'var(--hevy-green)';
                        } else if (sets >= 5) {
                          statusLabel = 'Construção Muscular Moderada';
                          statusColor = 'var(--hevy-blue)';
                        }

                        return (
                          <div
                            key={muscle}
                            style={{
                              backgroundColor: 'var(--hevy-elevated)',
                              padding: '10px 12px',
                              borderRadius: 10,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <span style={{ fontWeight: 700, fontSize: 14 }}>
                                {MUSCLE_LABELS[muscle] || muscle}
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: statusColor,
                                }}
                              >
                                {sets} {sets === 1 ? 'série' : 'séries'} •{' '}
                                {mVol.toLocaleString('pt-BR')} kg
                              </span>
                            </div>

                            <div
                              style={{
                                width: '100%',
                                height: 6,
                                backgroundColor: 'rgba(255,255,255,0.08)',
                                borderRadius: 999,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: '100%',
                                  backgroundColor: statusColor,
                                  borderRadius: 999,
                                }}
                              />
                            </div>

                            <div
                              style={{
                                fontSize: 11,
                                color: 'var(--hevy-text-secondary)',
                              }}
                            >
                              Efeito fisiológico: <strong>{statusLabel}</strong>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {weeklyReport.untrainedMuscles.length > 0 && (
                  <div
                    style={{
                      marginTop: 4,
                      padding: 12,
                      borderRadius: 10,
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--hevy-border)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--hevy-text-muted)',
                        textTransform: 'uppercase',
                        marginBottom: 6,
                      }}
                    >
                      Músculos Ainda Não Estimulados Nesta Semana
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {weeklyReport.untrainedMuscles.map((m) => (
                        <span
                          key={m}
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '4px 9px',
                            borderRadius: 999,
                            backgroundColor: 'var(--hevy-elevated)',
                            color: 'var(--hevy-text-secondary)',
                          }}
                        >
                          {MUSCLE_LABELS[m] || m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 4: 434 OFFICIAL EXERCISES ==================== */}
          {activeTab === 'exercises' && (
            <div
              style={{
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                    Biblioteca ({allExercises.length} Exercícios)
                  </h2>
                  <p style={{ fontSize: 12, color: 'var(--hevy-text-secondary)' }}>
                    Catálogo completo Tatagan.sh com vídeos MP4 e instruções
                  </p>
                </div>
                <button
                  type="button"
                  className="hevy-btn-primary"
                  style={{ padding: '8px 12px', fontSize: 12 }}
                  onClick={() => setPickerTarget('active')}
                >
                  <Plus size={15} /> Criar
                </button>
              </div>

              <input
                type="text"
                placeholder="Pesquisar exercício em PT ou EN (ex: Supino, Squat, Remada)..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="hevy-set-input"
                style={{ textAlign: 'left', padding: '0 14px', height: 42 }}
              />

              <div className="hevy-chip-row">
                {['all', ...Object.keys(MUSCLE_LABELS)].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`hevy-chip ${catalogMuscle === m ? 'active' : ''}`}
                    onClick={() => setCatalogMuscle(m)}
                  >
                    {m === 'all' ? 'Todos Músculos' : MUSCLE_LABELS[m]}
                  </button>
                ))}
              </div>

              <div className="hevy-chip-row">
                {['all', ...Object.keys(EQUIPMENT_LABELS)].map((eq) => (
                  <button
                    key={eq}
                    type="button"
                    className={`hevy-chip ${
                      catalogEquipment === eq ? 'active' : ''
                    }`}
                    onClick={() => setCatalogEquipment(eq)}
                  >
                    {eq === 'all' ? 'Todos Equipamentos' : EQUIPMENT_LABELS[eq]}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredCatalog.slice(0, 100).map((ex: Exercise) => (
                  <div
                    key={ex.id}
                    onClick={() => setInspectExercise(ex)}
                    className="hevy-card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        minWidth: 0,
                      }}
                    >
                      {ex.thumbnail_url ? (
                        <img
                          src={ex.thumbnail_url}
                          alt={ex.title}
                          loading="lazy"
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 10,
                            objectFit: 'cover',
                            backgroundColor: '#FFF',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 10,
                            backgroundColor: 'var(--hevy-elevated)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: 'var(--hevy-blue)',
                            flexShrink: 0,
                          }}
                        >
                          {ex.title.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 14,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {ex.title}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--hevy-text-secondary)',
                            marginTop: 2,
                          }}
                        >
                          {MUSCLE_LABELS[ex.muscle_group] || ex.muscle_group} •{' '}
                          {EQUIPMENT_LABELS[ex.equipment] || ex.equipment}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addExerciseToActiveWorkout(ex);
                      }}
                      className="hevy-btn-secondary"
                      style={{ padding: '7px 10px', fontSize: 12, flexShrink: 0 }}
                    >
                      <Plus size={14} /> Treinar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== TAB 5: PROFILE (CLOUD SYNC, USERNAME & FACTUAL VOLUME) ==================== */}
          {activeTab === 'profile' && (
            <div
              style={{
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {/* Cloud Account & Mobile/Desktop Sync Card */}
              <div
                className="hevy-card"
                style={{
                  background: authUser
                    ? 'linear-gradient(135deg, rgba(42,204,88,0.14) 0%, rgba(28,28,30,0.96) 100%)'
                    : 'linear-gradient(135deg, rgba(0,140,255,0.16) 0%, rgba(28,28,30,0.96) 100%)',
                  borderColor: authUser
                    ? 'rgba(42,204,88,0.35)'
                    : 'rgba(0,140,255,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: authUser
                        ? 'var(--hevy-green)'
                        : 'var(--hevy-blue)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {authUser
                      ? 'SINCRONIZAÇÃO EM NUVEM (SUPABASE) ATIVA'
                      : 'SINCRONIZAÇÃO MOBILE / DESKTOP'}
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      marginTop: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {authUser
                      ? authUser.email
                      : 'Acesse no celular e no computador'}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--hevy-text-secondary)',
                      marginTop: 2,
                    }}
                  >
                    {authUser
                      ? `Rotinas e histórico vinculados ao ID ${authUser.id.slice(
                          0,
                          10
                        )}...`
                      : 'Entre ou crie sua conta para sincronizar rotinas e treinos.'}
                  </div>
                </div>

                {authUser ? (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      className="hevy-btn-secondary"
                      style={{ padding: '8px 10px', fontSize: 12 }}
                      onClick={() => setShowAuthModal(true)}
                    >
                      <Cloud size={15} color="var(--hevy-green)" /> Conta
                    </button>
                    <button
                      type="button"
                      className="hevy-btn-secondary"
                      style={{
                        padding: '8px 10px',
                        fontSize: 12,
                        color: 'var(--hevy-red)',
                      }}
                      onClick={handleSupabaseLogout}
                      title="Sair da conta (Logout)"
                    >
                      <LogOut size={15} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="hevy-btn-primary"
                    style={{ padding: '9px 13px', fontSize: 12, flexShrink: 0 }}
                    onClick={() => setShowAuthModal(true)}
                  >
                    <Cloud size={15} /> Entrar / Criar
                  </button>
                )}
              </div>

              {/* Editable Profile Card */}
              <div
                className="hevy-card"
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                  >
                    <div
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: '50%',
                        background:
                          'linear-gradient(135deg, #008CFF, #0051A8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        fontWeight: 800,
                        color: '#FFF',
                        flexShrink: 0,
                      }}
                    >
                      {getUserInitials(userProfile.displayName)}
                    </div>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                        {userProfile.displayName}
                      </h2>
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--hevy-blue)',
                          fontWeight: 600,
                        }}
                      >
                        @{userProfile.username}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 14,
                          marginTop: 6,
                          fontSize: 12,
                          color: 'var(--hevy-text-secondary)',
                        }}
                      >
                        <span>
                          <strong>{workouts.length}</strong> Treinos
                        </span>
                        <span>
                          <strong>{lifetimeStats.totalSets}</strong> Séries
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="hevy-btn-secondary"
                    style={{ padding: '7px 11px', fontSize: 12 }}
                    onClick={() => {
                      setDraftDisplayName(userProfile.displayName);
                      setDraftUsername(userProfile.username);
                      setEditingProfile((v) => !v);
                    }}
                  >
                    <Edit3 size={14} /> Editar
                  </button>
                </div>

                {editingProfile && (
                  <div
                    style={{
                      paddingTop: 10,
                      borderTop: '1px solid var(--hevy-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--hevy-text-secondary)',
                        }}
                      >
                        NOME DE EXIBIÇÃO
                      </label>
                      <input
                        type="text"
                        value={draftDisplayName}
                        onChange={(e) => setDraftDisplayName(e.target.value)}
                        placeholder="Seu nome"
                        className="hevy-set-input"
                        style={{
                          textAlign: 'left',
                          padding: '0 12px',
                          height: 38,
                          marginTop: 4,
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--hevy-text-secondary)',
                        }}
                      >
                        NOME DE USUÁRIO (@HANDLE)
                      </label>
                      <input
                        type="text"
                        value={draftUsername}
                        onChange={(e) =>
                          setDraftUsername(
                            e.target.value.replace(/^@/, '').replace(/\s+/g, '_')
                          )
                        }
                        placeholder="seu_usuario"
                        className="hevy-set-input"
                        style={{
                          textAlign: 'left',
                          padding: '0 12px',
                          height: 38,
                          marginTop: 4,
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="hevy-btn-primary"
                      onClick={() => {
                        const cleanName =
                          draftDisplayName.trim() || 'Atleta Tatagan.sh';
                        const cleanHandle =
                          draftUsername.trim() || 'atleta_tatagan';
                        setUserProfile({
                          displayName: cleanName,
                          username: cleanHandle,
                        });
                        setEditingProfile(false);
                      }}
                    >
                      <Check size={15} /> Salvar Nome de Usuário
                    </button>
                  </div>
                )}
              </div>

              {/* Factual Lifetime Volume Card (Starts at 0 kg) */}
              <div
                className="hevy-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--hevy-blue)',
                    }}
                  >
                    VOLUME TOTAL ACUMULADO (FACTUAL)
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>
                    {lifetimeStats.totalVolume.toLocaleString('pt-BR')} kg
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--hevy-text-secondary)',
                      marginTop: 2,
                    }}
                  >
                    {lifetimeStats.equivalence ? (
                      <>
                        Equivalente a {lifetimeStats.equivalence.article}{' '}
                        <strong>{lifetimeStats.equivalence.name}</strong> (
                        {lifetimeStats.totalSets} séries concluídas)
                      </>
                    ) : (
                      'Baseado nos seus treinos registrados (inicia em 0 kg)'
                    )}
                  </div>
                </div>
                {lifetimeStats.equivalence && (
                  <img
                    src={lifetimeStats.equivalence.asset}
                    alt={lifetimeStats.equivalence.name}
                    style={{ width: 84, height: 64, objectFit: 'contain' }}
                  />
                )}
              </div>

              {/* Full Anatomical Heatmap */}
              <div className="hevy-card">
                <MuscleHeatmap muscleCounts={lifetimeStats.muscleCounts} />
              </div>

              {/* Body Measurements Tracker */}
              <div
                className="hevy-card"
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Scale size={17} color="var(--hevy-blue)" />
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>
                      Medidas Corporais
                    </h3>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    placeholder="Peso (kg)"
                    value={newWeightKg}
                    onChange={(e) => setNewWeightKg(e.target.value)}
                    className="hevy-set-input"
                    style={{ flex: 1, height: 36 }}
                  />
                  <input
                    type="number"
                    placeholder="% Gordura"
                    value={newBodyFat}
                    onChange={(e) => setNewBodyFat(e.target.value)}
                    className="hevy-set-input"
                    style={{ flex: 1, height: 36 }}
                  />
                  <button
                    type="button"
                    className="hevy-btn-primary"
                    style={{ padding: '0 14px', fontSize: 12 }}
                    onClick={() => {
                      const w = parseFloat(newWeightKg);
                      if (!w) return;
                      const entry: BodyMeasurement = {
                        id: `m-${Date.now()}`,
                        date: new Date().toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                        }),
                        weightKg: w,
                        bodyFatPct: parseFloat(newBodyFat) || 13.5,
                        chestCm: 107.5,
                        waistCm: 80,
                        armsCm: 41.5,
                      };
                      setMeasurements([entry, ...measurements]);
                      setNewWeightKg('');
                      setNewBodyFat('');
                    }}
                  >
                    Registrar
                  </button>
                </div>

                {measurements.length > 0 && (
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                  >
                    {measurements.slice(0, 5).map((m: BodyMeasurement) => (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: 8,
                          backgroundColor: 'var(--hevy-elevated)',
                          fontSize: 13,
                        }}
                      >
                        <span style={{ color: 'var(--hevy-text-secondary)' }}>
                          {m.date}
                        </span>
                        <span style={{ fontWeight: 700 }}>
                          {m.weightKg} kg • {m.bodyFatPct}% BF
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="hevy-card" style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="hevy-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    const blob = new Blob(
                      [
                        JSON.stringify(
                          { userProfile, workouts, routines, measurements },
                          null,
                          2
                        ),
                      ],
                      { type: 'application/json' }
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'tatagan-backup.json';
                    a.click();
                  }}
                >
                  <Download size={15} /> Exportar Backup (JSON)
                </button>
              </div>
            </div>
          )}
        </main>

        {/* ==================== FLOATING MINI WORKOUT BAR ==================== */}
        {activeWorkout && !workoutSheetExpanded && (
          <div
            onClick={() => setWorkoutSheetExpanded(true)}
            style={{
              position: 'absolute',
              bottom: 'calc(68px + var(--safe-bottom))',
              left: 12,
              right: 12,
              backgroundColor: 'var(--hevy-card)',
              border: '1px solid var(--hevy-blue)',
              borderRadius: 14,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 10px 30px rgba(0,0,0,0.65)',
              cursor: 'pointer',
              zIndex: 40,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: 'var(--hevy-green)',
                }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {activeWorkout.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--hevy-blue)',
                    fontWeight: 600,
                  }}
                >
                  ⏱️ {formatTimerMMSS(elapsedSeconds)} • Treino em andamento
                </div>
              </div>
            </div>
            <ChevronUp size={20} color="var(--hevy-blue)" />
          </div>
        )}

        {/* ==================== FULL LIVE WORKOUT SHEET ==================== */}
        {activeWorkout && workoutSheetExpanded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'var(--hevy-bg)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--hevy-surface-1)',
                borderBottom: '1px solid var(--hevy-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => setWorkoutSheetExpanded(false)}
                className="hevy-btn-secondary"
                style={{ padding: '7px 10px' }}
                title="Minimizar treino"
              >
                <ChevronDown size={18} />
              </button>

              <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
                <input
                  type="text"
                  value={activeWorkout.title}
                  onChange={(e) =>
                    setActiveWorkout({ ...activeWorkout, title: e.target.value })
                  }
                  style={{
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    fontWeight: 700,
                    fontSize: 15,
                    textAlign: 'center',
                    width: '100%',
                  }}
                />
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--hevy-blue)',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <span>⏱️ {formatTimerMMSS(elapsedSeconds)}</span>
                  <span>•</span>
                  <span>
                    {calculateExercisesVolume(
                      activeWorkout.exercises
                    ).toLocaleString('pt-BR')}{' '}
                    kg
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="hevy-btn-primary"
                style={{ padding: '8px 14px', fontSize: 13 }}
                onClick={handleFinishWorkout}
              >
                Finalizar
              </button>
            </div>

            {/* Notificação Passiva de Descanso (Sem cronômetro regressivo intrusivo, sem bloquear tela) */}
            {restSuggestionToast && (
              <div
                style={{
                  margin: '8px 14px 0',
                  padding: '9px 14px',
                  borderRadius: 10,
                  backgroundColor: 'rgba(0, 114, 245, 0.12)',
                  border: '1px solid rgba(0, 114, 245, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: 'var(--hevy-text)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <Clock size={16} color="var(--hevy-blue)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: 'var(--hevy-text-secondary)', fontSize: 11, fontWeight: 500 }}>
                    {restSuggestionToast.exerciseTitle} •{' '}
                  </span>
                  <span>
                    Descanso sugerido: <strong style={{ color: 'var(--hevy-blue)' }}>{restSuggestionToast.restText}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Feedback Visual: Exercício Removido da Sessão Ativa (Rotina Padrão Intacta) */}
            {workoutFeedbackToast && (
              <div
                style={{
                  margin: '8px 14px 0',
                  padding: '9px 14px',
                  borderRadius: 10,
                  backgroundColor: 'rgba(42, 204, 88, 0.14)',
                  border: '1px solid rgba(42, 204, 88, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: 'var(--hevy-text)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <ShieldCheck size={16} color="var(--hevy-green)" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{workoutFeedbackToast}</span>
                <button
                  type="button"
                  onClick={() => setWorkoutFeedbackToast(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--hevy-text-muted)',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {activeWorkout.exercises.map((exInstance: WorkoutExercise) => {
                const meta = exerciseMap[exInstance.exerciseId];
                if (!meta) return null;
                const firstWeight = exInstance.sets[0]?.weightKg || 60;
                const exRest =
                  exInstance.restTimerSeconds || DEFAULT_REST_SECONDS;

                return (
                  <div
                    key={exInstance.id}
                    className="hevy-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      borderLeft: exInstance.supersetGroup
                        ? '4px solid var(--hevy-purple)'
                        : undefined,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <div
                        onClick={() => setInspectExercise(meta)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          cursor: 'pointer',
                          minWidth: 0,
                        }}
                      >
                        {meta.thumbnail_url && (
                          <img
                            src={meta.thumbnail_url}
                            alt={meta.title}
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 8,
                              objectFit: 'cover',
                              backgroundColor: '#FFF',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 15,
                              color: 'var(--hevy-blue)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <span
                              style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {meta.title}
                            </span>
                            <Info size={13} />
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--hevy-text-muted)',
                            }}
                          >
                            {MUSCLE_LABELS[meta.muscle_group] ||
                              meta.muscle_group}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                        {/* Descanso Planejado do Exercício (Toque para alterar o tempo sugerido) */}
                        <button
                          type="button"
                          onClick={() => {
                            const curIdx = REST_PRESETS.indexOf(exRest);
                            const nextRest =
                              REST_PRESETS[
                                (curIdx + 1) % REST_PRESETS.length
                              ] || DEFAULT_REST_SECONDS;
                            setActiveWorkout({
                              ...activeWorkout,
                              exercises: activeWorkout.exercises.map((item) =>
                                item.id === exInstance.id
                                  ? { ...item, restTimerSeconds: nextRest }
                                  : item
                              ),
                            });
                          }}
                          title="Descanso sugerido para este exercício (toque para alterar)"
                          style={{
                            background: 'var(--hevy-elevated)',
                            color: 'var(--hevy-text-secondary)',
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Clock size={12} color="var(--hevy-blue)" />
                          {formatSuggestedRest(exRest)}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveWorkout({
                              ...activeWorkout,
                              exercises: activeWorkout.exercises.map(
                                (item: WorkoutExercise) =>
                                  item.id === exInstance.id
                                    ? {
                                        ...item,
                                        supersetGroup: item.supersetGroup
                                          ? null
                                          : 1,
                                      }
                                    : item
                              ),
                            });
                          }}
                          title="Alternar Bi-set / Superset"
                          style={{
                            background: exInstance.supersetGroup
                              ? 'var(--hevy-purple-soft)'
                              : 'var(--hevy-elevated)',
                            color: exInstance.supersetGroup
                              ? 'var(--hevy-purple)'
                              : 'var(--hevy-text-secondary)',
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Link2 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setPlateCalcTarget({
                              exerciseInstanceId: exInstance.id,
                              initialWeight: firstWeight,
                            })
                          }
                          title="Calculadora de Anilhas e Aquecimento"
                          style={{
                            background: 'var(--hevy-elevated)',
                            color: 'var(--hevy-blue)',
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Disc size={14} />
                        </button>

                        {/* Menu de Opções ("...") para Remover/Pular Exercício apenas desta sessão */}
                        <div style={{ position: 'relative' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveExerciseMenuId((prev) =>
                                prev === exInstance.id ? null : exInstance.id
                              );
                            }}
                            title="Opções do exercício nesta sessão"
                            aria-label="Opções do exercício"
                            style={{
                              background:
                                activeExerciseMenuId === exInstance.id
                                  ? 'var(--hevy-elevated)'
                                  : 'transparent',
                              color: 'var(--hevy-text-secondary)',
                              border: 'none',
                              borderRadius: 8,
                              padding: '6px 6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeExerciseMenuId === exInstance.id && (
                            <>
                              <div
                                style={{
                                  position: 'fixed',
                                  inset: 0,
                                  zIndex: 59,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveExerciseMenuId(null);
                                }}
                              />
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  right: 0,
                                  marginTop: 6,
                                  zIndex: 60,
                                  backgroundColor: 'var(--hevy-surface-1)',
                                  border: '1px solid var(--hevy-border)',
                                  borderRadius: 12,
                                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
                                  minWidth: 230,
                                  padding: 6,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 4,
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleRemoveExerciseFromActiveSession(exInstance);
                                    setActiveExerciseMenuId(null);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 10,
                                    padding: '10px 12px',
                                    background: 'none',
                                    border: 'none',
                                    borderRadius: 8,
                                    color: 'var(--hevy-red)',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    width: '100%',
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                      'var(--hevy-red-soft)')
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                      'transparent')
                                  }
                                >
                                  <Trash2 size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                                  <div>
                                    <div>Remover deste treino</div>
                                    <div
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 400,
                                        color: 'var(--hevy-text-muted)',
                                        marginTop: 2,
                                        lineHeight: 1.3,
                                      }}
                                    >
                                      Apenas desta sessão. Sua rotina padrão fica intacta.
                                    </div>
                                  </div>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Adicionar nota ao exercício (ex: banco 30°, pegada pronada)..."
                      value={exInstance.notes}
                      onChange={(e) => {
                        setActiveWorkout({
                          ...activeWorkout,
                          exercises: activeWorkout.exercises.map(
                            (item: WorkoutExercise) =>
                              item.id === exInstance.id
                                ? { ...item, notes: e.target.value }
                                : item
                          ),
                        });
                      }}
                      style={{
                        background: 'var(--hevy-elevated)',
                        border: 'none',
                        borderRadius: 8,
                        padding: '7px 10px',
                        fontSize: 12,
                        color: 'var(--hevy-text-secondary)',
                        outline: 'none',
                      }}
                    />

                    <div
                      className="hevy-set-row"
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--hevy-text-muted)',
                        padding: '2px 8px',
                      }}
                    >
                      <span>SÉRIE</span>
                      <span>ANTERIOR</span>
                      <span style={{ textAlign: 'center' }}>KG</span>
                      <span style={{ textAlign: 'center' }}>REPS</span>
                      <span style={{ textAlign: 'center' }}>✓</span>
                    </div>

                    {exInstance.sets.map((setItem: WorkoutSet, sIdx: number) => {
                      const typeCfg = SET_TYPE_CONFIG[setItem.type];
                      const prevRef =
                        setItem.previous ||
                        getPreviousSetReference(exInstance.exerciseId, sIdx);
                      return (
                        <div
                          key={setItem.id}
                          className={`hevy-set-row ${
                            setItem.completed ? 'completed' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleCycleSetType(exInstance.id, setItem)
                            }
                            title={`${typeCfg.label} (Toque para alternar W / D / F)`}
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 7,
                              border: 'none',
                              backgroundColor: typeCfg.bg,
                              color: typeCfg.color,
                              fontWeight: 700,
                              fontSize: 13,
                            }}
                          >
                            {setItem.type === 'normal'
                              ? sIdx + 1
                              : typeCfg.badge}
                          </button>

                          <div
                            style={{
                              fontSize: 12,
                              color: 'var(--hevy-text-muted)',
                              fontWeight: 600,
                            }}
                          >
                            {prevRef}
                          </div>

                          <input
                            type="number"
                            value={setItem.weightKg ?? ''}
                            onChange={(e) =>
                              updateSetField(exInstance.id, setItem.id, (s) => ({
                                ...s,
                                weightKg:
                                  e.target.value === ''
                                    ? null
                                    : Number(e.target.value),
                              }))
                            }
                            className="hevy-set-input"
                          />

                          <input
                            type="number"
                            value={setItem.reps ?? ''}
                            onChange={(e) =>
                              updateSetField(exInstance.id, setItem.id, (s) => ({
                                ...s,
                                reps:
                                  e.target.value === ''
                                    ? null
                                    : Number(e.target.value),
                              }))
                            }
                            className="hevy-set-input"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              handleToggleSetComplete(exInstance, setItem)
                            }
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 8,
                              border: 'none',
                              backgroundColor: setItem.completed
                                ? 'var(--hevy-green)'
                                : 'var(--hevy-elevated)',
                              color: setItem.completed
                                ? '#FFF'
                                : 'var(--hevy-text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Check size={18} />
                          </button>
                        </div>
                      );
                    })}

                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button
                        type="button"
                        className="hevy-btn-secondary"
                        style={{ flex: 1, padding: '8px', fontSize: 12 }}
                        onClick={() => handleAddSet(exInstance.id)}
                      >
                        <Plus size={14} /> Adicionar Série
                      </button>
                      {exInstance.sets.length > 1 && (
                        <button
                          type="button"
                          className="hevy-btn-secondary"
                          style={{
                            padding: '8px 12px',
                            fontSize: 12,
                            color: 'var(--hevy-red)',
                          }}
                          onClick={() =>
                            handleRemoveSet(
                              exInstance.id,
                              exInstance.sets[exInstance.sets.length - 1].id
                            )
                          }
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                className="hevy-btn-primary"
                style={{ width: '100%', padding: '13px' }}
                onClick={() => setPickerTarget('active')}
              >
                <Plus size={18} /> Adicionar Exercício (434 Oficiais)
              </button>

              <button
                type="button"
                className="hevy-btn-secondary"
                style={{
                  width: '100%',
                  color: 'var(--hevy-red)',
                  marginBottom: 24,
                }}
                onClick={() => {
                  if (confirm('Descartar o treino em andamento?')) {
                    setActiveWorkout(null);
                    setRestRemaining(0);
                    setRestTotal(DEFAULT_REST_SECONDS);
                  }
                }}
              >
                Descartar Treino
              </button>
            </div>
          </div>
        )}

        {/* ==================== ROUTINE CREATE / EDIT MODAL ==================== */}
        {buildingRoutine && (
          <div
            className="hevy-modal-backdrop"
            onClick={() => {
              setBuildingRoutine(null);
              setIsEditingExistingRoutine(false);
            }}
          >
            <div
              className="hevy-modal-sheet"
              onClick={(e) => e.stopPropagation()}
              style={{ padding: 16, gap: 12, height: '90%' }}
            >
              {/* Modal Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700 }}>
                    {isEditingExistingRoutine
                      ? 'Editar Rotina'
                      : 'Criar Nova Rotina'}
                  </h3>
                  <span
                    style={{ fontSize: 11, color: 'var(--hevy-text-secondary)' }}
                  >
                    Descanso padrão: 01:00 (60s) • Ajuste séries, cargas e
                    repetições
                  </span>
                </div>
                <button
                  type="button"
                  className="hevy-btn-secondary"
                  style={{ padding: '6px 10px', fontSize: 12 }}
                  onClick={() => {
                    setBuildingRoutine(null);
                    setIsEditingExistingRoutine(false);
                  }}
                >
                  Cancelar
                </button>
              </div>

              {/* Routine Title Input */}
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--hevy-text-secondary)',
                  }}
                >
                  NOME DA ROTINA
                </label>
                <input
                  type="text"
                  value={buildingRoutine.title}
                  onChange={(e) =>
                    setBuildingRoutine({
                      ...buildingRoutine,
                      title: e.target.value,
                    })
                  }
                  placeholder="Título da Rotina"
                  className="hevy-set-input"
                  style={{
                    textAlign: 'left',
                    padding: '0 12px',
                    height: 40,
                    marginTop: 4,
                  }}
                />
              </div>

              {/* Editable Exercises List inside Routine with Drag & Drop */}
              <div
                ref={routineScrollContainerRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  paddingRight: 2,
                }}
              >
                {buildingRoutine.exercises.length > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 8px',
                      borderRadius: 8,
                      backgroundColor: 'rgba(0, 114, 245, 0.08)',
                      color: 'var(--hevy-blue)',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    <GripVertical size={14} />
                    <span>Segure e arraste pelo ícone ⠿ para reorganizar os exercícios</span>
                  </div>
                )}

                {buildingRoutine.exercises.map(
                  (re: WorkoutExercise, exIdx: number) => {
                    const meta = exerciseMap[re.exerciseId];
                    const currentRest =
                      re.restTimerSeconds || DEFAULT_REST_SECONDS;
                    const isDragging = routineDraggingId === re.id;

                    return (
                      <div
                        key={re.id}
                        ref={registerRoutineItem(re.id)}
                        className="hevy-card"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          position: 'relative',
                          transition:
                            'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, border-color 0.15s ease',
                          opacity: isDragging ? 0.6 : 1,
                          transform: isDragging ? 'scale(1.02)' : 'none',
                          boxShadow: isDragging
                            ? '0 10px 25px rgba(0, 114, 245, 0.3)'
                            : undefined,
                          borderColor: isDragging
                            ? 'var(--hevy-blue)'
                            : undefined,
                        }}
                      >
                        {/* Exercise Title + Drag Handle + Rest Timer Selector + Remove Exercise Button */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            {/* Drag Reorder Handle & Quick Up/Down */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                              <button
                                type="button"
                                {...getRoutineHandleProps(re.id)}
                                title="Segure e arraste para reordenar para cima ou para baixo"
                                aria-label="Segure e arraste para reordenar"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: '6px 3px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: isDragging
                                    ? 'var(--hevy-blue)'
                                    : 'var(--hevy-text-muted)',
                                  cursor: isDragging ? 'grabbing' : 'grab',
                                  touchAction: 'none',
                                  userSelect: 'none',
                                  WebkitUserSelect: 'none',
                                  borderRadius: 4,
                                }}
                              >
                                <GripVertical size={18} />
                              </button>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <button
                                  type="button"
                                  disabled={exIdx === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveRoutineExercise(exIdx, exIdx - 1);
                                  }}
                                  title="Subir posição"
                                  aria-label="Subir posição"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    width: 14,
                                    height: 11,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color:
                                      exIdx === 0
                                        ? 'var(--hevy-border)'
                                        : 'var(--hevy-text-muted)',
                                    cursor: exIdx === 0 ? 'default' : 'pointer',
                                  }}
                                >
                                  <ChevronUp size={13} />
                                </button>
                                <button
                                  type="button"
                                  disabled={exIdx === buildingRoutine.exercises.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveRoutineExercise(exIdx, exIdx + 1);
                                  }}
                                  title="Descer posição"
                                  aria-label="Descer posição"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    width: 14,
                                    height: 11,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color:
                                      exIdx === buildingRoutine.exercises.length - 1
                                        ? 'var(--hevy-border)'
                                        : 'var(--hevy-text-muted)',
                                    cursor:
                                      exIdx === buildingRoutine.exercises.length - 1
                                        ? 'default'
                                        : 'pointer',
                                  }}
                                >
                                  <ChevronDown size={13} />
                                </button>
                              </div>
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: 14,
                                  color: 'var(--hevy-blue)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {exIdx + 1}. {meta?.title || re.exerciseId}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: 'var(--hevy-text-muted)',
                                }}
                              >
                                {meta
                                  ? MUSCLE_LABELS[meta.muscle_group] ||
                                    meta.muscle_group
                                  : 'Exercício'}
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              flexShrink: 0,
                            }}
                          >
                            {/* Rest Seconds Input (Defaults to 60s) */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                backgroundColor: 'var(--hevy-elevated)',
                                padding: '4px 8px',
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                              title="Tempo de descanso (segundos)"
                            >
                              <Clock size={12} color="var(--hevy-blue)" />
                              <input
                                type="number"
                                value={currentRest}
                                onChange={(e) => {
                                  const val = Math.max(
                                    0,
                                    Number(e.target.value) || DEFAULT_REST_SECONDS
                                  );
                                  setBuildingRoutine({
                                    ...buildingRoutine,
                                    exercises: buildingRoutine.exercises.map(
                                      (item) =>
                                        item.id === re.id
                                          ? { ...item, restTimerSeconds: val }
                                          : item
                                    ),
                                  });
                                }}
                                style={{
                                  width: 42,
                                  background: 'none',
                                  border: 'none',
                                  outline: 'none',
                                  textAlign: 'center',
                                  fontWeight: 700,
                                  fontSize: 13,
                                  color: 'var(--hevy-text)',
                                }}
                              />
                              <span>s</span>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setBuildingRoutine({
                                  ...buildingRoutine,
                                  exercises: buildingRoutine.exercises.filter(
                                    (item) => item.id !== re.id
                                  ),
                                })
                              }
                              title="Remover exercício da rotina"
                              style={{
                                background: 'var(--hevy-red-soft)',
                                color: 'var(--hevy-red)',
                                border: 'none',
                                borderRadius: 8,
                                width: 30,
                                height: 30,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Exercise Notes inside Routine */}
                        <input
                          type="text"
                          value={re.notes || ''}
                          onChange={(e) =>
                            setBuildingRoutine({
                              ...buildingRoutine,
                              exercises: buildingRoutine.exercises.map((item) =>
                                item.id === re.id
                                  ? { ...item, notes: e.target.value }
                                  : item
                              ),
                            })
                          }
                          placeholder="Notas do exercício na rotina..."
                          style={{
                            background: 'var(--hevy-elevated)',
                            border: 'none',
                            borderRadius: 7,
                            padding: '6px 10px',
                            fontSize: 12,
                            color: 'var(--hevy-text-secondary)',
                            outline: 'none',
                          }}
                        />

                        {/* Sets Editor Header */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '36px 1fr 1fr 34px',
                            gap: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            color: 'var(--hevy-text-muted)',
                            padding: '2px 4px',
                          }}
                        >
                          <span>TIPO</span>
                          <span style={{ textAlign: 'center' }}>CARGA (KG)</span>
                          <span style={{ textAlign: 'center' }}>REPS</span>
                          <span style={{ textAlign: 'center' }}>DEL</span>
                        </div>

                        {/* Sets Rows inside Routine Editor */}
                        {re.sets.map((sItem: WorkoutSet, sIdx: number) => {
                          const tCfg = SET_TYPE_CONFIG[sItem.type];
                          return (
                            <div
                              key={sItem.id}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '36px 1fr 1fr 34px',
                                gap: 6,
                                alignItems: 'center',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  const nextType =
                                    SET_TYPE_ORDER[
                                      (SET_TYPE_ORDER.indexOf(sItem.type) + 1) %
                                        SET_TYPE_ORDER.length
                                    ];
                                  setBuildingRoutine({
                                    ...buildingRoutine,
                                    exercises: buildingRoutine.exercises.map(
                                      (item) =>
                                        item.id === re.id
                                          ? {
                                              ...item,
                                              sets: item.sets.map((st) =>
                                                st.id === sItem.id
                                                  ? { ...st, type: nextType }
                                                  : st
                                              ),
                                            }
                                          : item
                                    ),
                                  });
                                }}
                                style={{
                                  height: 32,
                                  borderRadius: 7,
                                  border: 'none',
                                  backgroundColor: tCfg.bg,
                                  color: tCfg.color,
                                  fontWeight: 700,
                                  fontSize: 12,
                                }}
                              >
                                {sItem.type === 'normal'
                                  ? sIdx + 1
                                  : tCfg.badge}
                              </button>

                              <input
                                type="number"
                                value={sItem.weightKg ?? ''}
                                onChange={(e) => {
                                  const val =
                                    e.target.value === ''
                                      ? null
                                      : Number(e.target.value);
                                  setBuildingRoutine({
                                    ...buildingRoutine,
                                    exercises: buildingRoutine.exercises.map(
                                      (item) =>
                                        item.id === re.id
                                          ? {
                                              ...item,
                                              sets: item.sets.map((st) =>
                                                st.id === sItem.id
                                                  ? { ...st, weightKg: val }
                                                  : st
                                              ),
                                            }
                                          : item
                                    ),
                                  });
                                }}
                                className="hevy-set-input"
                                style={{ height: 32 }}
                              />

                              <input
                                type="number"
                                value={sItem.reps ?? ''}
                                onChange={(e) => {
                                  const val =
                                    e.target.value === ''
                                      ? null
                                      : Number(e.target.value);
                                  setBuildingRoutine({
                                    ...buildingRoutine,
                                    exercises: buildingRoutine.exercises.map(
                                      (item) =>
                                        item.id === re.id
                                          ? {
                                              ...item,
                                              sets: item.sets.map((st) =>
                                                st.id === sItem.id
                                                  ? { ...st, reps: val }
                                                  : st
                                              ),
                                            }
                                          : item
                                    ),
                                  });
                                }}
                                className="hevy-set-input"
                                style={{ height: 32 }}
                              />

                              <button
                                type="button"
                                disabled={re.sets.length <= 1}
                                onClick={() =>
                                  setBuildingRoutine({
                                    ...buildingRoutine,
                                    exercises: buildingRoutine.exercises.map(
                                      (item) =>
                                        item.id === re.id
                                          ? {
                                              ...item,
                                              sets: item.sets.filter(
                                                (st) => st.id !== sItem.id
                                              ),
                                            }
                                          : item
                                    ),
                                  })
                                }
                                style={{
                                  height: 32,
                                  borderRadius: 7,
                                  border: 'none',
                                  backgroundColor: 'var(--hevy-elevated)',
                                  color:
                                    re.sets.length <= 1
                                      ? 'var(--hevy-border)'
                                      : 'var(--hevy-red)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          );
                        })}

                        <button
                          type="button"
                          className="hevy-btn-secondary"
                          style={{ padding: '6px', fontSize: 12, marginTop: 2 }}
                          onClick={() => {
                            const lastSet = re.sets[re.sets.length - 1];
                            const newSet: WorkoutSet = {
                              id: `rs-${Date.now()}-${re.sets.length + 1}`,
                              type: 'normal',
                              weightKg:
                                lastSet && lastSet.weightKg !== null
                                  ? lastSet.weightKg
                                  : 0,
                              reps:
                                lastSet && lastSet.reps !== null
                                  ? lastSet.reps
                                  : 10,
                              rpe: 8,
                              completed: false,
                            };
                            setBuildingRoutine({
                              ...buildingRoutine,
                              exercises: buildingRoutine.exercises.map((item) =>
                                item.id === re.id
                                  ? { ...item, sets: [...item.sets, newSet] }
                                  : item
                              ),
                            });
                          }}
                        >
                          <Plus size={13} /> Adicionar Série
                        </button>
                      </div>
                    );
                  }
                )}

                <button
                  type="button"
                  className="hevy-btn-secondary"
                  style={{ padding: '11px' }}
                  onClick={() => setPickerTarget('routine')}
                >
                  <Plus size={16} /> Adicionar Exercício à Rotina
                </button>
              </div>

              <button
                type="button"
                className="hevy-btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: 15 }}
                onClick={handleSaveBuildingRoutine}
              >
                <Check size={17} />
                {isEditingExistingRoutine
                  ? 'Salvar Alterações'
                  : 'Salvar Rotina'}
              </button>
            </div>
          </div>
        )}

        {/* ==================== MODALS ==================== */}
        {showAuthModal && (
          <AuthModal
            user={authUser}
            status={syncStatus}
            configured={isCloudConfigured}
            lastSyncedAt={lastSyncedAt}
            onClose={() => setShowAuthModal(false)}
            onLogin={handleSupabaseLogin}
            onRegister={handleSupabaseRegister}
            onRequestPasswordReset={handleSupabaseResetPassword}
            onLogout={handleSupabaseLogout}
            onForceSync={handleForceSync}
          />
        )}

        {inspectExercise && (
          <ExerciseDetailModal
            exercise={inspectExercise}
            workouts={workouts}
            onClose={() => setInspectExercise(null)}
            onAddToActiveWorkout={addExerciseToActiveWorkout}
          />
        )}

        {pickerTarget && (
          <ExercisePickerModal
            exercises={allExercises}
            onClose={() => setPickerTarget(null)}
            onCreateCustomExercise={(newEx) =>
              setCustomExercises([newEx, ...customExercises])
            }
            onInspectExercise={(ex) => setInspectExercise(ex)}
            onSelectExercise={(ex) => {
              if (pickerTarget === 'active') {
                addExerciseToActiveWorkout(ex);
              } else if (pickerTarget === 'routine' && buildingRoutine) {
                setBuildingRoutine({
                  ...buildingRoutine,
                  exercises: [
                    ...buildingRoutine.exercises,
                    {
                      id: `re-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                      exerciseId: ex.id,
                      notes: '',
                      restTimerSeconds: DEFAULT_REST_SECONDS, // Default 60s (01:00)
                      supersetGroup: null,
                      sets: [
                        {
                          id: `rs-1-${Date.now()}`,
                          type: 'normal',
                          weightKg: 0,
                          reps: 10,
                          rpe: 8,
                          completed: false,
                        },
                        {
                          id: `rs-2-${Date.now()}`,
                          type: 'normal',
                          weightKg: 0,
                          reps: 10,
                          rpe: 8.5,
                          completed: false,
                        },
                        {
                          id: `rs-3-${Date.now()}`,
                          type: 'normal',
                          weightKg: 0,
                          reps: 10,
                          rpe: 9,
                          completed: false,
                        },
                      ],
                    },
                  ],
                });
                setPickerTarget(null);
              }
            }}
          />
        )}

        {plateCalcTarget && (
          <PlateCalculatorModal
            initialWeight={plateCalcTarget.initialWeight}
            onClose={() => setPlateCalcTarget(null)}
            onApplyWarmupSets={(warmups) =>
              handleInjectWarmupSets(
                plateCalcTarget.exerciseInstanceId,
                warmups
              )
            }
          />
        )}

        {completedSummary && (
          <WorkoutSummaryModal
            workout={completedSummary}
            exerciseCatalog={exerciseMap}
            onClose={() => setCompletedSummary(null)}
          />
        )}

        {/* BOTTOM NAVIGATION BAR */}
        <nav className="hevy-bottom-nav">
          <button
            type="button"
            className={`hevy-nav-btn ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            <Home size={20} />
            <span>Início</span>
          </button>
          <button
            type="button"
            className={`hevy-nav-btn ${activeTab === 'workout' ? 'active' : ''}`}
            onClick={() => setActiveTab('workout')}
          >
            <Dumbbell size={20} />
            <span>Treino</span>
          </button>
          <button
            type="button"
            className={`hevy-nav-btn ${activeTab === 'week' ? 'active' : ''}`}
            onClick={() => setActiveTab('week')}
          >
            <Calendar size={20} />
            <span>Week</span>
          </button>
          <button
            type="button"
            className={`hevy-nav-btn ${
              activeTab === 'exercises' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('exercises')}
          >
            <Library size={20} />
            <span>Exercícios</span>
          </button>
          <button
            type="button"
            className={`hevy-nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={20} />
            <span>Perfil</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default App;
