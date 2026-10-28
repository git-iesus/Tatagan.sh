import React, { useEffect } from 'react';
import { Trophy, Share2, CheckCircle2 } from 'lucide-react';
import { CompletedWorkout, Exercise } from '../types';
import {
  calculateExercisesVolume,
  calculateExercisesCompletedSets,
  getVolumeComparison,
  formatDuration,
  computeMuscleDistributionFromExercises,
} from '../utils/fitness';
import { playHevySound } from '../utils/sound';
import { MuscleHeatmap } from './MuscleHeatmap';

interface WorkoutSummaryModalProps {
  workout: CompletedWorkout;
  exerciseCatalog: Record<string, Exercise>;
  onClose: () => void;
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({
  workout,
  exerciseCatalog,
  onClose,
}) => {
  const totalVolume =
    workout.volumeKg || calculateExercisesVolume(workout.exercises);
  const totalSets =
    workout.totalSets || calculateExercisesCompletedSets(workout.exercises);
  const equivalence = getVolumeComparison(totalVolume);
  const muscleCounts = computeMuscleDistributionFromExercises(
    workout.exercises,
    exerciseCatalog
  );

  useEffect(() => {
    playHevySound('livepr_high');
  }, []);

  const handleShare = async () => {
    const shareText = `Treino concluído no Tatagan.sh! 💪\n📌 ${workout.title}\n⏱️ Duração: ${formatDuration(workout.durationSeconds)}\n🏋️ Volume Total: ${totalVolume.toLocaleString('pt-BR')} kg (equivalente a ${equivalence.article} ${equivalence.name}!)\n🏆 Recordes Pessoais: ${workout.prCount}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Tatagan.sh - ${workout.title}`, text: shareText });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      alert(
        'Resumo copiado para a área de transferência! Pronto para colar nos Stories.'
      );
    }
  };

  return (
    <div className="hevy-modal-backdrop" onClick={onClose}>
      <div
        className="hevy-modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ height: '92%', padding: 18, overflowY: 'auto', gap: 16 }}
      >
        <div style={{ textAlign: 'center', paddingTop: 6 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 999,
              backgroundColor: 'var(--hevy-green-soft)',
              color: 'var(--hevy-green)',
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            <CheckCircle2 size={15} /> TREINO FINALIZADO COM SUCESSO!
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>{workout.title}</h2>
          <p style={{ fontSize: 13, color: 'var(--hevy-text-secondary)', marginTop: 2 }}>
            Parabéns! Esse foi o seu treino de hoje no Tatagan.sh.
          </p>
        </div>

        {/* Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <div className="hevy-card" style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 11,
                color: 'var(--hevy-text-muted)',
                fontWeight: 600,
              }}
            >
              DURAÇÃO
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>
              {formatDuration(workout.durationSeconds)}
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
              VOLUME TOTAL
            </div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: 'var(--hevy-blue)',
                marginTop: 4,
              }}
            >
              {totalVolume.toLocaleString('pt-BR')} kg
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
              RECORDES (PR)
            </div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: 'var(--hevy-gold)',
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <Trophy size={15} /> {workout.prCount} ({totalSets} séries)
            </div>
          </div>
        </div>

        {/* Official Hevy Volume Equivalence Badge Card */}
        <div
          className="hevy-card"
          style={{
            background:
              'linear-gradient(135deg, rgba(0,140,255,0.22) 0%, rgba(28,28,30,0.95) 100%)',
            borderColor: 'rgba(0,140,255,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            padding: 16,
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
              Comparação de Volume Tatagan.sh
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
              Você levantou {equivalence.article} {equivalence.name}!
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--hevy-text-secondary)',
                marginTop: 4,
              }}
            >
              {totalVolume.toLocaleString('pt-BR')} kg levantados na sessão (~
              {equivalence.weightKg.toLocaleString('pt-BR')} kg)
            </div>
          </div>
          <img
            src={equivalence.asset}
            alt={equivalence.name}
            style={{ width: 92, height: 72, objectFit: 'contain', flexShrink: 0 }}
          />
        </div>

        {/* Anatomical Muscle Breakdown */}
        <div className="hevy-card">
          <MuscleHeatmap muscleCounts={muscleCounts} compact />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
          <button
            type="button"
            className="hevy-btn-secondary"
            style={{ flex: 1 }}
            onClick={handleShare}
          >
            <Share2 size={16} /> Compartilhar Story
          </button>
          <button
            type="button"
            className="hevy-btn-primary"
            style={{ flex: 1 }}
            onClick={onClose}
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
