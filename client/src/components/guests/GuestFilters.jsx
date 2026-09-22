import { useState } from 'react';
import PropTypes from 'prop-types';
import { Funnel, X, FileXls, SpinnerIcon } from '@phosphor-icons/react';
import { AsyncSearchSelect } from '../ui';
import api from '../../utils/api';

const inputCls =
  'w-full px-3.5 py-2.5 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-md text-sm text-[var(--ln-text-primary)] placeholder:text-[var(--ln-text-tertiary)] focus:outline-none focus:border-[var(--ln-accent-violet)] transition-all';
const labelCls =
  'block text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)] mb-1.5';

/**
 * GuestFilters — filtros actuales de la lista, extraídos para reutilizar en la
 * vista única. Incluye filtros rápidos: Por llamar / Por visitar / Llamados /
 * Visitados, que mapean a pendingCalls / pendingVisits / alreadyCalled /
 * alreadyVisited del hook useGuestManagement.
 */
const GuestFilters = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  invitedByFilter,
  setInvitedByFilter,
  liderDoceFilter,
  setLiderDoceFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  pendingCalls,
  setPendingCalls,
  pendingVisits,
  setPendingVisits,
  alreadyCalled,
  setAlreadyCalled,
  alreadyVisited,
  setAlreadyVisited,
  showLiderDoceFilter = true,
  total = 0,
  currentUser = null,
  onExport = null,
  isExporting = false,
  exportDisabled = false,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeCount = [
    searchTerm,
    statusFilter,
    invitedByFilter,
    liderDoceFilter,
    startDate,
    endDate,
    pendingCalls,
    pendingVisits,
    alreadyCalled,
    alreadyVisited,
  ].filter(Boolean).length;

  const hasActive = activeCount > 0;

  const clearAll = () => {
    setSearchTerm('');
    setStatusFilter('');
    setInvitedByFilter(null);
    setLiderDoceFilter(null);
    setStartDate('');
    setEndDate('');
    setPendingCalls(false);
    setPendingVisits(false);
    setAlreadyCalled(false);
    setAlreadyVisited(false);
  };

  const quickBtn = (active, onClick, label) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-[510] border transition-colors ${
        active
          ? 'bg-[var(--ln-brand-indigo)]/15 border-[var(--ln-brand-indigo)]/40 text-[var(--ln-accent-violet)]'
          : 'bg-[var(--ln-btn-ghost)] border-[var(--ln-border-subtle)] text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-[var(--ln-bg-panel)] border border-[var(--ln-border-subtle)] rounded-xl overflow-hidden mb-6 transition-colors">
      <div className="flex items-center justify-between p-4 border-b border-[var(--ln-border-subtle)]">
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="text-sm font-[510] text-[var(--ln-text-primary)] tracking-tight">Filtros</h3>
          {hasActive && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--ln-brand-indigo)]/15 text-[var(--ln-accent-violet)] text-xs font-[510]">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActive && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-[510] text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-[var(--ln-btn-subtle)] transition-colors"
            >
              <X size={14} /> Limpiar
            </button>
          )}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-[510] transition-all ${
              hasActive
                ? 'bg-[var(--ln-brand-indigo)] text-white'
                : 'bg-[var(--ln-btn-ghost)] text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] border border-[var(--ln-border-subtle)]'
            }`}
          >
            <Funnel size={16} weight={showAdvanced ? 'fill' : 'bold'} />
            Filtros
          </button>
        </div>
      </div>

      {/* Filtros rápidos siempre visibles */}
      <div className="flex flex-wrap gap-2 px-4 pt-3">
        {quickBtn(pendingCalls, () => setPendingCalls(!pendingCalls), 'Por llamar')}
        {quickBtn(pendingVisits, () => setPendingVisits(!pendingVisits), 'Por visitar')}
        {quickBtn(alreadyCalled, () => setAlreadyCalled(!alreadyCalled), 'Llamados')}
        {quickBtn(alreadyVisited, () => setAlreadyVisited(!alreadyVisited), 'Visitados')}
      </div>

      <div
        className={`transition-all duration-300 overflow-hidden ${
          showAdvanced ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-end">
            <div className="flex-[2] min-w-[150px] w-full sm:w-auto">
              <label className={labelCls}>Buscar por nombre o teléfono</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Escribe un nombre..."
                className={inputCls}
              />
            </div>
            <div className="flex-1 min-w-[140px] w-full sm:w-auto">
              <label className={labelCls}>Estado</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
                <option value="">Todos los estados</option>
                <option value="NUEVO">Nuevo</option>
                <option value="CONTACTADO">Llamado</option>
                <option value="CONSOLIDADO">Visitado</option>
                <option value="GANADO">Consolidado</option>
              </select>
            </div>
            <div className="flex-[2] min-w-[150px] w-full sm:w-auto">
              <label className={labelCls}>Invitado por</label>
              <AsyncSearchSelect
                fetchItems={(term) => api.get('/users/search', { params: { search: term } }).then((res) => res.data)}
                selectedValue={invitedByFilter}
                onSelect={(u) => setInvitedByFilter(u || null)}
                placeholder="Buscar invitador..."
                labelKey="fullName"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[140px] w-full sm:w-auto">
              <label className={labelCls}>Fecha desde</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div className="flex-1 min-w-[140px] w-full sm:w-auto">
              <label className={labelCls}>Fecha hasta</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
            </div>
            {showLiderDoceFilter && (
              <div className="flex-[2] min-w-[150px] w-full sm:w-auto">
                <label className={labelCls}>Líder de 12</label>
                <AsyncSearchSelect
                  fetchItems={(term) => {
                    const roleFilter = currentUser?.roles?.includes('PASTOR') ? 'LIDER_DOCE,PASTOR' : 'LIDER_DOCE';
                    return api.get('/users/search', { params: { search: term, role: roleFilter } }).then((res) => res.data);
                  }}
                  selectedValue={liderDoceFilter}
                  onSelect={(u) => setLiderDoceFilter(u || null)}
                  placeholder="Buscar líder de 12..."
                  labelKey="fullName"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-[var(--ln-btn-ghost)] border-t border-[var(--ln-border-subtle)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="text-sm font-[510] text-[var(--ln-text-secondary)]">{total} invitados</span>
          {onExport && (
            <button
              onClick={onExport}
              disabled={exportDisabled || isExporting}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--ln-emerald)]/15 hover:bg-[var(--ln-emerald)]/25 border border-[var(--ln-emerald)]/30 text-[var(--ln-success)] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-[510] transition-colors"
            >
              {isExporting ? <SpinnerIcon size={14} className="animate-spin" /> : <FileXls size={16} />}
              {isExporting ? 'Exportando...' : 'Exportar Excel'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

GuestFilters.propTypes = {
  searchTerm: PropTypes.string,
  setSearchTerm: PropTypes.func.isRequired,
  statusFilter: PropTypes.string,
  setStatusFilter: PropTypes.func.isRequired,
  invitedByFilter: PropTypes.object,
  setInvitedByFilter: PropTypes.func.isRequired,
  liderDoceFilter: PropTypes.object,
  setLiderDoceFilter: PropTypes.func.isRequired,
  startDate: PropTypes.string,
  setStartDate: PropTypes.func.isRequired,
  endDate: PropTypes.string,
  setEndDate: PropTypes.func.isRequired,
  pendingCalls: PropTypes.bool,
  setPendingCalls: PropTypes.func.isRequired,
  pendingVisits: PropTypes.bool,
  setPendingVisits: PropTypes.func.isRequired,
  alreadyCalled: PropTypes.bool,
  setAlreadyCalled: PropTypes.func.isRequired,
  alreadyVisited: PropTypes.bool,
  setAlreadyVisited: PropTypes.func.isRequired,
  showLiderDoceFilter: PropTypes.bool,
  total: PropTypes.number,
  currentUser: PropTypes.object,
  onExport: PropTypes.func,
  isExporting: PropTypes.bool,
  exportDisabled: PropTypes.bool,
};

export default GuestFilters;
