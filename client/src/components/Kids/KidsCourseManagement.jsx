import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, Calendar, Users, Trash, Pen, List, SquaresFourIcon } from '@phosphor-icons/react';
import { AsyncSearchSelect, Button } from '../ui';
import ConfirmationModal from '../ConfirmationModal';
import { useAuth } from "../../context/AuthContext";
import { ROLES } from '../../constants/roles';
import KidsClassMatrix from './KidsClassMatrix';



const CATEGORY_INFO = {
    'KIDS': { label: 'Kids', color: 'pink', ageRange: '5-7 años' },
    'TEENS': { label: 'Teens', color: 'yellow', ageRange: '8-10 años' },
    'ROCAS': { label: 'Rocas', color: 'orange', ageRange: '11-13 años' },
    'JOVENES': { label: 'Jóvenes', color: 'purple', ageRange: '14+ años' }
};

const KidsCourseManagement = () => {
    const { user, hasAnyRole } = useAuth();
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState(null);
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

    useEffect(() => {
        fetchCourses();
    }, [user.roles]);

    const fetchCourses = async () => {
        try {
            const res = await api.get('/kids/modules');
            setCourses(res.data);
        } catch (error) {
            console.error('Error fetching courses', error);
        }
    };

    if (selectedCourseId) {
        return (
            <div>
                <Button
                    onClick={() => setSelectedCourseId(null)}
                    variant="ghost"
                    className="mb-4 text-blue-500 hover:underline"
                >
                    &larr; Volver a Lista de Clases
                </Button>
                <KidsClassMatrix courseId={selectedCourseId} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Clases Kids</h2>
                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                viewMode === 'table'
                                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
                            }`}
                            title="Vista de tabla"
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                viewMode === 'cards'
                                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
                            }`}
                            title="Vista de tarjetas"
                        >
                            <SquaresFourIcon size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map(course => {
                        const categoryInfo = CATEGORY_INFO[course.category] || CATEGORY_INFO['KIDS'];
                        const colorClasses = {
                            pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-800 dark:text-pink-300' },
                            orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300' },
                            purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300' }
                        };
                        const colors = colorClasses[categoryInfo.color] || colorClasses.pink;

                        return (
                            <div
                                key={course.id}
                                onClick={() => setSelectedCourseId(course.id)}
                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedCourseId(course.id)}
                                role="button"
                                tabIndex={0}
                                className="bg-white dark:bg-gray-800 rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow p-6 border border-gray-200 dark:border-gray-700 relative group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{course.name}</h3>
                                </div>
                                <div className="flex gap-2 mb-2">
                                    <span className={`${colors.bg} ${colors.text} text-xs px-2 py-1 rounded-full`}>
                                        {categoryInfo.label} ({categoryInfo.ageRange})
                                    </span>
                                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
                                        {course._count?.enrollments || 0} Estudiantes
                                    </span>
                                </div>
                                <p className="text-gray-500 text-sm mb-4 line-clamp-2">{course.description}</p>

                                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                    <div className="flex items-center">
                                        <Users size={16} className="mr-2" />
                                        <span>Prof: {course.professor?.fullName || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Users size={16} className="mr-2" />
                                        <span>Aux: {course.auxiliaries && course.auxiliaries.length > 0 
                                            ? course.auxiliaries.map(a => a.fullName).join(', ')
                                            : 'N/A'
                                        }</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Calendar size={16} className="mr-2" />
                                        <span>
                                            {course.startDate ? new Date(course.startDate).toLocaleDateString() : 'Sin fecha'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Nombre
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Categoría
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Profesor
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Auxiliar
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Fecha Inicio
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Fecha Final
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Estudiantes
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {courses.map(course => {
                                const categoryInfo = CATEGORY_INFO[course.category] || CATEGORY_INFO['KIDS'];
                                const colorClasses = {
                                    pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-800 dark:text-pink-300' },
                                    orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300' },
                                    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300' }
                                };
                                const colors = colorClasses[categoryInfo.color] || colorClasses.pink;

                                return (
                                    <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:text-blue-600" onClick={() => setSelectedCourseId(course.id)}>
                                                    {course.name}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`${colors.bg} ${colors.text} text-xs px-2 py-1 rounded-full`}>
                                                {categoryInfo.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {course.professor?.fullName || 'Sin asignar'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {course.auxiliaries && course.auxiliaries.length > 0 
                                                ? course.auxiliaries.map(a => a.fullName).join(', ')
                                                : 'Sin asignar'
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {course.startDate ? new Date(course.startDate).toLocaleDateString() : 'Sin fecha'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {course.endDate ? new Date(course.endDate).toLocaleDateString() : 'Sin fecha'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                                            {course._count?.enrollments || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Button
                                                onClick={() => setSelectedCourseId(course.id)}
                                                variant="ghost"
                                                size="sm"
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                Ver
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default KidsCourseManagement;
