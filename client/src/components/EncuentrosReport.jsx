import { useState, useMemo } from 'react';
import { Download, FunnelIcon , CurrencyDollar, Users, CreditCard } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';

const EncuentrosReport = ({ encuentros }) => {
    const { user } = useAuth();
    const [filterPastor, setFilterPastor] = useState('');
    const [filterDoce, setFilterDoce] = useState('');
    const [filterCelula, setFilterCelula] = useState('');

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
            return (
                (filterPastor === '' || true) &&
                (filterDoce === '' || true) &&
                (filterCelula === '' || true)
            );
        });
    }, [encuentros, filterPastor, filterDoce, filterCelula]);

    const totals = useMemo(() => {
        return filteredData.reduce((acc, curr) => ({
            cost: acc.cost + curr.cost,
            paid: acc.paid + curr.totalRecaudado,
            balance: acc.balance + curr.totalPendiente
        }), { cost: 0, paid: 0, balance: 0 });
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
                    <Filter size={20} />
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Encuentros</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                                {filteredData.length}
                            </h3>
                        </div>
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <MoneyIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Recaudado</p>
                            <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                                ${totals.paid.toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Pendiente</p>
                            <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                                ${totals.balance.toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <MoneyIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Inscritos</p>
                            <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                                {filteredData.reduce((acc, enc) => acc + (enc.registeredCount || 0), 0).toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Header & Export */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users size={20} />
                    Resumen por Encuentro ({filteredData.length})
                </h3>
                {user?.roles?.some(role => ['ADMIN', 'LIDER_DOCE'].includes(role)) && (
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                        <Download size={18} />
                        Exportar CSV
                    </button>
                )}
            </div>

            {/* Data Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Encuentro</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
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
                                        No se encontraron encuentros.
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
            </div>
        </div>
    );
};

export default EncuentrosReport;
