import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';
import { Save, UserPlus, Trash2, X, AlertCircle } from 'lucide-react';
import { AsyncSearchSelect, Button } from '../ui';

const CLASSES_COUNT = 12;

const CATEGORY_INFO = {
    'KIDS': { label: 'Kids', minAge: 5, maxAge: 10 },
    'ROCAS': { label: 'Rocas', minAge: 11, maxAge: 13 },
    'JOVENES': { label: 'Jóvenes', minAge: 14, maxAge: 99 }
};

const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

const KidsClassMatrix = ({ courseId }) => {
    const [matrix, setMatrix] = useState([]);
    const [courseInfo, setCourseInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        fetchMatrix();
        fetchCourseInfo();
    }, [courseId]);

    const fetchCourseInfo = async () => {
        try {
            const res = await api.get('/kids/modules');
            const course = res.data.find(c => c.id === courseId);
            setCourseInfo(course);
        } catch (error) {
            console.error('Error fetching course info:', error);
        }
    };

    const fetchMatrix = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/kids/modules/${courseId}/matrix`);
            setMatrix(res.data.matrix || res.data);
            if (res.data.module) {
                setCourseInfo(res.data.module);
            }
        } catch (error) {
            console.error('Error fetching matrix:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCellUpdate = async (enrollmentId, classNumber, field, value) => {
        setSaving(true);
        try {
            await api.post('/kids/matrix/update', {
                enrollmentId,
                classNumber,
                [field]: value
            });
            fetchMatrix();
        } catch (error) {
            toast.error('Error updating cell');
        } finally {
            setSaving(false);
        }
    };

    const handleEnroll = async () => {
        if (!selectedStudentId) {
            toast.error('Selecciona un estudiante');
            return;
        }

        if (selectedStudent && courseInfo) {
            const age = calculateAge(selectedStudent.birthDate);
            const categoryConfig = CATEGORY_INFO[courseInfo.category];

            if (age !== null && categoryConfig) {
                if (age < categoryConfig.minAge || age > categoryConfig.maxAge) {
                    toast.error(
                        `Este estudiante tiene ${age} años y no pertenece a la categoría ${categoryConfig.label} (${categoryConfig.minAge}-${categoryConfig.maxAge === 99 ? '∞' : categoryConfig.maxAge} años)`,
                        { duration: 5000 }
                    );
                    return;
                }
            }
        }

        try {
            await api.post('/kids/enroll', {
                userId: selectedStudentId,
                moduleId: courseId
            });
            toast.success('Estudiante inscrito correctamente');
            setShowEnrollModal(false);
            setSelectedStudentId('');
            setSelectedStudent(null);
            fetchMatrix();
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Error al inscribir estudiante';
            toast.error(errorMsg);
        }
    };

    const handleUnenroll = async (enrollmentId) => {
        if (!window.confirm('¿Desinscribir a este estudiante?')) return;
        try {
            await api.delete(`/kids/enrollments/${enrollmentId}`);
            toast.success('Estudiante desinscrito');
            fetchMatrix();
        } catch (error) {
            toast.error('Error unenrolling student');
        }
    };

    const calculateAttendance = (attendances) => {
        if (!attendances || attendances.length === 0) return 0;
        const present = attendances.filter(a => a.status === 'ASISTE').length;
        return Math.round((present / attendances.length) * 100);
    };

    const calculateFinalGrade = (attendances) => {
        if (!attendances || attendances.length === 0) return null;
        const grades = attendances.filter(a => a.grade !== null).map(a => a.grade);
        if (grades.length === 0) return null;
        return (grades.reduce((sum, g) => sum + g, 0) / grades.length).toFixed(1);
    };

    if (loading) {
        return <div className="text-center py-10">Cargando matriz...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Matriz de Clases</h2>
                <Button
                    onClick={() => setShowEnrollModal(true)}
                    variant="primary"
                    icon={UserPlus}
                    className="bg-pink-600 hover:bg-pink-700"
                >
                    Inscribir Estudiante
                </Button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estudiante</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acudiente</th>
                            {Array.from({ length: CLASSES_COUNT }, (_, i) => (
                                <th key={i} className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                    C{i + 1}
                                </th>
                            ))}
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Asist.</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nota F.</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {matrix.map((row) => (
                            <tr key={row.enrollmentId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                    {row.studentName}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                    {row.responsibleName || 'N/A'}
                                </td>
                                {Array.from({ length: CLASSES_COUNT }, (_, i) => {
                                    const attendance = row.classAttendances?.find(a => a.classNumber === i + 1);
                                    return (
                                        <td key={i} className="px-1 py-2 text-center">
                                            <select
                                                value={attendance?.status || 'ASISTE'}
                                                onChange={(e) => handleCellUpdate(row.enrollmentId, i + 1, 'status', e.target.value)}
                                                className={`text-xs px-1 py-1 rounded border-0 cursor-pointer ${attendance?.status === 'ASISTE' ? 'bg-green-100 text-green-800' :
                                                        attendance?.status === 'AUSENCIA_JUSTIFICADA' ? 'bg-yellow-100 text-yellow-800' :
                                                            attendance?.status === 'AUSENCIA_NO_JUSTIFICADA' ? 'bg-red-100 text-red-800' :
                                                                'bg-gray-100 text-gray-800'
                                                    }`}
                                            >
                                                <option value="ASISTE">P</option>
                                                <option value="AUSENCIA_JUSTIFICADA">AJ</option>
                                                <option value="AUSENCIA_NO_JUSTIFICADA">A</option>
                                                <option value="BAJA">B</option>
                                            </select>
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-3 text-center text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${calculateAttendance(row.classAttendances) >= 80 ? 'bg-green-100 text-green-800' :
                                            calculateAttendance(row.classAttendances) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                        }`}>
                                        {calculateAttendance(row.classAttendances)}%
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 dark:text-white">
                                    {calculateFinalGrade(row.classAttendances) || '-'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <Button
                                        onClick={() => handleUnenroll(row.enrollmentId)}
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {matrix.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        No hay estudiantes inscritos en esta clase
                    </div>
                )}
            </div>

            {showEnrollModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Inscribir Estudiante</h3>
                            <Button onClick={() => { setShowEnrollModal(false); setSelectedStudent(null); setSelectedStudentId(''); }} variant="ghost" size="icon">
                                <X size={20} />
                            </Button>
                        </div>

                        {courseInfo && (
                            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    <strong>Categoría:</strong> {CATEGORY_INFO[courseInfo.category]?.label || courseInfo.category}
                                </p>
                                <p className="text-sm text-blue-600 dark:text-blue-300">
                                    <strong>Rango de edad permitido:</strong> {CATEGORY_INFO[courseInfo.category]?.minAge}-{CATEGORY_INFO[courseInfo.category]?.maxAge === 99 ? '∞' : CATEGORY_INFO[courseInfo.category]?.maxAge} años
                                </p>
                            </div>
                        )}

                        {selectedStudent && (
                            <div className="mb-4 p-3 rounded-lg border">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {selectedStudent.fullName}
                                </p>
                                {selectedStudent.birthDate && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Edad: {calculateAge(selectedStudent.birthDate)} años
                                    </p>
                                )}
                                {selectedStudent.birthDate && courseInfo && (() => {
                                    const age = calculateAge(selectedStudent.birthDate);
                                    const categoryConfig = CATEGORY_INFO[courseInfo.category];
                                    if (age !== null && categoryConfig && (age < categoryConfig.minAge || age > categoryConfig.maxAge)) {
                                        return (
                                            <div className="mt-2 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                                                <AlertCircle size={16} />
                                                <span>La edad no corresponde a esta categoría</span>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        )}

                        <div className="space-y-4">
                            <AsyncSearchSelect
                                fetchItems={(term) => {
                                    return api.get(`/kids/eligible-students/${courseId}`, { params: { search: term } })
                                        .then(res => res.data);
                                }}
                                selectedValue={selectedStudentId}
                                onSelect={(user) => {
                                    setSelectedStudentId(user?.id || '');
                                    setSelectedStudent(user || null);
                                }}
                                placeholder="Buscar estudiante elegible..."
                                labelKey="fullName"
                            />
                            <div className="flex justify-end space-x-3">
                                <Button onClick={() => { setShowEnrollModal(false); setSelectedStudent(null); setSelectedStudentId(''); }} variant="secondary">Cancelar</Button>
                                <Button onClick={handleEnroll} className="bg-pink-600 hover:bg-pink-700">Inscribir</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KidsClassMatrix;
