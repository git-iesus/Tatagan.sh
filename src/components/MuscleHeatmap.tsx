import React, { useState } from 'react';
import {
  FRONT_MUSCLES,
  BACK_MUSCLES,
  MUSCLE_LABELS,
  normalizeMuscleKeyForAsset,
} from '../utils/fitness';

interface MuscleHeatmapProps {
  muscleCounts: Record<string, number>;
  defaultGender?: 'male' | 'female';
  compact?: boolean;
  showLegend?: boolean;
}

export const MuscleHeatmap: React.FC<MuscleHeatmapProps> = ({
  muscleCounts,
  defaultGender = 'male',
  compact = false,
  showLegend = true,
}) => {
  const [gender, setGender] = useState<'male' | 'female'>(defaultGender);

  // Normalize keys (e.g. upper_back -> upperback, lower_back -> lowerback)
  const effectiveCounts: Record<string, number> = {};
  Object.entries(muscleCounts).forEach(([key, val]) => {
    if (key === 'full_body') {
      ['chest', 'quadriceps', 'lats', 'shoulders', 'abdominals', 'glutes', 'hamstrings'].forEach(
        (m) => {
          effectiveCounts[m] = (effectiveCounts[m] || 0) + val;
        }
      );
    } else {
      const norm = normalizeMuscleKeyForAsset(key);
      effectiveCounts[norm] = (effectiveCounts[norm] || 0) + val;
    }
  });

  const maxCount = Math.max(1, ...Object.values(effectiveCounts));

  const getOpacity = (assetMuscleKey: string): number => {
    const val = effectiveCounts[assetMuscleKey] || 0;
    if (val <= 0) return 0;
    const ratio = val / maxCount;
    return Math.min(1, Math.max(0.38, 0.35 + ratio * 0.65));
  };

  const activeMuscles = Object.entries(muscleCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const figureHeight = compact ? 165 : 220;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--hevy-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Mapa Anatômico Muscular
        </span>
        <div
          style={{
            display: 'inline-flex',
            backgroundColor: 'var(--hevy-elevated)',
            borderRadius: 8,
            padding: 2,
            border: '1px solid var(--hevy-border)',
          }}
        >
          <button
            type="button"
            onClick={() => setGender('male')}
            style={{
              border: 'none',
              background: gender === 'male' ? 'var(--hevy-blue)' : 'transparent',
              color: gender === 'male' ? '#fff' : 'var(--hevy-text-secondary)',
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 9px',
              borderRadius: 6,
            }}
          >
            Masc
          </button>
          <button
            type="button"
            onClick={() => setGender('female')}
            style={{
              border: 'none',
              background: gender === 'female' ? 'var(--hevy-blue)' : 'transparent',
              color: gender === 'female' ? '#fff' : 'var(--hevy-text-secondary)',
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 9px',
              borderRadius: 6,
            }}
          >
            Fem
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          backgroundColor: 'rgba(255,255,255,0.02)',
          borderRadius: 12,
          padding: compact ? '8px 4px' : '12px 8px',
          border: '1px solid var(--hevy-border)',
        }}
      >
        {/* FRONT ANATOMY */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', height: figureHeight, width: figureHeight * 0.58 }}>
            <img
              src={`/assets/muscles/${gender}bodyfront.png`}
              alt="Frente"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: 0.85,
              }}
            />
            {FRONT_MUSCLES.map((muscle: string) => {
              const opacity = getOpacity(muscle);
              if (opacity <= 0) return null;
              return (
                <img
                  key={`front-${muscle}`}
                  src={`/assets/muscles/${gender}${muscle}front.png`}
                  alt={muscle}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    opacity,
                    filter: 'hue-rotate(195deg) saturate(240%) brightness(1.15)',
                    transition: 'opacity 0.25s ease',
                  }}
                />
              );
            })}
          </div>
          <span
            style={{
              fontSize: 11,
              color: 'var(--hevy-text-muted)',
              marginTop: 4,
              fontWeight: 500,
            }}
          >
            Anterior
          </span>
        </div>

        {/* BACK ANATOMY */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', height: figureHeight, width: figureHeight * 0.58 }}>
            <img
              src={`/assets/muscles/${gender}bodyback.png`}
              alt="Costas"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: 0.85,
              }}
            />
            {BACK_MUSCLES.map((muscle: string) => {
              const opacity = getOpacity(muscle);
              if (opacity <= 0) return null;
              return (
                <img
                  key={`back-${muscle}`}
                  src={`/assets/muscles/${gender}${muscle}back.png`}
                  alt={muscle}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    opacity,
                    filter: 'hue-rotate(195deg) saturate(240%) brightness(1.15)',
                    transition: 'opacity 0.25s ease',
                  }}
                />
              );
            })}
          </div>
          <span
            style={{
              fontSize: 11,
              color: 'var(--hevy-text-muted)',
              marginTop: 4,
              fontWeight: 500,
            }}
          >
            Posterior
          </span>
        </div>
      </div>

      {showLegend && activeMuscles.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {activeMuscles.slice(0, 6).map(([muscle, count]) => (
            <span
              key={muscle}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 9px',
                borderRadius: 999,
                backgroundColor: 'var(--hevy-blue-soft)',
                color: 'var(--hevy-blue)',
                border: '1px solid rgba(0, 140, 255, 0.28)',
              }}
            >
              {MUSCLE_LABELS[muscle] || muscle}: {count}{' '}
              {count === 1 ? 'série' : 'séries'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
