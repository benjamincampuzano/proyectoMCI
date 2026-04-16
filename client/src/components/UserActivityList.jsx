import React, { useState, useEffect, useMemo } from 'react';
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
const UserActivityList = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    useEffect(() => {
        fetchActivityData();
    }, []);

    const fetchActivityData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/network/activity-list');
            setData(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al cargar los datos de actividad');
        } finally {
            setLoading(false);
        }
    };

    const filteredData = useMemo(() => {
        return data.filter(item => {
            const matchesSearch = !searchTerm || 
                item.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.roles.some(r => r.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesSearch;
        });
    }, [data, searchTerm]);

    const hasActiveFilters = searchTerm;

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
                                className={`w-8 h-8 rounded-full border-2 border-[var(--ln-bg-panel)] flex items-center justify-center text-[10px] weight-590 shadow-sm relative z-[${10-i}] ${c.finalGrade >= 70 ? 'bg-emerald-500 text-white' : 'bg-[var(--ln-border-standard)] text-[var(--ln-text-tertiary)]'
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
            <div className="p-8 border-b border-[var(--ln-border-standard)] bg-white/[0.02]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h3 className="text-lg weight-590 text-[var(--ln-text-primary)] flex items-center gap-3 tracking-tight">
                            <Medal className="text-amber-500" size={24} weight="bold" />
                            Reporte de Actividad Ministerial
                        </h3>
                        <p className="text-[13px] text-[var(--ln-text-tertiary)] mt-1 opacity-70">Monitoreo preciso de progresos, asistencias y cobertura espiritual.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {hasActiveFilters && (
                            <button 
                                onClick={() => setSearchTerm('')} 
                                className="text-[12px] weight-590 text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] transition-colors px-3 py-1.5"
                            >
                                Limpiar Filtros
                            </button>
                        )}
                        <div className="relative group min-w-[300px]">
                            <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ln-text-tertiary)] w-4 h-4 transition-colors group-focus-within:text-[var(--ln-brand-indigo)]" weight="bold" />
                            <input
                                type="text"
                                placeholder="Filtrar por nombre o rol..."
                                className="w-full pl-10 pr-4 py-2.5 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all placeholder:text-[var(--ln-text-tertiary)]/40"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 text-[10px] weight-590 text-[var(--ln-text-tertiary)] uppercase tracking-widest opacity-60">
                    <div className="flex items-center gap-2"><House size={14} weight="bold" className="text-indigo-500" /> Iglesia</div>
                    <div className="flex items-center gap-2"><Heart size={14} weight="bold" className="text-pink-500" /> Célula</div>
                    <div className="flex items-center gap-2"><BookOpen size={14} weight="bold" className="text-emerald-500" /> Escuela</div>
                    <div className="flex items-center gap-2"><GraduationCap size={14} weight="bold" className="text-amber-500" /> Encuentro</div>
                    <div className="flex items-center gap-2"><PhoneCall size={14} weight="bold" className="text-sky-500" /> Ganar</div>
                </div>
            </div>

            <div className="relative">
                {loading ? (
                    <div className="p-8">
                        <Table.Skeleton rows={6} columns={7} />
                    </div>
                ) : (
                    <Table
                        data={filteredData}
                        columns={columns}
                        emptyMessage="No se encontraron registros activos para los criterios seleccionados."
                        rowClassName="hover:bg-white/[0.02] border-b border-[var(--ln-border-standard)]/50 transition-all duration-300 group"
                        headerClassName="uppercase text-[10px] weight-590 tracking-widest text-[var(--ln-text-tertiary)] py-5 px-6 opacity-60 border-b border-[var(--ln-border-standard)]"
                    />
                )}
            </div>

            {!loading && data.length > 0 && (
                <div className="px-8 py-5 border-t border-[var(--ln-border-standard)] bg-white/[0.01]">
                    <span className="text-[12px] weight-510 text-[var(--ln-text-tertiary)]">
                        Mostrando <span className="text-[var(--ln-text-primary)] weight-590">{filteredData.length}</span> resultados de la red inmediata
                    </span>
                </div>
            )}
        </div>
    );
};

export default UserActivityList;
