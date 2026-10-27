import React, { useState, useEffect, useMemo } from 'react';
import {
  Home,
  Dumbbell,
  Library,
  User,
  Award,
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
  Disc,
  Volume2,
  Sun,
  Moon,
  Watch,
  Sparkles,
  FolderPlus,
  Download,
  Scale,
  Link2,
  Info,
  Send,
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
  CoachMessage,
} from './types';
import {
  INITIAL_ROUTINES,
  INITIAL_WORKOUT_HISTORY,
  INITIAL_MEASUREMENTS,
  INITIAL_COACH_MESSAGES,
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
import { MuscleHeatmap } from './components/MuscleHeatmap';
import { PlateCalculatorModal } from './components/PlateCalculatorModal';
import { ExerciseDetailModal } from './components/ExerciseDetailModal';
import { ExercisePickerModal } from './components/ExercisePickerModal';
import { WorkoutSummaryModal } from './components/WorkoutSummaryModal';

type NavTab = 'feed' | 'workout' | 'coach' | 'exercises' | 'profile';

interface LiveWorkoutState {
  id: string;
  title: string;
  startTime: number;
  exercises: WorkoutExercise[];
}

const STORAGE_KEYS = {
  workouts: 'hevy_clone_workouts_v2',
  routines: 'hevy_clone_routines_v2',
  customExercises: 'hevy_clone_custom_exercises_v2',
  measurements: 'hevy_clone_measurements_v2',
  coachMessages: 'hevy_clone_coach_messages_v2',
  activeWorkout: 'hevy_clone_active_workout_v2',
  timerSound: 'hevy_clone_timer_sound_v2',
  theme: 'hevy_clone_theme_v2',
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

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('workout');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem(STORAGE_KEYS.theme) as 'dark' | 'light') || 'dark';
  });
  const [timerSound, setTimerSound] = useState<HevySoundName>(() => {
    return (
      (localStorage.getItem(STORAGE_KEYS.timerSound) as HevySoundName) ||
      'boxing_bell'
    );
  });
  const [watchConnected, setWatchConnected] = useState(true);
  const [watchHeartRate, setWatchHeartRate] = useState(118);

  // Persistent Data
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

  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.coachMessages);
    return saved ? JSON.parse(saved) : INITIAL_COACH_MESSAGES;
  });
  const [coachInput, setCoachInput] = useState('');

  // Active Live Workout State
  const [activeWorkout, setActiveWorkout] = useState<LiveWorkoutState | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.activeWorkout);
    return saved ? JSON.parse(saved) : null;
  });
  const [workoutSheetExpanded, setWorkoutSheetExpanded] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Rest Timer State
  const [restRemaining, setRestRemaining] = useState<number>(0);
  const [restTotal, setRestTotal] = useState<number>(90);

  // Modals State
  const [inspectExercise, setInspectExercise] = useState<Exercise | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'active' | 'routine' | null>(null);
  const [plateCalcTarget, setPlateCalcTarget] = useState<{
    exerciseInstanceId: string;
    initialWeight: number;
  } | null>(null);
  const [completedSummary, setCompletedSummary] =
    useState<CompletedWorkout | null>(null);

  // Routine Builder Modal State
  const [buildingRoutine, setBuildingRoutine] = useState<Routine | null>(null);

  // Exercise Catalog Search State (Exercises Tab)
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogMuscle, setCatalogMuscle] = useState('all');
  const [catalogEquipment, setCatalogEquipment] = useState('all');

  // Feed Comment Input State
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

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
    localStorage.setItem(STORAGE_KEYS.measurements, JSON.stringify(measurements));
  }, [measurements]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.coachMessages,
      JSON.stringify(coachMessages)
    );
  }, [coachMessages]);

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

  // Live Workout Elapsed Timer & Simulated Apple Watch / WearOS BPM
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
      setWatchHeartRate((hr) => {
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.min(168, Math.max(98, hr + delta));
      });
    };
    updateElapsed();
    const interval = window.setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout]);

  // Live Rest Countdown Timer
  useEffect(() => {
    if (restRemaining <= 0) return;
    const timer = window.setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          playHevySound(timerSound);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [restRemaining, timerSound]);

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
          sets: re.sets.map((s: WorkoutSet, sIdx: number) => ({
            ...s,
            id: `live-set-${Date.now()}-${idx}-${sIdx}`,
            completed: false,
          })),
        }))
      : [];

    const session: LiveWorkoutState = {
      id: `session-${Date.now()}`,
      title: routine ? routine.title : 'Treino Livre Hevy',
      startTime: Date.now(),
      exercises: clonedExercises,
    };
    setActiveWorkout(session);
    setWorkoutSheetExpanded(true);
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
      restTimerSeconds: 90,
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

      setRestTotal(exInstance.restTimerSeconds || 90);
      setRestRemaining(exInstance.restTimerSeconds || 90);
    }
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

    const totalVolume = calculateExercisesVolume(activeWorkout.exercises);
    const finalized: CompletedWorkout = {
      id: activeWorkout.id,
      title: activeWorkout.title,
      date: 'Agora mesmo',
      durationSeconds: Math.max(60, elapsedSeconds),
      volumeKg: totalVolume,
      totalSets: completedSetsCount,
      prCount: Math.max(1, prs),
      likes: 1,
      likedByMe: true,
      comments: [],
      user: {
        username: 'iesus_candido',
        displayName: 'Iesus Candido',
        avatar: 'IC',
        isPro: true,
        gymName: 'Hevy Mobile Web',
      },
      exercises: activeWorkout.exercises,
    };

    setWorkouts([finalized, ...workouts]);
    setActiveWorkout(null);
    setRestRemaining(0);
    setCompletedSummary(finalized);
    setActiveTab('feed');
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

  // Overall Profile Statistics
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
    const equivalence = getVolumeComparison(totalVolume);
    return {
      totalVolume,
      totalSets,
      muscleCounts,
      equivalence,
    };
  }, [workouts, exerciseMap]);

  return (
    <div className="hevy-viewport-wrapper">
      <div className="hevy-mobile-shell">
        {/* TOP HEADER */}
        <header className="hevy-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img
              src={
                theme === 'dark'
                  ? '/assets/brand/hevy_logo_name_white.png'
                  : '/assets/brand/hevy_logo_name.png'
              }
              alt="Hevy"
              style={{ height: 22, objectFit: 'contain' }}
            />
            <img
              src="/assets/brand/pro_badge.png"
              alt="PRO"
              style={{ height: 16, objectFit: 'contain' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Smartwatch Sync Pill */}
            <button
              type="button"
              onClick={() => setWatchConnected((v) => !v)}
              title="Sincronização em Tempo Real WatchOS / WearOS"
              style={{
                border: '1px solid var(--hevy-border)',
                background: watchConnected
                  ? 'rgba(42, 204, 88, 0.14)'
                  : 'var(--hevy-elevated)',
                color: watchConnected
                  ? 'var(--hevy-green)'
                  : 'var(--hevy-text-muted)',
                borderRadius: 999,
                padding: '5px 10px',
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Watch size={13} />
              {watchConnected
                ? activeWorkout
                  ? `${watchHeartRate} BPM`
                  : 'Watch Sync'
                : 'Watch Off'}
            </button>

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
              title="Trocar som oficial do Timer Hevy"
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
          {/* ==================== TAB 1: SOCIAL FEED ==================== */}
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
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--hevy-blue)',
                    }}
                  >
                    COMUNIDADE HEVY & HISTÓRICO
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                    {workouts.length} treinos registrados •{' '}
                    {lifetimeStats.totalVolume.toLocaleString('pt-BR')} kg
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

              {workouts.map((w: CompletedWorkout) => {
                const vol =
                  w.volumeKg || calculateExercisesVolume(w.exercises);
                const setsCount =
                  w.totalSets || calculateExercisesCompletedSets(w.exercises);
                const workoutMuscles = computeMuscleDistributionFromExercises(
                  w.exercises,
                  exerciseMap
                );
                const eq = getVolumeComparison(vol);

                return (
                  <article
                    key={w.id}
                    className="hevy-card"
                    style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                  >
                    {/* Author Row */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 10 }}
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
                          {w.user.avatar}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>
                            {w.user.displayName}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--hevy-text-muted)',
                            }}
                          >
                            @{w.user.username} • {w.date}
                          </div>
                        </div>
                      </div>

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
                        <Play size={12} /> Repetir Treino
                      </button>
                    </div>

                    {/* Workout Title & Metrics */}
                    <div>
                      <h3 style={{ fontSize: 17, fontWeight: 700 }}>{w.title}</h3>
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
                            style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}
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
                      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
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
                        style={{ height: 32, width: 48, objectFit: 'contain' }}
                      />
                    </div>

                    {/* Compact Anatomical Heatmap */}
                    <MuscleHeatmap
                      muscleCounts={workoutMuscles}
                      compact
                      showLegend={false}
                    />

                    {/* Social Actions (Like, Comment, Share) */}
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
                            <span style={{ color: 'var(--hevy-text-secondary)' }}>
                              {c.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        placeholder="Adicionar comentário de incentivo..."
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
                                        username: 'iesus_candido',
                                        avatar: 'IC',
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
                        Enviar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* ==================== TAB 2: WORKOUT & ROUTINES ==================== */}
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
                  onClick={() =>
                    setBuildingRoutine({
                      id: `routine-${Date.now()}`,
                      title: 'Nova Rotina Hipertrofia',
                      folderId: 'folder-ppl',
                      exercises: [],
                    })
                  }
                >
                  <FolderPlus size={14} /> Nova Rotina
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
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: 'var(--hevy-blue)',
                              textTransform: 'uppercase',
                            }}
                          >
                            📁 {routine.lastPerformed || 'Rotina Oficial'}
                          </span>
                          <h3
                            style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}
                          >
                            {routine.title}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setRoutines((prev) =>
                              prev.filter((r) => r.id !== routine.id)
                            )
                          }
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--hevy-text-muted)',
                            padding: 4,
                          }}
                          title="Excluir rotina"
                        >
                          <Trash2 size={15} />
                        </button>
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
                              } (${re.sets.length}x)`
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

          {/* ==================== TAB 3: HEVY COACH ==================== */}
          {activeTab === 'coach' && (
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
                  gap: 10,
                }}
              >
                <img
                  src="/assets/brand/hevy_coach_logo_white.png"
                  alt="Hevy Coach"
                  style={{
                    height: 26,
                    objectFit: 'contain',
                    alignSelf: 'flex-start',
                  }}
                />
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--hevy-text-secondary)',
                    lineHeight: 1.45,
                  }}
                >
                  Acompanhamento de performance e periodização integrado ao Hevy Coach.
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                    marginTop: 4,
                  }}
                >
                  <div
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.35)',
                      padding: 10,
                      borderRadius: 10,
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{ fontSize: 10, color: 'var(--hevy-text-muted)' }}
                    >
                      ADESÃO MESOCICLO
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: 'var(--hevy-green)',
                      }}
                    >
                      94%
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.35)',
                      padding: 10,
                      borderRadius: 10,
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{ fontSize: 10, color: 'var(--hevy-text-muted)' }}
                    >
                      SEMANA ATUAL
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: 'var(--hevy-blue)',
                      }}
                    >
                      Bloco 4 / 6
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.35)',
                      padding: 10,
                      borderRadius: 10,
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{ fontSize: 10, color: 'var(--hevy-text-muted)' }}
                    >
                      RPE ALVO
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: 'var(--hevy-gold)',
                      }}
                    >
                      8.0 - 9.0
                    </div>
                  </div>
                </div>
              </div>

              {/* Coach Interactive Chat */}
              <div
                className="hevy-card"
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color="var(--hevy-blue)" />
                  <h3 style={{ fontSize: 15, fontWeight: 700 }}>
                    Chat Direto • Coach Marcos (Hevy Coach)
                  </h3>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    maxHeight: 230,
                    overflowY: 'auto',
                  }}
                >
                  {coachMessages.map((msg: CoachMessage) => (
                    <div
                      key={msg.id}
                      style={{
                        alignSelf:
                          msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '86%',
                        backgroundColor:
                          msg.sender === 'user'
                            ? 'var(--hevy-blue)'
                            : 'var(--hevy-elevated)',
                        color: '#FFF',
                        padding: '9px 12px',
                        borderRadius: 12,
                        fontSize: 13,
                        lineHeight: 1.4,
                      }}
                    >
                      <div>{msg.text}</div>
                      <div
                        style={{
                          fontSize: 10,
                          opacity: 0.7,
                          marginTop: 4,
                          textAlign: 'right',
                        }}
                      >
                        {msg.timestamp}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    placeholder="Enviar feedback do treino ao Coach..."
                    value={coachInput}
                    onChange={(e) => setCoachInput(e.target.value)}
                    className="hevy-set-input"
                    style={{
                      textAlign: 'left',
                      padding: '0 12px',
                      height: 38,
                      fontSize: 13,
                    }}
                  />
                  <button
                    type="button"
                    className="hevy-btn-primary"
                    style={{ padding: '0 12px' }}
                    onClick={() => {
                      if (!coachInput.trim()) return;
                      const userMsg: CoachMessage = {
                        id: `cm-${Date.now()}`,
                        sender: 'user',
                        text: coachInput.trim(),
                        timestamp: 'Agora',
                      };
                      const autoReply: CoachMessage = {
                        id: `cm-reply-${Date.now()}`,
                        sender: 'coach',
                        text: 'Perfeito! Registrei no seu check-in semanal do Hevy Coach. Mantenha a progressão de carga!',
                        timestamp: 'Agora',
                      };
                      setCoachMessages([...coachMessages, userMsg, autoReply]);
                      setCoachInput('');
                    }}
                  >
                    <Send size={15} />
                  </button>
                </div>

                <button
                  type="button"
                  className="hevy-btn-primary"
                  style={{ width: '100%', marginTop: 4 }}
                  onClick={() => startWorkout(routines[0])}
                >
                  <Play size={15} /> Iniciar Rotina Prescrita pelo Coach
                </button>
              </div>

              <div className="hevy-card">
                <MuscleHeatmap
                  muscleCounts={lifetimeStats.muscleCounts}
                  compact
                />
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
                    Biblioteca Oficial ({allExercises.length} Exercícios)
                  </h2>
                  <p style={{ fontSize: 12, color: 'var(--hevy-text-secondary)' }}>
                    Extraídos do bundle Hermes com vídeos MP4 e instruções em Português
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

          {/* ==================== TAB 5: PROFILE & ANALYTICS ==================== */}
          {activeTab === 'profile' && (
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
                style={{ display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <img
                  src="/assets/brand/ic_launcher_round.png"
                  alt="Avatar"
                  style={{ width: 60, height: 60, borderRadius: '50%' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                      Iesus Candido
                    </h2>
                  </div>
                  <div
                    style={{ fontSize: 12, color: 'var(--hevy-text-secondary)' }}
                  >
                    @iesus_candido • Atleta PRO
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 14,
                      marginTop: 8,
                      fontSize: 12,
                    }}
                  >
                    <span>
                      <strong>{workouts.length}</strong> Treinos
                    </span>
                    <span>
                      <strong>248</strong> Seguidores
                    </span>
                    <span>
                      <strong>182</strong> Seguindo
                    </span>
                  </div>
                </div>
              </div>

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
                    VOLUME TOTAL ACUMULADO
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
                    {lifetimeStats.totalVolume.toLocaleString('pt-BR')} kg
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--hevy-text-secondary)',
                      marginTop: 2,
                    }}
                  >
                    Equivalente a {lifetimeStats.equivalence.article}{' '}
                    <strong>{lifetimeStats.equivalence.name}</strong> (
                    {lifetimeStats.totalSets} séries)
                  </div>
                </div>
                <img
                  src={lifetimeStats.equivalence.asset}
                  alt={lifetimeStats.equivalence.name}
                  style={{ width: 84, height: 64, objectFit: 'contain' }}
                />
              </div>

              <div className="hevy-card">
                <MuscleHeatmap muscleCounts={lifetimeStats.muscleCounts} />
              </div>

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
                        {m.weightKg} kg • {m.bodyFatPct}% BF • Braço {m.armsCm} cm
                      </span>
                    </div>
                  ))}
                </div>
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
                          { workouts, routines, measurements },
                          null,
                          2
                        ),
                      ],
                      { type: 'application/json' }
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'hevy-backup.json';
                    a.click();
                  }}
                >
                  <Download size={15} /> Exportar Dados (JSON)
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
                  ⏱️ {formatTimerMMSS(elapsedSeconds)}
                  {restRemaining > 0 &&
                    ` • Descanso: ${formatTimerMMSS(restRemaining)}`}
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

            {restRemaining > 0 && (
              <div
                style={{
                  backgroundColor: 'var(--hevy-card)',
                  borderBottom: '1px solid var(--hevy-blue)',
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={16} color="var(--hevy-blue)" />
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--hevy-text-secondary)',
                      }}
                    >
                      TEMPO DE DESCANSO ({restTotal}s)
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: 'var(--hevy-blue)',
                      }}
                    >
                      {formatTimerMMSS(restRemaining)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="hevy-btn-secondary"
                    style={{ padding: '5px 10px', fontSize: 12 }}
                    onClick={() => setRestRemaining((r) => Math.max(0, r - 15))}
                  >
                    -15s
                  </button>
                  <button
                    type="button"
                    className="hevy-btn-secondary"
                    style={{ padding: '5px 10px', fontSize: 12 }}
                    onClick={() => setRestRemaining((r) => r + 15)}
                  >
                    +15s
                  </button>
                  <button
                    type="button"
                    className="hevy-btn-primary"
                    style={{ padding: '5px 10px', fontSize: 12 }}
                    onClick={() => setRestRemaining(0)}
                  >
                    Pular
                  </button>
                </div>
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

                      <div style={{ display: 'flex', gap: 6 }}>
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
                          {exInstance.supersetGroup ? 'Superset' : 'Bi-set'}
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
                          <Disc size={14} /> Anilhas
                        </button>
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
                  }
                }}
              >
                Descartar Treino
              </button>
            </div>
          </div>
        )}

        {/* ==================== ROUTINE BUILDER MODAL ==================== */}
        {buildingRoutine && (
          <div
            className="hevy-modal-backdrop"
            onClick={() => setBuildingRoutine(null)}
          >
            <div
              className="hevy-modal-sheet"
              onClick={(e) => e.stopPropagation()}
              style={{ padding: 16, gap: 12, height: '85%' }}
            >
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>Criar Nova Rotina</h3>
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
                style={{ textAlign: 'left', padding: '0 12px', height: 40 }}
              />
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {buildingRoutine.exercises.map((re: WorkoutExercise) => {
                  const meta = exerciseMap[re.exerciseId];
                  return (
                    <div
                      key={re.id}
                      className="hevy-card"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {meta?.title || re.exerciseId}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--hevy-blue)' }}>
                        {re.sets.length} séries
                      </span>
                    </div>
                  );
                })}

                <button
                  type="button"
                  className="hevy-btn-secondary"
                  onClick={() => setPickerTarget('routine')}
                >
                  <Plus size={16} /> Adicionar Exercício à Rotina
                </button>
              </div>
              <button
                type="button"
                className="hevy-btn-primary"
                onClick={() => {
                  if (buildingRoutine.exercises.length === 0) {
                    alert('Adicione pelo menos 1 exercício à rotina!');
                    return;
                  }
                  setRoutines([buildingRoutine, ...routines]);
                  setBuildingRoutine(null);
                }}
              >
                Salvar Rotina
              </button>
            </div>
          </div>
        )}

        {/* ==================== MODALS ==================== */}
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
                      id: `re-${Date.now()}`,
                      exerciseId: ex.id,
                      notes: '',
                      restTimerSeconds: 90,
                      supersetGroup: null,
                      sets: [
                        {
                          id: `rs-1-${Date.now()}`,
                          type: 'normal',
                          weightKg: 40,
                          reps: 10,
                          rpe: 8,
                          completed: false,
                        },
                        {
                          id: `rs-2-${Date.now()}`,
                          type: 'normal',
                          weightKg: 40,
                          reps: 10,
                          rpe: 8.5,
                          completed: false,
                        },
                        {
                          id: `rs-3-${Date.now()}`,
                          type: 'normal',
                          weightKg: 40,
                          reps: 10,
                          rpe: 9,
                          completed: false,
                        },
                      ],
                    },
                  ],
                });
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
            className={`hevy-nav-btn ${activeTab === 'coach' ? 'active' : ''}`}
            onClick={() => setActiveTab('coach')}
          >
            <Award size={20} />
            <span>Coach</span>
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
