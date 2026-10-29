import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, SYNC_TABLE } from '../lib/supabase';
import type {
  BodyMeasurement,
  CompletedWorkout,
  Exercise,
  Routine,
  UserProfile,
} from '../types';
import type { HevySoundName } from '../utils/sound';

// ==================== TYPES ====================

export interface SyncedSettings {
  userProfile: UserProfile;
  weekStartsOn: 0 | 1;
  timerSound: HevySoundName;
  theme: 'dark' | 'light';
}

export interface SyncState {
  routines: Routine[];
  workouts: CompletedWorkout[];
  customExercises: Exercise[];
  measurements: BodyMeasurement[];
  settings: SyncedSettings;
}

export type SyncStatus =
  | 'disabled'
  | 'signed-out'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'error';

export interface AuthResult {
  ok: boolean;
  error?: string;
  info?: string;
}

interface UseSupabaseSyncOptions {
  state: SyncState;
  seedState: SyncState;
  applyRemoteState: (next: SyncState) => void;
  resetLocalData: () => void;
}

// ==================== HELPERS ====================

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed'))
    return 'E-mail ainda não confirmado. Verifique sua caixa de entrada (ou spam).';
  if (
    m.includes('user already registered') ||
    m.includes('already been registered')
  )
    return 'Este e-mail já está cadastrado. Use a aba "Login".';
  if (m.includes('password should be at least'))
    return 'A senha é muito curta (mínimo de 6 caracteres).';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'Sem conexão com o servidor. Verifique sua internet.';
  if (m.includes('signups not allowed'))
    return 'Novos cadastros estão desativados neste projeto Supabase.';
  return message;
}

function getFingerprint(state: SyncState): string {
  try {
    return JSON.stringify({
      r: state.routines,
      w: state.workouts,
      c: state.customExercises,
      m: state.measurements,
      s: state.settings,
    });
  } catch {
    return '';
  }
}

// ==================== HOOK ====================

export function useSupabaseSync({
  state,
  seedState,
  applyRemoteState,
  resetLocalData,
}: UseSupabaseSyncOptions) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [status, setStatus] = useState<SyncStatus>(
    isSupabaseConfigured ? 'signed-out' : 'disabled'
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;
  const seedStateRef = useRef(seedState);
  seedStateRef.current = seedState;
  const applyRef = useRef(applyRemoteState);
  applyRef.current = applyRemoteState;
  const resetRef = useRef(resetLocalData);
  resetRef.current = resetLocalData;

  const userRef = useRef<User | null>(null);
  const isPushingRef = useRef(false);
  const isPullingRef = useRef(false);
  const lastPushedFpRef = useRef('');
  const lastPulledFpRef = useRef('');
  const localPushTimestampRef = useRef(0);
  const pushTimerRef = useRef<number | null>(null);
  const pullTimerRef = useRef<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // ---------- PUSH (Local -> Cloud) ----------
  const push = useCallback(async (): Promise<void> => {
    const currentUser = userRef.current;
    if (!supabase || !currentUser) return;
    if (isPushingRef.current || isPullingRef.current) return;

    const currentState = stateRef.current;
    const currentFp = getFingerprint(currentState);
    if (!currentFp) return;

    // Se o estado não mudou desde o último push ou pull, nada a fazer!
    if (
      currentFp === lastPushedFpRef.current ||
      currentFp === lastPulledFpRef.current
    ) {
      return;
    }

    isPushingRef.current = true;
    localPushTimestampRef.current = Date.now();
    setStatus('syncing');

    try {
      const now = new Date().toISOString();
      const rows = [
        {
          user_id: currentUser.id,
          collection: 'settings',
          item_id: 'main',
          data: currentState.settings,
          sort_key: 0,
          updated_at: now,
        },
        {
          user_id: currentUser.id,
          collection: 'routine',
          item_id: 'all',
          data: currentState.routines,
          sort_key: 0,
          updated_at: now,
        },
        {
          user_id: currentUser.id,
          collection: 'workout',
          item_id: 'all',
          data: currentState.workouts,
          sort_key: 0,
          updated_at: now,
        },
        {
          user_id: currentUser.id,
          collection: 'custom_exercise',
          item_id: 'all',
          data: currentState.customExercises,
          sort_key: 0,
          updated_at: now,
        },
        {
          user_id: currentUser.id,
          collection: 'measurement',
          item_id: 'all',
          data: currentState.measurements,
          sort_key: 0,
          updated_at: now,
        },
      ];

      const { error } = await supabase
        .from(SYNC_TABLE)
        .upsert(rows, { onConflict: 'user_id,collection,item_id' });

      if (error) throw error;

      lastPushedFpRef.current = currentFp;
      setLastSyncedAt(Date.now());
      setStatus(navigator.onLine === false ? 'offline' : 'synced');
    } catch {
      setStatus(navigator.onLine === false ? 'offline' : 'error');
    } finally {
      isPushingRef.current = false;
    }
  }, []);

  // ---------- PULL (Cloud -> Local) ----------
  const pull = useCallback(
    async (opts?: { isInitial?: boolean }): Promise<void> => {
      const currentUser = userRef.current;
      if (!supabase || !currentUser) return;
      if (isPullingRef.current) return;

      isPullingRef.current = true;
      setStatus('syncing');

      try {
        const { data, error } = await supabase
          .from(SYNC_TABLE)
          .select('collection, item_id, data')
          .eq('user_id', currentUser.id);

        if (error) throw error;

        // Se for o primeiro login e o banco estiver vazio, faz upload dos dados locais (migração transparente)
        if (opts?.isInitial && (!data || data.length === 0)) {
          isPullingRef.current = false;
          void push();
          return;
        }

        if (data && data.length > 0) {
          const settingsRow = data.find(
            (r) => r.collection === 'settings' && r.item_id === 'main'
          );
          const routineRow = data.find(
            (r) => r.collection === 'routine' && r.item_id === 'all'
          );
          const workoutRow = data.find(
            (r) => r.collection === 'workout' && r.item_id === 'all'
          );
          const customRow = data.find(
            (r) => r.collection === 'custom_exercise' && r.item_id === 'all'
          );
          const measureRow = data.find(
            (r) => r.collection === 'measurement' && r.item_id === 'all'
          );

          // Suporte retrocompatível caso existam linhas individuais legadas
          const legacyRoutines = data
            .filter((r) => r.collection === 'routine' && r.item_id !== 'all')
            .map((r) => r.data as Routine);
          const legacyWorkouts = data
            .filter((r) => r.collection === 'workout' && r.item_id !== 'all')
            .map((r) => r.data as CompletedWorkout);

          const remoteState: SyncState = {
            settings:
              (settingsRow?.data as SyncedSettings) ||
              seedStateRef.current.settings,
            routines:
              (routineRow?.data as Routine[]) ||
              (legacyRoutines.length > 0
                ? legacyRoutines
                : seedStateRef.current.routines),
            workouts:
              (workoutRow?.data as CompletedWorkout[]) ||
              (legacyWorkouts.length > 0
                ? legacyWorkouts
                : seedStateRef.current.workouts),
            customExercises:
              (customRow?.data as Exercise[]) ||
              seedStateRef.current.customExercises,
            measurements:
              (measureRow?.data as BodyMeasurement[]) ||
              seedStateRef.current.measurements,
          };

          const remoteFp = getFingerprint(remoteState);
          const currentLocalFp = getFingerprint(stateRef.current);

          // Aplica os dados remotos apenas se forem diferentes do estado local atual
          if (remoteFp && remoteFp !== currentLocalFp) {
            lastPulledFpRef.current = remoteFp;
            applyRef.current(remoteState);
          }
        }

        setLastSyncedAt(Date.now());
        setStatus(navigator.onLine === false ? 'offline' : 'synced');
      } catch {
        setStatus(navigator.onLine === false ? 'offline' : 'error');
      } finally {
        isPullingRef.current = false;
      }
    },
    [push]
  );

  // ---------- SESSION MANAGEMENT & REALTIME ----------
  const startSession = useCallback(
    (nextUser: User) => {
      if (!supabase) return;
      userRef.current = nextUser;
      setUser(nextUser);

      // Limpa canal anterior se houver
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // Realiza o primeiro pull limpo
      void pull({ isInitial: true });

      // Configura canal em tempo real (com filtro de eco local)
      channelRef.current = supabase
        .channel(`tatagan-realtime-${nextUser.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: SYNC_TABLE,
            filter: `user_id=eq.${nextUser.id}`,
          },
          () => {
            // Se o próprio cliente acabou de enviar alterações (menos de 2.5s), ignora o eco!
            if (Date.now() - localPushTimestampRef.current < 2500) {
              return;
            }

            // Notificação vinda de outro dispositivo (celular <-> computador): puxa de forma suave e com debounce
            if (pullTimerRef.current) clearTimeout(pullTimerRef.current);
            pullTimerRef.current = window.setTimeout(() => {
              void pull();
            }, 600);
          }
        )
        .subscribe();
    },
    [pull]
  );

  const stopSession = useCallback(() => {
    if (supabase && channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    userRef.current = null;
    setUser(null);
    lastPushedFpRef.current = '';
    lastPulledFpRef.current = '';
    setStatus(isSupabaseConfigured ? 'signed-out' : 'disabled');
  }, []);

  // ---------- AUTH LISTENER ----------
  useEffect(() => {
    if (!supabase) return;
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      if (data.session?.user) {
        startSession(data.session.user);
      }
      setAuthReady(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        if (event === 'PASSWORD_RECOVERY') {
          setRecoveryMode(true);
        }

        const sessionUser = session?.user ?? null;
        if (sessionUser && userRef.current?.id !== sessionUser.id) {
          startSession(sessionUser);
        } else if (!sessionUser && userRef.current && event === 'SIGNED_OUT') {
          stopSession();
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      if (pullTimerRef.current) clearTimeout(pullTimerRef.current);
    };
  }, [startSession, stopSession]);

  // ---------- AUTO-PUSH ON STATE CHANGE (Debounce de 1.5s suave) ----------
  useEffect(() => {
    if (!user) return;

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = window.setTimeout(() => {
      void push();
    }, 1500);

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [state, user, push]);

  // ---------- LISTENERS DE REDE & FOCO ----------
  useEffect(() => {
    if (!user) return;

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        if (Date.now() - (lastSyncedAt || 0) > 30000) {
          void pull();
        }
      }
    };

    const handleOnline = () => {
      setStatus('syncing');
      void push().then(() => pull());
    };

    const handleOffline = () => setStatus('offline');

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, lastSyncedAt, pull, push]);

  // ==================== AUTH PUBLIC METHODS ====================

  const signIn = async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    if (!supabase) return { ok: false, error: 'Supabase não configurado.' };
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { ok: false, error: translateAuthError(error.message) };
    if (data.user) {
      startSession(data.user);
    }
    return { ok: true };
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<AuthResult> => {
    if (!supabase) return { ok: false, error: 'Supabase não configurado.' };
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) return { ok: false, error: translateAuthError(error.message) };

    if (
      data.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0
    ) {
      return {
        ok: false,
        error: 'Este e-mail já está cadastrado. Use a aba "Login".',
      };
    }

    if (!data.session) {
      return {
        ok: true,
        info: 'Conta criada! Verifique seu e-mail caso a confirmação seja exigida, ou faça login.',
      };
    }

    if (data.user) {
      startSession(data.user);
    }
    return { ok: true };
  };

  const signOut = async () => {
    if (!supabase) return;
    try {
      await push();
    } catch {
      // ignora falha de envio ao sair
    }
    stopSession();
    resetRef.current();
    await supabase.auth.signOut();
  };

  const requestPasswordReset = async (email: string): Promise<AuthResult> => {
    if (!supabase) return { ok: false, error: 'Supabase não configurado.' };
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: window.location.origin,
      }
    );
    if (error) return { ok: false, error: translateAuthError(error.message) };
    return {
      ok: true,
      info: 'Se o e-mail estiver cadastrado, enviamos as instruções de recuperação.',
    };
  };

  const updatePassword = async (newPassword: string): Promise<AuthResult> => {
    if (!supabase) return { ok: false, error: 'Supabase não configurado.' };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: translateAuthError(error.message) };
    setRecoveryMode(false);
    return { ok: true, info: 'Senha atualizada com sucesso!' };
  };

  const syncNow = async () => {
    await push();
    await pull();
  };

  return {
    configured: isSupabaseConfigured,
    authReady,
    user,
    status,
    lastSyncedAt,
    recoveryMode,
    setRecoveryMode,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
    syncNow,
  };
}
