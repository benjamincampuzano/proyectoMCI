import PropTypes from 'prop-types';
import { SpinnerIcon, WarningCircleIcon } from '@phosphor-icons/react';
import Pagination from '../ui/Pagination';
import GuestFollowUpActions from './GuestFollowUpActions';
import GuestFollowUpSummary from './GuestFollowUpSummary';
import { getGuestStatusLabel, getGuestAlerts } from '../../utils/guestFollowUp';

const badgeFor = (status) =>
  status === 'GANADO'
    ? 'bg-[var(--ln-emerald)]/15 text-[var(--ln-success)] border border-[var(--ln-emerald)]/30'
    : 'bg-[var(--ln-bg-secondary)] text-[var(--ln-text-secondary)] border border-[var(--ln-border-subtle)]';

/** GuestCard — vista móvil de la vista única. */
const GuestCard = ({
  guests,
  loading,
  pagination,
  pageSize,
  onPageChange,
  onOpenDetail,
  actionsFor,
  actionHandlers,
}) => (
  <div className="md:hidden">
    <Pagination
      currentPage={pagination.page}
      totalPages={pagination.pages}
      totalItems={pagination.total}
      pageSize={pageSize}
      onPageChange={onPageChange}
      loading={loading}
      itemLabel="invitados"
      className="mb-4"
    />
    {loading ? (
      <div className="flex justify-center py-8">
        <SpinnerIcon size={24} className="animate-spin text-[var(--ln-brand-indigo)]" />
      </div>
    ) : guests.length === 0 ? (
      <div className="py-8 text-center text-[var(--ln-text-quaternary)] text-sm">No se encontraron invitados</div>
    ) : (
      <>
        <div className="divide-y divide-[var(--ln-border-subtle)]">
          {guests.map((guest) => {
            const alerts = getGuestAlerts(guest);
            return (
            <div key={guest.id} className="p-4 hover:bg-[var(--ln-btn-ghost)] transition-colors">
              <div className="flex items-start justify-between gap-2 mb-1">
                <button
                  onClick={() => onOpenDetail(guest)}
                  className="text-sm font-[510] text-[var(--ln-text-primary)] underline decoration-dotted underline-offset-2 text-left"
                >
                  {guest.name}
                </button>
                <span className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-[510] ${badgeFor(guest.status)}`}>
                  {getGuestStatusLabel(guest.status)}
                </span>
              </div>
              {alerts.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {alerts.map((a, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-[510] bg-red-500/10 text-red-500 border border-red-500/20"
                      title={a.message}
                    >
                      <WarningCircleIcon className="w-3 h-3 mr-0.5" />
                      {a.type === 'call' ? 'Por llamar' : a.type === 'visit' ? 'Por visitar' : '+1 mes'}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-xs text-[var(--ln-text-tertiary)] space-y-0.5 mb-2">
                {guest.createdAt && (
                  <p>
                    {new Date(guest.createdAt).toLocaleDateString('es-ES')} · Registró: {guest.registeredBy?.fullName || 'N/A'}
                  </p>
                )}
                {guest.phone && <p>Tel: {guest.phone}</p>}
                <p>Dirección: {guest.address || 'Sin dirección'}</p>
                {guest.prayerRequest && (
                  <p className="italic truncate" title={guest.prayerRequest}>
                    Oración: {guest.prayerRequest}
                  </p>
                )}
                <p>Resp: {guest.assignedTo?.fullName || guest.invitedBy?.fullName || 'Pendiente'}</p>
                <p>Célula: {guest.cell?.name || 'Sin célula'}</p>
                {guest.invitedBy?.fullName && <p>Invitó: {guest.invitedBy.fullName}</p>}
                {(guest.assignedTo?.liderDoce || guest.invitedBy?.liderDoce) && (
                  <p>
                    Líder de 12: {guest.assignedTo?.liderDoce?.fullName || guest.invitedBy?.liderDoce?.fullName}
                  </p>
                )}
              </div>
              <GuestFollowUpSummary guest={guest} compact showAlerts={false} />
              <div className="mt-3 pt-2 border-t border-[var(--ln-border-subtle)]">
                <GuestFollowUpActions guest={guest} {...actionHandlers} permissions={actionsFor(guest)} />
              </div>
            </div>
            );
          })}
        </div>
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          totalItems={pagination.total}
          pageSize={pageSize}
          onPageChange={onPageChange}
          loading={loading}
          itemLabel="invitados"
          className="mt-4"
        />
      </>
    )}
  </div>
);

GuestCard.propTypes = {
  guests: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  pagination: PropTypes.object.isRequired,
  pageSize: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onOpenDetail: PropTypes.func.isRequired,
  actionsFor: PropTypes.func.isRequired,
  actionHandlers: PropTypes.object.isRequired,
};

export default GuestCard;
