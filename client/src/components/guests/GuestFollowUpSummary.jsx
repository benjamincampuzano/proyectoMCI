import PropTypes from 'prop-types';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { getGuestAlerts, getLastCall, getLastVisit, formatShortDate } from '../../utils/guestFollowUp';

/** Última llamada / última visita + alertas por retraso junto al estado. */
const GuestFollowUpSummary = ({ guest, compact = false, showAlerts = true }) => {
  const alerts = showAlerts ? getGuestAlerts(guest) : [];
  const lastCall = getLastCall(guest);
  const lastVisit = getLastVisit(guest);

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {alerts.map((alert, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-[510] bg-red-500/10 text-red-500 border border-red-500/20"
            >
              <WarningCircleIcon className="w-3 h-3 mr-0.5" />
              {alert.message}
            </span>
          ))}
        </div>
      )}
      <p className="text-[11px] text-[var(--ln-text-tertiary)]">
        Llamada: {lastCall ? formatShortDate(lastCall.date) : <span className="italic">pendiente</span>}
        {lastCall?.observation && (
          <span className="block truncate max-w-[180px] italic" title={lastCall.observation}>
            “{lastCall.observation}”
          </span>
        )}
      </p>
      <p className="text-[11px] text-[var(--ln-text-tertiary)]">
        Visita: {lastVisit ? formatShortDate(lastVisit.date) : <span className="italic">pendiente</span>}
        {lastVisit?.observation && (
          <span className="block truncate max-w-[180px] italic" title={lastVisit.observation}>
            “{lastVisit.observation}”
          </span>
        )}
      </p>
    </div>
  );
};

GuestFollowUpSummary.propTypes = {
  guest: PropTypes.object.isRequired,
  compact: PropTypes.bool,
  showAlerts: PropTypes.bool,
};

export default GuestFollowUpSummary;
