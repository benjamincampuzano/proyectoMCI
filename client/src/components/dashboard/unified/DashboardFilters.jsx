import PropTypes from 'prop-types';
import { Funnel, MagnifyingGlass, MicrosoftExcelLogo, Eraser, CalendarBlank } from '@phosphor-icons/react';

const PRESETS = [
    { id: '7d', label: '7D' },
    { id: '30d', label: '30D' },
    { id: '90d', label: '90D' },
    { id: '12m', label: '12M' },
];

const inputCls = 'px-3 py-2 bg-white/5 border border-[var(--ln-border-standard)] rounded-xl text-[13px] text-[var(--ln-text-primary)] outline-none focus:border-[var(--ln-brand-indigo)] transition-colors';

/**
 * Barra de segmentaciones estilo Power BI: fechas + presets + red + búsqueda + estado.
 * Sticky y colapsable en móvil. Muestra chips de filtros activos.
 */
const DashboardFilters = ({ filters, lideresDoce, onChange, onPreset, onClear, onExport, resultCount }) => {
    const activeChips = [];
    if (filters.startDate || filters.endDate) activeChips.push({ key: 'dates', label: `${filters.startDate || '…'} → ${filters.endDate || '…'}` });
    if (filters.liderDoceId) {
        const found = lideresDoce.find((l) => String(l.id) === String(filters.liderDoceId));
        activeChips.push({ key: 'red', label: `Líder: ${found?.profile?.fullName || found?.fullName || found?.email || filters.liderDoceId}` });
    }
    if (filters.guestStatus) activeChips.push({ key: 'status', label: `Estado: ${filters.guestStatus}` });
    if (filters.search) activeChips.push({ key: 'q', label: `Buscar: ${filters.search}` });

    const clearOne = (key) => {
        if (key === 'dates') onChange({ startDate: '', endDate: '', preset: '' });
        if (key === 'red') onChange({ liderDoceId: '' });
        if (key === 'status') onChange({ guestStatus: '' });
        if (key === 'q') onChange({ search: '' });
    };

    return (
        <div className="bg-[var(--ln-bg-panel)]/60 backdrop-blur-xl border border-[var(--ln-border-standard)] rounded-[20px] p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="flex items-center gap-2 text-[12px] weight-590 text-[var(--ln-text-tertiary)] uppercase tracking-widest">
                    <Funnel size={15} className="text-[var(--ln-brand-indigo)]" weight="bold" />
                    Segmentaciones
                </span>
                <div className="flex items-center gap-1 bg-white/[0.03] border border-[var(--ln-border-standard)] rounded-xl p-1">
                    {PRESETS.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => onPreset(p.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] weight-590 transition-all ${filters.preset === p.id ? 'bg-[var(--ln-brand-indigo)] text-white' : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)]'}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                {typeof resultCount === 'number' && (
                    <span className="ml-auto text-[11px] text-[var(--ln-text-tertiary)] weight-510">{resultCount} registros en vista</span>
                )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3">
                <label className="flex items-center gap-2 col-span-1">
                    <CalendarBlank size={15} className="text-[var(--ln-text-tertiary)] shrink-0" />
                    <input type="date" value={filters.startDate || ''} onChange={(e) => onChange({ startDate: e.target.value, preset: '' })} className={`${inputCls} w-full`} aria-label="Fecha desde" />
                </label>
                <label className="flex items-center gap-2 col-span-1">
                    <CalendarBlank size={15} className="text-[var(--ln-text-tertiary)] shrink-0" />
                    <input type="date" value={filters.endDate || ''} onChange={(e) => onChange({ endDate: e.target.value, preset: '' })} className={`${inputCls} w-full`} aria-label="Fecha hasta" />
                </label>
                <select value={filters.liderDoceId || ''} onChange={(e) => onChange({ liderDoceId: e.target.value })} className={`${inputCls} col-span-2 lg:col-span-1`} aria-label="Filtrar por red">
                    <option value="">Todos los Lideres 12</option>
                    {lideresDoce.map((l) => (
                        <option key={l.id} value={l.id}>{l.profile?.fullName || l.fullName || l.email}</option>
                    ))}
                </select>
                <select value={filters.guestStatus || ''} onChange={(e) => onChange({ guestStatus: e.target.value })} className={`${inputCls} col-span-1`} aria-label="Filtrar por estado">
                    <option value="">Todos los estados</option>
                    <option value="NUEVO">Nuevos</option>
                    <option value="CONTACTADO">Contactados</option>
                    <option value="CONSOLIDADO">Consolidados</option>
                    <option value="GANADO">Ganados</option>
                </select>
                <div className={`col-span-2 lg:col-span-1 relative`}>
                    <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ln-text-tertiary)]" />
                    <input value={filters.search || ''} onChange={(e) => onChange({ search: e.target.value })} placeholder="Buscar líder, persona…" className={`${inputCls} w-full pl-9`} aria-label="Búsqueda" />
                </div>
                <div className="col-span-2 lg:col-span-1 flex gap-2">
                    <button type="button" onClick={onClear} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-[12px] weight-590 text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-white/5 transition-all">
                        <Eraser size={15} /> Limpiar
                    </button>
                    <button type="button" onClick={onExport} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[12px] weight-590 hover:bg-emerald-500/25 transition-all">
                        <MicrosoftExcelLogo size={15} /> Excel
                    </button>
                </div>
            </div>

            {activeChips.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {activeChips.map((chip) => (
                        <button key={chip.key} type="button" onClick={() => clearOne(chip.key)} title="Quitar filtro" className="flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-full bg-[var(--ln-brand-indigo)]/12 border border-[var(--ln-brand-indigo)]/25 text-[var(--ln-brand-indigo)] text-[11px] weight-590 hover:bg-[var(--ln-brand-indigo)]/20 transition-all">
                            {chip.label} <span aria-hidden>×</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

DashboardFilters.propTypes = {
    filters: PropTypes.object.isRequired,
    lideresDoce: PropTypes.array,
    onChange: PropTypes.func.isRequired,
    onPreset: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
    onExport: PropTypes.func.isRequired,
    resultCount: PropTypes.number,
};

export default DashboardFilters;
