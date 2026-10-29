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
  if (
    m.includes('rate limit') ||
    m.includes('too many') ||
    m.includes('over_email_send_rate_limit')
  ) {
    if (m.includes('email') || m.includes('send')) {
      return 'Limite de e-mails do Supabase atingido (máx. 2 por hora no plano grátis). Desative "Confirm email" no painel do Supabase (Authentication > Providers > Email) para cadastros instantâneos e ilimitados.';
    }
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos ou desative a confirmação de e-mail no painel do Supabase.';
  }
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
  const [lastError, setLastError] = useState<string | null>(null);
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
  const hasPendingPushRef = useRef(false);
  const lastPushedFpRef = useRef('');
  const lastPulledFpRef = useRef('');
  const localPushTimestampRef = useRef(0);
  const pushTimerRef = useRef<number | null>(null);
  const pullTimerRef = useRef<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // ---------- SESSION CLEANUP ----------
  const stopSession = useCallback(() => {
    if (supabase && channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    userRef.current = null;
    setUser(null);
    lastPushedFpRef.current = '';
    lastPulledFpRef.current = '';
    setLastError(null);
    setStatus(isSupabaseConfigured ? 'signed-out' : 'disabled');
  }, []);

  // ---------- PUSH (Local -> Cloud) ----------
  const push = useCallback(
    async (opts?: { force?: boolean }): Promise<void> => {
      if (!supabase) return;
      if (isPushingRef.current) {
        hasPendingPushRef.current = true;
        return;
      }
      if (isPullingRef.current && !opts?.force) return;

      // Valida sessão atual diretamente com o Supabase Auth no servidor
      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      const currentUser = authData?.user;

      if (authError || !currentUser) {
        console.warn(
          '[Tatagan Cloud] Push ignorado: usuário não autenticado no servidor.'
        );
        stopSession();
        return;
      }

      userRef.current = currentUser;
      setUser(currentUser);

      const currentState = stateRef.current;
      const currentFp = getFingerprint(currentState);
      if (!currentFp) return;

      if (!opts?.force) {
        if (
          currentFp === lastPushedFpRef.current ||
          currentFp === lastPulledFpRef.current
        ) {
          return;
        }
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

        console.log('[Tatagan Cloud] Enviando dados para o Supabase...', {
          userId: currentUser.id,
          rotinas: currentState.routines.length,
          treinos: currentState.workouts.length,
        });

        const { error } = await supabase
          .from(SYNC_TABLE)
          .upsert(rows, { onConflict: 'user_id,collection,item_id' });

        if (error) {
          console.error('[Tatagan Cloud] Erro no envio (push):', error);
          throw error;
        }

        console.log('[Tatagan Cloud] Dados salvos com sucesso na nuvem!');
        lastPushedFpRef.current = currentFp;
        setLastError(null);
        setLastSyncedAt(Date.now());
        setStatus(navigator.onLine === false ? 'offline' : 'synced');
      } catch (err: any) {
        console.error('[Tatagan Cloud] Falha no push:', err);
        const rawMsg = err?.message || '';
        let displayMsg = rawMsg || 'Falha ao salvar na nuvem.';
        if (rawMsg.includes('row-level security') || rawMsg.includes('42501')) {
          displayMsg =
            'Erro de RLS no Supabase. Execute o script supabase_reset_all.sql no SQL Editor.';
        }
        setLastError(displayMsg);
        setStatus(navigator.onLine === false ? 'offline' : 'error');
      } finally {
        isPushingRef.current = false;
        if (hasPendingPushRef.current) {
          hasPendingPushRef.current = false;
          window.setTimeout(() => void push(), 100);
        }
      }
    },
    [stopSession]
  );

  // ---------- PULL (Cloud -> Local) ----------
  const pull = useCallback(
    async (opts?: { force?: boolean; isInitial?: boolean }): Promise<void> => {
      if (!supabase) return;
      if (isPullingRef.current && !opts?.force) return;

      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      const currentUser = authData?.user;

      if (authError || !currentUser) {
        console.warn(
          '[Tatagan Cloud] Pull ignorado: usuário não autenticado no servidor.'
        );
        stopSession();
        return;
      }

      userRef.current = currentUser;
      setUser(currentUser);

      isPullingRef.current = true;
      setStatus('syncing');

      try {
        console.log('[Tatagan Cloud] Buscando dados do Supabase...', {
          userId: currentUser.id,
        });

        const { data, error } = await supabase
          .from(SYNC_TABLE)
          .select('collection, item_id, data, updated_at')
          .eq('user_id', currentUser.id);

        if (error) {
          console.error('[Tatagan Cloud] Erro na busca (pull):', error);
          throw error;
        }

        console.log(
          '[Tatagan Cloud] Dados recebidos do Supabase:',
          data?.length || 0,
          'registros'
        );

        // Se for o primeiro login e o banco estiver 100% vazio, faz upload dos dados locais para inicializar a conta
        if (opts?.isInitial && (!data || data.length === 0)) {
          console.log(
            '[Tatagan Cloud] Banco na nuvem vazio para esta conta. Inicializando com dados locais...'
          );
          isPullingRef.current = false;
          void push({ force: true });
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

          const remoteRoutines = routineRow
            ? (routineRow.data as Routine[])
            : legacyRoutines.length > 0
            ? legacyRoutines
            : seedStateRef.current.routines;

          const remoteWorkouts = workoutRow
            ? (workoutRow.data as CompletedWorkout[])
            : legacyWorkouts.length > 0
            ? legacyWorkouts
            : seedStateRef.current.workouts;

          const remoteState: SyncState = {
            settings:
              (settingsRow?.data as SyncedSettings) ||
              seedStateRef.current.settings,
            routines: remoteRoutines,
            workouts: remoteWorkouts,
            customExercises:
              (customRow?.data as Exercise[]) ||
              seedStateRef.current.customExercises,
            measurements:
              (measureRow?.data as BodyMeasurement[]) ||
              seedStateRef.current.measurements,
          };

          const remoteFp = getFingerprint(remoteState);
          const currentLocalFp = getFingerprint(stateRef.current);

          // Aplica dados da nuvem se forem diferentes ou se for pull forçado
          if (opts?.force || (remoteFp && remoteFp !== currentLocalFp)) {
            console.log(
              '[Tatagan Cloud] Aplicando dados da nuvem ao aparelho!',
              {
                rotinas: remoteState.routines.length,
                treinos: remoteState.workouts.length,
              }
            );
            lastPulledFpRef.current = remoteFp;
            lastPushedFpRef.current = remoteFp;
            applyRef.current(remoteState);
          } else {
            console.log(
              '[Tatagan Cloud] Aparelho já está alinhado com a nuvem.'
            );
          }
        }

        setLastError(null);
        setLastSyncedAt(Date.now());
        setStatus(navigator.onLine === false ? 'offline' : 'synced');
      } catch (err: any) {
        console.error('[Tatagan Cloud] Falha no pull:', err);
        setLastError(err?.message || 'Falha ao baixar da nuvem.');
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

      // Realiza o primeiro pull limpo da nuvem com force=true
      void pull({ force: true, isInitial: true });

      // Configura canal em tempo real para sincronização instantânea
      channelRef.current = supabase
        .channel(`tatagan-realtime-${nextUser.id}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: SYNC_TABLE,
          },
          (payload) => {
            const newRow = payload.new as { user_id?: string } | undefined;
            const oldRow = payload.old as { user_id?: string } | undefined;
            const rowUid = newRow?.user_id || oldRow?.user_id;

            // Só processa evento se pertencer a este usuário
            if (rowUid && rowUid !== nextUser.id) return;

            // Se o próprio cliente acabou de enviar alterações (menos de 2s), ignora o eco
            if (Date.now() - localPushTimestampRef.current < 2000) {
              return;
            }

            console.log(
              '[Tatagan Cloud] Atualização recebida via Realtime de outro dispositivo!'
            );
            if (pullTimerRef.current) clearTimeout(pullTimerRef.current);
            pullTimerRef.current = window.setTimeout(() => {
              void pull({ force: true });
            }, 300);
          }
        )
        .subscribe((subStatus) => {
          console.log('[Tatagan Cloud] Status Realtime:', subStatus);
        });
    },
    [pull]
  );

  // ---------- AUTH LISTENER ----------
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let isMounted = true;

    // Valida a sessão diretamente com o servidor Supabase Auth (evita sessões fantasmas/órfãs)
    client.auth.getUser().then(async ({ data, error }) => {
      if (!isMounted) return;
      if (error || !data.user) {
        // Token inválido, expirado ou usuário excluído do banco
        await client.auth.signOut();
        try {
          localStorage.removeItem('tatagan-auth');
        } catch {
          // ignore
        }
        stopSession();
      } else {
        startSession(data.user);
      }
      setAuthReady(true);
    });

    const { data: authListener } = client.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        if (event === 'PASSWORD_RECOVERY') {
          setRecoveryMode(true);
        }

        const sessionUser = session?.user ?? null;
        if (sessionUser && userRef.current?.id !== sessionUser.id) {
          startSession(sessionUser);
        } else if (!sessionUser && (event === 'SIGNED_OUT' || userRef.current)) {
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

  // ---------- AUTO-PUSH ON STATE CHANGE (Debounce de 600ms) ----------
  useEffect(() => {
    if (!user) return;

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = window.setTimeout(() => {
      void push();
    }, 600);

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [state, user, push]);

  // ---------- LISTENERS DE REDE, FOCO & UNLOAD + POLLING DE SEGURANÇA ----------
  useEffect(() => {
    if (!user) return;

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        console.log(
          '[Tatagan Cloud] Aba focada / tela desbloqueada: sincronizando dados...'
        );
        void pull({ force: true });
      } else if (document.visibilityState === 'hidden') {
        // Ao minimizar ou trocar de aba no smartphone/PC, envia pendências
        const currentFp = getFingerprint(stateRef.current);
        if (currentFp && currentFp !== lastPushedFpRef.current) {
          void push({ force: true });
        }
      }
    };

    const handleBeforeUnload = () => {
      const currentFp = getFingerprint(stateRef.current);
      if (currentFp && currentFp !== lastPushedFpRef.current) {
        void push({ force: true });
      }
    };

    const handleOnline = () => {
      setStatus('syncing');
      void pull({ force: true }).then(() => void push());
    };

    const handleOffline = () => setStatus('offline');

    // Intervalo de segurança a cada 10s para pegar alterações mesmo se o WebSocket falhar no mobile
    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void pull();
      }
    }, 10000);

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, pull, push]);

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
      await push({ force: true });
    } catch {
      // ignora falha de envio ao sair
    }
    stopSession();
    resetRef.current();
    await supabase.auth.signOut();
    try {
      localStorage.removeItem('tatagan-auth');
    } catch {
      // ignore
    }
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
    await pull({ force: true });
    await push({ force: true });
  };

  return {
    configured: isSupabaseConfigured,
    authReady,
    user,
    status,
    lastSyncedAt,
    lastError,
    recoveryMode,
    setRecoveryMode,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
    syncNow,
    pushToCloud: () => push({ force: true }),
    pullFromCloud: () => pull({ force: true }),
  };
}
