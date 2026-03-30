import React, { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FloppyDisk, UserPlus, Trash, X, Warning, Pen, WarningCircle, Camera, Upload } from '@phosphor-icons/react';
import { AsyncSearchSelect, Button, Input } from '../ui';
import ConfirmationModal from '../ConfirmationModal';
import { useAuth } from '../../context/AuthContext';
import { ROLE_GROUPS } from '../../constants/roles';

const CATEGORY_INFO = {
    'KIDS': { label: 'Kids', minAge: 5, maxAge: 7 },
    'TEENS': { label: 'Teens', minAge: 8, maxAge: 10 },
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
    const { hasAnyRole } = useAuth();
    const [matrix, setMatrix] = useState([]);
    const [courseInfo, setCourseInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedGuardianId, setSelectedGuardianId] = useState('');
    const [selectedGuardian, setSelectedGuardian] = useState(null);

    // Unenrollment Confirmation Modal State
    const [showUnenrollConfirm, setShowUnenrollConfirm] = useState(false);
    const [enrollmentToUnenroll, setEnrollmentToUnenroll] = useState(null);

    // Photo Modal State
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
    const [photoUrl, setPhotoUrl] = useState('');
    const [photoDescription, setPhotoDescription] = useState('');
    const [uploading, setUploading] = useState(false);

    // Check permissions based on module assignment (local roles)
    const currentUserId = useMemo(() => JSON.parse(localStorage.getItem('user'))?.id, []);
    
    const isModuleProfessor = useMemo(() => {
        if (!courseInfo) return false;
        return courseInfo.professors?.some(p => p.id === currentUserId) || false;
    }, [courseInfo, currentUserId]);

    const isModuleAuxiliary = useMemo(() => {
        if (!courseInfo) return false;
        return courseInfo.auxiliaries?.some(a => a.id === currentUserId) || false;
    }, [courseInfo, currentUserId]);

    const canUploadEvidence = useMemo(() => 
        isModuleProfessor, // Solo profesores del módulo pueden subir evidencias
        [isModuleProfessor]
    );

    const canEditAttendance = useMemo(() => 
        isModuleProfessor || isModuleAuxiliary, // Profesores y auxiliares del módulo pueden editar asistencia
        [isModuleProfessor, isModuleAuxiliary]
    );

    const canEnrollStudents = useMemo(() => 
        isModuleProfessor || isModuleAuxiliary, // Profesores y auxiliares del módulo pueden inscribir estudiantes
        [isModuleProfessor, isModuleAuxiliary]
    );

    const canDeleteStudents = useMemo(() => 
        isModuleProfessor, // Solo profesores del módulo pueden eliminar estudiantes
        [isModuleProfessor]
    );

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
            // Error fetching course info
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
            // Error fetching matrix
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
                moduleId: courseId,
                guardianId: selectedGuardianId || null
            });
            toast.success('Estudiante inscrito correctamente');
            setShowEnrollModal(false);
            setSelectedStudentId('');
            setSelectedStudent(null);
            setSelectedGuardianId('');
            setSelectedGuardian(null);
            fetchMatrix();
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Error al inscribir estudiante';
            toast.error(errorMsg);
        }
    };

    const handleUnenroll = async (enrollmentId) => {
        // Find the enrollment to show details in the confirmation modal
        const enrollment = matrix.find(m => m.enrollmentId === enrollmentId);
        setEnrollmentToUnenroll(enrollment);
        setShowUnenrollConfirm(true);
    };

    const performUnenroll = async () => {
        if (!enrollmentToUnenroll) return;

        try {
            await api.delete(`/kids/enrollments/${enrollmentToUnenroll.enrollmentId}`);
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

    // Photo Modal Functions
    const openPhotoModal = (classInfo) => {
        setSelectedClass(classInfo);
        setShowPhotoModal(true);
    };

    const closePhotoModal = () => {
        setShowPhotoModal(false);
        setSelectedClass(null);
        setPhotoUrl('');
        setPhotoDescription('');
    };

    const handlePhotoUpload = async () => {
        if (!photoUrl.trim()) {
            toast.error('Por favor ingresa la URL de la imagen');
            return;
        }

        try {
            setUploading(true);
            const photoData = {
                url: photoUrl.trim(),
                description: `Clase ${selectedClass.classNumber}: ${photoDescription.trim()}`,
                uploadedBy: JSON.parse(localStorage.getItem('user')).id,
                uploadDate: new Date().toISOString()
            };

            await api.post('/kids-class-photos', photoData);
            
            toast.success('Evidencia de clase guardada exitosamente');
            closePhotoModal();
        } catch (error) {
            // Error uploading photo
            toast.error('Error al guardar la evidencia de clase');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return <div className="text-center py-10">Cargando matriz...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Matriz de Clases</h2>
                {canEnrollStudents && (
                    <Button
                        onClick={() => setShowEnrollModal(true)}
                        variant="primary"
                        icon={UserPlus}
                        className="bg-pink-600 hover:bg-pink-700"
                    >
                        Inscribir Estudiante
                    </Button>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estudiante</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acudiente</th>
                            {courseInfo?.classCount ? Array.from({ length: courseInfo.classCount }, (_, i) => (
                                <th key={i} className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                    <div className="space-y-1">
                                        <div>C{i + 1}</div>
                                        {canUploadEvidence && (
                                            <Button
                                                onClick={() => openPhotoModal({ classNumber: i + 1 })}
                                                variant="secondary"
                                                size="xs"
                                                className="inline-flex items-center gap-1 text-xs"
                                            >
                                                <Camera size={12} />
                                                Evidencia
                                            </Button>
                                        )}
                                    </div>
                                </th>
                            )) : (
                                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                    Sin clases definidas
                                </th>
                            )}
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Asist.</th>
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
                                {courseInfo?.classCount ? Array.from({ length: courseInfo.classCount }, (_, i) => {
                                    const attendance = row.classAttendances?.find(a => a.classNumber === i + 1);
                                    return (
                                        <td key={i} className="px-1 py-2 text-center">
                                            {canEditAttendance ? (
                                                <select
                                                    value={attendance?.status || 'SIN_CLASE'}
                                                    onChange={(e) => handleCellUpdate(row.enrollmentId, i + 1, 'status', e.target.value)}
                                                    className={`text-xs px-1 py-1 rounded border-0 cursor-pointer ${attendance?.status === 'ASISTE' ? 'bg-green-100 text-green-800' :
                                                            attendance?.status === 'AUSENCIA_JUSTIFICADA' ? 'bg-yellow-100 text-yellow-800' :
                                                                attendance?.status === 'AUSENCIA_NO_JUSTIFICADA' ? 'bg-red-100 text-red-800' :
                                                                    attendance?.status === 'SIN_CLASE' ? 'bg-gray-200 text-gray-600' :
                                                                        'bg-gray-100 text-gray-800'
                                                        }`}
                                                >
                                                    <option value="SIN_CLASE">-</option>
                                                    <option value="ASISTE">A</option>
                                                    <option value="AUSENCIA_JUSTIFICADA">AJ</option>
                                                    <option value="AUSENCIA_NO_JUSTIFICADA">ANJ</option>
                                                    <option value="BAJA">BJ</option>
                                                </select>
                                            ) : (
                                                <div className={`text-xs px-1 py-1 rounded border-0 ${attendance?.status === 'ASISTE' ? 'bg-green-100 text-green-800' :
                                                        attendance?.status === 'AUSENCIA_JUSTIFICADA' ? 'bg-yellow-100 text-yellow-800' :
                                                            attendance?.status === 'AUSENCIA_NO_JUSTIFICADA' ? 'bg-red-100 text-red-800' :
                                                                attendance?.status === 'SIN_CLASE' ? 'bg-gray-200 text-gray-600' :
                                                                    'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {attendance?.status === 'ASISTE' ? 'A' :
                                                        attendance?.status === 'AUSENCIA_JUSTIFICADA' ? 'AJ' :
                                                            attendance?.status === 'AUSENCIA_NO_JUSTIFICADA' ? 'ANJ' :
                                                                attendance?.status === 'BAJA' ? 'BJ' : '-'}
                                                </div>
                                            )}
                                        </td>
                                    );
                                }) : (
                                    <td className="px-1 py-2 text-center text-xs text-gray-500" colSpan="1">
                                        Sin clases
                                    </td>
                                )}
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
                                    {canDeleteStudents && (
                                        <Button
                                            onClick={() => handleUnenroll(row.enrollmentId)}
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash size={16} />
                                        </Button>
                                    )}
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

                        <div className="space-y-4">
                            {!selectedStudent && (
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
                                                    <WarningCircle size={16} />
                                                    <span>La edad no corresponde a esta categoría</span>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            )}
                            
                            <AsyncSearchSelect
                                fetchItems={(term) => {
                                    return api.get('/users/search', {
                                        params: {
                                            search: term,
                                            excludeRoles: 'PASTOR,ADMIN'
                                        }
                                    }).then(res => res.data);
                                }}
                                selectedValue={selectedGuardianId}
                                onSelect={(user) => {
                                    setSelectedGuardianId(user?.id || '');
                                    setSelectedGuardian(user || null);
                                }}
                                placeholder="Buscar acudiente (opcional)..."
                                labelKey="fullName"
                            />
                            
                            {selectedGuardian && (
                                <div className="mb-4 p-3 rounded-lg border bg-green-50 dark:bg-green-900/20">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        Acudiente seleccionado: {selectedGuardian.fullName}
                                    </p>
                                </div>
                            )}
                            
                            <div className="flex justify-end space-x-3">
                                <Button onClick={() => { 
                                    setShowEnrollModal(false); 
                                    setSelectedStudent(null); 
                                    setSelectedStudentId(''); 
                                    setSelectedGuardian(null); 
                                    setSelectedGuardianId(''); 
                                }} variant="secondary">Cancelar</Button>
                                <Button onClick={handleEnroll} className="bg-pink-600 hover:bg-pink-700">Inscribir</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Unenrollment Confirmation Modal */}
            <ConfirmationModal
                isOpen={showUnenrollConfirm}
                onClose={() => {
                    setShowUnenrollConfirm(false);
                    setEnrollmentToUnenroll(null);
                }}
                onConfirm={performUnenroll}
                title="Desinscribir Estudiante"
                message="¿Estás seguro de desinscribir a este estudiante?"
                confirmText="Desinscribir"
                confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
            >
                {enrollmentToUnenroll && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Estudiante:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{enrollmentToUnenroll.studentName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Acudiente:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{enrollmentToUnenroll.responsibleName || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Asistencia:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{calculateAttendance(enrollmentToUnenroll.classAttendances)}%</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                        <div className="text-red-600 dark:text-red-400 mt-0.5">
                            <WarningCircle size={20} />
                        </div>
                        <div>
                            <h4 className="text-red-800 dark:text-red-200 font-semibold mb-1">
                                ⚠️ Acción Irreversible
                            </h4>
                            <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
                                <li>• Se eliminará la inscripción del estudiante</li>
                                <li>• Se perderán todos los registros de asistencia</li>
                                <li>• Se perderán todas las calificaciones</li>
                                <li>• No se puede deshacer esta acción</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </ConfirmationModal>

            {/* Photo Modal */}
            {showPhotoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                Subir Evidencia de Clase
                            </h3>
                            <Button onClick={closePhotoModal} variant="ghost" size="icon">
                                <X size={20} />
                            </Button>
                        </div>

                        {selectedClass && (
                            <div className="mb-4 p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Clase:</span> {selectedClass.classNumber}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Módulo:</span> {courseInfo?.name || 'Kids'}
                                </p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    URL de la Imagen (Google Drive)
                                </label>
                                <Input
                                    type="url"
                                    placeholder="https://drive.google.com/..."
                                    value={photoUrl}
                                    onChange={(e) => setPhotoUrl(e.target.value)}
                                    className="w-full"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Pega el enlace público de la imagen en Google Drive
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Descripción de la Evidencia
                                </label>
                                <textarea
                                    placeholder="Describe la actividad, fecha, tema de la clase..."
                                    value={photoDescription}
                                    onChange={(e) => setPhotoDescription(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-gray-100"
                                    rows="3"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={handlePhotoUpload}
                                    disabled={uploading || !photoUrl.trim()}
                                    className="flex-1"
                                >
                                    {uploading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={16} className="mr-2" />
                                            Guardar Evidencia
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={closePhotoModal}
                                    variant="secondary"
                                    disabled={uploading}
                                    className="flex-1"
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KidsClassMatrix;
