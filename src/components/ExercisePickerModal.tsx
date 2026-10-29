import React, { useState, useMemo } from 'react';
import { X, Search, Plus, Check, Info } from 'lucide-react';
import { Exercise } from '../types';
import { MUSCLE_LABELS, EQUIPMENT_LABELS } from '../utils/fitness';

interface ExercisePickerModalProps {
  exercises: Exercise[];
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
  onCreateCustomExercise?: (exercise: Exercise) => void;
  onInspectExercise?: (exercise: Exercise) => void;
}

export const ExercisePickerModal: React.FC<ExercisePickerModalProps> = ({
  exercises,
  onClose,
  onSelectExercise,
  onCreateCustomExercise,
  onInspectExercise,
}) => {
  const [query, setQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const [customTitle, setCustomTitle] = useState('');
  const [customMuscle, setCustomMuscle] = useState('chest');
  const [customEquipment, setCustomEquipment] = useState('dumbbell');

  const muscleOptions = useMemo(() => {
    const set = new Set<string>();
    exercises.forEach((e) => set.add(e.muscle_group));
    return ['all', ...Array.from(set)];
  }, [exercises]);

  const equipmentOptions = useMemo(() => {
    const set = new Set<string>();
    exercises.forEach((e) => set.add(e.equipment));
    return ['all', ...Array.from(set)];
  }, [exercises]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (selectedMuscle !== 'all' && ex.muscle_group !== selectedMuscle) return false;
      if (selectedEquipment !== 'all' && ex.equipment !== selectedEquipment) return false;
      if (!q) return true;
      return (
        ex.title.toLowerCase().includes(q) ||
        ex.title_en.toLowerCase().includes(q) ||
        (MUSCLE_LABELS[ex.muscle_group] || '').toLowerCase().includes(q)
      );
    });
  }, [exercises, query, selectedMuscle, selectedEquipment]);

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    const newEx: Exercise = {
      id: `custom-${Date.now()}`,
      title: customTitle.trim(),
      title_en: customTitle.trim(),
      priority: 10,
      muscle_group: customMuscle,
      exercise_type: 'weight_reps',
      equipment: customEquipment,
      video_url: null,
      video_url_female: null,
      thumbnail_url: null,
      instructions: '1. Exercício personalizado criado no Tatagan.sh.',
    };
    if (onCreateCustomExercise) {
      onCreateCustomExercise(newEx);
    }
    onSelectExercise(newEx);
    onClose();
  };

  return (
    <div className="hevy-modal-backdrop" onClick={onClose} style={{ zIndex: 70 }}>
      <div
        className="hevy-modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ height: '92%', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
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
            <h3 style={{ fontSize: 17, fontWeight: 700 }}>Adicionar Exercício</h3>
            <span style={{ fontSize: 12, color: 'var(--hevy-text-secondary)' }}>
              {filtered.length} de {exercises.length} exercícios oficiais Tatagan.sh
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="hevy-btn-secondary"
              style={{ padding: '6px 10px', fontSize: 12 }}
              onClick={() => setShowCustomForm((v) => !v)}
            >
              <Plus size={14} />
              Criar
            </button>
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
        </div>

        {/* Custom Exercise Builder */}
        {showCustomForm && (
          <form
            onSubmit={handleCreateCustom}
            style={{
              padding: 14,
              backgroundColor: 'var(--hevy-card)',
              borderBottom: '1px solid var(--hevy-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--hevy-blue)' }}>
              Novo Exercício Personalizado
            </div>
            <input
              type="text"
              placeholder="Nome do exercício (ex: Supino Máquina Articulada)"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="hevy-set-input"
              style={{ textAlign: 'left', padding: '0 12px', height: 38 }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <select
                value={customMuscle}
                onChange={(e) => setCustomMuscle(e.target.value)}
                className="hevy-set-input"
                style={{ height: 38, padding: '0 8px' }}
              >
                {Object.entries(MUSCLE_LABELS).map(([k, label]: [string, string]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={customEquipment}
                onChange={(e) => setCustomEquipment(e.target.value)}
                className="hevy-set-input"
                style={{ height: 38, padding: '0 8px' }}
              >
                {Object.entries(EQUIPMENT_LABELS).map(([k, label]: [string, string]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="hevy-btn-primary">
              <Check size={16} /> Salvar e Adicionar ao Treino
            </button>
          </form>
        )}

        {/* Search & Filters */}
        <div
          style={{
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            borderBottom: '1px solid var(--hevy-border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'var(--hevy-elevated)',
              borderRadius: 10,
              padding: '0 12px',
              height: 40,
            }}
          >
            <Search size={17} color="var(--hevy-text-muted)" />
            <input
              type="text"
              placeholder="Buscar nos 434 exercícios (ex: Supino, Agachamento, Rosca)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                width: '100%',
                color: 'var(--hevy-text)',
                fontSize: 15,
              }}
            />
          </div>

          {/* Muscle Filter Chips */}
          <div className="hevy-chip-row">
            {muscleOptions.map((m) => (
              <button
                key={m}
                type="button"
                className={`hevy-chip ${selectedMuscle === m ? 'active' : ''}`}
                onClick={() => setSelectedMuscle(m)}
              >
                {m === 'all' ? 'Todos os Músculos' : MUSCLE_LABELS[m] || m}
              </button>
            ))}
          </div>

          {/* Equipment Filter Chips */}
          <div className="hevy-chip-row">
            {equipmentOptions.map((eq) => (
              <button
                key={eq}
                type="button"
                className={`hevy-chip ${selectedEquipment === eq ? 'active' : ''}`}
                onClick={() => setSelectedEquipment(eq)}
              >
                {eq === 'all' ? 'Todos Equipamentos' : EQUIPMENT_LABELS[eq] || eq}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {filtered.slice(0, 120).map((ex) => (
            <div
              key={ex.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 12,
                backgroundColor: 'var(--hevy-card)',
                border: '1px solid var(--hevy-border)',
                gap: 10,
              }}
            >
              <div
                onClick={() => {
                  onSelectExercise(ex);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flex: 1,
                  cursor: 'pointer',
                }}
              >
                {ex.thumbnail_url ? (
                  <img
                    src={ex.thumbnail_url}
                    alt={ex.title}
                    loading="lazy"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 10,
                      objectFit: 'cover',
                      backgroundColor: '#FFF',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 48,
                      height: 48,
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
                      fontWeight: 600,
                      fontSize: 14,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {ex.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--hevy-text-secondary)' }}>
                    {MUSCLE_LABELS[ex.muscle_group] || ex.muscle_group} •{' '}
                    {EQUIPMENT_LABELS[ex.equipment] || ex.equipment}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {onInspectExercise && (
                  <button
                    type="button"
                    onClick={() => onInspectExercise(ex)}
                    style={{
                      background: 'var(--hevy-elevated)',
                      border: 'none',
                      borderRadius: 8,
                      width: 34,
                      height: 34,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--hevy-text-secondary)',
                    }}
                    title="Ver vídeo e instruções"
                  >
                    <Info size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onSelectExercise(ex);
                    onClose();
                  }}
                  style={{
                    background: 'var(--hevy-blue)',
                    border: 'none',
                    borderRadius: 8,
                    width: 34,
                    height: 34,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFF',
                  }}
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
