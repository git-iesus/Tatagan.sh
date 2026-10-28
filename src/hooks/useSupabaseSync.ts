import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

export type SyncStatus = 'disabled' | 'signed-out' | 'syncing' | 'synced' | 'offline' | 'error';

type Collection = 'settings' | 'routine' | 'workout' | 'custom_exercise' | 'measurement';

interface ItemRow {
  collection: Collection;
  item_id: string;
  data: unknown;
  sort_key: number;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  info?: string;
}

// ==================== HELPERS ====================

/** JSON stringify with sorted keys (Postgres jsonb reorders keys, so plain stringify is not stable). */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => (v === undefined ? 'null' : stableStringify(v))).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

const rowKey = (collection: string, itemId: string) => `${collection}::${itemId}`;
const rowSig = (row: ItemRow) => stableStringify({ d: row.data, s: row.sort_key });

function stateToRows(state: SyncState): Map<string, ItemRow> {
  const rows = new Map<string, ItemRow>();
  const add = (row: ItemRow) => rows.set(rowKey(row.collection, row.item_id), row);

  add({ collection: 'settings', item_id: 'main', data: state.settings, sort_key: 0 });
  state.routines.forEach((r, i) => add({ collection: 'routine', item_id: r.id, data: r, sort_key: i }));
  state.workouts.forEach((w) =>
    add({ collection: 'workout', item_id: w.id, data: w, sort_key: w.timestamp || 0 })
  );
  state.customExercises.forEach((ex, i) =>
    add({ collection: 'custom_exercise', item_id: ex.id, data: ex, sort_key: i })
  );
  state.measurements.forEach((m, i) =>
    add({ collection: 'measurement', item_id: m.id, data: m, sort_key: i })
  );
  return rows;
}

function rowsToState(rows: Iterable<ItemRow>, fallback: SyncState): SyncState {
  const byCollection: Record<Collection, ItemRow[]> = {
    settings: [],
    routine: [],
    workout: [],
    custom_exercise: [],
    measurement: [],
  };
  for (const row of rows) byCollection[row.collection]?.push(row);

  const asc = (a: ItemRow, b: ItemRow) => a.sort_key - b.sort_key;
  const desc = (a: ItemRow, b: ItemRow) => b.sort_key - a.sort_key;

  const settingsRow = byCollection.settings[0];
  const settings = settingsRow
    ? { ...fallback.settings, ...(settingsRow.data as Partial<SyncedSettings>) }
    : fallback.settings;

  return {
    settings,
    routines: byCollection.routine.sort(asc).map((r) => r.data as Routine),
    workouts: byCollection.workout.sort(desc).map((r) => r.data as CompletedWorkout),
    customExercises: byCollection.custom_exercise.sort(asc).map((r) => r.data as Exercise),
    measurements: byCollection.measurement.sort(asc).map((r) => r.data as BodyMeasurement),
  };
}

const snapshotStorageKey = (userId: string) => `tatagan_sync_snapshot_v1_${userId}`;

function loadSnapshot(userId: string): Map<string, string> | null {
  try {
    const raw = localStorage.getItem(snapshotStorageKey(userId));
    if (!raw) return null;
    return new Map(Object.entries(JSON.parse(raw) as Record<string, string>));
  } catch {
    return null;
  }
}

function saveSnapshot(userId: string, snap: Map<string, string>) {
  try {
    localStorage.setItem(snapshotStorageKey(userId), JSON.stringify(Object.fromEntries(snap)));
  } catch {
    // storage full / unavailable
  }
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed'))
    return 'E-mail ainda não confirmado. Abra o link enviado para sua caixa de entrada (verifique o spam).';
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'Este e-mail já está cadastrado. Use a aba "Login".';
  if (m.includes('password should be at least'))
    return 'A senha é muito curta (mínimo de 6 caracteres).';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'Sem conexão com o servidor. Verifique sua internet.';
  if (m.includes('signups not allowed')) return 'Novos cadastros estão desativados neste projeto Supabase.';
  return message;
}

// ==================== HOOK ====================

interface UseSupabaseSyncOptions {
  state: SyncState;
  /** Default ("seed") data of a fresh install — used to avoid re-uploading untouched sample routines. */
  seedState: SyncState;
  applyRemoteState: (next: SyncState) => void;
  resetLocalData: () => void;
}

export function useSupabaseSync({
  state,
  seedState,
  applyRemoteState,
  resetLocalData,
}: UseSupabaseSyncOptions) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [status, setStatus] = useState<SyncStatus>(isSupabaseConfigured ? 'signed-out' : 'disabled');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [initialSyncDone, setInitialSyncDone] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;
  const applyRef = useRef(applyRemoteState);
  applyRef.current = applyRemoteState;
  const resetRef = useRef(resetLocalData);
  resetRef.current = resetLocalData;

  const userRef = useRef<User | null>(null);
  const snapshotRef = useRef<Map<string, string>>(new Map());
  const pushingRef = useRef(false);
  const pushQueuedRef = useRef(false);
  const pullingRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const pullDebounceRef = useRef<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const seedSigs = useMemo(() => {
    const map = new Map<string, string>();
    stateToRows(seedState).forEach((row, key) => map.set(key, rowSig(row)));
    return map;
  }, [seedState]);
  const seedSigsRef = useRef(seedSigs);
  seedSigsRef.current = seedSigs;

  const markSynced = () => {
    setLastSyncedAt(Date.now());
    setStatus(navigator.onLine === false ? 'offline' : 'synced');
  };

  // ---------- FETCH ALL REMOTE ROWS (paginated, Supabase returns max 1000 per request) ----------
  const fetchRemoteRows = async (userId: string): Promise<Map<string, ItemRow>> => {
    if (!supabase) return new Map();
    const result = new Map<string, ItemRow>();
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from(SYNC_TABLE)
        .select('collection,item_id,data,sort_key')
        .eq('user_id', userId)
        .order('collection', { ascending: true })
        .order('item_id', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      (data as ItemRow[]).forEach((row) =>
        result.set(rowKey(row.collection, row.item_id), {
          ...row,
          sort_key: Number(row.sort_key) || 0,
        })
      );
      if (!data || data.length < pageSize) break;
    }
    return result;
  };

  // ---------- PUSH (local -> cloud): only changed / deleted items ----------
  const push = useCallback(async (): Promise<void> => {
    const currentUser = userRef.current;
    if (!supabase || !currentUser) return;
    if (pushingRef.current || pullingRef.current) {
      pushQueuedRef.current = true;
      return;
    }

    const rows = stateToRows(stateRef.current);
    const snap = snapshotRef.current;
    const upserts: { key: string; sig: string; row: ItemRow }[] = [];
    const deletes: { key: string; collection: Collection; itemId: string }[] = [];

    rows.forEach((row, key) => {
      const sig = rowSig(row);
      if (snap.get(key) !== sig) upserts.push({ key, sig, row });
    });
    snap.forEach((_sig, key) => {
      if (!rows.has(key)) {
        const [collection, ...rest] = key.split('::');
        deletes.push({ key, collection: collection as Collection, itemId: rest.join('::') });
      }
    });

    if (upserts.length === 0 && deletes.length === 0) return;

    pushingRef.current = true;
    setStatus('syncing');
    try {
      for (let i = 0; i < upserts.length; i += 200) {
        const chunk = upserts.slice(i, i + 200);
        const { error } = await supabase.from(SYNC_TABLE).upsert(
          chunk.map(({ row }) => ({
            user_id: currentUser.id,
            collection: row.collection,
            item_id: row.item_id,
            data: row.data,
            sort_key: row.sort_key,
          })),
          { onConflict: 'user_id,collection,item_id' }
        );
        if (error) throw error;
        chunk.forEach(({ key, sig }) => snap.set(key, sig));
      }

      const byCollection = new Map<Collection, string[]>();
      deletes.forEach((d) => {
        byCollection.set(d.collection, [...(byCollection.get(d.collection) || []), d.itemId]);
      });
      for (const [collection, ids] of byCollection) {
        for (let i = 0; i < ids.length; i += 200) {
          const idChunk = ids.slice(i, i + 200);
          const { error } = await supabase
            .from(SYNC_TABLE)
            .delete()
            .eq('user_id', currentUser.id)
            .eq('collection', collection)
            .in('item_id', idChunk);
          if (error) throw error;
          idChunk.forEach((id) => snap.delete(rowKey(collection, id)));
        }
      }

      saveSnapshot(currentUser.id, snap);
      markSynced();
    } catch {
      saveSnapshot(currentUser.id, snap);
      setStatus(navigator.onLine === false ? 'offline' : 'error');
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = window.setTimeout(() => {
        void push();
      }, 8000);
    } finally {
      pushingRef.current = false;
      if (pushQueuedRef.current) {
        pushQueuedRef.current = false;
        void push();
      }
    }
  }, []);

  // ---------- PULL (cloud -> local), merging any local changes not yet uploaded ----------
  const pull = useCallback(
    async (opts?: { initial?: boolean }): Promise<void> => {
      const currentUser = userRef.current;
      if (!supabase || !currentUser) return;
      if (pullingRef.current) return;
      pullingRef.current = true;
      setStatus('syncing');

      try {
        const remote = await fetchRemoteRows(currentUser.id);
        if (userRef.current?.id !== currentUser.id) return; // logged out meanwhile

        const local = stateToRows(stateRef.current);
        const merged = new Map(remote);

        if (opts?.initial) {
          // First sync of this account on this device: cloud wins on conflicts,
          // local-only items (created before login) are migrated to the cloud.
          const remoteIsEmpty = remote.size === 0;
          local.forEach((row, key) => {
            if (remote.has(key)) return;
            const isUntouchedSeed = seedSigsRef.current.get(key) === rowSig(row);
            if (!remoteIsEmpty && isUntouchedSeed) return;
            merged.set(key, row);
          });
        } else {
          // Keep local changes made since the last successful sync (they will be pushed next).
          const snap = snapshotRef.current;
          local.forEach((row, key) => {
            if (snap.get(key) !== rowSig(row)) merged.set(key, row);
          });
          snap.forEach((_sig, key) => {
            if (!local.has(key)) merged.delete(key);
          });
        }

        const remoteSnap = new Map<string, string>();
        remote.forEach((row, key) => remoteSnap.set(key, rowSig(row)));
        snapshotRef.current = remoteSnap;
        saveSnapshot(currentUser.id, remoteSnap);

        applyRef.current(rowsToState(merged.values(), seedState));
        markSynced();
      } catch {
        setStatus(navigator.onLine === false ? 'offline' : 'error');
      } finally {
        pullingRef.current = false;
        if (opts?.initial) setInitialSyncDone(true);
        // Upload anything that is pending (local-only items, edits made during the pull, etc.)
        window.setTimeout(() => void push(), 50);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [push, seedState]
  );

  const schedulePull = useCallback(() => {
    if (pullDebounceRef.current) clearTimeout(pullDebounceRef.current);
    pullDebounceRef.current = window.setTimeout(() => void pull(), 450);
  }, [pull]);

  // ---------- START / STOP SESSION ----------
  const startSession = useCallback(
    (nextUser: User) => {
      if (!supabase) return;
      userRef.current = nextUser;
      setUser(nextUser);
      setInitialSyncDone(false);

      const storedSnap = loadSnapshot(nextUser.id);
      snapshotRef.current = storedSnap || new Map();
      void pull({ initial: !storedSnap });

      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
      }
      channelRef.current = supabase
        .channel(`tatagan-items-${nextUser.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: SYNC_TABLE,
            filter: `user_id=eq.${nextUser.id}`,
          },
          (payload) => {
            const oldRow = payload.old as { user_id?: string } | undefined;
            const newRow = payload.new as { user_id?: string } | undefined;
            const owner = newRow?.user_id || oldRow?.user_id;
            if (owner && owner !== nextUser.id) return;
            schedulePull();
          }
        )
        .subscribe();
    },
    [pull, schedulePull]
  );

  const stopSession = useCallback(() => {
    if (supabase && channelRef.current) {
      void supabase.removeChannel(channelRef.current);
    }
    channelRef.current = null;
    userRef.current = null;
    snapshotRef.current = new Map();
    setUser(null);
    setInitialSyncDone(false);
    setStatus(isSupabaseConfigured ? 'signed-out' : 'disabled');
  }, []);

  // ---------- AUTH LISTENER ----------
  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session?.user) startSession(data.session.user);
      setAuthReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      const nextUser = session?.user ?? null;
      if (nextUser && userRef.current?.id !== nextUser.id) {
        // Defer to avoid running Supabase calls inside the auth callback
        window.setTimeout(() => startSession(nextUser), 0);
      } else if (!nextUser && userRef.current && event === 'SIGNED_OUT') {
        stopSession();
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [startSession, stopSession]);

  // ---------- AUTO PUSH when local state changes ----------
  useEffect(() => {
    if (!user || !initialSyncDone) return;
    const timer = window.setTimeout(() => void push(), 700);
    return () => clearTimeout(timer);
  }, [state, user, initialSyncDone, push]);

  // ---------- PULL on focus / visibility / reconnect + periodic safety net ----------
  useEffect(() => {
    if (!user) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') schedulePull();
    };
    const onOnline = () => {
      void push().then(() => schedulePull());
    };
    const onOffline = () => setStatus('offline');
    window.addEventListener('focus', schedulePull);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const interval = window.setInterval(schedulePull, 60000);
    return () => {
      window.removeEventListener('focus', schedulePull);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(interval);
    };
  }, [user, push, schedulePull]);

  // ==================== PUBLIC ACTIONS ====================

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { ok: false, error: 'Supabase não configurado.' };
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { ok: false, error: translateAuthError(error.message) };
    return { ok: true };
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<AuthResult> => {
    if (!supabase) return { ok: false, error: 'Supabase não configurado.' };
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return { ok: false, error: translateAuthError(error.message) };
    // When "Confirm email" is enabled, Supabase returns a user with an empty identities array
    // for already registered e-mails, and no session for new ones until confirmation.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { ok: false, error: 'Este e-mail já está cadastrado. Use a aba "Login".' };
    }
    if (!data.session) {
      return {
        ok: true,
        info: 'Conta criada! Enviamos um link de confirmação para o seu e-mail. Confirme e depois faça login.',
      };
    }
    return { ok: true };
  };

  const signOut = async () => {
    if (!supabase) return;
    const currentUser = userRef.current;
    try {
      await push(); // flush pending changes before leaving
    } catch {
      // ignore
    }
    if (currentUser) {
      localStorage.removeItem(snapshotStorageKey(currentUser.id));
    }
    stopSession();
    resetRef.current();
    await supabase.auth.signOut();
  };

  const requestPasswordReset = async (email: string): Promise<AuthResult> => {
    if (!supabase) return { ok: false, error: 'Supabase não configurado.' };
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin,
    });
    if (error) return { ok: false, error: translateAuthError(error.message) };
    return {
      ok: true,
      info: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.',
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
