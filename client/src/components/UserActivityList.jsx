import React, { useState, useEffect } from 'react';
import {
    Users,
    Calendar,
    CheckCircle2,
    Clock,
    BookOpen,
    Home,
    Heart,
    ChevronRight,
    Search,
    Info,
    PhoneCall,
    MapPin,
    Trophy,
    GraduationCap
} from 'lucide-react';
import api from '../utils/api';
import Table from './ui/Table';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

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

    const filteredData = data.filter(item =>
        item.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.roles.some(r => r.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const columns = [
        {
            header: 'Usuario',
            key: 'fullName',
            render: (name, row) => (
                <div className="flex flex-col space-y-1">
                    <span className="font-bold text-gray-900 dark:text-white">{name}</span>
                    <div className="flex flex-wrap gap-1">
                        {row.roles.map(role => (
                            <span key={role} className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded uppercase tracking-wider">
                                {role}
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
                <div className="flex items-center space-x-2">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg">
                        <Users size={16} />
                    </div>
                    <span className="font-semibold">{count}</span>
                </div>
            )
        },
        {
            header: 'Oración de 3',
            key: 'isOracionDeTres',
            render: (active) => (
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full w-fit ${active
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
                    <CheckCircle2 size={14} className={active ? 'animate-pulse' : ''} />
                    <span className="text-xs font-bold font-mono">{active ? '3 de 3' : 'Sin Grupo'}</span>
                </div>
            )
        },
        {
            header: 'Asistencias',
            key: 'asistencias',
            render: (asistencias) => (
                <div className="grid grid-cols-5 gap-2 min-w-[200px]">
                    <div className="flex flex-col items-center group relative cursor-default" title="Iglesia">
                        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded group-hover:scale-110 transition-transform">
                            <Home size={14} />
                        </div>
                        <span className="text-[10px] font-bold mt-1">{asistencias.iglesia}</span>
                    </div>
                    <div className="flex flex-col items-center group relative cursor-default" title="Célula">
                        <div className="p-1.5 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 rounded group-hover:scale-110 transition-transform">
                            <Heart size={14} />
                        </div>
                        <span className="text-[10px] font-bold mt-1">{asistencias.celula}</span>
                    </div>
                    <div className="flex flex-col items-center group relative cursor-default" title="Escuela">
                        <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded group-hover:scale-110 transition-transform">
                            <BookOpen size={14} />
                        </div>
                        <span className="text-[10px] font-bold mt-1">{asistencias.escuela}</span>
                    </div>
                    <div className="flex flex-col items-center group relative cursor-default" title="Encuentro">
                        <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded group-hover:scale-110 transition-transform">
                            <GraduationCap size={14} />
                        </div>
                        <span className="text-[10px] font-bold mt-1">{asistencias.encuentro}</span>
                    </div>
                    <div className="flex flex-col items-center group relative cursor-default" title="Ganar (Reportes)">
                        <div className="p-1.5 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded group-hover:scale-110 transition-transform">
                            <PhoneCall size={14} />
                        </div>
                        <span className="text-[10px] font-bold mt-1">{asistencias.ganar}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Célula',
            key: 'celula',
            render: (celula) => (
                <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-1.5">
                        <MapPin size={12} className="text-gray-400" />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {celula.nombre}
                        </span>
                    </div>
                    {celula.isAnfitrion && (
                        <span className="w-fit px-1.5 py-0.5 text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md font-bold flex items-center gap-1">
                            🏠 ANFITRIÓN
                        </span>
                    )}
                </div>
            )
        },
        {
            header: 'Clases',
            key: 'clases',
            render: (clases) => (
                <div className="flex -space-x-2 overflow-hidden">
                    {clases.length > 0 ? (
                        clases.slice(0, 3).map((c, i) => (
                            <div
                                key={i}
                                className={`w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-[10px] font-bold ${c.finalGrade >= 70 ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'
                                    }`}
                                title={`${c.moduleName}: ${c.finalGrade || 'En curso'}`}
                            >
                                {c.moduleName.substring(0, 2).toUpperCase()}
                            </div>
                        ))
                    ) : (
                        <span className="text-xs text-gray-400 italic">Ninguna</span>
                    )}
                    {clases.length > 3 && (
                        <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                            +{clases.length - 3}
                        </div>
                    )}
                </div>
            )
        },
        {
            header: 'Eventos',
            key: 'id',
            render: (id, row) => (
                <div className="flex space-x-4 text-xs">
                    <div className="flex flex-col items-center">
                        <span className="text-gray-400 uppercase text-[9px] font-bold">Encuentros</span>
                        <span className="font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded mt-1">
                            {row.encuentrosAsistidos}
                        </span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-gray-400 uppercase text-[9px] font-bold">Conv.</span>
                        <span className="font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded mt-1">
                            {row.convencionesAsistidas}
                        </span>
                    </div>
                </div>
            )
        },
        {
            header: 'Acceso',
            key: 'ultimoAcceso',
            render: (date) => (
                <div className="flex items-center space-x-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Clock size={12} />
                    <span>
                        {date
                            ? formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
                            : 'Nunca'
                        }
                    </span>
                </div>
            )
        }
    ];

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <Info size={20} />
                    <span>{error}</span>
                </div>
                <button onClick={fetchActivityData} className="text-sm font-bold underline bg-transparent">Reintentar</button>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Trophy className="text-amber-500" size={24} />
                        Reporte del Ministerio
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Seguimiento en tiempo real de progresos y asistencias</p>
                </div>

                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o rol..."
                        className="pl-10 pr-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-full md:w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="relative">
                {loading ? (
                    <div className="p-8">
                        <Table.Skeleton rows={5} columns={8} />
                    </div>
                ) : (
                    <Table
                        data={filteredData}
                        columns={columns}
                        emptyMessage="No se encontraron miembros con actividad registrada."
                        rowClassName="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors"
                        headerClassName="uppercase text-[10px] tracking-widest text-gray-400 font-black py-4"
                    />
                )}
            </div>

            {!loading && data.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        Mostrando <b>{filteredData.length}</b> de <b>{data.length}</b> usuarios
                    </span>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        <div className="flex items-center gap-1"><Home size={10} /> IG: Iglesia</div>
                        <div className="flex items-center gap-1"><Heart size={10} /> CE: Célula</div>
                        <div className="flex items-center gap-1"><BookOpen size={10} /> ES: Escuela</div>
                        <div className="flex items-center gap-1"><GraduationCap size={10} /> EN: Encuentro</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserActivityList;
