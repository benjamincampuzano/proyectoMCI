import { useState } from 'react';
import PropTypes from 'prop-types';
import { X, Clock, CheckCircle } from '@phosphor-icons/react';
import { format } from 'date-fns';

/** Modal Registrar llamada / visita (extraído de GuestTracking). */
const FollowUpModal = ({ type, guest, onClose, onSubmit, saving = false }) => {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [observation, setObservation] = useState('');
  const [error, setError] = useState('');

  if (!guest || (type !== 'call' && type !== 'visit')) return null;

  const handleSubmit = async () => {
    if (!observation.trim()) {
      setError('La observación es obligatoria');
      return;
    }
    setError('');
    await onSubmit({ date, observation: observation.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--ln-overlay)] backdrop-blur-[2px]">
      <div className="bg-[var(--ln-bg-surface)] border border-[var(--ln-border-standard)] rounded-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--ln-border-subtle)] flex items-center justify-between bg-[var(--ln-bg-panel)]">
          <div>
            <h3 className="text-lg font-[590] text-[var(--ln-text-primary)]">
              {type === 'call' ? 'Registrar Llamada' : 'Registrar Visita'}
            </h3>
            <p className="text-xs text-[var(--ln-text-tertiary)] mt-0.5">Invitado: {guest.name}</p>
          </div>
          <button onClick={onClose} className="text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] rounded-md p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">{error}</p>}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Fecha y Hora</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ln-text-quaternary)]" />
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-md text-[var(--ln-text-primary)] focus:outline-none focus:border-[var(--ln-accent-violet)]"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Observación (Obligatoria)</label>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-md text-[var(--ln-text-primary)] resize-none"
              placeholder="Escribe lo que sucedió durante el contacto..."
              rows="4"
            />
          </div>
        </div>
        <div className="px-6 py-4 bg-[var(--ln-bg-panel)] border-t border-[var(--ln-border-subtle)] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-[510] text-[var(--ln-text-secondary)] hover:bg-[var(--ln-btn-subtle)] rounded-md">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm font-[510] text-white bg-[var(--ln-brand-indigo)] hover:bg-[var(--ln-accent-hover)] disabled:opacity-50 rounded-md flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Crear contacto'}
          </button>
        </div>
      </div>
    </div>
  );
};

FollowUpModal.propTypes = {
  type: PropTypes.oneOf(['call', 'visit']),
  guest: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  saving: PropTypes.bool,
};

export default FollowUpModal;
