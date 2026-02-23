import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Search, CheckCircle, XCircle, Clock, Users, BookOpen } from 'lucide-react';
import { Button, Input, AsyncSearchSelect } from '../ui';

const KIDS_LEVELS = [
    { nivel: 'KIDS', seccion: '1A', name: 'Kids (5-10 años)', moduleNumber: 101, minAge: 5, maxAge: 10 },
    { nivel: 'ROCAS', seccion: '1A', name: 'Rocas (11-13 años)', moduleNumber: 301, minAge: 11, maxAge: 13 },
    { nivel: 'JOVENES', seccion: '1A', name: 'Jóvenes (14+ años)', moduleNumber: 501, minAge: 14, maxAge: 99 },
];
const CATEGORY_INFO = {
    'KIDS': { label: 'Kids', color: 'pink', ageRange: '5-10 años' },
    'ROCAS': { label: 'Rocas', color: 'orange', ageRange: '11-13 años' },
    'JOVENES': { label: 'Jóvenes', color: 'purple', ageRange: '14+ años' }
};

const KidsStudentMatrix = () => {
    const { user, hasRole } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLeader, setSelectedLeader] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('');

    useEffect(() => {
        fetchStudentMatrix();
    }, []);

    const fetchStudentMatrix = async () => {
        try {
            setLoading(true);
            const res = await api.get('/kids/student-matrix');
            setStudents(res.data);
        } catch (error) {
            console.error('Error fetching student matrix:', error);
        } finally {
            setLoading(false);
        }
    };

    const getClassStatus = (enrollment, level) => {
        if (!enrollment) return null;

        if (enrollment.module?.moduleNumber !== level.moduleNumber) return null;

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
                e.module?.moduleNumber === KIDS_LEVELS.find(
                    level => `${level.nivel}${level.seccion}` === selectedLevel
                )?.moduleNumber
            );

        return matchesSearch && matchesLeader && matchesLevel;
    });

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    Matriz de Seguimiento Kids
                </h2>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Buscar Estudiante
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <Input
                                placeholder="Buscar por nombre..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Líder de Doce
                        </label>
                        <AsyncSearchSelect
                            fetchItems={(term) => {
                                const params = { search: term, role: 'LIDER_DOCE' };
                                return api.get('/users/search', { params })
                                    .then(res => res.data);
                            }}
                            selectedValue={selectedLeader}
                            onSelect={(user) => setSelectedLeader(user?.id || '')}
                            placeholder="Todos los líderes..."
                            labelKey="fullName"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nivel
                        </label>
                        <select
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white"
                            value={selectedLevel}
                            onChange={(e) => setSelectedLevel(e.target.value)}
                        >
                            <option value="">Todos los niveles</option>
                            {KIDS_LEVELS.map(level => (
                                <option key={`${level.nivel}${level.seccion}`} value={`${level.nivel}${level.seccion}`}>
                                    {level.nivel}{level.seccion} - {level.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Nombre
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Acudiente
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Líder de Doce
                                </th>
                                {KIDS_LEVELS.map(level => (
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
                                        {student.responsible?.fullName || 'Sin acudiente'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {student.leaderDoce?.fullName || 'Sin asignar'}
                                    </td>
                                    {KIDS_LEVELS.map(level => {
                                        const enrollment = student.enrollments?.find(e =>
                                            e.module?.moduleNumber === level.moduleNumber
                                        );
                                        const status = getClassStatus(enrollment, level);

                                        return (
                                            <td key={`${level.nivel}${level.seccion}`} className="px-4 py-4 whitespace-nowrap text-center">
                                                {status ? (
                                                    status.completed ? (
                                                        <div className="flex justify-center">
                                                            <CheckCircle className="text-green-500" size={20} title={`Completado - Nota: ${status.grade}`} />
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center">
                                                            <XCircle className="text-red-500" size={20} title={`No completado - Nota: ${status.grade}`} />
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="flex justify-center">
                                                        <Clock className="text-gray-400" size={20} title="No iniciado" />
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

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Leyenda:</h3>
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
                        <Clock className="text-gray-400 mr-2" size={16} />
                        <span className="text-gray-600 dark:text-gray-400">No iniciado</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KidsStudentMatrix;
