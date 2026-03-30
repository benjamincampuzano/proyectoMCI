import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { MagnifyingGlass, CheckCircle, XCircle, Clock } from '@phosphor-icons/react';
import { Button, Input, AsyncSearchSelect } from '../ui';

const KIDS_LEVELS = [
    { nivel: 'KIDS', seccion: '1A', name: 'Kids (5-7 años)', moduleNumber: 101, minAge: 5, maxAge: 7 },
    { nivel: 'TEENS', seccion: '1A', name: 'Teens (8-10 años)', moduleNumber: 201, minAge: 8, maxAge: 10 },
    { nivel: 'ROCAS', seccion: '1A', name: 'Rocas (11-13 años)', moduleNumber: 301, minAge: 11, maxAge: 13 },
    { nivel: 'JOVENES', seccion: '1A', name: 'Jóvenes (14 años en adelante)', moduleNumber: 501, minAge: 14, maxAge: 99 },
];
const CATEGORY_INFO = {
    'KIDS': { label: 'Kids', color: 'pink', ageRange: '5-7 años' },
    'TEENS': { label: 'Teens', color: 'yellow', ageRange: '8-10 años' },
    'ROCAS': { label: 'Rocas', color: 'orange', ageRange: '11-13 años' },
    'JOVENES': { label: 'Jóvenes', color: 'purple', ageRange: '14+ años' }
};

const KidsStudentMatrix = () => {
    const { user, hasRole } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Función para calcular edad
    const calculateAge = (birthDate) => {
        if (!birthDate) return null;
        
        let birth;
        // Manejar diferentes formatos de fecha
        if (typeof birthDate === 'string') {
            // Si es un string, intentar crear fecha
            birth = new Date(birthDate);
            // Si la fecha es inválida, intentar otros formatos
            if (isNaN(birth.getTime())) {
                // Intentar formato YYYY-MM-DD
                const parts = birthDate.split('-');
                if (parts.length === 3) {
                    birth = new Date(parts[0], parts[1] - 1, parts[2]);
                }
            }
        } else if (birthDate instanceof Date) {
            birth = birthDate;
        } else {
            return null;
        }
        
        // Verificación final de que la fecha es válida
        if (isNaN(birth.getTime())) {
            return null;
        }
        
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    // Función para formatear fecha
    const formatDate = (birthDate) => {
        if (!birthDate) return 'Sin fecha';
        
        let date;
        if (typeof birthDate === 'string') {
            date = new Date(birthDate);
            if (isNaN(date.getTime())) {
                const parts = birthDate.split('-');
                if (parts.length === 3) {
                    date = new Date(parts[0], parts[1] - 1, parts[2]);
                }
            }
        } else if (birthDate instanceof Date) {
            date = birthDate;
        } else {
            return 'Sin fecha';
        }
        
        if (isNaN(date.getTime())) {
            return 'Fecha inválida';
        }
        
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    useEffect(() => {
        fetchStudentMatrix();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchStudentMatrix = async () => {
        try {
            setLoading(true);
            const res = await api.get('/kids/student-matrix');
            setStudents(res.data.filter(student => student.enrollments && student.enrollments.length > 0));
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
        return matchesSearch;
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
                // Ya no se necesitan filtros de líder ni nivel
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                                    Edad
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Fecha de Nacimiento
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Acudiente
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Líderes
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Asistencia
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredStudents.map((student) => {
                                const birthDate = student.profile?.birthDate;
                                const age = calculateAge(birthDate);
                                const formattedDate = formatDate(birthDate);
                                
                                return (
                                    <tr key={student.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {student.fullName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {age || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {formattedDate}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {student.responsible?.fullName || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {student.leaderDoce?.fullName || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                                            {getAttendanceRate(student.enrollments)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredStudents.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No se encontraron estudiantes con los filtros seleccionados
                    </div>
                )}
            </div>
        </div>
    );
};

export default KidsStudentMatrix;
