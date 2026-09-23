import PropTypes from 'prop-types';
import { SpinnerIcon } from '@phosphor-icons/react';
import Pagination from '../ui/Pagination';
import GuestFollowUpActions from './GuestFollowUpActions';
import { getGuestStatusLabel, getLastCall, getLastVisit, formatShortDate, getGuestAlerts } from '../../utils/guestFollowUp';
import { WarningCircleIcon } from '@phosphor-icons/react';

const badgeFor = (status) =>
  status === 'GANADO'
    ? 'bg-[var(--ln-emerald)]/15 text-[var(--ln-success)] border border-[var(--ln-emerald)]/30'
    : 'bg-[var(--ln-bg-secondary)] text-[var(--ln-text-secondary)] border border-[var(--ln-border-subtle)]';

const thCls = 'px-4 py-3 text-left text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]';

/**
 * GuestTable — vista escritorio de la vista única.
 * Columnas: Invitado, contacto, estado, responsable/célula, última llamada,
 * última visita y acciones. El detalle menos frecuente va al modal.
 */
const GuestTable = ({
  guests,
  loading,
  pagination,
  pageSize,
  onPageChange,
  onOpenDetail,
  actionsFor,
  actionHandlers,
}) => (
  <div className="hidden md:block">
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
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-[var(--ln-btn-ghost)] border-b border-[var(--ln-border-subtle)]">
          <tr>
            <th className={thCls}>Invitado</th>
            <th className={thCls}>Contacto</th>
            <th className={thCls}>Estado</th>
            <th className={thCls}>Responsable / Célula</th>
            <th className={thCls}>Última llamada</th>
            <th className={thCls}>Última visita</th>
            <th className={`${thCls} text-right`}>Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ln-border-subtle)]">
          {loading ? (
            <tr>
              <td colSpan="7" className="px-4 py-8 text-center">
                <SpinnerIcon size={24} className="animate-spin mx-auto text-[var(--ln-brand-indigo)]" />
              </td>
            </tr>
          ) : guests.length === 0 ? (
            <tr>
              <td colSpan="7" className="px-4 py-8 text-center text-[var(--ln-text-quaternary)]">
                No se encontraron invitados
              </td>
            </tr>
          ) : (
            guests.map((guest) => {
              const lastCall = getLastCall(guest);
              const lastVisit = getLastVisit(guest);
              const alerts = getGuestAlerts(guest);
              const responsible = guest.assignedTo?.fullName || guest.invitedBy?.fullName || 'Pendiente';
              return (
                <tr key={guest.id} className="hover:bg-[var(--ln-btn-ghost)] transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onOpenDetail(guest)}
                      className="text-[var(--ln-text-primary)] text-sm font-[510] hover:text-[var(--ln-accent-violet)] text-left underline decoration-dotted underline-offset-2 decoration-[var(--ln-border-subtle)]"
                      title="Ver detalle"
                    >
                      {guest.name}
                    </button>
                    <p className="text-xs text-[var(--ln-text-tertiary)] mt-0.5">
                      {guest.createdAt ? new Date(guest.createdAt).toLocaleDateString('es-ES') : ''}
                    </p>
                    <p className="text-xs text-[var(--ln-text-tertiary)]">
                      Registró: {guest.registeredBy?.fullName || 'N/A'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-[var(--ln-text-secondary)]">{guest.phone || 'N/A'}</p>
                    <div className="flex items-start gap-3 mt-0.5">
                      <p className="text-xs text-[var(--ln-text-tertiary)] min-w-0 truncate max-w-[140px]" title={guest.address || ''}>
                        {guest.address || 'Sin dirección'}
                      </p>
                      <p
                        className="text-xs text-[var(--ln-text-tertiary)] italic min-w-0 truncate max-w-[160px]"
                        title={guest.prayerRequest || ''}
                      >
                        {guest.prayerRequest || 'Sin petición'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-[510] ${badgeFor(guest.status)}`}>
                      {getGuestStatusLabel(guest.status)}
                    </span>
                    {alerts.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
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
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-[var(--ln-text-primary)]">{responsible}</p>
                    <p className="text-xs text-[var(--ln-text-tertiary)]">
                      {guest.cell ? `Célula: ${guest.cell.name}` : 'Sin célula'}
                    </p>
                    {guest.invitedBy?.fullName && (
                      <p className="text-xs text-[var(--ln-text-tertiary)]">Invitó: {guest.invitedBy.fullName}</p>
                    )}
                    {(guest.assignedTo?.liderDoce || guest.invitedBy?.liderDoce) && (
                      <p className="text-xs text-[var(--ln-text-tertiary)]">
                        Líder de 12: {guest.assignedTo?.liderDoce?.fullName || guest.invitedBy?.liderDoce?.fullName}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lastCall ? (
                      <>
                        <p className="text-sm text-[var(--ln-text-secondary)]">{formatShortDate(lastCall.date)}</p>
                        <p className="text-xs text-[var(--ln-text-tertiary)] truncate max-w-[160px]" title={lastCall.observation}>
                          {lastCall.observation}
                        </p>
                      </>
                    ) : (
                      <span className="text-xs italic text-[var(--ln-text-quaternary)]">Pendiente</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lastVisit ? (
                      <>
                        <p className="text-sm text-[var(--ln-text-secondary)]">{formatShortDate(lastVisit.date)}</p>
                        <p className="text-xs text-[var(--ln-text-tertiary)] truncate max-w-[160px]" title={lastVisit.observation}>
                          {lastVisit.observation}
                        </p>
                      </>
                    ) : (
                      <span className="text-xs italic text-[var(--ln-text-quaternary)]">Pendiente</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <GuestFollowUpActions guest={guest} {...actionHandlers} permissions={actionsFor(guest)} />
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
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
  </div>
);

GuestTable.propTypes = {
  guests: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  pagination: PropTypes.object.isRequired,
  pageSize: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onOpenDetail: PropTypes.func.isRequired,
  actionsFor: PropTypes.func.isRequired,
  actionHandlers: PropTypes.object.isRequired,
};

export default GuestTable;
