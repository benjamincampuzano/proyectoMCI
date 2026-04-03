import { GuitarIcon, Users, MoneyIcon, TrendUpIcon, FileTextIcon, Download } from '@phosphor-icons/react';

const formatCurrency = (amount) => {
    const value = parseFloat(amount) || 0;
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);
};

const ArtSchoolReport = ({ classes }) => {
    // Calculate overall statistics
    const totalStats = classes.reduce((acc, cls) => {
        const enrollments = cls.enrollments || [];
        const totalPaid = enrollments.reduce((sum, enr) => sum + (enr.totalPaid || 0), 0);
        const totalBalance = enrollments.reduce((sum, enr) => sum + (enr.balance || 0), 0);
        const totalCost = enrollments.reduce((sum, enr) => sum + (enr.finalCost || 0), 0);

        return {
            totalClasses: acc.totalClasses + 1,
            totalEnrollments: acc.totalEnrollments + enrollments.length,
            totalPaid: acc.totalPaid + totalPaid,
            totalBalance: acc.totalBalance + totalBalance,
            totalCost: acc.totalCost + totalCost
        };
    }, {
        totalClasses: 0,
        totalEnrollments: 0,
        totalPaid: 0,
        totalBalance: 0,
        totalCost: 0
    });

    const overallCompletionRate = totalStats.totalCost > 0 
        ? (totalStats.totalPaid / totalStats.totalCost) * 100 
        : 0;

    // Class performance data
    const classPerformance = classes.map(cls => {
        const enrollments = cls.enrollments || [];
        const totalPaid = enrollments.reduce((sum, enr) => sum + (enr.totalPaid || 0), 0);
        const totalCost = enrollments.reduce((sum, enr) => sum + (enr.finalCost || 0), 0);
        const completionRate = totalCost > 0 ? (totalPaid / totalCost) * 100 : 0;

        return {
            name: cls.name,
            schedule: cls.schedule,
            professor: cls.professor?.profile?.fullName || cls.professor?.fullName || 'Sin Asignar',
            enrollments: enrollments.length,
            totalCost,
            totalPaid,
            balance: totalCost - totalPaid,
            completionRate
        };
    }).sort((a, b) => b.completionRate - a.completionRate);

    // Payment status distribution
    const paymentStatus = classes.reduce((acc, cls) => {
        cls.enrollments?.forEach(enr => {
            if (enr.balance === 0) {
                acc.paid += 1;
            } else if (enr.totalPaid > 0) {
                acc.partial += 1;
            } else {
                acc.unpaid += 1;
            }
        });
        return acc;
    }, { paid: 0, partial: 0, unpaid: 0 });

    const totalEnrollmentsForStatus = paymentStatus.paid + paymentStatus.partial + paymentStatus.unpaid;

    const handleExportCSV = () => {
        const csvContent = [
            ['Clase', 'Horario', 'Profesor', 'Inscritos', 'Costo Total', 'Pagado', 'Saldo', '% Completado'],
            ...classPerformance.map(cls => [
                cls.name,
                cls.schedule,
                cls.professor,
                cls.enrollments,
                formatCurrency(cls.totalCost),
                formatCurrency(cls.totalPaid),
                formatCurrency(cls.balance),
                `${cls.completionRate.toFixed(1)}%`
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `reporte_escuela_artes_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reporte General de Escuela de Artes</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Resumen completo del rendimiento financiero y académico
                    </p>
                </div>
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                    <Download size={20} />
                    Exportar CSV
                </button>
            </div>

            {/* Overall Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-purple-50 dark:bg-purple-900/20 p-5 rounded-xl border border-purple-100 dark:border-purple-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg text-purple-600 dark:text-purple-300">
                            <GuitarIcon size={20} />
                        </div>
                        <span className="text-sm font-bold text-purple-800 dark:text-purple-200 uppercase tracking-tight">Total Clases</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-extrabold text-purple-900 dark:text-white">{totalStats.totalClasses}</span>
                        <span className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">Clases Activas</span>
                    </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                            <Users size={20} />
                        </div>
                        <span className="text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-tight">Total Estudiantes</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-extrabold text-blue-900 dark:text-white">{totalStats.totalEnrollments}</span>
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">Estudiantes Inscritos</span>
                    </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-lg text-emerald-600 dark:text-emerald-300">
                            <MoneyIcon size={20} />
                        </div>
                        <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-tight">Total Recaudado</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-extrabold text-emerald-900 dark:text-white">{formatCurrency(totalStats.totalPaid)}</span>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">Dinero Recaudado</span>
                    </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-xl border border-red-100 dark:border-red-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg text-red-600 dark:text-red-300">
                            <MoneyIcon size={20} />
                        </div>
                        <span className="text-sm font-bold text-red-800 dark:text-red-200 uppercase tracking-tight">Pendiente</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-extrabold text-red-900 dark:text-white">{formatCurrency(totalStats.totalBalance)}</span>
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">Saldo Pendiente</span>
                    </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-xl border border-amber-100 dark:border-amber-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg text-amber-600 dark:text-amber-300">
                            <TrendUpIcon size={20} />
                        </div>
                        <span className="text-sm font-bold text-amber-800 dark:text-amber-200 uppercase tracking-tight">% Completado</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-extrabold text-amber-900 dark:text-white">{overallCompletionRate.toFixed(1)}%</span>
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">Tasa de Cobro</span>
                    </div>
                </div>
            </div>

            {/* Payment Status Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Distribución de Pagos</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Pagado Completo</p>
                                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{paymentStatus.paid}</p>
                            </div>
                            <div className="text-emerald-600 dark:text-emerald-400">
                                <MoneyIcon size={24} />
                            </div>
                        </div>
                        <div className="mt-2">
                            <div className="w-full bg-emerald-200 dark:bg-emerald-800 rounded-full h-2">
                                <div 
                                    className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${totalEnrollmentsForStatus > 0 ? (paymentStatus.paid / totalEnrollmentsForStatus) * 100 : 0}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                {totalEnrollmentsForStatus > 0 ? ((paymentStatus.paid / totalEnrollmentsForStatus) * 100).toFixed(1) : 0}%
                            </p>
                        </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-100 dark:border-amber-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Pago Parcial</p>
                                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{paymentStatus.partial}</p>
                            </div>
                            <div className="text-amber-600 dark:text-amber-400">
                                <MoneyIcon size={24} />
                            </div>
                        </div>
                        <div className="mt-2">
                            <div className="w-full bg-amber-200 dark:bg-amber-800 rounded-full h-2">
                                <div 
                                    className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${totalEnrollmentsForStatus > 0 ? (paymentStatus.partial / totalEnrollmentsForStatus) * 100 : 0}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                {totalEnrollmentsForStatus > 0 ? ((paymentStatus.partial / totalEnrollmentsForStatus) * 100).toFixed(1) : 0}%
                            </p>
                        </div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-red-800 dark:text-red-200">Sin Pagar</p>
                                <p className="text-2xl font-bold text-red-900 dark:text-red-100">{paymentStatus.unpaid}</p>
                            </div>
                            <div className="text-red-600 dark:text-red-400">
                                <MoneyIcon size={24} />
                            </div>
                        </div>
                        <div className="mt-2">
                            <div className="w-full bg-red-200 dark:bg-red-800 rounded-full h-2">
                                <div 
                                    className="bg-red-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${totalEnrollmentsForStatus > 0 ? (paymentStatus.unpaid / totalEnrollmentsForStatus) * 100 : 0}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                {totalEnrollmentsForStatus > 0 ? ((paymentStatus.unpaid / totalEnrollmentsForStatus) * 100).toFixed(1) : 0}%
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Class Performance Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Rendimiento por Clase</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clase</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Horario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profesor</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estudiantes</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Costo Total</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recaudado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Saldo</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">% Completado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {classPerformance.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        No hay datos disponibles para mostrar.
                                    </td>
                                </tr>
                            ) : (
                                classPerformance.map((cls, index) => (
                                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{cls.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">{cls.schedule}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{cls.professor}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                                <Users size={12} />
                                                {cls.enrollments}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(cls.totalCost)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm font-medium text-green-600 dark:text-green-400">{formatCurrency(cls.totalPaid)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm font-medium text-red-500 dark:text-red-400">{formatCurrency(cls.balance)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                        <div 
                                                            className={`h-2 rounded-full transition-all duration-300 ${
                                                                cls.completionRate >= 80 ? 'bg-emerald-600' : 
                                                                cls.completionRate >= 50 ? 'bg-amber-600' : 'bg-red-600'
                                                            }`}
                                                            style={{ width: `${cls.completionRate}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className={`text-sm font-medium ${
                                                        cls.completionRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 
                                                        cls.completionRate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                                                    }`}>
                                                        {cls.completionRate.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
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

export default ArtSchoolReport;
