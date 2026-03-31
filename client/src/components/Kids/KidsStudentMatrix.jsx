import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { MagnifyingGlass, Camera, X, Upload, Link, Download } from '@phosphor-icons/react';
import { Button, Input, AsyncSearchSelect } from '../ui';
import * as XLSX from 'xlsx';

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
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [photoUrl, setPhotoUrl] = useState('');
    const [photoDescription, setPhotoDescription] = useState('');
    const [uploading, setUploading] = useState(false);

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

    // Función para formatear fecha de asistencia a célula
    const formatCellAttendanceDate = (attendanceDate) => {
        if (!attendanceDate) return 'Sin asistencia';
        
        const date = new Date(attendanceDate);
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

    const handlePhotoUpload = async () => {
        if (!photoUrl.trim()) {
            alert('Por favor ingresa la URL de la imagen');
            return;
        }

        try {
            setUploading(true);
            const photoData = {
                url: photoUrl.trim(),
                description: photoDescription.trim(),
                uploadedBy: user.id,
                uploadDate: new Date().toISOString()
            };

            await api.post('/kids-class-photos', photoData);
            
            // Resetear el modal
            setPhotoUrl('');
            setPhotoDescription('');
            setShowPhotoModal(false);
            
            alert('Evidencia de clase guardada exitosamente');
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert('Error al guardar la evidencia de clase');
        } finally {
            setUploading(false);
        }
    };

    const openPhotoModal = () => {
        setShowPhotoModal(true);
    };

    const closePhotoModal = () => {
        setShowPhotoModal(false);
        setPhotoUrl('');
        setPhotoDescription('');
    };

    const downloadExcel = () => {
        const excelData = filteredStudents.map(student => {
            const birthDate = student.profile?.birthDate;
            const age = calculateAge(birthDate);
            const formattedDate = formatDate(birthDate);
            
            return {
                'Nombre': student.fullName,
                'Edad': age || '-',
                'Teléfono': student.phone || '-',
                'Correo': student.email || '-',
                'Fecha de Nacimiento': formattedDate,
                'Acudiente': student.responsible?.fullName || '-',
                'Líder': student.leaderDoce ? 
                    `${student.leaderDoce.fullName} (${student.leaderDoce.role === 'LIDER_DOCE' ? 'Líder 12' : 
                        student.leaderDoce.role === 'LIDER_CELULA' ? 'Líder Célula' : 
                        student.leaderDoce.role})` : '-',
                'En Célula': student.cell?.hasCell ? 'SÍ' : 'NO',
                'Nombre Célula': student.cell?.name || '-',
                'Última Asistencia Célula': student.lastCellAttendance ? 
                    `${formatCellAttendanceDate(student.lastCellAttendance.date)} - ${student.lastCellAttendance.status === 'PRESENTE' ? 'Asistió' : 
                        student.lastCellAttendance.status === 'AUSENTE' ? 'No asistió' :
                        student.lastCellAttendance.status === 'JUSTIFICADO' ? 'Justificado' :
                        student.lastCellAttendance.status}` : '-',
                'Asistencia General': getAttendanceRate(student.enrollments)
            };
        });

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Matriz Estudiantes Kids");
        XLSX.writeFile(wb, `Matriz_Estudiantes_Kids_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.xlsx`);
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
                <Button
                    onClick={downloadExcel}
                    variant="success"
                    className="inline-flex items-center gap-2"
                >
                    <Download size={20} />
                    Exportar Excel
                </Button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
                
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
                                    Teléfono
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Correo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Fecha de Nacimiento
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Acudiente
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Líder
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Célula
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Última Asistencia Célula
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
                                            {student.phone || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {student.email || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {formattedDate}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {student.responsible?.fullName || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {student.leaderDoce ? (
                                                <div>
                                                    <div>{student.leaderDoce.fullName}</div>
                                                    <div className="text-xs text-gray-400">
                                                        {student.leaderDoce.role === 'LIDER_DOCE' ? 'Líder 12' : 
                                                         student.leaderDoce.role === 'LIDER_CELULA' ? 'Líder Célula' : 
                                                         student.leaderDoce.role}
                                                    </div>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {student.cell?.hasCell ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                    SÍ
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                                    NO
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {student.lastCellAttendance ? (
                                                <div>
                                                    <div>{formatCellAttendanceDate(student.lastCellAttendance.date)}</div>
                                                    <div className="text-xs text-gray-400">
                                                        {student.lastCellAttendance.status === 'PRESENTE' ? 'Asistió' : 
                                                         student.lastCellAttendance.status === 'AUSENTE' ? 'No asistió' :
                                                         student.lastCellAttendance.status === 'JUSTIFICADO' ? 'Justificado' :
                                                         student.lastCellAttendance.status}
                                                    </div>
                                                </div>
                                            ) : '-'}
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

            {/* Modal para subir evidencias de clase */}
            {showPhotoModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Subir Evidencia de Clase
                            </h3>
                            <Button
                                onClick={closePhotoModal}
                                variant="ghost"
                                size="sm"
                                className="p-1"
                            >
                                <X size={20} />
                            </Button>
                        </div>

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

export default KidsStudentMatrix;
