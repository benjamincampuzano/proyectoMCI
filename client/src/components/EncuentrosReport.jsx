import { useState, useMemo } from 'react';
import { MicrosoftExcelLogoIcon, FunnelIcon, MoneyIcon, UsersFourIcon, Users, MagnifyingGlass } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';

const EncuentrosReport = ({ encuentros }) => {
    const { user } = useAuth();
    const [filterPastor, setFilterPastor] = useState('');
    const [filterDoce, setFilterDoce] = useState('');
    const [filterCelula, setFilterCelula] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showStatsMobile, setShowStatsMobile] = useState(false);

    const filteredData = useMemo(() => {
        return (encuentros || []).map(enc => ({
            id: enc.id,
            name: enc.name,
            type: enc.type,
            startDate: enc.startDate,
            endDate: enc.endDate,
            cost: enc.cost,
            transportCost: enc.transportCost || 0,
            accommodationCost: enc.accommodationCost || 0,
            coordinator: enc.coordinator,
            registrations: enc.registrations || [],
            registeredCount: enc.stats?.registeredCount || 0,
            totalRecaudado: enc.stats?.totalCollected || 0,
            totalPendiente: (enc.stats?.expectedIncome || 0) - (enc.stats?.totalCollected || 0),
        })).filter(item => {
            const matchesFilters =
                (filterPastor === '' || true) &&
                (filterDoce === '' || true) &&
                (filterCelula === '' || true);

            if (!matchesFilters) return false;

            if (!searchTerm.trim()) return true;
            const term = searchTerm.toLowerCase();
            return (
                item.name.toLowerCase().includes(term) ||
                (item.coordinator?.fullName || '').toLowerCase().includes(term) ||
                (item.type || '').toLowerCase().includes(term)
            );
        });
    }, [encuentros, filterPastor, filterDoce, filterCelula, searchTerm]);

    const totals = useMemo(() => {
        return filteredData.reduce((acc, curr) => ({
            cost: acc.cost + curr.cost,
            paid: acc.paid + curr.totalRecaudado,
            balance: acc.balance + curr.totalPendiente,
            registered: acc.registered + curr.registeredCount,
        }), { cost: 0, paid: 0, balance: 0, registered: 0 });
    }, [filteredData]);

    const handleExport = () => {
        const headers = ['Encuentro', 'Tipo', 'Coordinador', 'Costo Base', 'Transporte', 'Hospedaje', 'Recaudado', 'Pendiente'];

        const csvContent = [
            headers.join(','),
            ...filteredData.map(row => {
                const coord = row.coordinator?.fullName || 'Sin Asignar';
                return [
                    `"${row.name}"`,
                    `"${row.type}"`,
                    `"${coord}"`,
                    row.cost.toFixed(2),
                    row.transportCost.toFixed(2),
                    row.accommodationCost.toFixed(2),
                    row.totalRecaudado.toFixed(2),
                    row.totalPendiente.toFixed(2)
                ].join(',')
            }).join('\n')
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Reporte_Encuentros_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Filter Section */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4 text-gray-700 dark:text-gray-300 font-medium">
                    <FunnelIcon size={20} />
                    <span>Filtros</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select
                        value={filterPastor}
                        onChange={(e) => setFilterPastor(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
                    >
                        <option value="">Todos los Pastores</option>
                    </select>
                    <select
                        value={filterDoce}
                        onChange={(e) => setFilterDoce(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
                    >
                        <option value="">Todos los Líderes de 12</option>
                    </select>
                    <select
                        value={filterCelula}
                        onChange={(e) => setFilterCelula(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
                    >
                        <option value="">Todos los Líderes de Célula</option>
                    </select>
                </div>
            </div>

            {/* Vista Móvil: Estadísticas Colapsables */}
            <div className="sm:hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
                <button
                    type="button"
                    onClick={() => setShowStatsMobile(!showStatsMobile)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none"
                >
                    <div className="flex items-center gap-2 truncate">
                        <UsersFourIcon size={16} className="text-blue-500 shrink-0" />
                        <span className="truncate">
                            Resumen: <strong className="text-blue-600 dark:text-blue-400">{filteredData.length}</strong> encuentros · <strong className="text-emerald-600 dark:text-emerald-400">{totals.registered}</strong> inscritos
                        </span>
                    </div>
                    <span className="text-blue-600 dark:text-blue-400 text-xs font-bold bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full shrink-0 ml-2">
                        {showStatsMobile ? 'Ocultar ▲' : 'Ver resumen ▼'}
                    </span>
                </button>

                {showStatsMobile && (
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/60">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg border border-blue-100 dark:border-blue-800">
                            <div className="flex items-center gap-1.5 mb-1">
                                <UsersFourIcon size={14} className="text-blue-600 dark:text-blue-300" />
                                <span className="text-[10px] font-bold text-blue-800 dark:text-blue-200 uppercase tracking-tight">Encuentros</span>
                            </div>
                            <span className="text-lg font-extrabold text-blue-900 dark:text-white">{filteredData.length}</span>
                        </div>

                        <div className="bg-purple-50 dark:bg-purple-900/20 p-2.5 rounded-lg border border-purple-100 dark:border-purple-800">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Users size={14} className="text-purple-600 dark:text-purple-300" />
                                <span className="text-[10px] font-bold text-purple-800 dark:text-purple-200 uppercase tracking-tight">Inscritos</span>
                            </div>
                            <span className="text-lg font-extrabold text-purple-900 dark:text-white">{totals.registered.toLocaleString()}</span>
                        </div>

                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-800">
                            <div className="flex items-center gap-1.5 mb-1">
                                <MoneyIcon size={14} className="text-emerald-600 dark:text-emerald-300" />
                                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-tight">Recaudado</span>
                            </div>
                            <span className="text-sm font-extrabold text-emerald-900 dark:text-white">${totals.paid.toLocaleString()}</span>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 p-2.5 rounded-lg border border-red-100 dark:border-red-800">
                            <div className="flex items-center gap-1.5 mb-1">
                                <MoneyIcon size={14} className="text-red-600 dark:text-red-300" />
                                <span className="text-[10px] font-bold text-red-800 dark:text-red-200 uppercase tracking-tight">Pendiente</span>
                            </div>
                            <span className="text-sm font-extrabold text-red-900 dark:text-white">${totals.balance.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Vista Desktop: Stats Cards Grid */}
            <div className="hidden sm:grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 md:p-5 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                    <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                        <div className="p-1.5 md:p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                            <UsersFourIcon size={16} />
                        </div>
                        <span className="text-[10px] md:text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-tight">Total Encuentros</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl md:text-3xl font-extrabold text-blue-900 dark:text-white">{filteredData.length}</span>
                        <span className="hidden md:block text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">Cantidad de Encuentros Realizados</span>
                    </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 md:p-5 rounded-xl border border-purple-100 dark:border-purple-800 shadow-sm">
                    <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                        <div className="p-1.5 md:p-2 bg-purple-100 dark:bg-purple-800 rounded-lg text-purple-600 dark:text-purple-300">
                            <Users size={16} />
                        </div>
                        <span className="text-[10px] md:text-sm font-bold text-purple-800 dark:text-purple-200 uppercase tracking-tight">Total Inscritos</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl md:text-3xl font-extrabold text-purple-900 dark:text-white">{totals.registered.toLocaleString()}</span>
                        <span className="hidden md:block text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">Total Inscritos</span>
                    </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 md:p-5 rounded-xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
                    <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                        <div className="p-1.5 md:p-2 bg-emerald-100 dark:bg-emerald-800 rounded-lg text-emerald-600 dark:text-emerald-300">
                            <MoneyIcon size={16} />
                        </div>
                        <span className="text-[10px] md:text-sm font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-tight">Total Recaudado</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl md:text-3xl font-extrabold text-emerald-900 dark:text-white">${totals.paid.toLocaleString()}</span>
                        <span className="hidden md:block text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">Dinero Recaudado</span>
                    </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 p-3 md:p-5 rounded-xl border border-red-100 dark:border-red-800 shadow-sm">
                    <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                        <div className="p-1.5 md:p-2 bg-red-100 dark:bg-red-800 rounded-lg text-red-600 dark:text-red-300">
                            <MoneyIcon size={16} />
                        </div>
                        <span className="text-[10px] md:text-sm font-bold text-red-800 dark:text-red-200 uppercase tracking-tight">Total Pendiente</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl md:text-3xl font-extrabold text-red-900 dark:text-white">${totals.balance.toLocaleString()}</span>
                        <span className="hidden md:block text-xs text-red-600 dark:text-red-400 font-medium mt-1">Pendiente por Recaudar</span>
                    </div>
                </div>
            </div>

            {/* Table Header, Search & Export */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 shrink-0">
                    <Users size={20} />
                    Resumen por Encuentro ({filteredData.length})
                </h3>
                <div className="flex items-center gap-2 flex-1 sm:justify-end">
                    {/* Barra de búsqueda */}
                    <div className="relative flex-1 sm:max-w-xs">
                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar encuentro o coordinador..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-8 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold bg-gray-100 dark:bg-gray-700 rounded-full w-4 h-4 flex items-center justify-center"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    {/* Botón exportar */}
                    {user?.roles?.some(role => ['ADMIN', 'LIDER_DOCE'].includes(role)) && (
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs md:text-sm font-medium shrink-0"
                        >
                            <MicrosoftExcelLogoIcon size={16} />
                            <span className="hidden sm:inline">Exportar CSV</span>
                            <span className="sm:hidden">CSV</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Encuentro</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Coordinador</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Costo Base</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Libro U. de la Vida</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hospedaje</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recaudado</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pendiente</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Inscritos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        {searchTerm ? 'Sin resultados para la búsqueda.' : 'No se encontraron encuentros.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((enc) => (
                                    <tr key={enc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{enc.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(enc.startDate).toLocaleDateString()} - {new Date(enc.endDate).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                {enc.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {enc.coordinator?.fullName || 'Sin Asignar'}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                                            ${enc.cost.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                                            ${enc.transportCost.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                                            ${enc.accommodationCost.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-green-600 dark:text-green-400 font-medium">
                                            ${enc.totalRecaudado.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-red-600 dark:text-red-400 font-medium">
                                            ${enc.totalPendiente.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                                            {enc.registeredCount}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View — tarjetas enriquecidas */}
                <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredData.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                            {searchTerm ? 'Sin resultados para la búsqueda.' : 'No se encontraron encuentros.'}
                        </div>
                    ) : (
                        filteredData.map((enc) => (
                            <div key={enc.id} className="p-4 space-y-3">
                                {/* Nombre y tipo */}
                                <div className="flex justify-between items-start gap-2">
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">{enc.name}</h4>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(enc.startDate).toLocaleDateString()} – {new Date(enc.endDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                        {enc.type}
                                    </span>
                                </div>

                                {/* Coordinador e inscritos */}
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">
                                        <strong className="text-gray-700 dark:text-gray-300">Coord:</strong> {enc.coordinator?.fullName || 'Sin Asignar'}
                                    </span>
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 rounded-full font-semibold">
                                        <Users size={11} />
                                        {enc.registeredCount} inscritos
                                    </span>
                                </div>

                                {/* Costos */}
                                <div className="grid grid-cols-3 gap-0 divide-x divide-gray-100 dark:divide-gray-700/60 py-2 border-t border-gray-100 dark:border-gray-700/60">
                                    <div className="flex flex-col items-center px-2">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">Base</span>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 mt-0.5">${enc.cost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col items-center px-2">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">Libro</span>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 mt-0.5">${enc.transportCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col items-center px-2">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">Hospedaje</span>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 mt-0.5">${enc.accommodationCost.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Recaudado y pendiente */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg px-3 py-2">
                                        <span className="text-[10px] text-emerald-500 uppercase tracking-wide block">Recaudado</span>
                                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">${enc.totalRecaudado.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2">
                                        <span className="text-[10px] text-red-400 uppercase tracking-wide block">Pendiente</span>
                                        <span className="text-sm font-bold text-red-600 dark:text-red-400">${enc.totalPendiente.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default EncuentrosReport;
