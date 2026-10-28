export type HevySoundName =
  | 'set_complete_high'
  | 'set_complete_medium'
  | 'set_complete_low'
  | 'livepr_high'
  | 'livepr_normal'
  | 'boxing_bell'
  | 'ting_ting'
  | 'futuristic'
  | 'original'
  | 'alarm';

export const TIMER_SOUND_OPTIONS: { id: HevySoundName; label: string }[] = [
  { id: 'boxing_bell', label: 'Gongo de Boxe' },
  { id: 'ting_ting', label: 'Ting Ting' },
  { id: 'futuristic', label: 'Futurista' },
  { id: 'original', label: 'Clássico Tatagan.sh' },
  { id: 'alarm', label: 'Alarme Forte' },
];

const audioCache: Partial<Record<HevySoundName, HTMLAudioElement>> = {};

export function playHevySound(name: HevySoundName, volume = 0.65): void {
  try {
    let audio = audioCache[name];
    if (!audio) {
      audio = new Audio(`/sounds/${name}.wav`);
      audioCache[name] = audio;
    }
    audio.currentTime = 0;
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch(() => {
      // Browser autoplay restriction before first gesture
    });
  } catch {
    // Ignore audio errors on unsupported devices
  }
}

export function triggerHaptic(pattern: number | number[] = 15): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore vibration errors
  }
}
