import React, { useState, useMemo } from 'react';
import { MicrosoftExcelLogoIcon, FunnelIcon, Users, HandCoinsIcon, MoneyIcon, CreditCardIcon, MagnifyingGlass } from '@phosphor-icons/react';
import { useAuth } from '../hooks/useAuth';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const BalanceReport = ({ data, title }) => {
    const { user } = useAuth();
    const [filterPastor, setFilterPastor] = useState('');
    const [filterDoce, setFilterDoce] = useState('');
    const [filterCelula, setFilterCelula] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showStatsMobile, setShowStatsMobile] = useState(false);
    const [showFiltersMobile, setShowFiltersMobile] = useState(false);

    // Extract unique filter options
    const pastors = useMemo(() => [...new Set(data.map(item => item.pastorName || item.pastor).filter(n => n && n !== 'N/A' && n !== ''))].sort(), [data]);
    const doces = useMemo(() => [...new Set(data.map(item => item.liderDoceName || item.liderDoce || item.doceName).filter(n => n && n !== 'N/A' && n !== ''))].sort(), [data]);
    const celulas = useMemo(() => [...new Set(data.map(item => item.liderCelulaName || item.liderCelula || item.celulaName).filter(n => n && n !== 'N/A' && n !== ''))].sort(), [data]);

    // Apply filters
    const filteredData = useMemo(() => {
        return data.filter(item => {
            const pastorMatch = filterPastor === '' ||
                (item.pastorName === filterPastor) ||
                (item.pastor === filterPastor);

            const doceMatch = filterDoce === '' ||
                (item.liderDoceName === filterDoce) ||
                (item.liderDoce === filterDoce) ||
                (item.doceName === filterDoce);

            const celulaMatch = filterCelula === '' ||
                (item.liderCelulaName === filterCelula) ||
                (item.liderCelula === filterCelula) ||
                (item.celulaName === filterCelula);

            if (!(pastorMatch && doceMatch && celulaMatch)) return false;

            if (!searchTerm.trim()) return true;
            const term = searchTerm.toLowerCase();
            const userName = (item.userName || item.guestName || '').toLowerCase();
            const liderDoce = (item.liderDoceName || item.liderDoce || item.doceName || '').toLowerCase();
            const liderCelula = (item.liderCelulaName || item.liderCelula || item.celulaName || '').toLowerCase();
            const pastor = (item.pastorName || item.pastor || '').toLowerCase();

            return (
                userName.includes(term) ||
                liderDoce.includes(term) ||
                liderCelula.includes(term) ||
                pastor.includes(term)
            );
        });
    }, [data, filterPastor, filterDoce, filterCelula, searchTerm]);

    // Calculate totals
    const totals = useMemo(() => {
        return filteredData.reduce((acc, curr) => ({
            cost: acc.cost + curr.cost,
            paid: acc.paid + curr.paid,
            balance: acc.balance + curr.balance
        }), { cost: 0, paid: 0, balance: 0 });
    }, [filteredData]);

    const isEncuentro = useMemo(() => data.some(item => item.paymentsByType?.ENCUENTRO !== undefined), [data]);
    const baseType = isEncuentro ? 'ENCUENTRO' : 'CONVENTION';
    const baseLabel = isEncuentro ? 'Encuentro' : 'Conv.';

    // Export to Excel
    const handleExport = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Reporte Financiero');

            // Define columns
            worksheet.columns = [
                { header: 'Nombre', key: 'userName', width: 30 },
                { header: 'Rol', key: 'userRole', width: 20 },
                { header: 'Pastor', key: 'pastorName', width: 25 },
                { header: 'Líder 12', key: 'liderDoceName', width: 25 },
                { header: 'Líder Célula', key: 'liderCelulaName', width: 25 },
                { header: 'Costo Final', key: 'cost', width: 15 },
                { header: 'Pagado', key: 'paid', width: 15 },
                { header: `Saldo ${baseLabel}`, key: 'baseBalance', width: 15 },
                { header: 'Saldo Libro', key: 'transportBalance', width: 15 },
                { header: 'Saldo Otros Gastos.', key: 'accommodationBalance', width: 15 },
                { header: 'Saldo Total', key: 'totalBalance', width: 15 }
            ];

            // Add rows
            filteredData.forEach(row => {
                worksheet.addRow({
                    userName: row.userName || row.guestName || '',
                    userRole: row.userRole || row.status || '',
                    pastorName: row.pastorName || 'N/A',
                    liderDoceName: row.liderDoceName || row.liderDoce || row.doceName || 'N/A',
                    liderCelulaName: row.liderCelulaName || row.liderCelula || row.celulaName || 'N/A',
                    cost: row.cost,
                    paid: row.paid,
                    baseBalance: row.baseCost - (row.paymentsByType?.[baseType] || 0),
                    transportBalance: row.transportCost - (row.paymentsByType?.TRANSPORT || 0),
                    accommodationBalance: row.accommodationCost - (row.paymentsByType?.ACCOMMODATION || 0),
                    totalBalance: row.balance
                });
            });

            // Style headers
            const headerRow = worksheet.getRow(1);
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF059669' } // Emerald-600
                };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            // Format numbers
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) {
                    ['F', 'G', 'H', 'I', 'J', 'K'].forEach(col => {
                        row.getCell(col).numFmt = '"$"#,##0.00';
                    });
                }
            });

            // Save file
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `${title.replace(/\s+/g, '_')}_Reporte_Financiero.xlsx`);
            
        } catch (error) {
            console.error('Error exporting BalanceReport to Excel:', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                {/* Mobile: Header colapsable */}
                <button
                    type="button"
                    onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                    className="md:hidden w-full flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-200 focus:outline-none"
                >
                    <div className="flex items-center gap-2">
                        <FunnelIcon size={18} className="text-blue-500" />
                        <span>Filtros de LIDER DOCE</span>
                        {(filterPastor || filterDoce || filterCelula) && (
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                                {[filterPastor, filterDoce, filterCelula].filter(Boolean).length} activos
                            </span>
                        )}
                    </div>
                    <span className="text-blue-600 dark:text-blue-400 text-xs font-bold bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full shrink-0">
                        {showFiltersMobile ? 'Ocultar ▲' : 'Ver filtros ▼'}
                    </span>
                </button>

                {/* Desktop: Header normal */}
                <div className="hidden md:flex items-center gap-2 mb-4 text-gray-700 dark:text-gray-300 font-medium">
                    <FunnelIcon size={20} />
                    <span>Filtros de LIDER DOCE</span>
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${showFiltersMobile ? 'mt-4' : 'hidden md:grid'}`}>
                    <select
                        value={filterPastor}
                        onChange={(e) => setFilterPastor(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
                    >
                        <option value="">Todos los Pastores</option>
                        {pastors.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>

                    <select
                        value={filterDoce}
                        onChange={(e) => setFilterDoce(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
                    >
                        <option value="">Todos los Líderes de 12</option>
                        {doces.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>

                    <select
                        value={filterCelula}
                        onChange={(e) => setFilterCelula(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
                    >
                        <option value="">Todos los Líderes de Célula</option>
                        {celulas.map(c => <option key={c} value={c}>{c}</option>)}
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
                        <MoneyIcon size={16} className="text-blue-500 shrink-0" />
                        <span className="truncate">
                            Resumen: <strong className="text-blue-600 dark:text-blue-400">${totals.cost.toLocaleString()}</strong> esperado · <strong className="text-emerald-600 dark:text-emerald-400">${totals.paid.toLocaleString()}</strong> recaudado
                        </span>
                    </div>
                    <span className="text-blue-600 dark:text-blue-400 text-xs font-bold bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full shrink-0 ml-2">
                        {showStatsMobile ? 'Ocultar ▲' : 'Ver resumen ▼'}
                    </span>
                </button>

                {showStatsMobile && (
                    <div className="grid grid-cols-1 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/60">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg border border-blue-100 dark:border-blue-800">
                            <div className="flex items-center gap-1.5 mb-1">
                                <MoneyIcon size={14} className="text-blue-600 dark:text-blue-300" />
                                <span className="text-[10px] font-bold text-blue-800 dark:text-blue-200 uppercase tracking-tight">Total Esperado</span>
                            </div>
                            <span className="text-sm font-extrabold text-blue-900 dark:text-white">${totals.cost.toLocaleString()}</span>
                        </div>

                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-800">
                            <div className="flex items-center gap-1.5 mb-1">
                                <MoneyIcon size={14} className="text-emerald-600 dark:text-emerald-300" />
                                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-tight">Total Recaudado</span>
                            </div>
                            <span className="text-sm font-extrabold text-emerald-900 dark:text-white">${totals.paid.toLocaleString()}</span>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 p-2.5 rounded-lg border border-red-100 dark:border-red-800">
                            <div className="flex items-center gap-1.5 mb-1">
                                <MoneyIcon size={14} className="text-red-600 dark:text-red-300" />
                                <span className="text-[10px] font-bold text-red-800 dark:text-red-200 uppercase tracking-tight">Saldo Pendiente</span>
                            </div>
                            <span className="text-sm font-extrabold text-red-900 dark:text-white">${totals.balance.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Vista Desktop: Stats Cards Grid */}
            <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 md:p-5 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                    <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                        <div className="p-1.5 md:p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                            <MoneyIcon size={16} />
                        </div>
                        <span className="text-[10px] md:text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-tight">Total Esperado</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl md:text-3xl font-extrabold text-blue-900 dark:text-white">${totals.cost.toLocaleString()}</span>
                        <span className="hidden md:block text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">Dinero Esperado</span>
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
                        <span className="text-[10px] md:text-sm font-bold text-red-800 dark:text-red-200 uppercase tracking-tight">Saldo Pendiente</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl md:text-3xl font-extrabold text-red-900 dark:text-white">${totals.balance.toLocaleString()}</span>
                        <span className="hidden md:block text-xs text-red-600 dark:text-red-400 font-medium mt-1">Dinero Pendiente</span>
                    </div>
                </div>
            </div>
            {/* Table Header, Search & Export */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 shrink-0">
                    <Users size={20} />
                    Detalle de Inscritos ({filteredData.length})
                </h3>
                <div className="flex items-center gap-2 flex-1 sm:justify-end">
                    {/* Barra de búsqueda */}
                    <div className="relative flex-1 sm:max-w-xs">
                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar nombre, líder o pastor..."
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
                    {user?.roles?.some(role => ['ADMIN', 'LIDER_DOCE'].includes(role)) && (
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs md:text-sm font-medium shrink-0"
                        >
                            <MicrosoftExcelLogoIcon size={16} />
                            <span className="hidden sm:inline">Exportar Excel</span>
                            <span className="sm:hidden">Excel</span>
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
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre / Rol</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">LIDER DOCE</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Costo Final</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pagado</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{baseLabel}</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Libro</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Otros Gastos</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        {searchTerm ? 'Sin resultados para la búsqueda.' : 'No se encontraron registros con los filtros seleccionados.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {item.userName || item.guestName}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {item.userRole || item.status}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-gray-600 dark:text-gray-300">
                                                <span className="font-semibold">12:</span> {item.liderDoceName || item.liderDoce || item.doceName || 'N/A'}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                <span className="font-semibold">Célula:</span> {item.liderCelulaName || item.liderCelula || item.celulaName || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                                            ${item.cost.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-green-600 dark:text-green-400 font-medium">
                                            ${item.paid.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-300">
                                            ${(item.baseCost - (item.paymentsByType?.[baseType] || 0)).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-300">
                                            ${(item.transportCost - (item.paymentsByType?.TRANSPORT || 0)).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-300">
                                            ${(item.accommodationCost - (item.paymentsByType?.ACCOMMODATION || 0)).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${item.balance > 0
                                                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                                : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                                }`}>
                                                ${item.balance.toLocaleString()}
                                            </span>
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
                            {searchTerm ? 'Sin resultados para la búsqueda.' : 'No se encontraron registros con los filtros seleccionados.'}
                        </div>
                    ) : (
                        filteredData.map((item) => {
                            const baseBalance = item.baseCost - (item.paymentsByType?.[baseType] || 0);
                            const transportBalance = item.transportCost - (item.paymentsByType?.TRANSPORT || 0);
                            const accommodationBalance = item.accommodationCost - (item.paymentsByType?.ACCOMMODATION || 0);
                            return (
                                <div key={item.id} className="p-4 space-y-3">
                                    {/* Nombre y rol */}
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                                                {item.userName || item.guestName}
                                            </h4>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {item.userRole || item.status}
                                            </span>
                                        </div>
                                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${item.balance > 0
                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                            }`}>
                                            ${item.balance.toLocaleString()}
                                        </span>
                                    </div>

                                    {/* LIDER DOCE */}
                                    <div className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                                        <div>
                                            <strong className="text-gray-700 dark:text-gray-200">12:</strong>{' '}
                                            {item.liderDoceName || item.liderDoce || item.doceName || 'N/A'}
                                        </div>
                                        <div>
                                            <strong className="text-gray-700 dark:text-gray-200">Célula:</strong>{' '}
                                            {item.liderCelulaName || item.liderCelula || item.celulaName || 'N/A'}
                                        </div>
                                    </div>

                                    {/* Costo y pagado */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wide block">Costo Final</span>
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">${item.cost.toLocaleString()}</span>
                                        </div>
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg px-3 py-2">
                                            <span className="text-[10px] text-emerald-500 uppercase tracking-wide block">Pagado</span>
                                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">${item.paid.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Saldos por categoría */}
                                    <div className="grid grid-cols-3 gap-0 divide-x divide-gray-100 dark:divide-gray-700/60 py-2 border-t border-gray-100 dark:border-gray-700/60">
                                        <div className="flex flex-col items-center px-2">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Saldo {baseLabel}</span>
                                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 mt-0.5">${baseBalance.toLocaleString()}</span>
                                        </div>
                                        <div className="flex flex-col items-center px-2">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Trans.</span>
                                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 mt-0.5">${transportBalance.toLocaleString()}</span>
                                        </div>
                                        <div className="flex flex-col items-center px-2">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Hosp.</span>
                                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 mt-0.5">${accommodationBalance.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default BalanceReport;
