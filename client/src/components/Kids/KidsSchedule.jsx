import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { CaretDown, CaretUp, Plus, Pen, Trash, Calendar, BookOpen } from '@phosphor-icons/react';
import { Button, AsyncSearchSelect } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import ConfirmationModal from '../ConfirmationModal';
import PropTypes from 'prop-types';

const CATEGORY_INFO = {
    'KIDS': { label: 'Kids', color: 'pink' },
    'TEENS': { label: 'Teens', color: 'yellow' },
    'ROCAS': { label: 'Rocas', color: 'orange' },
    'JOVENES': { label: 'Jóvenes', color: 'purple' }
};

const KidsSchedule = ({ moduleCoordinator }) => {
    const { user, hasAnyRole } = useAuth();
    const [courses, setCourses] = useState([]);
    const [expandedCourseId, setExpandedCourseId] = useState(null);
    const [schedules, setSchedules] = useState({});
    const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [scheduleToDelete, setScheduleToDelete] = useState(null);
    const [formCourseId, setFormCourseId] = useState(null);

    // Course management states
    const [showEditCourseModal, setShowEditCourseModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [showCourseDeleteConfirm, setShowCourseDeleteConfirm] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState(null);

    const [formData, setFormData] = useState({
        unit: '',
        date: '',
        lesson: '',
        bibleReading: '',
        memoryVerse: '',
        activity: '',
        teacherId: null,
        auxiliaryId: null,
        observations: ''
    });

    // Course creation form data
    const [courseFormData, setCourseFormData] = useState({
        category: 'KIDS'
    });

    // Course edit form data
    const [courseEditFormData, setCourseEditFormData] = useState({
        name: '',
        category: 'KIDS'
    });

    // Check if user is ADMIN or the specific coordinator of the KIDS module
    const isKidsCoordinatorOrAdmin = hasAnyRole([ROLES.ADMIN]) || 
        (moduleCoordinator && user?.id === moduleCoordinator.id);

    useEffect(() => {
        fetchCourses();
    }, []);

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        try {
            const categoryConfig = CATEGORY_INFO[courseFormData.category];
            const finalName = categoryConfig ? `${categoryConfig.label}` : courseFormData.category;

            await api.post('/kids/modules', {
                name: finalName,
                category: courseFormData.category
            });
            setShowCreateCourseModal(false);
            setCourseFormData({
                category: 'KIDS'
            });
            fetchCourses();
            toast.success('Clase creada exitosamente');
        } catch (error) {
            toast.error('Error creating course');
        }
    };

    const fetchCourses = async () => {
        try {
            const res = await api.get('/kids/modules');
            setCourses(res.data);
            if (res.data.length > 0 && expandedCourseId === null) {
                // Optionally expand the first course by default
            }
        } catch (error) {
            console.error('Error fetching courses', error);
        }
    };

    // Course management functions
    const handleEditCourse = (e, course) => {
        e.stopPropagation();
        setEditingCourse(course);
        setCourseEditFormData({
            name: course.name,
            category: course.category || 'KIDS'
        });
        setShowEditCourseModal(true);
    };

    const handleUpdateCourse = async (e) => {
        e.preventDefault();
        try {
            const categoryConfig = CATEGORY_INFO[courseEditFormData.category];
            const finalName = categoryConfig ? `${categoryConfig.label}` : courseEditFormData.name;

            await api.put(`/kids/modules/${editingCourse.id}`, {
                name: finalName,
                category: courseEditFormData.category
            });
            setShowEditCourseModal(false);
            setEditingCourse(null);
            fetchCourses();
            toast.success('Clase actualizada exitosamente');
        } catch (error) {
            toast.error('Error updating course');
        }
    };

    const handleDeleteCourse = (e, course) => {
        e.stopPropagation();
        setCourseToDelete(course);
        setShowCourseDeleteConfirm(true);
    };

    const performCourseDelete = async () => {
        if (!courseToDelete) return;

        try {
            await api.delete(`/kids/modules/${courseToDelete.id}`);
            fetchCourses();
            setShowCourseDeleteConfirm(false);
            setCourseToDelete(null);
            toast.success('Clase eliminada exitosamente');
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Error al eliminar la clase';
            if (errorMessage.includes('enrolled students')) {
                toast.error('No se puede eliminar la clase porque tiene estudiantes inscritos. Primero debe desvincular a todos los estudiantes.');
            } else {
                toast.error(errorMessage);
            }
        }
    };

    const fetchSchedulesForCourse = async (courseId) => {
        try {
            const res = await api.get(`/kids-schedule/module/${courseId}`);
            setSchedules(prev => ({ ...prev, [courseId]: res.data }));
        } catch (error) {
            console.error('Error fetching schedules for course', error);
            toast.error('Error al cargar cronograma del curso');
        }
    };

    const toggleCourse = (courseId) => {
        if (expandedCourseId === courseId) {
            setExpandedCourseId(null);
        } else {
            setExpandedCourseId(courseId);
            if (!schedules[courseId]) {
                fetchSchedulesForCourse(courseId);
            }
        }
    };

    const handleOpenCreateModal = (courseId, e) => {
        e.stopPropagation();
        setFormCourseId(courseId);
        setEditingSchedule(null);
        setFormData({
            unit: '',
            date: '',
            lesson: '',
            bibleReading: '',
            memoryVerse: '',
            activity: '',
            teacherId: null,
            auxiliaryId: null,
            observations: ''
        });
        setShowModal(true);
    };

    const handleOpenEditModal = (courseId, schedule) => {
        setFormCourseId(courseId);
        setEditingSchedule(schedule);
        setFormData({
            unit: schedule.unit || '',
            date: schedule.date ? schedule.date.split('T')[0] : '',
            lesson: schedule.lesson || '',
            bibleReading: schedule.bibleReading || '',
            memoryVerse: schedule.memoryVerse || '',
            activity: schedule.activity || '',
            teacherId: schedule.teacher || null,
            auxiliaryId: schedule.auxiliary || null,
            observations: schedule.observations || ''
        });
        setShowModal(true);
    };

    const handleDeleteClicked = (schedule) => {
        setScheduleToDelete(schedule);
        setShowDeleteConfirm(true);
    };

    const performDelete = async () => {
        if (!scheduleToDelete) return;
        try {
            await api.delete(`/kids-schedule/${scheduleToDelete.id}`);
            toast.success('Entrada de cronograma eliminada');
            fetchSchedulesForCourse(scheduleToDelete.moduleId);
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar');
        } finally {
            setShowDeleteConfirm(false);
            setScheduleToDelete(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                teacherId: formData.teacherId?.id || null,
                auxiliaryId: formData.auxiliaryId?.id || null
            };

            if (editingSchedule) {
                await api.put(`/kids-schedule/${editingSchedule.id}`, payload);
                toast.success('Cronograma actualizado');
            } else {
                await api.post(`/kids-schedule/module/${formCourseId}`, payload);
                toast.success('Entrada añadida al cronograma');
            }
            setShowModal(false);
            fetchSchedulesForCourse(formCourseId);
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar en el cronograma');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2.5 rounded-lg">
                        <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" weight="duotone" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Cronogramas de Clases</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Despliega un curso para ver su cronograma</p>
                    </div>
                </div>
                {hasAnyRole(['ADMIN', 'PASTOR','LIDER_DOCE']) && (
                    <Button
                        onClick={() => setShowCreateCourseModal(true)}
                        variant="primary"
                        icon={Plus}
                        className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                    >
                        Nueva Clase
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                {courses.length === 0 ? (
                    <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <BookOpen className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" weight="duotone" />
                        <p className="text-gray-500 dark:text-gray-400">No hay cursos creados todavía.</p>
                    </div>
                ) : (
                    courses.map(course => {
                        const isExpanded = expandedCourseId === course.id;
                        const categoryInfo = CATEGORY_INFO[course.category] || CATEGORY_INFO['KIDS'];
                        const courseSchedules = schedules[course.id] || [];

                        return (
                            <div key={course.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200">
                                {/* Accordion Header */}
                                <div 
                                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    onClick={() => toggleCourse(course.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg bg-${categoryInfo.color}-100 dark:bg-${categoryInfo.color}-900/30`}>
                                            <BookOpen className={`w-5 h-5 text-${categoryInfo.color}-600 dark:text-${categoryInfo.color}-400`} weight="fill" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{course.name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Prof. Titular: {course.professor?.fullName || 'No asignado'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {isKidsCoordinatorOrAdmin && (
                                            <Button
                                                onClick={(e) => handleOpenCreateModal(course.id, e)}
                                                variant="primary"
                                                size="sm"
                                                icon={Plus}
                                                className="bg-indigo-600 hover:bg-indigo-700"
                                            >
                                                Agregar Fila
                                            </Button>
                                        )}
                                        {hasAnyRole([ROLES.ADMIN]) && (
                                            <>
                                                <Button
                                                    onClick={(e) => handleEditCourse(e, course)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-amber-600 hover:text-amber-800"
                                                    icon={Pen}
                                                >
                                                    Editar
                                                </Button>
                                                <Button
                                                    onClick={(e) => handleDeleteCourse(e, course)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700"
                                                    icon={Trash}
                                                >
                                                    Eliminar
                                                </Button>
                                            </>
                                        )}
                                        <div className="text-gray-400 dark:text-gray-500 p-1">
                                            {isExpanded ? <CaretUp size={20} weight="bold" /> : <CaretDown size={20} weight="bold" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Accordion Content */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 p-0 sm:p-4">
                                        <div className="overflow-x-auto rounded-lg shadow-inner bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                                            {courseSchedules.length === 0 ? (
                                                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                                    No hay entradas en el cronograma para este curso.
                                                </div>
                                            ) : (
                                                <table className="w-full text-sm text-left whitespace-nowrap">
                                                    <thead className="text-xs text-gray-600 dark:text-gray-300 uppercase bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                                        <tr>
                                                            <th className="px-4 py-3">Unidad</th>
                                                            <th className="px-4 py-3">Fecha</th>
                                                            <th className="px-4 py-3 min-w-[150px]">Lección</th>
                                                            <th className="px-4 py-3 min-w-[150px]">Lectura Bíblica</th>
                                                            <th className="px-4 py-3 min-w-[150px]">Texto a Memorizar</th>
                                                            <th className="px-4 py-3 min-w-[150px]">Actividad</th>
                                                            <th className="px-4 py-3">Maestro</th>
                                                            <th className="px-4 py-3">Auxiliar</th>
                                                            <th className="px-4 py-3">Observaciones</th>
                                                            {isKidsCoordinatorOrAdmin && <th className="px-4 py-3 text-right">Acciones</th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                        {courseSchedules.map((schedule) => (
                                                            <tr key={schedule.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                                                                    {schedule.unit}
                                                                </td>
                                                                <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400 font-medium">
                                                                    {schedule.date ? new Date(schedule.date).toLocaleDateString() : '-'}
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-normal min-w-[200px]">{schedule.lesson}</td>
                                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-normal min-w-[200px]">{schedule.bibleReading}</td>
                                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-normal min-w-[200px] italic">"{schedule.memoryVerse}"</td>
                                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-normal min-w-[200px]">{schedule.activity}</td>
                                                                <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">
                                                                    {schedule.teacher?.profile?.fullName || '-'}
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                                    {schedule.auxiliary?.profile?.fullName || '-'}
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-normal min-w-[200px] text-xs">
                                                                    {schedule.observations}
                                                                </td>
                                                                {isKidsCoordinatorOrAdmin && (
                                                                    <td className="px-4 py-3 text-right">
                                                                        <div className="flex justify-end gap-2">
                                                                            <button 
                                                                                onClick={() => handleOpenEditModal(course.id, schedule)}
                                                                                className="p-1.5 text-blue-600 bg-blue-50 dark:bg-blue-900/40 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/60"
                                                                                title="Editar"
                                                                            >
                                                                                <Pen size={16} />
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => handleDeleteClicked(schedule)}
                                                                                className="p-1.5 text-red-600 bg-red-50 dark:bg-red-900/40 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/60"
                                                                                title="Eliminar"
                                                                            >
                                                                                <Trash size={16} />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-black/50 transition-all">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex-shrink-0">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingSchedule ? 'Editar Cronograma' : 'Añadir al Cronograma'}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Completa la información para esta clase
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Unidad</label>
                                    <input required type="text" className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej: Unidad 1" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Fecha</label>
                                    <input required type="date" className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                </div>
                                <div className="md:col-span-2 lg:col-span-1">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Lección</label>
                                    <input required type="text" className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Tema principal..." value={formData.lesson} onChange={e => setFormData({ ...formData, lesson: e.target.value })} />
                                </div>
                                <div className="md:col-span-2 lg:col-span-3">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Lectura Bíblica</label>
                                    <input required type="text" className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej: Mateo 28:19-20" value={formData.bibleReading} onChange={e => setFormData({ ...formData, bibleReading: e.target.value })} />
                                </div>
                                <div className="md:col-span-2 lg:col-span-3">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Texto a Memorizar</label>
                                    <input required type="text" className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Versículo completo..." value={formData.memoryVerse} onChange={e => setFormData({ ...formData, memoryVerse: e.target.value })} />
                                </div>
                                <div className="md:col-span-2 lg:col-span-3">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Actividad a Realizar</label>
                                    <textarea required className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" rows="2" placeholder="Manualidad, juego, etc..." value={formData.activity} onChange={e => setFormData({ ...formData, activity: e.target.value })} />
                                </div>

                                {/* Selectors logic using AsyncSearchSelect */}
                                <div className="lg:col-span-1 md:col-span-1">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Maestro (Opcional)</label>
                                    <AsyncSearchSelect
                                        fetchItems={(term) => api.get('/users/search', { 
                                            params: { 
                                                search: term,
                                                excludeRoles: 'PASTOR,ADMIN'
                                            } 
                                        }).then(res => res.data)}
                                        selectedValue={formData.teacherId}
                                        onSelect={(user) => setFormData({ ...formData, teacherId: user })}
                                        placeholder="Buscar maestro..."
                                        labelKey="fullName"
                                    />
                                </div>
                                <div className="lg:col-span-1 md:col-span-1">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Auxiliar (Opcional)</label>
                                    <AsyncSearchSelect
                                        fetchItems={(term) => api.get('/users/search', { 
                                            params: { 
                                                search: term,
                                                excludeRoles: 'PASTOR,ADMIN'
                                            } 
                                        }).then(res => res.data)}
                                        selectedValue={formData.auxiliaryId}
                                        onSelect={(user) => setFormData({ ...formData, auxiliaryId: user })}
                                        placeholder="Buscar auxiliar..."
                                        labelKey="fullName"
                                    />
                                </div>
                                <div className="lg:col-span-3 md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Observaciones</label>
                                    <textarea className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" rows="2" value={formData.observations} onChange={e => setFormData({ ...formData, observations: e.target.value })} />
                                </div>
                            </div>
                            
                            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
                                <Button type="button" onClick={() => setShowModal(false)} variant="secondary">Cancelar</Button>
                                <Button type="submit" variant="primary" className="bg-indigo-600 hover:bg-indigo-700">
                                    {editingSchedule ? 'Guardar Cambios' : 'Añadir Fila'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Course Modal */}
            {showCreateCourseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 transition-all">
                    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-filter backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-md w-full overflow-hidden flex flex-col">
                        <div className="p-6 flex-shrink-0">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white border-b pb-2">
                                Nueva Clase - {CATEGORY_INFO[courseFormData.category]?.label || courseFormData.category}
                            </h3>
                        </div>

                        <form onSubmit={handleCreateCourse} className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Categoría</label>
                                    <select
                                        className="w-full px-4 py-2 bg-gray-50/50 dark:bg-gray-700/50 rounded-lg dark:text-white border border-gray-200 dark:border-gray-600"
                                        value={courseFormData.category}
                                        onChange={e => setCourseFormData({ ...courseFormData, category: e.target.value })}
                                    >
                                        {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                                            <option key={key} value={key}>
                                                {info.label}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Los detalles como fechas, profesores y cronograma se definirán en cada fila del cronograma.</p>
                                </div>
                            </div>

                            {/* Submit Buttons - Fixed at bottom outside scroll area */}
                            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                <div className="p-6 flex justify-end space-x-3">
                                    <Button type="button" onClick={() => setShowCreateCourseModal(false)} variant="secondary">Cancelar</Button>
                                    <Button type="submit" className="bg-gradient-to-r from-pink-600 to-purple-600">Crear Clase</Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Course Modal */}
            {showEditCourseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 transition-all">
                    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-filter backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-md w-full overflow-hidden flex flex-col">
                        <div className="p-6 flex-shrink-0">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white border-b pb-2">
                                Editar Clase
                            </h3>
                        </div>

                        <form onSubmit={handleUpdateCourse} className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Nombre</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-gray-50/50 dark:bg-gray-700/50 rounded-lg dark:text-white border border-gray-200 dark:border-gray-600"
                                        value={courseEditFormData.name}
                                        onChange={e => setCourseEditFormData({ ...courseEditFormData, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Categoría</label>
                                    <select
                                        className="w-full px-4 py-2 bg-gray-50/50 dark:bg-gray-700/50 rounded-lg dark:text-white border border-gray-200 dark:border-gray-600"
                                        value={courseEditFormData.category}
                                        onChange={e => setCourseEditFormData({ ...courseEditFormData, category: e.target.value })}
                                    >
                                        {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                                            <option key={key} value={key}>
                                                {info.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Submit Buttons - Fixed at bottom outside scroll area */}
                            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                <div className="p-6 flex justify-end space-x-3">
                                    <Button type="button" onClick={() => setShowEditCourseModal(false)} variant="secondary">Cancelar</Button>
                                    <Button type="submit" className="bg-gradient-to-r from-amber-600 to-orange-600">Guardar Cambios</Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Course Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showCourseDeleteConfirm}
                onClose={() => {
                    setShowCourseDeleteConfirm(false);
                    setCourseToDelete(null);
                }}
                onConfirm={performCourseDelete}
                title="Eliminar Clase"
                message="¿Estás seguro de eliminar esta clase?"
                confirmText="Eliminar Clase"
                confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
            >
                {courseToDelete && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Clase:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{courseToDelete.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Categoría:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{CATEGORY_INFO[courseToDelete.category]?.label || courseToDelete.category}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Estudiantes:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{courseToDelete._count?.enrollments || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Profesor:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{courseToDelete.professor?.fullName || 'N/A'}</span>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-red-800 dark:text-red-200 font-semibold mb-1 mt-3">
                                ⚠️ Acción Irreversible
                            </h4>
                            <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
                                <li>• Se eliminará la clase completamente</li>
                                <li>• Se perderán todas las inscripciones</li>
                                <li>• Se perderán todas las notas y asistencia</li>
                                <li>• No se puede deshacer esta acción</li>
                            </ul>
                        </div>
                    </div>
                )}
            </ConfirmationModal>

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={performDelete}
                title="Eliminar del Cronograma"
                message={<>¿Estás seguro de que deseas eliminar la lección <strong>{scheduleToDelete?.lesson}</strong> sumada a la fecha {scheduleToDelete?.date ? new Date(scheduleToDelete.date).toLocaleDateString() : ''}?</>}
                confirmText="Sí, Eliminar"
            />
        </div>
    );
};

KidsSchedule.propTypes = {
    moduleCoordinator: PropTypes.shape({
        id: PropTypes.number,
        fullName: PropTypes.string,
        email: PropTypes.string
    })
};

export default KidsSchedule;
