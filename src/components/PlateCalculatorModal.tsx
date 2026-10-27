import React, { useState } from 'react';
import { X, Disc, Flame } from 'lucide-react';
import { calculatePlates, generateWarmupSets, PlateResult } from '../utils/fitness';

interface PlateCalculatorModalProps {
  initialWeight: number;
  onClose: () => void;
  onApplyWarmupSets?: (warmups: { weightKg: number; reps: number }[]) => void;
}

const BAR_OPTIONS = [
  { id: 'olympic', label: 'Barra Olímpica', weight: 20, img: '/assets/brand/barbell_olympic.png' },
  { id: 'womens', label: 'Barra Olímpica Fem.', weight: 15, img: '/assets/brand/barbell_olympic.png' },
  { id: 'ez', label: 'Barra W (EZ)', weight: 10, img: '/assets/brand/barbell_ezbar.png' },
  { id: 'standard', label: 'Barra Standard', weight: 12, img: '/assets/brand/barbell_olympic.png' },
];

export const PlateCalculatorModal: React.FC<PlateCalculatorModalProps> = ({
  initialWeight,
  onClose,
  onApplyWarmupSets,
}) => {
  const [tab, setTab] = useState<'plates' | 'warmup'>('plates');
  const [targetWeight, setTargetWeight] = useState<number>(
    initialWeight > 0 ? initialWeight : 100
  );
  const [barType, setBarType] = useState(BAR_OPTIONS[0]);

  const plateData = calculatePlates(targetWeight, barType.weight);
  const warmupSets = generateWarmupSets(targetWeight, barType.weight);

  // Flatten plates for visual bar sleeve rendering
  const visualPlates: { weight: number; color: string; height: number }[] = [];
  plateData.plates.forEach((p: PlateResult) => {
    for (let i = 0; i < p.countPerSide; i++) {
      const height = Math.max(46, Math.min(110, 44 + p.weight * 2.6));
      visualPlates.push({ weight: p.weight, color: p.color, height });
    }
  });

  return (
    <div className="hevy-modal-backdrop" onClick={onClose}>
      <div
        className="hevy-modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: 16, gap: 14 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Disc size={20} color="var(--hevy-blue)" />
            <h3 style={{ fontSize: 17, fontWeight: 700 }}>
              Calculadora de Carga & Aquecimento
            </h3>
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

        {/* Sub-tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            backgroundColor: 'var(--hevy-elevated)',
            padding: 3,
            borderRadius: 10,
          }}
        >
          <button
            type="button"
            onClick={() => setTab('plates')}
            style={{
              border: 'none',
              padding: '8px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              backgroundColor: tab === 'plates' ? 'var(--hevy-card)' : 'transparent',
              color: tab === 'plates' ? 'var(--hevy-text)' : 'var(--hevy-text-secondary)',
            }}
          >
            Anilhas na Barra
          </button>
          <button
            type="button"
            onClick={() => setTab('warmup')}
            style={{
              border: 'none',
              padding: '8px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              backgroundColor: tab === 'warmup' ? 'var(--hevy-card)' : 'transparent',
              color: tab === 'warmup' ? 'var(--hevy-text)' : 'var(--hevy-text-secondary)',
            }}
          >
            Séries de Aquecimento
          </button>
        </div>

        {/* Target Weight Controls */}
        <div
          className="hevy-card"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <div style={{ fontSize: 12, color: 'var(--hevy-text-secondary)', fontWeight: 600 }}>
              CARGA ALVO TOTAL (KG)
            </div>
            <div style={{ fontSize: 11, color: 'var(--hevy-text-muted)', marginTop: 2 }}>
              Barra ({barType.weight} kg) + 2x {plateData.perSideWeight.toFixed(2)} kg/lado
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="hevy-btn-secondary"
              style={{ padding: '6px 12px' }}
              onClick={() => setTargetWeight((w) => Math.max(barType.weight, w - 2.5))}
            >
              -2.5
            </button>
            <input
              type="number"
              value={targetWeight}
              onChange={(e) => setTargetWeight(Math.max(0, Number(e.target.value)))}
              className="hevy-set-input"
              style={{ width: 78, height: 38, fontSize: 17 }}
            />
            <button
              type="button"
              className="hevy-btn-secondary"
              style={{ padding: '6px 12px' }}
              onClick={() => setTargetWeight((w) => w + 2.5)}
            >
              +2.5
            </button>
          </div>
        </div>

        {/* Bar Selector */}
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--hevy-text-secondary)',
              marginBottom: 6,
            }}
          >
            Tipo de Barra
          </div>
          <div className="hevy-chip-row">
            {BAR_OPTIONS.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`hevy-chip ${barType.id === b.id ? 'active' : ''}`}
                onClick={() => setBarType(b)}
              >
                {b.label} ({b.weight} kg)
              </button>
            ))}
          </div>
        </div>

        {tab === 'plates' ? (
          <>
            {/* Visual Barbell Sleeve Graphic */}
            <div
              className="hevy-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 150,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <img
                src={barType.img}
                alt={barType.label}
                style={{
                  width: 180,
                  height: 28,
                  objectFit: 'contain',
                  opacity: 0.45,
                  marginBottom: 10,
                }}
              />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                {/* Barbell Shaft */}
                <div
                  style={{
                    width: 65,
                    height: 12,
                    background: 'linear-gradient(180deg, #9CA3AF 0%, #4B5563 100%)',
                    borderRadius: '4px 0 0 4px',
                  }}
                />
                {/* Barbell Collar */}
                <div
                  style={{
                    width: 12,
                    height: 30,
                    background: '#D1D5DB',
                    borderRadius: 2,
                    marginRight: 3,
                  }}
                />
                {/* Loaded Plates */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {visualPlates.length === 0 ? (
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--hevy-text-muted)',
                        marginLeft: 12,
                      }}
                    >
                      Apenas a barra ({barType.weight} kg)
                    </span>
                  ) : (
                    visualPlates.map((plate, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: plate.weight >= 15 ? 20 : 15,
                          height: plate.height,
                          backgroundColor: plate.color,
                          borderRadius: 4,
                          border: '1px solid rgba(0,0,0,0.45)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: plate.weight === 5 ? '#111' : '#FFF',
                          fontSize: 10,
                          fontWeight: 700,
                          writingMode: 'vertical-rl',
                        }}
                      >
                        {plate.weight}
                      </div>
                    ))
                  )}
                </div>
                {/* Outer Sleeve End */}
                <div
                  style={{
                    width: 34,
                    height: 16,
                    background: 'linear-gradient(180deg, #9CA3AF 0%, #6B7280 100%)',
                    borderRadius: '0 4px 4px 0',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--hevy-text-secondary)',
                  marginTop: 12,
                  fontWeight: 600,
                }}
              >
                Anilhas por lado (Total montado: {plateData.achievedWeight} kg)
              </div>
            </div>

            {/* Per-side Breakdown Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {plateData.plates.map((p: PlateResult) => (
                <div
                  key={p.weight}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: 'var(--hevy-card)',
                    border: '1px solid var(--hevy-border)',
                    borderRadius: 10,
                    padding: '8px 12px',
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      backgroundColor: p.color,
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{p.countPerSide}x</span>
                  <span style={{ fontSize: 13, color: 'var(--hevy-text-secondary)' }}>
                    {p.weight} kg
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {warmupSets.map((ws, idx: number) => (
              <div
                key={idx}
                className="hevy-card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      backgroundColor: 'var(--hevy-orange-soft)',
                      color: 'var(--hevy-orange)',
                      fontWeight: 700,
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    W{idx + 1}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{ws.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--hevy-text-secondary)' }}>
                      {ws.pct}% da carga de trabalho
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--hevy-blue)' }}>
                  {ws.weightKg} kg × {ws.reps}
                </div>
              </div>
            ))}

            {onApplyWarmupSets && (
              <button
                type="button"
                className="hevy-btn-primary"
                style={{ marginTop: 6, width: '100%' }}
                onClick={() => {
                  onApplyWarmupSets(
                    warmupSets.map((w) => ({ weightKg: w.weightKg, reps: w.reps }))
                  );
                  onClose();
                }}
              >
                <Flame size={16} />
                Inserir {warmupSets.length} Séries de Aquecimento no Exercício
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
