import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
    Users,
    Calendar,
    Clock,
    BookOpen,
    House,
    Heart,
    CaretRight,
    MagnifyingGlass,
    Info,
    PhoneDisconnect,
    MapPin,
    Medal,
    GraduationCap,
    PhoneCall
} from '@phosphor-icons/react';
import api from '../utils/api';
import Table from './ui/Table';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from './ui';

const ROLES = ['PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO'];
const ASISTENCIA_TIPOS = [
    { key: 'iglesia', label: 'Iglesia', icon: House },
    { key: 'celula', label: 'Célula', icon: Heart },
    { key: 'escuela', label: 'Escuela', icon: BookOpen },
    { key: 'encuentro', label: 'Encuentro', icon: GraduationCap },
    { key: 'ganar', label: 'Ganar', icon: PhoneCall }
];
const ROLE_OPTIONS = ['PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO'];

const defaultWindow = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    const iso = (d) => d.toISOString().split('T')[0];
    return { startDate: iso(start), endDate: iso(end) };
};

const UserActivityList = ({ filters: externalFilters = null, lideresDoce: externalLideres = null, showFilters = true }) => {
    const controlled = Boolean(externalFilters);
    const [data, setData] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [localFilters, setLocalFilters] = useState(defaultWindow);
    const [localRed, setLocalRed] = useState('');
    const [localLideres, setLocalLideres] = useState([]);
    const limit = 50;

    const lideres = externalLideres || localLideres;
    const effStart = controlled ? externalFilters.startDate : localFilters.startDate;
    const effEnd = controlled ? externalFilters.endDate : localFilters.endDate;
    const effRed = controlled ? externalFilters.liderDoceId : localRed;
    const effSearch = controlled ? (externalFilters.search || '') : searchTerm;

    useEffect(() => {
        if (externalLideres) return;
        let cancelled = false;
        api.get('/network/los-doce').then((res) => {
            if (!cancelled) setLocalLideres(res.data || []);
        }).catch(() => {});
        return () => { cancelled = true; };
    }, [externalLideres]);

    const fetchActivityData = useCallback(async () => {
        try {
            setLoading(true);
            const params = { page, limit };
            if (effStart) params.startDate = effStart;
            if (effEnd) params.endDate = effEnd;
            if (effRed) params.liderDoceId = effRed;
            if (roleFilter) params.role = roleFilter;
            if (effSearch) params.search = effSearch;
            const response = await api.get('/network/activity-list', { params });
            setData(response.data.data || []);
            setTotalPages(response.data.pagination.pages);
            setTotalItems(response.data.pagination.total);
            setMeta(response.data.meta || null);
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Error al cargar los datos de actividad');
        } finally {
            setLoading(false);
        }
    }, [page, limit, effStart, effEnd, effRed, roleFilter, effSearch]);

    useEffect(() => {
        const t = setTimeout(() => {
            void Promise.resolve().then(fetchActivityData);
        }, controlled ? 0 : 300);
        return () => clearTimeout(t);
    }, [fetchActivityData, controlled]);

    const firstRun = useRef(true);
    useEffect(() => {
        if (firstRun.current) {
            firstRun.current = false;
            return;
        }
        setPage(1);
    }, [effStart, effEnd, effRed, effSearch, roleFilter]);

    const updateLocal = (patch) => {
        setLocalFilters((prev) => ({ ...prev, ...patch }));
    };

    const clearAll = () => {
        setSearchTerm('');
        setRoleFilter('');
        setLocalRed('');
        setLocalFilters(defaultWindow());
        setPage(1);
    };

    const hasActiveFilters = searchTerm || roleFilter || (!controlled && (localRed || localFilters.startDate || localFilters.endDate));

    const columns = [
        {
            header: 'Usuario',
            key: 'fullName',
            render: (name, row) => (
                <div className="flex flex-col gap-1.5">
                    <span className="weight-590 text-[var(--ln-text-primary)] tracking-tight text-[14px]">{name}</span>
                    <div className="flex flex-wrap gap-1.5">
                        {row.roles.map(role => (
                            <span key={role} className="px-2 py-0.5 text-[9px] weight-590 bg-[var(--ln-brand-indigo)]/10 text-[var(--ln-brand-indigo)] border border-[var(--ln-brand-indigo)]/20 rounded uppercase tracking-widest">
                                {role.replace(/_/g, ' ')}
                            </span>
                        ))}
                    </div>
                </div>
            )
        },
        {
            header: 'Invitados',
            key: 'invitadosCount',
            render: (count) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center border border-amber-500/20">
                        <Users size={16} weight="bold" />
                    </div>
                    <span className="weight-590 text-[var(--ln-text-primary)] text-sm">{count}</span>
                </div>
            )
        },
        {
            header: 'Líder Inmediato',
            key: 'liderDoce',
            render: (liderName) => (
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-purple-500/10 text-purple-500 rounded-lg flex items-center justify-center border border-purple-500/20">
                        <Medal size={14} weight="bold" />
                    </div>
                    <span className="text-[13px] weight-510 text-[var(--ln-text-tertiary)] group-hover:text-[var(--ln-text-primary)] transition-colors">
                        {liderName && liderName !== 'N/A' ? liderName : 'Sin líder asignado'}
                    </span>
                </div>
            )
        },
        {
            header: 'Asistencias',
            key: 'asistencias',
            render: (asistencias) => (
                <div className="flex items-center gap-4 min-w-[220px]">
                    <div className="flex flex-col items-center gap-1.5 group relative" title="Iglesia">
                        <div className="p-2 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-lg group-hover:scale-110 transition-all duration-300">
                            <House size={14} weight="bold" />
                        </div>
                        <span className="text-[11px] weight-590 text-[var(--ln-text-primary)]">{asistencias.iglesia}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 group relative" title="Célula">
                        <div className="p-2 bg-pink-500/10 text-pink-500 border border-pink-500/20 rounded-lg group-hover:scale-110 transition-all duration-300">
                            <Heart size={14} weight="bold" />
                        </div>
                        <span className="text-[11px] weight-590 text-[var(--ln-text-primary)]">{asistencias.celula}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 group relative" title="Escuela">
                        <div className="p-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg group-hover:scale-110 transition-all duration-300">
                            <BookOpen size={14} weight="bold" />
                        </div>
                        <span className="text-[11px] weight-590 text-[var(--ln-text-primary)]">{asistencias.escuela}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 group relative" title="Encuentro">
                        <div className="p-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg group-hover:scale-110 transition-all duration-300">
                            <GraduationCap size={14} weight="bold" />
                        </div>
                        <span className="text-[11px] weight-590 text-[var(--ln-text-primary)]">{asistencias.encuentro}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 group relative" title="Ganar">
                        <div className="p-2 bg-sky-500/10 text-sky-500 border border-sky-500/20 rounded-lg group-hover:scale-110 transition-all duration-300">
                            <PhoneCall size={14} weight="bold" />
                        </div>
                        <span className="text-[11px] weight-590 text-[var(--ln-text-primary)]">{asistencias.ganar}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'En Célula',
            key: 'celula',
            render: (celula) => (
                <div className="flex flex-col gap-1.5 min-w-[140px]">
                    <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-[var(--ln-text-tertiary)]" />
                        <span className="text-[13px] weight-510 text-[var(--ln-text-primary)]">
                            {celula.nombre}
                        </span>
                    </div>
                    {celula.isAnfitrion && (
                        <span className="w-fit px-2 py-0.5 text-[9px] weight-590 bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded uppercase tracking-widest flex items-center gap-1.5">
                            <House size={10} weight="bold" />
                            Anfitrión
                        </span>
                    )}
                </div>
            )
        },
        {
            header: 'Clases',
            key: 'clases',
            render: (clases) => (
                <div className="flex -space-x-2 overflow-hidden items-center min-w-[100px]">
                    {clases.length > 0 ? (
                        clases.slice(0, 3).map((c, i) => (
                            <div
                                key={i}
                                className={`w-8 h-8 rounded-full border-2 border-[var(--ln-bg-panel)] flex items-center justify-center text-[10px] weight-590 shadow-sm relative z-[${10-i}] ${c.finalGrade >= 3 ? 'bg-emerald-500 text-white' : 'bg-[var(--ln-border-standard)] text-[var(--ln-text-tertiary)]'
                                    }`}
                                title={`${c.moduleName}: ${c.finalGrade || 'En curso'}`}
                            >
                                {c.moduleName.substring(0, 2).toUpperCase()}
                            </div>
                        ))
                    ) : (
                        <span className="text-[11px] text-[var(--ln-text-tertiary)] font-italic opacity-40">Sin registros</span>
                    )}
                    {clases.length > 3 && (
                        <div className="w-8 h-8 rounded-full border-2 border-[var(--ln-bg-panel)] bg-white/5 text-[var(--ln-text-tertiary)] flex items-center justify-center text-[10px] weight-700 z-0">
                            +{clases.length - 3}
                        </div>
                    )}
                </div>
            )
        },
        {
            header: 'Acceso',
            key: 'ultimoAcceso',
            render: (date) => (
                <div className="flex items-center gap-2 text-[12px] text-[var(--ln-text-tertiary)] opacity-60">
                    <Clock size={12} weight="bold" />
                    <span>
                        {date
                            ? formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
                            : 'Sin actividad'}
                    </span>
                </div>
            )
        }
    ];

    if (error) {
        return (
            <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex items-center gap-4 text-red-500">
                    <Info size={24} weight="bold" />
                    <span className="text-sm weight-510">{error}</span>
                </div>
                <button 
                    onClick={fetchActivityData} 
                    className="px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs weight-590 transition-all border border-red-500/20"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="bg-[var(--ln-bg-panel)]/50 backdrop-blur-xl rounded-[24px] border border-[var(--ln-border-standard)] shadow-2xl overflow-hidden animate-in fade-in duration-700">
            <div className="p-6 sm:p-8 border-b border-[var(--ln-border-standard)] bg-white/[0.02]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 mb-4 sm:mb-8">
                    <div>
                        <h3 className="text-base sm:text-lg weight-590 text-[var(--ln-text-primary)] flex items-center gap-2 sm:gap-3 tracking-tight">
                            <Medal className="text-amber-500" size={20} sm:size={24} weight="bold" />
                            Reporte de Actividad Ministerial
                        </h3>
                        <p className="text-xs sm:text-[13px] text-[var(--ln-text-tertiary)] mt-1 opacity-70">
                            Monitoreo preciso de progresos, asistencias y cobertura espiritual.
                            {meta?.ventana && <span className="block mt-0.5">Ventana: <span className="text-[var(--ln-text-primary)] weight-590 opacity-100">{meta.ventana}</span></span>}
                            {controlled && <span className="block mt-0.5">Sincronizado con los segmentadores del dashboard.</span>}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        {hasActiveFilters && (
                            <button
                                onClick={clearAll}
                                className="text-[10px] sm:text-[12px] weight-590 text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] transition-colors px-2 sm:px-3 py-1 sm:py-1.5"
                            >
                                Limpiar Filtros
                            </button>
                        )}
                        <select
                            value={roleFilter}
                            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                            className="px-3 py-1.5 sm:py-2.5 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] rounded-lg sm:rounded-xl text-[10px] sm:text-sm focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all"
                            aria-label="Filtrar por rol"
                        >
                            <option value="">Todos los roles</option>
                            {ROLE_OPTIONS.map((r) => (
                                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                        {!controlled && showFilters && (
                            <div className="relative group min-w-[0] sm:min-w-[300px] flex-1">
                                <MagnifyingGlass className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-[var(--ln-text-tertiary)] w-3.5 sm:w-4 h-3.5 sm:h-4 transition-colors group-focus-within:text-[var(--ln-brand-indigo)]" weight="bold" />
                                <input
                                    type="text"
                                    placeholder="Filtrar por nombre o rol..."
                                    className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2.5 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] rounded-lg sm:rounded-xl text-[10px] sm:text-sm focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all placeholder:text-[var(--ln-text-tertiary)]/40"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {!controlled && showFilters && (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <label className="flex items-center gap-2 text-[11px] text-[var(--ln-text-tertiary)] weight-510">
                            Desde
                            <input
                                type="date"
                                value={localFilters.startDate}
                                onChange={(e) => { updateLocal({ startDate: e.target.value }); setPage(1); }}
                                className="flex-1 px-3 py-1.5 sm:py-2 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] rounded-lg text-[11px] sm:text-sm focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all"
                            />
                        </label>
                        <label className="flex items-center gap-2 text-[11px] text-[var(--ln-text-tertiary)] weight-510">
                            Hasta
                            <input
                                type="date"
                                value={localFilters.endDate}
                                onChange={(e) => { updateLocal({ endDate: e.target.value }); setPage(1); }}
                                className="flex-1 px-3 py-1.5 sm:py-2 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] rounded-lg text-[11px] sm:text-sm focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all"
                            />
                        </label>
                        <select
                            value={localRed}
                            onChange={(e) => { setLocalRed(e.target.value); setPage(1); }}
                            className="col-span-2 lg:col-span-1 px-3 py-1.5 sm:py-2 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] rounded-lg text-[11px] sm:text-sm focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all"
                            aria-label="Filtrar por red"
                        >
                            <option value="">Todas las redes</option>
                            {lideres.map((l) => (
                                <option key={l.id} value={l.id}>{l.profile?.fullName || l.fullName || l.email}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-[9px] sm:text-[10px] weight-590 text-[var(--ln-text-tertiary)] uppercase tracking-widest opacity-60">
                    <div className="flex items-center gap-1.5 sm:gap-2"><House size={12} sm:size={14} weight="bold" className="text-indigo-500" /> Iglesia</div>
                    <div className="flex items-center gap-1.5 sm:gap-2"><Heart size={12} sm:size={14} weight="bold" className="text-pink-500" /> Célula</div>
                    <div className="flex items-center gap-1.5 sm:gap-2"><BookOpen size={12} sm:size={14} weight="bold" className="text-emerald-500" /> Escuela</div>
                    <div className="flex items-center gap-1.5 sm:gap-2"><GraduationCap size={12} sm:size={14} weight="bold" className="text-amber-500" /> Encuentro</div>
                    <div className="flex items-center gap-1.5 sm:gap-2"><PhoneCall size={12} sm:size={14} weight="bold" className="text-sky-500" /> Ganar</div>
                </div>
            </div>

            <div className="relative">
                {loading ? (
                    <div className="overflow-x-auto">
                        <div className="p-4 sm:p-6">
                            <Table.Skeleton rows={6} columns={7} />
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table
                            data={data}
                            columns={columns}
                            emptyMessage="No se encontraron registros activos para los criterios seleccionados."
                            rowClassName="hover:bg-white/[0.02] border-b border-[var(--ln-border-standard)]/50 transition-all duration-300 group"
                            headerClassName="uppercase text-[9px] sm:text-[10px] weight-590 tracking-widest text-[var(--ln-text-tertiary)] py-3 sm:py-5 px-4 sm:px-6 opacity-60 border-b border-[var(--ln-border-standard)]"
                        />
                    </div>
                )}
            </div>

            {!loading && data.length > 0 && (
                <div className="px-4 sm:px-8 py-3 sm:py-5 border-t border-[var(--ln-border-standard)] bg-white/[0.01] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6">
                    <span className="text-[9px] sm:text-[12px] weight-510 text-[var(--ln-text-tertiary)]">
                        Mostrando <span className="text-[var(--ln-text-primary)] weight-590">{data.length}</span> de <span className="text-[var(--ln-text-primary)] weight-590">{totalItems}</span> resultados
                    </span>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[12px] weight-590 rounded-lg sm:rounded-xl bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            Anterior
                        </button>
                        <span className="text-[9px] sm:text-[12px] weight-590 text-[var(--ln-text-tertiary)] px-1 sm:px-2">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[12px] weight-590 rounded-lg sm:rounded-xl bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserActivityList;

UserActivityList.propTypes = {
    filters: PropTypes.shape({
        startDate: PropTypes.string,
        endDate: PropTypes.string,
        liderDoceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        search: PropTypes.string,
    }),
    lideresDoce: PropTypes.array,
    showFilters: PropTypes.bool,
};
