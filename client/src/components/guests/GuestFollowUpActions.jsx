import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Phone, House, DotsThreeVertical, WhatsappLogoIcon, ClockCounterClockwiseIcon, UserCheckIcon, PencilSimple, Trash } from '@phosphor-icons/react';

/**
 * GuestFollowUpActions — botones visibles "WhatsApp", "Llamar" y "Visitar" +
 * menú "Más" (historial, editar/convertir/eliminar). Lógica extraída de
 * GuestTracking, sin reescribirla: solo emite callbacks.
 */
const GuestFollowUpActions = ({
  guest,
  onCall,
  onVisit,
  onWhatsApp,
  onHistory,
  onEdit,
  onConvert,
  onDelete,
  permissions = {},
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const { canFollowUp = true, canWhatsApp = true, canEdit = false, canConvert = true, canDelete = false } = permissions;

  const itemCls =
    'w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] hover:bg-[var(--ln-btn-subtle)] transition-colors';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {canFollowUp && (
        <>
          {canWhatsApp && (
            <button
              onClick={() => onWhatsApp(guest)}
              title="Enviar WhatsApp"
              className="px-2.5 py-1.5 rounded-md text-xs font-[510] bg-[var(--ln-btn-ghost)] border border-[var(--ln-border-subtle)] text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] hover:bg-[var(--ln-btn-subtle)] transition-colors flex items-center gap-1"
            >
              <WhatsappLogoIcon size={13} className="text-[var(--ln-success)]" /> WhatsApp
            </button>
          )}
          <button
            onClick={() => onCall(guest)}
            title="Registrar llamada"
            className="px-2.5 py-1.5 rounded-md text-xs font-[510] bg-[var(--ln-btn-ghost)] border border-[var(--ln-border-subtle)] text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] hover:bg-[var(--ln-btn-subtle)] transition-colors flex items-center gap-1"
          >
            <Phone size={13} /> Llamar
          </button>
          <button
            onClick={() => onVisit(guest)}
            title="Registrar visita"
            className="px-2.5 py-1.5 rounded-md text-xs font-[510] bg-[var(--ln-btn-ghost)] border border-[var(--ln-border-subtle)] text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] hover:bg-[var(--ln-btn-subtle)] transition-colors flex items-center gap-1"
          >
            <House size={13} /> Visitar
          </button>
        </>
      )}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen(!open)}
          title="Más acciones"
          className="p-1.5 rounded-md text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-[var(--ln-btn-subtle)] transition-colors"
        >
          <DotsThreeVertical size={16} weight="bold" />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--ln-bg-surface)] border border-[var(--ln-border-standard)] rounded-lg shadow-xl z-20 py-1 overflow-hidden">
            <button className={itemCls} onClick={() => { setOpen(false); onHistory(guest); }}>
              <ClockCounterClockwiseIcon size={14} /> Ver historial
            </button>
            {canEdit && (
              <button className={itemCls} onClick={() => { setOpen(false); onEdit(guest); }}>
                <PencilSimple size={14} /> Editar
              </button>
            )}
            {canConvert && (
              <button className={itemCls} onClick={() => { setOpen(false); onConvert(guest); }}>
                <UserCheckIcon size={14} className="text-[var(--ln-success)]" /> Convertir a discípulo
              </button>
            )}
            {canDelete && (
              <button
                className={`${itemCls} !text-red-500 hover:!bg-red-500/10`}
                onClick={() => { setOpen(false); onDelete(guest); }}
              >
                <Trash size={14} /> Eliminar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

GuestFollowUpActions.propTypes = {
  guest: PropTypes.object.isRequired,
  onCall: PropTypes.func.isRequired,
  onVisit: PropTypes.func.isRequired,
  onWhatsApp: PropTypes.func.isRequired,
  onHistory: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onConvert: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  permissions: PropTypes.shape({
    canFollowUp: PropTypes.bool,
    canWhatsApp: PropTypes.bool,
    canEdit: PropTypes.bool,
    canConvert: PropTypes.bool,
    canDelete: PropTypes.bool,
  }),
};

export default GuestFollowUpActions;
