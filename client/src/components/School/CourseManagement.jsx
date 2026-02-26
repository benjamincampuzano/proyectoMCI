import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus, Calendar, Users, Trash, Pen, List, SquaresFourIcon } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { useAuth } from "../../context/AuthContext";
import ClassMatrix from './ClassMatrix';
import { AsyncSearchSelect, Button } from '../ui';

const SCHOOL_LEVELS = [
    { nivel: '1', seccion: 'A', name: 'Pastoreados en su amor', moduleNumber: 1 },
    { nivel: '1', seccion: 'B', name: 'El poder de una Vision', moduleNumber: 2 },
    { nivel: '2', seccion: 'A', name: 'La estrategia del Ganar', moduleNumber: 3 },
    { nivel: '2', seccion: 'B', name: 'Familias con Proposito', moduleNumber: 4 },
    { nivel: '3', seccion: 'A', name: 'Liderazgo Eficaz', moduleNumber: 5 },
    { nivel: '3', seccion: 'B', name: 'El Espiritu Santo en Mi', moduleNumber: 6 }
];

const CourseManagement = () => {
    const { user, hasRole, hasAnyRole, isSuperAdmin } = useAuth();
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        professorId: null,
        auxiliarId: null,
        nivel: '1',
        seccion: 'A'
    });


    useEffect(() => {
        fetchCourses();
    }, [user.roles]);

    const fetchCourses = async () => {
        try {
            const res = await api.get('/school/modules');
            setCourses(res.data);
        } catch (error) {
            console.error('Error fetching courses', error);
        }
    };

    // fetchLeaders removed - using AsyncSearchSelect now

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('¿Estás seguro de eliminar esta clase? Se perderán todas las inscripciones y notas.')) return;
        try {
            await api.delete(`/school/modules/${id}`);
            fetchCourses();
        } catch (error) {
            toast.error('Error, No se puede eliminar la clase porque existen estudiantes inscritos y notas asociadas. Primero debe desvincular a todos los estudiantes.');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const selectedLevel = SCHOOL_LEVELS.find(l => l.nivel === formData.nivel && l.seccion === formData.seccion);
            const finalName = selectedLevel ? `${selectedLevel.name} (Nivel ${selectedLevel.nivel}${selectedLevel.seccion})` : `Escuela ${formData.nivel}${formData.seccion}`;
            const modId = selectedLevel ? selectedLevel.moduleNumber : 0;

            await api.post('/school/modules', {
                ...formData,
                name: finalName,
                moduleId: modId,
                auxiliarIds: formData.auxiliarId ? [parseInt(formData.auxiliarId)] : []
            });
            setShowCreateModal(false);
            setFormData({ ...formData, name: '', description: '', professorId: null, auxiliarId: null, startDate: '', endDate: '' });
            fetchCourses();
        } catch (error) {
            toast.error('Error creating course');
        }
    };

    const openEditModal = (e, course) => {
        e.stopPropagation();
        setEditingCourse(course);
        setFormData({
            name: course.name,
            description: course.description || '',
            startDate: course.startDate ? course.startDate.split('T')[0] : '',
            endDate: course.endDate ? course.endDate.split('T')[0] : '',
            professorId: course.professor?.id || null,
            auxiliarId: course.auxiliaries?.[0]?.id || null,
            nivel: '1',
            seccion: 'A'
        });
        setShowEditModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/school/modules/${editingCourse.id}`, {
                ...formData,
                auxiliarIds: formData.auxiliarId ? [parseInt(formData.auxiliarId)] : []
            });
            setShowEditModal(false);
            setEditingCourse(null);
            fetchCourses();
        } catch (error) {
            toast.error('Error updating course');
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
                <ClassMatrix courseId={selectedCourseId} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Escuelas de Discipulado</h2>
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
                    {hasAnyRole(['ADMIN']) && (
                        <Button
                            onClick={() => { setShowCreateModal(true); setFormData({ ...formData, name: '' }); }}
                            variant="primary"
                            icon={Plus}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            Nueva Clase
                        </Button>
                    )}
                </div>
            </div>

            {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map(course => (
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
                                {hasAnyRole(['ADMIN']) && (
                                    <div className="flex space-x-2">
                                        <Button
                                            onClick={(e) => openEditModal(e, course)}
                                            variant="ghost"
                                            size="icon"
                                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                            title="Editar"
                                        >
                                            <Pen size={18} />
                                        </Button>
                                        <Button
                                            onClick={(e) => handleDelete(e, course.id)}
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            title="Eliminar"
                                        >
                                            <Trash size={18} />
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full mb-2 inline-block">
                                {course._count?.enrollments || 0} Estudiantes
                            </span>
                            <p className="text-gray-500 text-sm mb-4 line-clamp-2">{course.description}</p>

                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center">
                                    <Users size={16} className="mr-2" />
                                    <span>Prof: {course.professor?.fullName || 'N/A'}</span>
                                </div>
                                <div className="flex items-center">
                                    <Calendar size={16} className="mr-2" />
                                    <span>
                                        {course.startDate ? new Date(course.startDate).toLocaleDateString() : 'Sin fecha'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
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
                                    Profesor
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Fecha Inicio
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
                            {courses.map(course => (
                                <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:text-blue-600" onClick={() => setSelectedCourseId(course.id)}>
                                                {course.name}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{course.description}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {course.professor?.fullName || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {course.startDate ? new Date(course.startDate).toLocaleDateString() : 'Sin fecha'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                            {course._count?.enrollments || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                onClick={() => setSelectedCourseId(course.id)}
                                                variant="ghost"
                                                size="sm"
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                Ver
                                            </Button>
                                            {hasAnyRole(['ADMIN']) && (
                                                <>
                                                    <Button
                                                        onClick={(e) => openEditModal(e, course)}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-amber-600 hover:text-amber-800"
                                                    >
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        onClick={(e) => handleDelete(e, course.id)}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-700"
                                                        icon={Trash}
                                                    >
                                                        Eliminar
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit Modal */}
            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 transition-all">
                    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-filter backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-lg w-full p-8">
                        <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white border-b pb-2">
                            {showEditModal ? 'Editar Clase' : 'Nueva Clase'}
                        </h3>
                        <form onSubmit={showEditModal ? handleUpdate : handleCreate} className="space-y-5">

                            {/* Nivel/Seccion Selection only for Create */}
                            {!showEditModal && (
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Seleccionar Nivel (Clase)</label>
                                        <select
                                            className="w-full px-4 py-2 bg-gray-50/50 dark:bg-gray-700/50 rounded-lg dark:text-white border border-gray-200 dark:border-gray-600"
                                            value={`${formData.nivel}${formData.seccion}`}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setFormData({ ...formData, nivel: val.substring(0, 1), seccion: val.substring(1) });
                                            }}
                                        >
                                            {SCHOOL_LEVELS.map(level => (
                                                <option key={`${level.nivel}${level.seccion}`} value={`${level.nivel}${level.seccion}`}>
                                                    {level.nivel}{level.seccion} - {level.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Name Input - Only visible/editable when editing */}
                            {showEditModal && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg dark:text-white"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                                <textarea
                                    className="w-full px-4 py-2 bg-gray-50/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg dark:text-white"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    rows="2"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
                                    <input type="date" className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700/50 dark:text-white dark:border-gray-600" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Fecha Fin</label>
                                    <input type="date" className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700/50 dark:text-white dark:border-gray-600" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Profesor</label>
                                <AsyncSearchSelect
                                    fetchItems={(term) => {
                                        const params = { search: term, role: 'LIDER_DOCE' };
                                        return api.get('/users/search', { params })
                                            .then(res => res.data);
                                    }}
                                    selectedValue={formData.professorId}
                                    onSelect={(user) => setFormData({ ...formData, professorId: user?.id || null })}
                                    placeholder="Seleccionar Profesor (Líder de 12)..."
                                    labelKey="fullName"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Auxiliar</label>
                                <AsyncSearchSelect
                                    fetchItems={(term) => {
                                        const params = { search: term, role: 'LIDER_CELULA' };
                                        return api.get('/users/search', { params })
                                            .then(res => res.data);
                                    }}
                                    selectedValue={formData.auxiliarId}
                                    onSelect={(user) => setFormData({ ...formData, auxiliarId: user?.id || null })}
                                    placeholder="Seleccionar Auxiliar (Líder de Célula)..."
                                    labelKey="fullName"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} variant="secondary">Cancelar</Button>
                                <Button type="submit" className="bg-gradient-to-r from-purple-600 to-blue-600">{showEditModal ? 'Guardar Cambios' : 'Crear Clase'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseManagement;
