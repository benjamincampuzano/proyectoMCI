import PropTypes from 'prop-types';
import { X, Phone, House, Trash } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/** Historial de llamadas/visitas + eliminación de registros (extraído de GuestTracking). */
const GuestFollowUpHistoryModal = ({ guest, canDeleteRecords, onClose, onDeleteCall, onDeleteVisit }) => {
  if (!guest) return null;

  const recordCls = 'bg-[var(--ln-bg-panel)] rounded-xl p-4 border border-[var(--ln-border-subtle)]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--ln-overlay)] backdrop-blur-[2px]">
      <div className="bg-[var(--ln-bg-surface)] border border-[var(--ln-border-standard)] rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--ln-border-subtle)] flex items-center justify-between bg-[var(--ln-bg-panel)]">
          <div>
            <h3 className="text-lg font-[590] text-[var(--ln-text-primary)]">Historial de Seguimiento</h3>
            <p className="text-xs text-[var(--ln-text-tertiary)] mt-0.5">Invitado: {guest.name}</p>
          </div>
          <button onClick={onClose} className="text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] rounded-md p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-[510] uppercase tracking-wider text-[var(--ln-text-primary)] mb-4">
              <Phone className="w-4 h-4 text-[var(--ln-success)]" />
              Llamadas Realizadas ({guest.calls?.length || 0})
            </h4>
            <div className="space-y-4">
              {guest.calls?.length > 0 ? (
                guest.calls.map((call) => (
                  <div key={call.id} className={recordCls}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-[510] text-[var(--ln-accent-violet)] bg-[var(--ln-brand-indigo)]/10 px-2 py-0.5 rounded-md">
                        {format(new Date(call.date), 'PPP p', { locale: es })}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--ln-text-tertiary)] uppercase font-[510]">
                          Por: {call.caller?.fullName}
                        </span>
                        {canDeleteRecords && (
                          <button
                            onClick={() => onDeleteCall(call)}
                            className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                            title="Eliminar llamada"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-[var(--ln-text-secondary)] leading-relaxed italic border-l-2 border-[var(--ln-border-subtle)] pl-3">
                      &ldquo;{call.observation}&rdquo;
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--ln-text-tertiary)] italic text-center py-4 bg-[var(--ln-bg-panel)] rounded-xl border border-dashed border-[var(--ln-border-subtle)]">
                  No hay registros de llamadas.
                </p>
              )}
            </div>
          </div>
          <div>
            <h4 className="flex items-center gap-2 text-sm font-[510] uppercase tracking-wider text-[var(--ln-text-primary)] mb-4">
              <House className="w-4 h-4 text-[var(--ln-accent-violet)]" />
              Visitas Realizadas ({guest.visits?.length || 0})
            </h4>
            <div className="space-y-4">
              {guest.visits?.length > 0 ? (
                guest.visits.map((visit) => (
                  <div key={visit.id} className={recordCls}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-[510] text-[var(--ln-accent-violet)] bg-[var(--ln-brand-indigo)]/10 px-2 py-0.5 rounded-md">
                        {format(new Date(visit.date), 'PPP p', { locale: es })}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--ln-text-tertiary)] uppercase font-[510]">
                          Por: {visit.visitor?.fullName}
                        </span>
                        {canDeleteRecords && (
                          <button
                            onClick={() => onDeleteVisit(visit)}
                            className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                            title="Eliminar visita"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-[var(--ln-text-secondary)] leading-relaxed italic border-l-2 border-[var(--ln-border-subtle)] pl-3">
                      &ldquo;{visit.observation}&rdquo;
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--ln-text-tertiary)] italic text-center py-4 bg-[var(--ln-bg-panel)] rounded-xl border border-dashed border-[var(--ln-border-subtle)]">
                  No hay registros de visitas.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-[var(--ln-bg-panel)] border-t border-[var(--ln-border-subtle)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-[510] text-white bg-[var(--ln-brand-indigo)] hover:bg-[var(--ln-accent-hover)] rounded-md"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

GuestFollowUpHistoryModal.propTypes = {
  guest: PropTypes.object,
  canDeleteRecords: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onDeleteCall: PropTypes.func.isRequired,
  onDeleteVisit: PropTypes.func.isRequired,
};

export default GuestFollowUpHistoryModal;
