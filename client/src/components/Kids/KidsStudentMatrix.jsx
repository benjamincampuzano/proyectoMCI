import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { MagnifyingGlass, Camera, X, Upload, Link, Download } from '@phosphor-icons/react';
import { Button, Input, AsyncSearchSelect } from '../ui';
import Pagination from '../ui/Pagination';
import Modal from '../ui/Modal';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const KIDS_LEVELS = [
    { nivel: 'KIDS1', seccion: '1A', name: 'Kids 1 (5-7 años)', moduleNumber: 101, minAge: 5, maxAge: 7 },
    { nivel: 'KIDS2', seccion: '1A', name: 'Kids 2 (8-10 años)', moduleNumber: 201, minAge: 8, maxAge: 10 },
    { nivel: 'TEENS', seccion: '1A', name: 'Teens (11-13 años)', moduleNumber: 301, minAge: 11, maxAge: 13 },
    { nivel: 'JOVENES', seccion: '1A', name: 'Jóvenes (14 años en adelante)', moduleNumber: 501, minAge: 14, maxAge: 99 },
];
const CATEGORY_INFO = {
    'KIDS1': { label: 'Kids 1 (5-7 años)', minAge: 5, maxAge: 7 },
    'KIDS2': { label: 'Kids 2 (8-10 años)', minAge: 8, maxAge: 10 },
    'TEENS': { label: 'Teens (11-13 años)', minAge: 11, maxAge: 13 },
    'JOVENES': { label: 'Jóvenes (14 años en adelante)', minAge: 14, maxAge: 99 }
};

const KidsStudentMatrix = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [photoUrl, setPhotoUrl] = useState('');
    const [photoDescription, setPhotoDescription] = useState('');
    const [uploading, setUploading] = useState(false);

    // Pagination
    const PAGE_SIZE = 10;
    const [currentPage, setCurrentPage] = useState(1);
    
    // Edit Student Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [editingStudent, setEditingStudent] = useState(null);
    const [editingResponsible, setEditingResponsible] = useState(null);
    const [editingPhone, setEditingPhone] = useState('');
    const [editingEmail, setEditingEmail] = useState('');
    const [saving, setSaving] = useState(false);

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

    const fetchStudentMatrix = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/kids/student-matrix');
            setStudents(res.data || []);
        } catch (error) {
            console.error('Error fetching student matrix:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void Promise.resolve().then(fetchStudentMatrix);
    }, [fetchStudentMatrix]);

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
            toast.error('Por favor ingresa la URL de la imagen');
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

            toast.success('Evidencia de clase guardada exitosamente');
        } catch (error) {
            console.error('Error uploading photo:', error);
            toast.error('Error al guardar la evidencia de clase');
        } finally {
            setUploading(false);
        }
    };

    const closePhotoModal = () => {
        setShowPhotoModal(false);
        setPhotoUrl('');
        setPhotoDescription('');
    };

    const openEditModal = (student) => {
        setSelectedStudent(student);
        setEditingStudent({
            fullName: student.fullName || ''
        });

        // Buscar el acudiente actual en la API para obtener sus datos completos
        if (student.responsible?.fullName) {
            api.get('/users', { params: { search: student.responsible.fullName } })
                .then(res => {
                    // La API devuelve {users: [...], pagination: {...}}
                    const usersArray = res.data?.users || res.data || [];
                    const responsibleData = usersArray.find(u => u.fullName === student.responsible.fullName);
                    if (responsibleData) {
                        setEditingResponsible({
                            id: responsibleData.id || '',
                            fullName: responsibleData.fullName || responsibleData.name || '',
                            phone: responsibleData.phone || responsibleData.profile?.phone || '',
                            email: responsibleData.email || responsibleData.profile?.email || ''
                        });
                    } else {
                        setEditingResponsible({
                            id: '',
                            fullName: student.responsible.fullName || '',
                            phone: student.responsible.phone || '',
                            email: student.responsible.email || ''
                        });
                    }
                })
                .catch(() => {
                    setEditingResponsible({
                        id: '',
                        fullName: student.responsible.fullName || '',
                        phone: student.responsible.phone || '',
                        email: student.responsible.email || ''
                    });
                });
        } else {
            setEditingResponsible({
                id: '',
                fullName: '',
                phone: '',
                email: ''
            });
        }

        setEditingPhone(student.phone || '');
        setEditingEmail(student.email || '');
        setShowEditModal(true);
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setSelectedStudent(null);
        setEditingStudent(null);
        setEditingResponsible(null);
        setEditingPhone('');
        setEditingEmail('');
    };

    const handleSaveStudent = async () => {
        if (!selectedStudent) return;

        try {
            setSaving(true);
            const updateData = {
                phone: editingPhone.trim(),
                email: editingEmail.trim(),
                responsible: editingResponsible
            };

            await api.put(`/users/${selectedStudent.id}?module=kids`, updateData);

            // Refresh the student matrix
            await fetchStudentMatrix();

            toast.success('Información del estudiante actualizada exitosamente');
            closeEditModal();
        } catch (error) {
            console.error('Error updating student:', error);
            toast.error('Error al actualizar la información del estudiante');
        } finally {
            setSaving(false);
        }
    };

    const downloadExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Matriz Estudiantes Kids');

            // Define columns
            worksheet.columns = [
                { header: 'Nombre', key: 'name', width: 30 },
                { header: 'Edad', key: 'age', width: 8 },
                { header: 'Inscrito en clases', key: 'registered', width: 18 },
                { header: 'Teléfono', key: 'phone', width: 15 },
                { header: 'Correo', key: 'email', width: 25 },
                { header: 'Fecha de Nacimiento', key: 'birthDate', width: 20 },
                { header: 'Acudiente', key: 'responsible', width: 25 },
                { header: 'Líder', key: 'leader', width: 30 },
                { header: 'En Célula', key: 'inCell', width: 10 },
                { header: 'Nombre Célula', key: 'cellName', width: 25 },
                { header: 'Última Asistencia Célula', key: 'lastAttendance', width: 30 },
                { header: 'Asistencia General', key: 'attendanceRate', width: 15 }
            ];

            // Add rows
            filteredStudents.forEach(student => {
                const birthDate = student.profile?.birthDate;
                const age = calculateAge(birthDate);
                const formattedDate = formatDate(birthDate);
                const registered = student.enrollments && student.enrollments.length > 0;

                worksheet.addRow({
                    name: student.fullName,
                    age: age || '-',
                    registered: registered ? 'SÍ' : 'NO',
                    phone: student.phone || '-',
                    email: student.email || '-',
                    birthDate: formattedDate,
                    responsible: student.responsible?.fullName || '-',
                    leader: student.leaderDoce ? 
                        `${student.leaderDoce.fullName} (${student.leaderDoce.role === 'LIDER_DOCE' ? 'Líder 12' : 
                            student.leaderDoce.role === 'LIDER_CELULA' ? 'Líder Célula' : 
                            student.leaderDoce.role})` : '-',
                    inCell: student.cell?.hasCell ? 'SÍ' : 'NO',
                    cellName: student.cell?.name || '-',
                    lastAttendance: student.lastCellAttendance ? 
                        `${formatCellAttendanceDate(student.lastCellAttendance.date)} - ${student.lastCellAttendance.status === 'PRESENTE' ? 'Asistió' : 
                            student.lastCellAttendance.status === 'AUSENTE' ? 'No asistió' :
                            student.lastCellAttendance.status === 'JUSTIFICADO' ? 'Justificado' :
                            student.lastCellAttendance.status}` : '-',
                    attendanceRate: getAttendanceRate(student.enrollments)
                });
            });

            // Style headers
            const headerRow = worksheet.getRow(1);
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFDB2777' } // Pink-600
                };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            // Save file
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Matriz_Estudiantes_Kids_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.xlsx`);
            
        } catch (error) {
            console.error('Error downloading Excel:', error);
        }
    };

    const filteredStudents = students.filter(student => {
        const matchesSearch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    // Reset page when search term changes
    const [prevSearchTerm, setPrevSearchTerm] = useState(searchTerm);
    if (prevSearchTerm !== searchTerm) {
        setPrevSearchTerm(searchTerm);
        setCurrentPage(1);
    }

    const pagination = useMemo(() => {
        const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
        return {
            page: currentPage,
            pages: totalPages,
            total: filteredStudents.length,
            hasPrev: currentPage > 1,
            hasNext: currentPage < totalPages,
            onPrev: () => setCurrentPage(prev => Math.max(1, prev - 1)),
            onNext: () => setCurrentPage(prev => Math.min(totalPages, prev + 1)),
        };
    }, [currentPage, filteredStudents.length]);

    const paginatedStudents = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredStudents.slice(start, start + PAGE_SIZE);
    }, [filteredStudents, currentPage]);

    const totalStudents = filteredStudents.length;
    const studentsWithClasses = filteredStudents.filter(student => student.enrollments && student.enrollments.length > 0).length;
    const studentsWithoutClasses = totalStudents - studentsWithClasses;

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

            <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#3a3a3c] dark:bg-[#272729]">
                    <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Total de Estudiantes</div>
                    <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{totalStudents}</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/25">
                    <div className="text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Registrado en Clase</div>
                    <div className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-200">{studentsWithClasses}</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/25">
                    <div className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300">Pendientes por Registro</div>
                    <div className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-200">{studentsWithoutClasses}</div>
                </div>
            </div>

            <div className="bg-white dark:bg-[#272729] rounded-lg shadow p-4 space-y-4">
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

            {/* Paginación (superior) */}
            <Pagination
                currentPage={pagination.page}
                totalPages={pagination.pages}
                totalItems={pagination.total}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                loading={loading}
                itemLabel="estudiantes"
            />

            <div className="bg-white dark:bg-[#272729] rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-[#f5f5f7] dark:bg-[#272729]">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#86868b] dark:text-gray-300 uppercase tracking-wider">
                                    Nombre
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#86868b] dark:text-gray-300 uppercase tracking-wider">
                                    Edad
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#86868b] dark:text-gray-300 uppercase tracking-wider">
                                    Registro
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#86868b] dark:text-gray-300 uppercase tracking-wider">
                                    Teléfono
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#86868b] dark:text-gray-300 uppercase tracking-wider">
                                    Correo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#86868b] dark:text-gray-300 uppercase tracking-wider">
                                    Fecha de Nacimiento
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#86868b] dark:text-gray-300 uppercase tracking-wider">
                                    Acudiente
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#86868b] dark:text-gray-300 uppercase tracking-wider">
                                    Líder
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#86868b] dark:text-gray-300 uppercase tracking-wider">
                                    Célula
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#86868b] dark:text-gray-300 uppercase tracking-wider">
                                    Última Asistencia Célula
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-[#86868b] dark:text-gray-300 uppercase tracking-wider">
                                    Asistencia
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-[#272729] divide-y divide-gray-200 dark:divide-gray-700">
                            {paginatedStudents.map((student) => {
                                const birthDate = student.profile?.birthDate;
                                const age = calculateAge(birthDate);
                                const formattedDate = formatDate(birthDate);
                                const hasEnrollments = student.enrollments && student.enrollments.length > 0;
                                
                                return (
                                    <tr
                                        key={student.id}
                                        className={!hasEnrollments
                                            ? 'bg-amber-50/80 dark:bg-amber-950/25'
                                            : ''
                                        }
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                            <button
                                                onClick={() => openEditModal(student)}
                                                className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer transition-colors"
                                            >
                                                {student.fullName}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#86868b] dark:text-[#98989d]">
                                            {age || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#86868b] dark:text-[#98989d]">
                                            {hasEnrollments ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                                                    Registrado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                                    Sin clases
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#86868b] dark:text-[#98989d]">
                                            {student.phone || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#86868b] dark:text-[#98989d]">
                                            {student.email || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#86868b] dark:text-[#98989d]">
                                            {formattedDate}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#86868b] dark:text-[#98989d]">
                                            {student.responsible?.fullName || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#86868b] dark:text-[#98989d]">
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#86868b] dark:text-[#98989d]">
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#86868b] dark:text-[#98989d]">
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#86868b] dark:text-[#98989d] text-center">
                                            {getAttendanceRate(student.enrollments)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredStudents.length === 0 && (
                    <div className="text-center py-8 text-[#86868b] dark:text-[#98989d]">
                        No se encontraron estudiantes con los filtros seleccionados
                    </div>
                )}
            </div>

            {/* Paginación */}
            <Pagination
                currentPage={pagination.page}
                totalPages={pagination.pages}
                totalItems={pagination.total}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                loading={loading}
                itemLabel="estudiantes"
            />

            {/* Modal para subir evidencias de clase */}
            {showPhotoModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-[#272729] rounded-lg p-6 w-full max-w-md mx-4">
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
                                <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-1">
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
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#3a3a3c] rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-[#272729] dark:text-gray-100"
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

            {/* Modal para editar información del estudiante */}
            <Modal
                isOpen={showEditModal}
                onClose={closeEditModal}
                title="Editar Información del Estudiante"
                size="md"
            >
                <Modal.Content className="space-y-4">
                    {/* Nombre del estudiante (lectura) */}
                    <div>
                        <label className="block text-sm font-medium text-black dark:text-white mb-1">
                            Nombre del Estudiante
                        </label>
                        <Input
                            type="text"
                            value={editingStudent?.fullName || ''}
                            disabled
                            className="w-full opacity-50 cursor-not-allowed !text-black dark:!text-white"
                        />
                    </div>

                    {/* Teléfono del estudiante */}
                    <div>
                        <label className="block text-sm font-medium text-black dark:text-white mb-1">
                            Teléfono del Estudiante
                        </label>
                        <Input
                            type="tel"
                            value={editingPhone}
                            onChange={(e) => setEditingPhone(e.target.value)}
                            placeholder="Ej: +57 300 1234567"
                            className="w-full !text-black dark:!text-white"
                        />
                    </div>

                    {/* Correo del estudiante */}
                    <div>
                        <label className="block text-sm font-medium text-black dark:text-white mb-1">
                            Correo del Estudiante
                        </label>
                        <Input
                            type="email"
                            value={editingEmail}
                            onChange={(e) => setEditingEmail(e.target.value)}
                            placeholder="Ej: estudiante@example.com"
                            className="w-full !text-black dark:!text-white"
                        />
                    </div>

                    {/* Acudiente */}
                    <div className="border-t border-[rgba(255,255,255,0.08)] pt-4 mt-4">
                        <h4 className="font-semibold text-black dark:text-white mb-3">
                            Información del Acudiente
                        </h4>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-black dark:text-white mb-1">
                                    Nombre del Acudiente
                                </label>
                                <AsyncSearchSelect
                                    fetchItems={async (term) => {
                                        try {
                                            const res = await api.get('/users', { params: { search: term } });
                                            // La API devuelve {users: [...], pagination: {...}}
                                            const usersArray = res.data?.users || res.data || [];
                                            return Array.isArray(usersArray) ? usersArray : [];
                                        } catch {
                                            return [];
                                        }
                                    }}
                                    selectedValue={editingResponsible || null}
                                    onSelect={(responsible) => {
                                        if (responsible) {
                                            setEditingResponsible({
                                                id: responsible.id,
                                                fullName: responsible.fullName || responsible.name || '',
                                                phone: responsible.phone || responsible.profile?.phone || '',
                                                email: responsible.email || responsible.profile?.email || ''
                                            });
                                            // Opcional: Actualizar también los campos del estudiante con los datos del acudiente
                                            // setEditingPhone(responsible.phone || responsible.profile?.phone || '');
                                            // setEditingEmail(responsible.email || responsible.profile?.email || '');
                                        } else {
                                            setEditingResponsible({
                                                id: '',
                                                fullName: '',
                                                phone: '',
                                                email: ''
                                            });
                                        }
                                    }}
                                    placeholder="Buscar acudiente..."
                                    labelKey={(item) => item.fullName || item.name || ''}
                                    valueKey="id"
                                    renderItem={(item) => (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--ln-brand-indigo)]/10 flex items-center justify-center text-[var(--ln-brand-indigo)] text-[12px] weight-700 shadow-sm border border-[var(--ln-brand-indigo)]/20">
                                                {(item.fullName || item.name || '?').charAt(0)}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <div className="text-[13.5px] weight-590 text-[var(--ln-text-primary)] truncate">
                                                    {item.fullName || item.name || 'Sin nombre'}
                                                </div>
                                                <div className="text-[11px] weight-510 text-[var(--ln-text-tertiary)] opacity-60 truncate">
                                                    {item.phone || item.profile?.phone || item.email || item.profile?.email || 'Sin contacto'}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    renderSelected={(item) => (
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-[var(--ln-brand-indigo)]/10 flex items-center justify-center text-[var(--ln-brand-indigo)] text-[10px] weight-700">
                                                {item?.fullName?.charAt(0) || item?.name?.charAt(0) || '?'}
                                            </div>
                                            <span className="text-[13.5px] weight-590 text-[var(--ln-text-primary)] truncate block tracking-tight">
                                                {item?.fullName || item?.name || 'Sin acudiente'}
                                            </span>
                                        </div>
                                    )}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-black dark:text-white mb-1">
                                    Teléfono del Acudiente
                                </label>
                                <Input
                                    type="tel"
                                    value={editingResponsible?.phone || ''}
                                    disabled
                                    placeholder="Se llena automáticamente al seleccionar acudiente"
                                    className="w-full opacity-50 cursor-not-allowed !text-black dark:!text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-black dark:text-white mb-1">
                                    Correo del Acudiente
                                </label>
                                <Input
                                    type="email"
                                    value={editingResponsible?.email || ''}
                                    disabled
                                    placeholder="Se llena automáticamente al seleccionar acudiente"
                                    className="w-full opacity-50 cursor-not-allowed !text-black dark:!text-white"
                                />
                            </div>
                        </div>
                    </div>
                </Modal.Content>

                <Modal.Footer className="flex gap-3">
                    <Button
                        onClick={handleSaveStudent}
                        disabled={saving}
                        className="flex-1"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Guardando...
                            </>
                        ) : (
                            'Guardar Cambios'
                        )}
                    </Button>
                    <Button
                        onClick={closeEditModal}
                        variant="secondary"
                        disabled={saving}
                        className="flex-1"
                    >
                        Cancelar
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default KidsStudentMatrix;
