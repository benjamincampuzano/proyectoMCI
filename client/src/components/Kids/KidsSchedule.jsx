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
    'KIDS1': { label: 'Kids 1 (5-7 años)', minAge: 5, maxAge: 7, color: 'pink' },
    'KIDS2': { label: 'Kids 2 (8-10 años)', minAge: 8, maxAge: 10, color: 'purple' },
    'TEENS': { label: 'Teens (11-13 años)', minAge: 11, maxAge: 13, color: 'blue' },
    'JOVENES': { label: 'Jóvenes (14 años en adelante)', minAge: 14, maxAge: 99, color: 'green' }
};

const KidsSchedule = ({ moduleCoordinator }) => {
    const { user, hasAnyRole } = useAuth();
    const [courses, setCourses] = useState([]);
    const [expandedCourseIds, setExpandedCourseIds] = useState(new Set());
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
        category: 'KIDS1'
    });

    // Course edit form data
    const [courseEditFormData, setCourseEditFormData] = useState({
        name: '',
        category: 'KIDS1'
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
                category: 'KIDS1'
            });
            fetchCourses();
            toast.success('Clase creada exitosamente');
        } catch (error) {
            console.error('Error creating course:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Error creating course';
            toast.error(errorMessage);
        }
    };

    const fetchCourses = async () => {
        try {
            const res = await api.get('/kids/modules');
            setCourses(res.data);
            // Expand all courses by default
            setExpandedCourseIds(new Set(res.data.map(c => c.id)));
            // Fetch schedules for all courses
            res.data.forEach(course => {
                if (!schedules[course.id]) {
                    fetchSchedulesForCourse(course.id);
                }
            });
        } catch (error) {
            console.error('Error fetching courses:', error);
            toast.error('Error al cargar los cursos');
        }
    };

    // Course management functions
    const handleEditCourse = (e, course) => {
        e.stopPropagation();
        setEditingCourse(course);
        setCourseEditFormData({
            name: course.name,
            category: course.category || 'KIDS1'
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
            console.error('Error updating course:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Error updating course';
            toast.error(errorMessage);
        }
    };

    const handleDeleteCourse = (e, course) => {
        e.stopPropagation();
        setCourseToDelete(course);
        setShowCourseDeleteConfirm(true);
    };

    const performCourseDelete = async () => {
        if (!courseToDelete) return;

        // Check if there are enrolled students before attempting deletion
        const enrollmentCount = courseToDelete._count?.enrollments || 0;
        if (enrollmentCount > 0) {
            toast.error(`❌ No se puede eliminar la clase porque tiene ${enrollmentCount} estudiante(s) inscrito(s). Primero debe desvincular a todos los estudiantes.`);
            return;
        }

        try {
            await api.delete(`/kids/modules/${courseToDelete.id}`);
            fetchCourses();
            setShowCourseDeleteConfirm(false);
            setCourseToDelete(null);
            toast.success('Clase eliminada exitosamente');
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Error al eliminar la clase';
            if (error.response?.status === 400 && errorMessage.includes('enrolled students')) {
                toast.error('❌ No se puede eliminar la clase porque tiene estudiantes inscritos. Primero debe desvincular a todos los estudiantes desde la sección de inscripciones.');
            } else {
                toast.error(`❌ ${errorMessage}`);
            }
        }
    };

    const fetchSchedulesForCourse = async (courseId) => {
        try {
            const res = await api.get(`/kids-schedule/module/${courseId}`);
            setSchedules(prev => ({ ...prev, [courseId]: res.data }));
        } catch (error) {
            console.error('Error fetching schedules for course:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Error al cargar cronograma del curso';
            toast.error(errorMessage);
        }
    };

    const toggleCourse = (courseId) => {
        setExpandedCourseIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(courseId)) {
                newSet.delete(courseId);
            } else {
                newSet.add(courseId);
                if (!schedules[courseId]) {
                    fetchSchedulesForCourse(courseId);
                }
            }
            return newSet;
        });
    };

    const handleOpenCreateModal = (courseId, e) => {
        if (e) e.stopPropagation();
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
            console.error('Error deleting schedule:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Error al eliminar';
            toast.error(errorMessage);
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
            console.error('Error saving schedule:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Error al guardar en el cronograma';
            toast.error(errorMessage);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-white dark:bg-[#272729] p-4 rounded-xl shadow-sm border border-[#d1d1d6] dark:border-[#3a3a3c]">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2.5 rounded-lg">
                        <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" weight="duotone" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-white">Cronogramas de Clases</h2>
                        <p className="text-sm text-[#86868b] dark:text-[#98989d]">Despliega un curso para ver su cronograma</p>
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
                    <div className="text-center py-10 bg-white dark:bg-[#272729] rounded-xl shadow-sm border border-[#d1d1d6] dark:border-[#3a3a3c]">
                        <BookOpen className="w-12 h-12 mx-auto text-gray-300 dark:text-[#86868b] mb-3" weight="duotone" />
                        <p className="text-[#86868b] dark:text-[#98989d]">No hay cursos creados todavía.</p>
                    </div>
                ) : (
                    courses.map(course => {
                        const isExpanded = expandedCourseIds.has(course.id);
                        const categoryInfo = CATEGORY_INFO[course.category] || CATEGORY_INFO['KIDS1'];
                        const safeColor = categoryInfo?.color || 'indigo';
                        const courseSchedules = schedules[course.id] || [];

                        return (
                            <div key={course.id} className="bg-white dark:bg-[#272729] rounded-xl shadow-sm border border-[#d1d1d6] dark:border-[#3a3a3c] overflow-hidden transition-all duration-200">
                                {/* Accordion Header */}
                                <div 
                                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-[#f5f5f7] dark:hover:bg-[#272729]/50 transition-colors"
                                    onClick={() => toggleCourse(course.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg bg-${safeColor}-100 dark:bg-${safeColor}-900/30`}>
                                            <BookOpen className={`w-5 h-5 text-${safeColor}-600 dark:text-${safeColor}-400`} weight="fill" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-[#1d1d1f] dark:text-white">{course.name}</h3>
                                            <p className="text-sm text-[#86868b] dark:text-[#98989d]">
                                                Prof. Titular: {course.professor?.fullName || 'No asignado'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-gray-400 dark:text-[#86868b] p-1">
                                            {isExpanded ? <CaretUp size={20} weight="bold" /> : <CaretDown size={20} weight="bold" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Accordion Content */}
                                {isExpanded && (
                                    <div className="border-t border-[#d1d1d6] dark:border-[#3a3a3c] bg-[#f5f5f7] dark:bg-[#272729]/80 p-0 sm:p-4">
                                        {(isKidsCoordinatorOrAdmin || hasAnyRole([ROLES.ADMIN])) && (
                                            <div className="px-4 py-3 sm:px-0 sm:py-0 sm:mb-4 flex flex-wrap gap-2">
                                                {isKidsCoordinatorOrAdmin && (
                                                    <Button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenCreateModal(course.id, e);
                                                        }}
                                                        variant="primary"
                                                        size="sm"
                                                        icon={Plus}
                                                        className="bg-indigo-600 hover:bg-indigo-700 flex-1 sm:flex-none"
                                                    >
                                                        Fila
                                                    </Button>
                                                )}
                                                {hasAnyRole([ROLES.ADMIN]) && (
                                                    <>
                                                        <Button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditCourse(e, course);
                                                            }}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-amber-600 hover:text-amber-800 flex-1 sm:flex-none"
                                                            icon={Pen}
                                                        >
                                                            Editar
                                                        </Button>
                                                        <Button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteCourse(e, course);
                                                            }}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-500 hover:text-red-700 flex-1 sm:flex-none"
                                                            icon={Trash}
                                                        >
                                                            Eliminar
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        <div className="overflow-x-auto rounded-lg shadow-inner bg-white dark:bg-black border border-[#d1d1d6] dark:border-[#3a3a3c]">
                                            {courseSchedules.length === 0 ? (
                                                <div className="p-8 text-center text-[#86868b] dark:text-[#98989d]">
                                                    No hay entradas en el cronograma para este curso.
                                                </div>
                                            ) : (
                                                <table className="w-full text-sm text-left whitespace-nowrap">
                                                    <thead className="text-xs text-[#86868b] dark:text-white/80 uppercase bg-gray-100 dark:bg-[#272729] border-b border-[#d1d1d6] dark:border-[#3a3a3c]">
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
                                                            <tr key={schedule.id} className="hover:bg-[#f5f5f7] dark:hover:bg-gray-800/50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-[#1d1d1f] dark:text-white">
                                                                    {schedule.unit}
                                                                </td>
                                                                <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400 font-medium">
                                                                    {schedule.date ? new Date(schedule.date).toLocaleDateString() : '-'}
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-700 dark:text-white/80 whitespace-normal min-w-[200px]">{schedule.lesson}</td>
                                                                <td className="px-4 py-3 text-[#86868b] dark:text-[#98989d] whitespace-normal min-w-[200px]">{schedule.bibleReading}</td>
                                                                <td className="px-4 py-3 text-[#86868b] dark:text-[#98989d] whitespace-normal min-w-[200px] italic">"{schedule.memoryVerse}"</td>
                                                                <td className="px-4 py-3 text-[#86868b] dark:text-[#98989d] whitespace-normal min-w-[200px]">{schedule.activity}</td>
                                                                <td className="px-4 py-3 text-[#1d1d1f] dark:text-white/80 font-medium">
                                                                    {schedule.teacher?.profile?.fullName || '-'}
                                                                </td>
                                                                <td className="px-4 py-3 text-[#86868b] dark:text-[#98989d]">
                                                                    {schedule.auxiliary?.profile?.fullName || '-'}
                                                                </td>
                                                                <td className="px-4 py-3 text-[#86868b] dark:text-[#98989d] whitespace-normal min-w-[200px] text-xs">
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4 backdrop-blur-sm bg-black/50 transition-all">
                    <div className="bg-white dark:bg-[#272729] sm:rounded-2xl shadow-2xl border border-[#d1d1d6] dark:border-[#3a3a3c] w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-4 sm:p-6 border-b border-[#d1d1d6] dark:border-[#3a3a3c] bg-[#f5f5f7] dark:bg-[#272729]/80 flex-shrink-0">
                            <h3 className="text-lg sm:text-xl font-bold text-[#1d1d1f] dark:text-white">
                                {editingSchedule ? 'Editar Cronograma' : 'Añadir al Cronograma'}
                            </h3>
                            <p className="text-xs sm:text-sm text-[#86868b] dark:text-[#98989d] mt-1">
                                Completa la información para esta clase
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-1.5">Unidad</label>
                                    <input required type="text" className="w-full px-4 py-2 bg-[#f5f5f7] dark:bg-black border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej: Unidad 1" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-1.5">Fecha</label>
                                    <input required type="date" className="w-full px-4 py-2 bg-[#f5f5f7] dark:bg-black border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                </div>
                                <div className="md:col-span-2 lg:col-span-1">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-1.5">Lección</label>
                                    <input required type="text" className="w-full px-4 py-2 bg-[#f5f5f7] dark:bg-black border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Tema principal..." value={formData.lesson} onChange={e => setFormData({ ...formData, lesson: e.target.value })} />
                                </div>
                                <div className="md:col-span-2 lg:col-span-3">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-1.5">Lectura Bíblica</label>
                                    <input required type="text" className="w-full px-4 py-2 bg-[#f5f5f7] dark:bg-black border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej: Mateo 28:19-20" value={formData.bibleReading} onChange={e => setFormData({ ...formData, bibleReading: e.target.value })} />
                                </div>
                                <div className="md:col-span-2 lg:col-span-3">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-1.5">Texto a Memorizar</label>
                                    <input required type="text" className="w-full px-4 py-2 bg-[#f5f5f7] dark:bg-black border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Versículo completo..." value={formData.memoryVerse} onChange={e => setFormData({ ...formData, memoryVerse: e.target.value })} />
                                </div>
                                <div className="md:col-span-2 lg:col-span-3">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-1.5">Actividad a Realizar</label>
                                    <textarea required className="w-full px-4 py-2 bg-[#f5f5f7] dark:bg-black border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" rows="2" placeholder="Manualidad, juego, etc..." value={formData.activity} onChange={e => setFormData({ ...formData, activity: e.target.value })} />
                                </div>

                                {/* Selectors logic using AsyncSearchSelect */}
                                <div className="lg:col-span-1 md:col-span-1">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-1.5">Maestro (Opcional)</label>
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
                                        labelKey={(item) => item.fullName || item.profile?.fullName}
                                    />
                                </div>
                                <div className="lg:col-span-1 md:col-span-1">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-1.5">Auxiliar (Opcional)</label>
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
                                        labelKey={(item) => item.fullName || item.profile?.fullName}
                                    />
                                </div>
                                <div className="lg:col-span-3 md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-1.5">Observaciones</label>
                                    <textarea className="w-full px-4 py-2 bg-[#f5f5f7] dark:bg-black border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" rows="2" value={formData.observations} onChange={e => setFormData({ ...formData, observations: e.target.value })} />
                                </div>
                            </div>
                            
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-[#d1d1d6] dark:border-[#3a3a3c] bg-[#f5f5f7] dark:bg-[#272729]/80 flex-shrink-0 p-4">
                                <Button type="button" onClick={() => setShowModal(false)} variant="secondary" size="sm" className="text-sm">Cancelar</Button>
                                <Button type="submit" variant="primary" className="bg-indigo-600 hover:bg-indigo-700 text-sm" size="sm">
                                    {editingSchedule ? 'Guardar' : 'Añadir'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Course Modal */}
            {showCreateCourseModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4 backdrop-blur-sm bg-black/40 transition-all">
                    <div className="bg-white/90 dark:bg-[#272729]/90 backdrop-filter backdrop-blur-md sm:rounded-2xl shadow-2xl border border-white/20 max-w-md w-full h-full sm:h-auto overflow-hidden flex flex-col">
                        <div className="p-4 sm:p-6 flex-shrink-0">
                            <h3 className="text-lg sm:text-xl font-bold text-[#1d1d1f] dark:text-white border-b pb-2">
                                Nueva Clase
                            </h3>
                        </div>

                        <form onSubmit={handleCreateCourse} className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-2">Categoría</label>
                                    <select
                                        className="w-full px-4 py-2 bg-[#f5f5f7]/50 dark:bg-[#272729]/50 rounded-lg dark:text-white border border-[#d1d1d6] dark:border-gray-600"
                                        value={courseFormData.category}
                                        onChange={e => setCourseFormData({ ...courseFormData, category: e.target.value })}
                                    >
                                        {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                                            <option key={key} value={key}>
                                                {info.label}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-2">Los detalles como fechas, profesores y cronograma se definirán en cada fila del cronograma.</p>
                                </div>
                            </div>

                            {/* Submit Buttons - Fixed at bottom outside scroll area */}
                            <div className="border-t border-[#d1d1d6] dark:border-[#3a3a3c] bg-[#f5f5f7]/50 dark:bg-[#272729]/50 flex-shrink-0">
                                <div className="p-4 sm:p-6 flex justify-end gap-2">
                                    <Button type="button" onClick={() => setShowCreateCourseModal(false)} variant="secondary" size="sm" className="text-sm">Cancelar</Button>
                                    <Button type="submit" className="bg-gradient-to-r from-pink-600 to-purple-600 text-sm" size="sm">Crear</Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Course Modal */}
            {showEditCourseModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4 backdrop-blur-sm bg-black/40 transition-all">
                    <div className="bg-white/90 dark:bg-[#272729]/90 backdrop-filter backdrop-blur-md sm:rounded-2xl shadow-2xl border border-white/20 max-w-md w-full h-full sm:h-auto overflow-hidden flex flex-col">
                        <div className="p-4 sm:p-6 flex-shrink-0">
                            <h3 className="text-lg sm:text-xl font-bold text-[#1d1d1f] dark:text-white border-b pb-2">
                                Editar Clase
                            </h3>
                        </div>

                        <form onSubmit={handleUpdateCourse} className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-2">Nombre</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-[#f5f5f7]/50 dark:bg-[#272729]/50 rounded-lg dark:text-white border border-[#d1d1d6] dark:border-gray-600"
                                        value={courseEditFormData.name}
                                        onChange={e => setCourseEditFormData({ ...courseEditFormData, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-white/80 mb-2">Categoría</label>
                                    <select
                                        className="w-full px-4 py-2 bg-[#f5f5f7]/50 dark:bg-[#272729]/50 rounded-lg dark:text-white border border-[#d1d1d6] dark:border-gray-600"
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
                            <div className="border-t border-[#d1d1d6] dark:border-[#3a3a3c] bg-[#f5f5f7]/50 dark:bg-[#272729]/50 flex-shrink-0">
                                <div className="p-4 sm:p-6 flex justify-end gap-2">
                                    <Button type="button" onClick={() => setShowEditCourseModal(false)} variant="secondary" size="sm" className="text-sm">Cancelar</Button>
                                    <Button type="submit" className="bg-gradient-to-r from-amber-600 to-orange-600 text-sm" size="sm">Guardar</Button>
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
                message={courseToDelete?._count?.enrollments > 0 
                    ? `⚠️ Esta clase tiene ${courseToDelete._count.enrollments} estudiante(s) inscrito(s). No se puede eliminar hasta que todos los estudiantes sean desvinculados.` 
                    : "¿Estás seguro de eliminar esta clase?"}
                confirmText={courseToDelete?._count?.enrollments > 0 ? "No se puede eliminar" : "Eliminar Clase"}
                confirmButtonClass={courseToDelete?._count?.enrollments > 0 
                    ? "bg-gray-400 cursor-not-allowed text-white" 
                    : "bg-red-600 hover:bg-red-700 text-white"}
                disabled={courseToDelete?._count?.enrollments > 0}
            >
                {courseToDelete && (
                    <div className="bg-[#f5f5f7] dark:bg-[#272729]/50 p-4 rounded-lg mb-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[#86868b] dark:text-[#98989d]">Clase:</span>
                                <span className="font-medium text-[#1d1d1f] dark:text-white">{courseToDelete.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#86868b] dark:text-[#98989d]">Categoría:</span>
                                <span className="font-medium text-[#1d1d1f] dark:text-white">{CATEGORY_INFO[courseToDelete.category]?.label || courseToDelete.category}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#86868b] dark:text-[#98989d]">Estudiantes:</span>
                                <span className="font-medium text-[#1d1d1f] dark:text-white">{courseToDelete._count?.enrollments || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#86868b] dark:text-[#98989d]">Profesor:</span>
                                <span className="font-medium text-[#1d1d1f] dark:text-white">{courseToDelete.professor?.fullName || 'N/A'}</span>
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
