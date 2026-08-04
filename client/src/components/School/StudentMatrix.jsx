import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { MagnifyingGlass, Funnel, CheckCircle, XCircle, Clock, Users, BookOpen } from '@phosphor-icons/react';
import { Button, Input, AsyncSearchSelect } from '../ui';

const SCHOOL_LEVELS = [
    { nivel: '1', seccion: 'A', name: 'Pastoreados en su amor', moduleNumber: 1 },
    { nivel: '1', seccion: 'B', name: 'El poder de una Vision', moduleNumber: 2 },
    { nivel: '2', seccion: 'A', name: 'La estrategia del Ganar', moduleNumber: 3 },
    { nivel: '2', seccion: 'B', name: 'Familias con Proposito', moduleNumber: 4 },
    { nivel: '3', seccion: 'A', name: 'Liderazgo Eficaz', moduleNumber: 5 },
    { nivel: '3', seccion: 'B', name: 'El Espiritu Santo en Mi', moduleNumber: 6 }
];


const StudentMatrix = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLeader, setSelectedLeader] = useState(null);
    const [selectedLevel, setSelectedLevel] = useState('');
    const [showFiltersMobile, setShowFiltersMobile] = useState(false);

    const fetchStudentMatrix = async () => {
        try {
            setLoading(true);
            const res = await api.get('/school/student-matrix');
            setStudents(res.data.filter(student => student.enrollments && student.enrollments.length > 0));
        } catch (error) {
            console.error('Error fetching student matrix:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(fetchStudentMatrix);

    }, []);

    const getClassStatus = (enrollment, level) => {
        if (!enrollment) return null;

        // Check if this enrollment matches the level by moduleNumber
        if (enrollment.module?.moduleNumber !== level.moduleNumber) return null;

        // Use finalGrade from enrollment or calculate from classAttendances
        const finalGrade = enrollment.finalGrade;

        if (finalGrade !== null && finalGrade >= 7) {
            return { completed: true, grade: finalGrade };
        } else if (finalGrade !== null) {
            return { completed: false, grade: finalGrade };
        }

        return { completed: false, grade: null };
    };

    const getAverageGrade = (enrollments) => {
        if (!enrollments || enrollments.length === 0) return '-';

        const completedGrades = enrollments
            .filter(e => e.finalGrade !== null)
            .map(e => e.finalGrade);

        if (completedGrades.length === 0) return '-';

        const average = completedGrades.reduce((sum, grade) => sum + grade, 0) / completedGrades.length;
        return average.toFixed(1);
    };

    const getAttendanceRate = (enrollments) => {
        if (!enrollments || enrollments.length === 0) return '-';

        const totalAttendance = enrollments.reduce((sum, e) => {
            return sum + (e.attendanceRate || 0);
        }, 0);

        const average = totalAttendance / enrollments.length;
        return `${average.toFixed(1)}%`;
    };

    const filteredStudents = students.filter(student => {
        const matchesSearch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLeader = !selectedLeader || student.leaderDoce?.id === parseInt(selectedLeader);
        const matchesLevel = !selectedLevel ||
            student.enrollments?.some(e =>
                e.module?.moduleNumber === SCHOOL_LEVELS.find(
                    level => `${level.nivel}${level.seccion}` === selectedLevel
                )?.moduleNumber
            );

        return matchesSearch && matchesLeader && matchesLevel;
    });

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    Matriz de Seguimiento de Estudiantes
                </h2>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <button
                    onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                    className="flex md:hidden items-center justify-between w-full text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                    <span className="flex items-center gap-2"><Funnel size={16} /> Filtros</span>
                    <svg className={`w-4 h-4 transition-transform ${showFiltersMobile ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className={`mt-4 md:mt-0 ${showFiltersMobile ? 'block' : 'hidden'} md:block`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Buscar Estudiante
                        </label>
                        <div className="relative">
                            <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <Input
                                placeholder="Buscar por nombre..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Líder de Doce
                        </label>
                        <AsyncSearchSelect
                            fetchItems={(term) => {
                                const params = { search: term, role: 'LIDER_DOCE' };
                                return api.get('/users/search', { params })
                                    .then(res => res.data);
                            }}
                            selectedValue={selectedLeader}
                            onSelect={(user) => setSelectedLeader(user?.id || null)}
                            placeholder="Todos los líderes..."
                            labelKey="fullName"
                        />
                    </div>

                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nivel
                        </label>
                        <select
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white text-sm"
                            value={selectedLevel}
                            onChange={(e) => setSelectedLevel(e.target.value)}
                        >
                            <option value="">Todos los niveles</option>
                            {SCHOOL_LEVELS.map(level => (
                                <option key={`${level.nivel}${level.seccion}`} value={`${level.nivel}${level.seccion}`}>
                                    {level.nivel}{level.seccion} - {level.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                    </div>
            </div>

            {/* Student Count */}
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{filteredStudents.length} estudiante{filteredStudents.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Matrix Table (Desktop) */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hidden md:block">
                <div className="overflow-x-auto touch-pan-x">
                    <div className="text-[11px] text-gray-400 dark:text-gray-500 text-center py-1 md:hidden bg-gray-50 dark:bg-gray-700/50 italic">Desliza para ver más columnas →</div>
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Nombre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Líder de Doce
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Encuentro
                        </th>
                        {SCHOOL_LEVELS.map(level => (
                            <th key={`${level.nivel}${level.seccion}`} className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                {level.nivel}{level.seccion}
                            </th>
                        ))}
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Promedio
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Asistencia
                        </th>
                    </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredStudents.map((student) => (
                                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                        {student.fullName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {student.leaderDoce?.fullName || 'Sin asignar'}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                        {student.encuentro ? (
                                            <CheckCircle className="text-green-500" size={20} title="Completado" />
                                        ) : (
                                            <XCircle className="text-red-400" size={20} title="No completado" />
                                        )}
                                    </td>
                                    {SCHOOL_LEVELS.map(level => {
                                        const enrollment = student.enrollments?.find(e =>
                                            e.module?.moduleNumber === level.moduleNumber
                                        );
                                        const status = getClassStatus(enrollment, level);

                                        const DISCIPULAR_FIELD_MAP = {
                                            1: 'discipular1A',
                                            2: 'discipular1B',
                                            3: 'discipular2A',
                                            4: 'discipular2B',
                                            5: 'discipular3A',
                                            6: 'discipular3B',
                                        };
                                        const profileField = DISCIPULAR_FIELD_MAP[level.moduleNumber];
                                        const profileCompleted = profileField && student[profileField] === true;

                                        const isCompleted = status ? status.completed : profileCompleted;
                                        const grade = status?.grade ?? null;
                                        const hasData = status !== null || profileCompleted;

                                        return (
                                            <td key={`${level.nivel}${level.seccion}`} className="px-4 py-4 whitespace-nowrap text-center">
                                                {hasData ? (
                                                    isCompleted ? (
                                                        <div className="flex justify-center">
                                                            <CheckCircle className="text-green-500" size={20} title={grade !== null ? `Completado - Nota: ${grade}` : 'Completado (perfil)'} />
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center">
                                                            <XCircle className="text-red-500" size={20} title={grade !== null ? `No completado - Nota: ${grade}` : 'No completado'} />
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="flex justify-center">
                                                        <Clock className="text-red-500" size={20} title="No iniciado" />
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                                        {getAverageGrade(student.enrollments)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                                        {getAttendanceRate(student.enrollments)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredStudents.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No se encontraron estudiantes con los filtros seleccionados
                    </div>
                )}
            </div>

            {/* Mobile Student Cards */}
            <div className="block md:hidden space-y-3">
                {filteredStudents.map(student => (
                    <div key={student.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{student.fullName}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{student.leaderDoce?.fullName || 'Sin líder'}</div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {student.encuentro ? (
                                    <CheckCircle className="text-green-500" size={18} weight="fill" title="Encuentro completado" />
                                ) : (
                                    <XCircle className="text-red-400" size={18} title="Encuentro pendiente" />
                                )}
                            </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {SCHOOL_LEVELS.map(level => {
                                const enrollment = student.enrollments?.find(e =>
                                    e.module?.moduleNumber === level.moduleNumber
                                );
                                const status = getClassStatus(enrollment, level);
                                const profileField = {1:'discipular1A',2:'discipular1B',3:'discipular2A',4:'discipular2B',5:'discipular3A',6:'discipular3B'}[level.moduleNumber];
                                const profileCompleted = profileField && student[profileField] === true;
                                const isCompleted = status ? status.completed : profileCompleted;
                                const hasData = status !== null || profileCompleted;
                                return (
                                    <span key={`${level.nivel}${level.seccion}`} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${hasData ? (isCompleted ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300') : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                        {hasData ? (isCompleted ? <CheckCircle size={12} weight="fill" /> : <XCircle size={12} weight="fill" />) : <Clock size={12} />}
                                        {level.nivel}{level.seccion}
                                    </span>
                                );
                            })}
                        </div>
                        <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2">
                            <span>Prom: <strong>{getAverageGrade(student.enrollments)}</strong></span>
                            <span>Asist: <strong>{getAttendanceRate(student.enrollments)}</strong></span>
                        </div>
                    </div>
                ))}
                {filteredStudents.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow">
                        No se encontraron estudiantes
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <details className="md:open">
                    <summary className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer list-none flex items-center justify-between md:hidden">
                        <span>Leyenda</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </summary>
                    <div className="mt-2 md:mt-0">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 hidden md:block">Leyenda:</h3>
                        <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center">
                                <CheckCircle className="text-green-500 mr-2" size={16} />
                                <span className="text-gray-600 dark:text-gray-400">Clase completada (aprobado)</span>
                            </div>
                            <div className="flex items-center">
                                <XCircle className="text-red-500 mr-2" size={16} />
                                <span className="text-gray-600 dark:text-gray-400">Clase no aprobada</span>
                            </div>
                            <div className="flex items-center">
                                <Clock className="text-red-500 mr-2" size={16} />
                                <span className="text-gray-600 dark:text-gray-400">No iniciado</span>
                            </div>
                        </div>
                    </div>
                </details>
            </div>
        </div>
    );
};

export default StudentMatrix;
