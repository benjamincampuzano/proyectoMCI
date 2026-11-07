import { useState, useMemo } from 'react';
import { MicrosoftExcelLogoIcon, FunnelIcon, Users, TrendUpIcon, TrendDownIcon,UserCheck } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { StatCard } from './ui';

const ConvencionesReport = ({ conventions }) => {
    const { user } = useAuth();
    const [filterPastor, setFilterPastor] = useState('');
    const [filterDoce, setFilterDoce] = useState('');
    const [filterCelula, setFilterCelula] = useState('');

    // Extract unique filter options from conventions data
    // Note: This assumes conventions have related data with hierarchy info
    // If not available, we'll use a simplified version

    const filteredData = useMemo(() => {
        // Report data based on convention registrations with correct backend structure
        return (conventions || []).map(conv => ({
            id: conv.id,
            name: `${conv.type} ${conv.year}`,
            theme: conv.theme,
            startDate: conv.startDate,
            endDate: conv.endDate,
            cost: conv.cost,
            transportCost: conv.transportCost || 0,
            accommodationCost: conv.accommodationCost || 0,
            coordinator: conv.coordinator,
            registrations: conv.registrations || [],
            registeredCount: conv.stats?.registeredCount || 0,
            totalRecaudado: conv.stats?.totalCollected || 0,
            totalPendiente: (conv.stats?.expectedIncome || 0) - (conv.stats?.totalCollected || 0),
        }));
    }, [conventions]);

    // Calculate totals
    const totals = useMemo(() => {
        return filteredData.reduce((acc, curr) => ({
            cost: acc.cost + curr.cost,
            paid: acc.paid + curr.totalRecaudado,
            balance: acc.balance + curr.totalPendiente
        }), { cost: 0, paid: 0, balance: 0 });
    }, [filteredData]);

    // Export to CSV
    const handleExport = () => {
        const headers = ['Convención', 'Lema', 'Coordinador', 'Costo Base', 'Transporte', 'Hospedaje', 'Recaudado', 'Pendiente'];

        const csvContent = [
            headers.join(','),
            ...filteredData.map(row => {
                const coord = row.coordinator?.fullName || 'Sin Asignar';
                return [
                    `"${row.name}"`,
                    `"${row.theme || ''}"`,
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
        link.setAttribute('download', `Reporte_Convenciones_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Filter Section - Simplified for now */}
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

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mb-6">
                <StatCard
                    title="Total Convenciones"
                    value={filteredData.length}
                    icon={Users}
                    color="var(--ln-brand-indigo)"
                    subtitle="Cantidad de convenciones creadas"
                />
                <StatCard
                    title="Total Inscritos"
                    value={filteredData.reduce((acc, conv) => acc + (conv.registeredCount || 0), 0).toLocaleString()}
                    icon={UserCheck}
                    color="#8b5cf6"
                    subtitle="Total de consolidados"
                />
                <StatCard
                    title="Total Recaudado"
                    value={`$${totals.paid.toLocaleString()}`}
                    icon={TrendUpIcon}
                    color="#10b981"
                    subtitle="Recaudo total"
                />
                <StatCard
                    title="Total Pendiente"
                    value={`$${totals.balance.toLocaleString()}`}
                    icon={TrendDownIcon}
                    color="#ef4444"
                    subtitle="Pendiente por recaudar"
                />
            </div>

            {/* Table Header & Export */}
            <div className="flex justify-between items-center gap-2">
                <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users size={20} />
                    Resumen por Convención ({filteredData.length})
                </h3>
                {user?.roles?.some(role => ['ADMIN', 'LIDER_DOCE'].includes(role)) && (
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs md:text-sm font-medium shrink-0"
                    >
                        <MicrosoftExcelLogoIcon size={16} />
                        <span className="hidden sm:inline">Exportar CSV</span>
                        <span className="sm:hidden">Exportar</span>
                    </button>
                )}
            </div>

            {/* Data Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Convención</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lema</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Coordinador</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Costo Base</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transporte</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hospedaje</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recaudado</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pendiente</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Inscritos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No se encontraron convenciones.
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((conv) => (
                                    <tr key={conv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{conv.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(conv.startDate).toLocaleDateString()} - {new Date(conv.endDate).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                                            {conv.theme || 'Sin tema'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {conv.coordinator?.fullName || 'Sin Asignar'}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                                            ${conv.cost.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                                            ${conv.transportCost.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                                            ${conv.accommodationCost.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-green-600 dark:text-green-400 font-medium">
                                            ${conv.totalRecaudado.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-red-600 dark:text-red-400 font-medium">
                                            ${conv.totalPendiente.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                                            {conv.registeredCount}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredData.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                            No se encontraron convenciones.
                        </div>
                    ) : (
                        filteredData.map((conv) => (
                            <div key={conv.id} className="p-4 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{conv.name}</h4>
                                        {conv.theme && <p className="text-xs text-gray-500 dark:text-gray-400">{conv.theme}</p>}
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                                        {conv.registeredCount} inscritos
                                    </span>
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-300">
                                    <strong>Coordinador:</strong> {conv.coordinator?.fullName || 'Sin Asignar'}
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs">
                                    <div>
                                        <span className="text-gray-400 block text-[10px] uppercase">Recaudado</span>
                                        <span className="font-semibold text-green-600 dark:text-green-400">${conv.totalRecaudado.toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block text-[10px] uppercase">Pendiente</span>
                                        <span className="font-semibold text-red-600 dark:text-red-400">${conv.totalPendiente.toLocaleString()}</span>
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

export default ConvencionesReport;
