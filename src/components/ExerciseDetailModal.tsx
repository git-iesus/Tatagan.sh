import React, { useState } from 'react';
import { X, Play, Award, BookOpen, Calculator } from 'lucide-react';
import { Exercise, CompletedWorkout, WorkoutExercise, WorkoutSet } from '../types';
import { MUSCLE_LABELS, EQUIPMENT_LABELS, calculateOneRepMax } from '../utils/fitness';
import { MuscleHeatmap } from './MuscleHeatmap';

interface ExerciseDetailModalProps {
  exercise: Exercise;
  workouts: CompletedWorkout[];
  onClose: () => void;
  onAddToActiveWorkout?: (exercise: Exercise) => void;
}

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  exercise,
  workouts,
  onClose,
  onAddToActiveWorkout,
}) => {
  const [tab, setTab] = useState<'overview' | 'instructions' | 'records'>('overview');
  const [videoGender, setVideoGender] = useState<'male' | 'female'>('male');

  const activeVideoUrl =
    videoGender === 'female' && exercise.video_url_female
      ? exercise.video_url_female
      : exercise.video_url;

  // Compute historical PRs for this exercise across completed workouts
  let bestWeight = 0;
  let best1RM = 0;
  let bestVolumeSet = 0;

  workouts.forEach((w: CompletedWorkout) => {
    w.exercises.forEach((we: WorkoutExercise) => {
      if (we.exerciseId === exercise.id) {
        we.sets.forEach((s: WorkoutSet) => {
          if (s.completed) {
            const weight = s.weightKg || 0;
            const reps = s.reps || 0;
            if (weight > bestWeight) bestWeight = weight;
            const e1rm = calculateOneRepMax(weight, reps);
            if (e1rm > best1RM) best1RM = e1rm;
            if (weight * reps > bestVolumeSet) bestVolumeSet = weight * reps;
          }
        });
      }
    });
  });

  const reference1RM = best1RM > 0 ? best1RM : 100;

  // Parse instructions string into array of steps
  const instructionSteps: string[] = exercise.instructions
    ? exercise.instructions
        .split('\n')
        .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean)
    : [];

  return (
    <div className="hevy-modal-backdrop" onClick={onClose} style={{ zIndex: 100 }}>
      <div
        className="hevy-modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ height: '90%', display: 'flex', flexDirection: 'column' }}
      >
        {/* Top Bar */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--hevy-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 700 }}>{exercise.title}</h3>
            <span style={{ fontSize: 12, color: 'var(--hevy-text-secondary)' }}>
              {exercise.title_en} •{' '}
              {MUSCLE_LABELS[exercise.muscle_group] || exercise.muscle_group}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--hevy-elevated)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--hevy-text)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            borderBottom: '1px solid var(--hevy-border)',
            backgroundColor: 'var(--hevy-surface-1)',
          }}
        >
          {[
            { id: 'overview', label: 'Resumo & Vídeo', icon: Play },
            { id: 'instructions', label: 'Como Executar', icon: BookOpen },
            { id: 'records', label: 'Recordes & 1RM', icon: Award },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as typeof tab)}
                style={{
                  border: 'none',
                  background: 'none',
                  padding: '11px 6px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: active ? 'var(--hevy-blue)' : 'var(--hevy-text-secondary)',
                  borderBottom: active
                    ? '2px solid var(--hevy-blue)'
                    : '2px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {tab === 'overview' && (
            <>
              {/* Official Hevy CloudFront MP4 Video Player */}
              <div
                className="hevy-card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  position: 'relative',
                  backgroundColor: '#000',
                }}
              >
                {activeVideoUrl ? (
                  <video
                    key={activeVideoUrl}
                    src={activeVideoUrl}
                    poster={exercise.thumbnail_url || undefined}
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls
                    style={{
                      width: '100%',
                      maxHeight: 250,
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                ) : exercise.thumbnail_url ? (
                  <img
                    src={exercise.thumbnail_url}
                    alt={exercise.title}
                    style={{
                      width: '100%',
                      maxHeight: 240,
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      padding: 40,
                      textAlign: 'center',
                      color: 'var(--hevy-text-muted)',
                    }}
                  >
                    Demonstração visual personalizada
                  </div>
                )}

                {exercise.video_url_female && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      display: 'flex',
                      gap: 4,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setVideoGender('male')}
                      style={{
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor:
                          videoGender === 'male'
                            ? 'var(--hevy-blue)'
                            : 'rgba(0,0,0,0.65)',
                        color: '#FFF',
                      }}
                    >
                      Vídeo Masc
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoGender('female')}
                      style={{
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor:
                          videoGender === 'female'
                            ? 'var(--hevy-blue)'
                            : 'rgba(0,0,0,0.65)',
                        color: '#FFF',
                      }}
                    >
                      Vídeo Fem
                    </button>
                  </div>
                )}
              </div>

              {/* Metadata Pills */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="hevy-card">
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--hevy-text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    MÚSCULO ALVO PRIMÁRIO
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      marginTop: 4,
                      color: 'var(--hevy-blue)',
                    }}
                  >
                    {MUSCLE_LABELS[exercise.muscle_group] || exercise.muscle_group}
                  </div>
                </div>
                <div className="hevy-card">
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--hevy-text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    EQUIPAMENTO
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>
                    {EQUIPMENT_LABELS[exercise.equipment] || exercise.equipment}
                  </div>
                </div>
              </div>

              {/* Muscle Heatmap Highlight */}
              <div className="hevy-card">
                <MuscleHeatmap
                  muscleCounts={{ [exercise.muscle_group]: 4 }}
                  compact
                  showLegend={false}
                />
              </div>
            </>
          )}

          {tab === 'instructions' && (
            <div
              className="hevy-card"
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <h4 style={{ fontSize: 15, fontWeight: 700 }}>
                Passo a Passo de Execução (Tatagan.sh)
              </h4>
              {instructionSteps.length > 0 ? (
                instructionSteps.map((step: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: 'var(--hevy-blue-soft)',
                        color: 'var(--hevy-blue)',
                        fontWeight: 700,
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {i + 1}
                    </span>
                    <p
                      style={{
                        fontSize: 14,
                        lineHeight: 1.5,
                        color: 'var(--hevy-text-secondary)',
                      }}
                    >
                      {step}
                    </p>
                  </div>
                ))
              ) : (
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--hevy-text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  Mantenha a postura estabilizada, controle a fase excêntrica (descida) por 2
                  segundos e execute a fase concêntrica com foco total no grupamento de{' '}
                  <strong>
                    {MUSCLE_LABELS[exercise.muscle_group] || exercise.muscle_group}
                  </strong>
                  .
                </p>
              )}
            </div>
          )}

          {tab === 'records' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div className="hevy-card" style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--hevy-text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    1RM ESTIMADO
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: 'var(--hevy-gold)',
                      marginTop: 4,
                    }}
                  >
                    {best1RM > 0 ? `${best1RM} kg` : '—'}
                  </div>
                </div>
                <div className="hevy-card" style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--hevy-text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    MAIOR CARGA
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: 'var(--hevy-blue)',
                      marginTop: 4,
                    }}
                  >
                    {bestWeight > 0 ? `${bestWeight} kg` : '—'}
                  </div>
                </div>
                <div className="hevy-card" style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--hevy-text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    MELHOR SÉRIE
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: 'var(--hevy-green)',
                      marginTop: 4,
                    }}
                  >
                    {bestVolumeSet > 0 ? `${bestVolumeSet} kg` : '—'}
                  </div>
                </div>
              </div>

              {/* 1RM Percentage Table */}
              <div className="hevy-card">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 10,
                  }}
                >
                  <Calculator size={16} color="var(--hevy-blue)" />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>
                    Tabela de Porcentagem 1RM (Base: {reference1RM} kg)
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { pct: 95, reps: '2 reps' },
                    { pct: 90, reps: '4 reps' },
                    { pct: 85, reps: '6 reps' },
                    { pct: 80, reps: '8 reps' },
                    { pct: 75, reps: '10 reps' },
                    { pct: 70, reps: '12 reps' },
                  ].map((row) => (
                    <div
                      key={row.pct}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: 6,
                        backgroundColor: 'var(--hevy-elevated)',
                        fontSize: 13,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: 'var(--hevy-text-secondary)',
                        }}
                      >
                        {row.pct}% de 1RM ({row.reps})
                      </span>
                      <span style={{ fontWeight: 700 }}>
                        {Math.round((reference1RM * row.pct) / 100)} kg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer CTA */}
        {onAddToActiveWorkout && (
          <div style={{ padding: 14, borderTop: '1px solid var(--hevy-border)' }}>
            <button
              type="button"
              className="hevy-btn-primary"
              style={{ width: '100%' }}
              onClick={() => {
                onAddToActiveWorkout(exercise);
                onClose();
              }}
            >
              Adicionar ao Treino Ativo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
