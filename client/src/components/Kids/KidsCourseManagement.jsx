import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus, Calendar, Users, Trash2, Edit } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from "../../context/AuthContext";
import KidsClassMatrix from './KidsClassMatrix';
import { AsyncSearchSelect, Button } from '../ui';



const CATEGORY_INFO = {
    'KIDS': { label: 'Kids', color: 'pink', ageRange: '5-10 años' },
    'ROCAS': { label: 'Rocas', color: 'orange', ageRange: '11-13 años' },
    'JOVENES': { label: 'Jóvenes', color: 'purple', ageRange: '14+ años' }
};

const KidsCourseManagement = () => {
    const { user, hasRole, hasAnyRole, isSuperAdmin } = useAuth();
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        professorId: '',
        auxiliarId: '',
        category: 'KIDS'
    });

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

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('¿Estás seguro de eliminar esta clase? Se perderán todas las inscripciones y notas.')) return;
        try {
            await api.delete(`/kids/modules/${id}`);
            fetchCourses();
        } catch (error) {
            toast.error('Error, No se puede eliminar la clase porque existen estudiantes inscritos y notas asociadas. Primero debe desvincular a todos los estudiantes.');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const categoryConfig = CATEGORY_INFO[formData.category];
            const finalName = categoryConfig ? `${categoryConfig.label} (${categoryConfig.ageRange})` : formData.category;

            await api.post('/kids/modules', {
                ...formData,
                name: finalName,
                category: formData.category,
                auxiliarIds: formData.auxiliarId ? [parseInt(formData.auxiliarId)] : []
            });
            setShowCreateModal(false);
            setFormData({ name: '', description: '', professorId: '', auxiliarId: '', startDate: '', endDate: '', category: 'KIDS' });
            fetchCourses();
            toast.success('Clase creada exitosamente');
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
            professorId: course.professor?.id || '',
            auxiliarId: course.auxiliaries?.[0]?.id || '',
            nivel: '1',
            seccion: 'A'
        });
        setShowEditModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/kids/modules/${editingCourse.id}`, {
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
                <KidsClassMatrix courseId={selectedCourseId} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Clases Kids</h2>
                {hasAnyRole(['ADMIN']) && (
                    <Button
                        onClick={() => { setShowCreateModal(true); setFormData({ ...formData, name: '' }); }}
                        variant="primary"
                        icon={Plus}
                        className="bg-pink-600 hover:bg-pink-700"
                    >
                        Nueva Clase
                    </Button>
                )}
            </div>

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
                                {hasAnyRole(['ADMIN']) && (
                                    <div className="flex space-x-2">
                                        <Button
                                            onClick={(e) => openEditModal(e, course)}
                                            variant="ghost"
                                            size="icon"
                                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                            title="Editar"
                                        >
                                            <Edit size={18} />
                                        </Button>
                                        <Button
                                            onClick={(e) => handleDelete(e, course.id)}
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} />
                                        </Button>
                                    </div>
                                )}
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

            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 transition-all">
                    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-filter backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-lg w-full p-8">
                        <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white border-b pb-2">
                            {showEditModal ? 'Editar Clase' : 'Nueva Clase Kids'}
                        </h3>
                        <form onSubmit={showEditModal ? handleUpdate : handleCreate} className="space-y-5">

                            {!showEditModal && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
                                    <select
                                        className="w-full px-4 py-2 bg-gray-50/50 dark:bg-gray-700/50 rounded-lg dark:text-white border border-gray-200 dark:border-gray-600"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                                            <option key={key} value={key}>
                                                {info.label} ({info.ageRange})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

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
                                    onSelect={(user) => setFormData({ ...formData, professorId: user?.id || '' })}
                                    placeholder="Seleccionar Profesor..."
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
                                    onSelect={(user) => setFormData({ ...formData, auxiliarId: user?.id || '' })}
                                    placeholder="Seleccionar Auxiliar..."
                                    labelKey="fullName"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} variant="secondary">Cancelar</Button>
                                <Button type="submit" className="bg-gradient-to-r from-pink-600 to-purple-600">{showEditModal ? 'Guardar Cambios' : 'Crear Clase'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KidsCourseManagement;
