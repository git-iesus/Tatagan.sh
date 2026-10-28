import {
  Routine,
  CompletedWorkout,
  BodyMeasurement,
  Exercise,
  UserProfile,
} from '../types';
import { HevySoundName } from './sound';

export interface CloudUserPayload {
  routines: Routine[];
  workouts: CompletedWorkout[];
  measurements: BodyMeasurement[];
  customExercises: Exercise[];
  userProfile: UserProfile;
  weekStartsOn: 0 | 1;
  timerSound: HevySoundName;
  defaultRestSeconds: number;
}

export interface CloudUserRecord {
  userId: string;
  email: string;
  passwordHash: string;
  updatedAt: number;
  bytebinKey?: string;
  payload?: CloudUserPayload;
}

export interface AuthSession {
  userId: string;
  email: string;
  passwordHash: string;
  topic: string;
  lastSyncedAt: number;
}

/**
 * Generates a deterministic SHA-256 hex string using Web Crypto API (with pure JS fallback).
 */
export async function sha256Hex(input: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(input);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // Fallback below
  }
  // Simple deterministic fallback hash if subtle crypto is unavailable on non-HTTPS LAN IP
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0')
  );
}

export async function deriveUserCredentials(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();
  const userIdHash = await sha256Hex(`tatagan_uid_v3:${cleanEmail}`);
  const userId = `usr_${userIdHash.slice(0, 20)}`;
  const topic = `tatagan_sync_${userIdHash.slice(0, 24)}`;
  const passwordHash = await sha256Hex(
    `tatagan_pwd_v3:${cleanEmail}:${password}`
  );
  return { userId, cleanEmail, topic, passwordHash };
}

/**
 * Merges local data (e.g. pre-login localStorage routines and workouts) with cloud data
 * so no workout history or custom routine is ever lost on first login or multi-device sync!
 */
export function mergeUserPayloads(
  local: CloudUserPayload,
  remote: CloudUserPayload
): CloudUserPayload {
  // Merge workouts by ID (preserving chronological order, newest first)
  const workoutMap = new Map<string, CompletedWorkout>();
  remote.workouts.forEach((w) => workoutMap.set(w.id, w));
  local.workouts.forEach((w) => {
    if (!workoutMap.has(w.id)) {
      workoutMap.set(w.id, w);
    }
  });
  const mergedWorkouts = Array.from(workoutMap.values()).sort(
    (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
  );

  // Merge routines: keep remote routines (which reflect latest edits on other devices)
  // AND include any local custom routines not yet in remote
  const routineMap = new Map<string, Routine>();
  local.routines.forEach((r) => routineMap.set(r.id, r));
  remote.routines.forEach((r) => routineMap.set(r.id, r));
  const mergedRoutines = Array.from(routineMap.values());

  // Merge custom exercises by ID
  const customExMap = new Map<string, Exercise>();
  remote.customExercises.forEach((ex) => customExMap.set(ex.id, ex));
  local.customExercises.forEach((ex) => customExMap.set(ex.id, ex));

  // Merge body measurements by ID
  const measMap = new Map<string, BodyMeasurement>();
  remote.measurements.forEach((m) => measMap.set(m.id, m));
  local.measurements.forEach((m) => measMap.set(m.id, m));

  return {
    routines: mergedRoutines,
    workouts: mergedWorkouts,
    measurements: Array.from(measMap.values()),
    customExercises: Array.from(customExMap.values()),
    userProfile:
      remote.userProfile?.displayName &&
      remote.userProfile.displayName !== 'Atleta Tatagan.sh'
        ? remote.userProfile
        : local.userProfile,
    weekStartsOn: remote.weekStartsOn ?? local.weekStartsOn,
    timerSound: remote.timerSound || local.timerSound,
    defaultRestSeconds: remote.defaultRestSeconds || local.defaultRestSeconds || 60,
  };
}

/**
 * Fetches the latest cloud record for a given deterministic user topic
 * Checks:
 * 1. Optional Supabase REST table (if VITE_SUPABASE_URL is configured)
 * 2. Vercel Serverless API (/api/sync) + Distributed Cloud Relay (ntfy.sh + bytebin)
 */
export async function fetchCloudRecord(
  topic: string,
  userId: string
): Promise<CloudUserRecord | null> {
  const candidates: CloudUserRecord[] = [];

  // 1. Optional Supabase REST check
  const sbUrl = (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_SUPABASE_URL;
  const sbKey = (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_SUPABASE_ANON_KEY;

  if (sbUrl && sbKey) {
    try {
      const res = await fetch(
        `${sbUrl.replace(/\/$/, '')}/rest/v1/tatagan_user_sync?user_id=eq.${encodeURIComponent(
          userId
        )}&select=*`,
        {
          headers: {
            apikey: sbKey,
            Authorization: `Bearer ${sbKey}`,
          },
        }
      );
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const row = rows[0];
          candidates.push({
            userId: row.user_id,
            email: row.email,
            passwordHash: row.password_hash,
            updatedAt: Number(row.updated_at) || 0,
            payload: row.payload,
          });
        }
      }
    } catch {
      // Ignore Supabase network error and continue
    }
  }

  // 2. Vercel Serverless API (/api/sync)
  try {
    const apiRes = await fetch(`/api/sync?topic=${encodeURIComponent(topic)}`);
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data?.record && data.record.userId) {
        candidates.push(data.record as CloudUserRecord);
      }
    }
  } catch {
    // Ignore when running purely on static/local dev
  }

  // 3. Distributed Cloud Relay (ntfy.sh + bytebin) for cross-device mobile/desktop sync
  try {
    const ntfyRes = await fetch(
      `https://ntfy.sh/${encodeURIComponent(topic)}/json?poll=1&since=all`,
      { cache: 'no-store' }
    );
    if (ntfyRes.ok) {
      const text = await ntfyRes.text();
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      let newestRecord: CloudUserRecord | null = null;
      for (const line of lines) {
        try {
          const envelope = JSON.parse(line);
          if (envelope.event === 'message' && envelope.message) {
            const parsed = JSON.parse(envelope.message) as CloudUserRecord;
            if (
              parsed &&
              parsed.userId &&
              (!newestRecord || parsed.updatedAt >= newestRecord.updatedAt)
            ) {
              newestRecord = parsed;
            }
          }
        } catch {
          // Skip malformed message
        }
      }

      if (newestRecord) {
        if (newestRecord.bytebinKey) {
          try {
            const bbRes = await fetch(
              `https://bytebin.lucko.me/${encodeURIComponent(
                newestRecord.bytebinKey
              )}`,
              { cache: 'no-store' }
            );
            if (bbRes.ok) {
              const fullPayload = (await bbRes.json()) as CloudUserPayload;
              newestRecord.payload = fullPayload;
            }
          } catch {
            // Keep inline payload if bytebin fetch fails
          }
        }
        candidates.push(newestRecord);
      }
    }
  } catch {
    // Ignore relay error
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return candidates[0];
}

/**
 * Pushes the authenticated user's complete state (`routines`, `workouts`, `measurements`, etc.)
 * to the cloud so it is immediately available on both Desktop and Mobile browsers.
 */
export async function pushCloudRecord(
  session: AuthSession,
  payload: CloudUserPayload
): Promise<number> {
  const updatedAt = Date.now();
  let bytebinKey: string | undefined;

  // 1. Upload full payload JSON to bytebin (handles large workout histories cleanly)
  try {
    const bbRes = await fetch('https://bytebin.lucko.me/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (bbRes.ok) {
      const bbData = await bbRes.json();
      if (bbData?.key) {
        bytebinKey = String(bbData.key);
      }
    }
  } catch {
    // Fallback to inline payload
  }

  const fullRecord: CloudUserRecord = {
    userId: session.userId,
    email: session.email,
    passwordHash: session.passwordHash,
    updatedAt,
    bytebinKey,
    payload,
  };

  // Compact envelope for ntfy relay (includes inline payload if small enough, plus bytebinKey)
  const serializedFull = JSON.stringify(fullRecord);
  const relayRecord: CloudUserRecord =
    serializedFull.length <= 3500
      ? fullRecord
      : {
          userId: session.userId,
          email: session.email,
          passwordHash: session.passwordHash,
          updatedAt,
          bytebinKey,
        };

  // 2. Push to Distributed Cloud Relay (ntfy.sh)
  try {
    await fetch(`https://ntfy.sh/${encodeURIComponent(session.topic)}`, {
      method: 'POST',
      body: JSON.stringify(relayRecord),
    });
  } catch {
    // Ignore relay error
  }

  // 3. Push to Vercel Serverless API (/api/sync)
  try {
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: session.topic, record: fullRecord }),
    });
  } catch {
    // Ignore local dev error
  }

  // 4. Optional Supabase upsert
  const sbUrl = (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_SUPABASE_URL;
  const sbKey = (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_SUPABASE_ANON_KEY;

  if (sbUrl && sbKey) {
    try {
      await fetch(`${sbUrl.replace(/\/$/, '')}/rest/v1/tatagan_user_sync`, {
        method: 'POST',
        headers: {
          apikey: sbKey,
          Authorization: `Bearer ${sbKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          user_id: session.userId,
          email: session.email,
          password_hash: session.passwordHash,
          payload,
          updated_at: updatedAt,
        }),
      });
    } catch {
      // Ignore Supabase network error
    }
  }

  return updatedAt;
}
