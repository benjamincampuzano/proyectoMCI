import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { PencilSimple } from '@phosphor-icons/react';
import Modal from '../ui/Modal';
import GuestFollowUpSummary from './GuestFollowUpSummary';
import GuestEditForm from './GuestEditForm';
import { getGuestStatusLabel } from '../../utils/guestFollowUp';

/**
 * GuestDetailModal — modal con el detalle menos frecuente del invitado
 * (petición, dirección, encuentro y resumen de seguimiento), con modo de
 * edición de datos personales integrado (reutiliza GuestEditForm).
 * Usa el componente Modal del design system (focus trap, Escape, backdrop).
 */
const GuestDetailModal = ({
  guest,
  isOpen,
  onClose,
  onSubmitEdit,
  canEdit,
  canEditAllFields,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isOpen) void Promise.resolve().then(() => setIsEditing(false));
  }, [isOpen]);

  useEffect(() => {
    void Promise.resolve().then(() => setIsEditing(false));
  }, [guest?.id]);

  const handleSubmitEdit = async (values) => {
    await onSubmitEdit(values);
    setIsEditing(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Editar: ${guest?.name || ''}` : guest?.name || 'Detalle del invitado'}
      size="lg"
    >
      {!guest ? (
        <p className="text-sm text-[var(--ln-text-tertiary)]">Sin información para mostrar.</p>
      ) : isEditing ? (
        <GuestEditForm
          guest={guest}
          canEditAllFields={canEditAllFields}
          onSubmit={handleSubmitEdit}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 -mt-2">
            <p className="text-xs text-[var(--ln-text-tertiary)]">Estado: {getGuestStatusLabel(guest.status)}</p>
            {canEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-[510] bg-[var(--ln-btn-ghost)] border border-[var(--ln-border-subtle)] text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] hover:bg-[var(--ln-btn-subtle)] transition-colors"
              >
                <PencilSimple size={13} /> Editar datos
              </button>
            )}
          </div>

          <section className="space-y-2 text-sm">
            <h4 className="text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Contacto y dirección</h4>
            <p className="text-[var(--ln-text-secondary)]">Tel: {guest.phone || 'N/A'}</p>
            <p className="text-[var(--ln-text-secondary)]">Dirección: {guest.address || 'N/A'}</p>
            {guest.city && <p className="text-[var(--ln-text-secondary)]">Ciudad: {guest.city}</p>}
          </section>

          <section className="space-y-2 text-sm">
            <h4 className="text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Petición de oración</h4>
            <p className="text-[var(--ln-text-secondary)] italic">{guest.prayerRequest || 'Sin petición'}</p>
            {guest.observations && <p className="text-[var(--ln-text-secondary)]">Obs: {guest.observations}</p>}
          </section>

          <section className="space-y-2 text-sm">
            <h4 className="text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Responsable / célula / encuentro</h4>
            <p className="text-[var(--ln-text-secondary)]">
              Responsable: {guest.assignedTo?.fullName || guest.invitedBy?.fullName || 'Pendiente'}
            </p>
            <p className="text-[var(--ln-text-secondary)]">
              Célula: {guest.cell ? `${guest.cell.name} (Líder: ${guest.cell.leader?.fullName || 'N/A'})` : 'No asignado'}
            </p>
            <p className="text-[var(--ln-text-secondary)]">
              Encuentro:{' '}
              {guest.encuentroRegistrations?.length > 0
                ? guest.encuentroRegistrations.map((r) => r.encuentro?.name || r.encuentro?.type).join(', ')
                : 'No registrado'}
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Seguimiento</h4>
            <GuestFollowUpSummary guest={guest} />
          </section>
        </div>
      )}
    </Modal>
  );
};

GuestDetailModal.propTypes = {
  guest: PropTypes.object,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmitEdit: PropTypes.func.isRequired,
  canEdit: PropTypes.bool,
  canEditAllFields: PropTypes.bool,
};

export default GuestDetailModal;
