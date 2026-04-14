import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

const useUserManagement = () => {
    const [users, setUsers] = useState([]);
    const [allLeaders, setAllLeaders] = useState({ pastores: [], lideresDoce: [], lideresCelula: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [sexFilter, setSexFilter] = useState('');
    const [liderDoceFilter, setLiderDoceFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [usersPerPage] = useState(50); // Límite para no ADMIN
    const [editingUser, setEditingUser] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [passwordResetUser, setPasswordResetUser] = useState(null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorDetails, setErrorDetails] = useState({ title: '', message: '', type: '' });
    const auth = useAuth();
    const currentUser = auth.user;

    // Use isAdmin from AuthContext but also fall back to property check
    const isUserAdmin = (() => {
        if (typeof auth.isAdmin === 'function' && auth.isAdmin()) return true;
        if (!currentUser) return false;
        const roles = currentUser.roles || [currentUser.role];
        return roles.map(r => String(r).toUpperCase()).includes('ADMIN');
    })();

    const [formData, setFormData] = useState({
        documentType: '',
        documentNumber: '',
        fullName: '',
        birthDate: '',
        email: '',
        password: '',
        role: 'DISCIPULO',
        sex: '',
        phone: '',
        address: '',
        city: '',
        neighborhood: '',
        maritalStatus: '',
        network: '',
        pastorIds: [],
        pastorSpouseIds: [],
        liderDoceIds: [],
        liderDoceSpouseIds: [],
        liderCelulaIds: [],
        liderCelulaSpouseIds: [],
        spouseId: '',
        isCoordinator: false,
        dataPolicyAccepted: false,
        dataTreatmentAuthorized: false,
        minorConsentAuthorized: false
    });

    // Function to categorize and handle errors
    const handleError = (error, operation = 'general') => {
        const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
        
        let title = 'Error';
        let type = 'error';
        let message = errorMessage;

        // Categorize common errors
        if (errorMessage.includes('correo electrónico') || errorMessage.includes('email')) {
            title = 'Error de Correo Electrónico';
            type = 'email';
        } else if (errorMessage.includes('teléfono') || errorMessage.includes('phone')) {
            title = 'Error de Teléfono';
            type = 'phone';
        } else if (errorMessage.includes('documento') || errorMessage.includes('document')) {
            title = 'Error de Documento';
            type = 'document';
        } else if (errorMessage.includes('contraseña') || errorMessage.includes('password')) {
            title = 'Error de Contraseña';
            type = 'password';
        } else if (errorMessage.includes('permiso') || errorMessage.includes('permission') || errorMessage.includes('Unauthorized')) {
            title = 'Error de Permisos';
            type = 'permission';
        } else if (errorMessage.includes('servidor') || errorMessage.includes('server')) {
            title = 'Error del Servidor';
            type = 'server';
        }

        // Set error for banner display (backward compatibility)
        setError(errorMessage);
        
        // Set detailed error for modal display
        setErrorDetails({ title, message, type });
        setShowErrorModal(true);
        
        return { title, message, type };
    };

    // Fetch leaders separately - independent of filters
    const fetchAllLeaders = useCallback(async () => {
        try {
            const response = await api.get('/users?leadersOnly=true');
            const leadersData = response.data.users || response.data || [];
            
            setAllLeaders({
                pastores: leadersData.filter(u => u.roles?.includes('PASTOR')),
                lideresDoce: leadersData.filter(u => u.roles?.includes('LIDER_DOCE')),
                lideresCelula: leadersData.filter(u => u.roles?.includes('LIDER_CELULA'))
            });
        } catch (err) {
            console.error('Error fetching leaders:', err);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);

            // Para ADMIN, obtener todos los usuarios sin límite
            // Para otros roles, usar paginación
            const isAdminUser = currentUser?.roles?.includes('ADMIN') ||
                               currentUser?.role === 'ADMIN' ||
                               auth.isAdmin?.();

            const params = new URLSearchParams();
            params.append('page', currentPage);

            if (!isAdminUser) {
                params.append('limit', usersPerPage);
            }

            // Enviar filtros al backend
            if (roleFilter) params.append('role', roleFilter);
            if (searchTerm) params.append('search', searchTerm);
            if (sexFilter) params.append('sexFilter', sexFilter);
            if (liderDoceFilter) params.append('liderDoceFilter', liderDoceFilter);

            const response = await api.get(`/users?${params.toString()}`);

            // El backend ahora devuelve { users: [...], pagination: {...} }
            const { users: usersData, pagination } = response.data;

            setUsers(usersData || []);
            setTotalUsers(pagination?.total || 0);
        } catch (err) {
            setError('Error al cargar usuarios');
            setUsers([]);
            setTotalUsers(0);
        } finally {
            setLoading(false);
        }
    }, [currentPage, roleFilter, searchTerm, sexFilter, liderDoceFilter, usersPerPage, currentUser, auth]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Fetch leaders once on mount
    useEffect(() => {
        fetchAllLeaders();
    }, [fetchAllLeaders]);

    const handleCreateUser = useCallback(async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const payload = { ...formData };

            // Handle arrays of IDs
            if (payload.pastorIds && payload.pastorIds.length > 0) {
                payload.pastorIds = payload.pastorIds.map(id => parseInt(id)).filter(id => !isNaN(id));
            } else delete payload.pastorIds;

            if (payload.pastorSpouseIds && payload.pastorSpouseIds.length > 0) {
                payload.pastorSpouseIds = payload.pastorSpouseIds.map(id => parseInt(id)).filter(id => !isNaN(id));
            } else delete payload.pastorSpouseIds;

            if (payload.liderDoceIds && payload.liderDoceIds.length > 0) {
                payload.liderDoceIds = payload.liderDoceIds.map(id => parseInt(id)).filter(id => !isNaN(id));
            } else delete payload.liderDoceIds;

            if (payload.liderDoceSpouseIds && payload.liderDoceSpouseIds.length > 0) {
                payload.liderDoceSpouseIds = payload.liderDoceSpouseIds.map(id => parseInt(id)).filter(id => !isNaN(id));
            } else delete payload.liderDoceSpouseIds;

            if (payload.liderCelulaIds && payload.liderCelulaIds.length > 0) {
                payload.liderCelulaIds = payload.liderCelulaIds.map(id => parseInt(id)).filter(id => !isNaN(id));
            } else delete payload.liderCelulaIds;

            if (payload.liderCelulaSpouseIds && payload.liderCelulaSpouseIds.length > 0) {
                payload.liderCelulaSpouseIds = payload.liderCelulaSpouseIds.map(id => parseInt(id)).filter(id => !isNaN(id));
            } else delete payload.liderCelulaSpouseIds;

            if (payload.spouseId) payload.spouseId = parseInt(payload.spouseId);
            else delete payload.spouseId;

            if (payload.isCoordinator !== undefined) payload.isCoordinator = !!payload.isCoordinator;

            Object.keys(payload).forEach(key => payload[key] === '' && delete payload[key]);

            await api.post('/users', payload);
            setSuccess('Usuario creado exitosamente');
            setShowCreateForm(false);
            setFormData({
                documentType: '', documentNumber: '', fullName: '', birthDate: '',
                email: '', password: '', role: 'DISCIPULO',
                sex: '', phone: '', address: '', city: '', neighborhood: '',
                maritalStatus: '', network: '',
                pastorIds: [], pastorSpouseIds: [],
                liderDoceIds: [], liderDoceSpouseIds: [],
                liderCelulaIds: [], liderCelulaSpouseIds: [],
                spouseId: '',
                dataPolicyAccepted: false, dataTreatmentAuthorized: false, minorConsentAuthorized: false
            });
            fetchUsers();
        } catch (err) {
            handleError(err, 'create');
        } finally {
            setSubmitting(false);
        }
    }, [fetchUsers, formData]);

    const handleUpdateUser = useCallback(async (userId) => {
        if (!editingUser) return;
        setSubmitting(true);
        setError('');
        try {
            const payload = {
                fullName: editingUser.fullName,
                email: editingUser.email,
                role: editingUser.role,
                sex: editingUser.sex,
                phone: editingUser.phone,
                address: editingUser.address,
                city: editingUser.city,
                neighborhood: editingUser.neighborhood || null,
                maritalStatus: editingUser.maritalStatus || null,
                network: editingUser.network || null,
                pastorIds: (editingUser.pastorIds || []).map(id => parseInt(id)).filter(id => !isNaN(id)),
                pastorSpouseIds: (editingUser.pastorSpouseIds || []).map(id => parseInt(id)).filter(id => !isNaN(id)),
                liderDoceIds: (editingUser.liderDoceIds || []).map(id => parseInt(id)).filter(id => !isNaN(id)),
                liderDoceSpouseIds: (editingUser.liderDoceSpouseIds || []).map(id => parseInt(id)).filter(id => !isNaN(id)),
                liderCelulaIds: (editingUser.liderCelulaIds || []).map(id => parseInt(id)).filter(id => !isNaN(id)),
                liderCelulaSpouseIds: (editingUser.liderCelulaSpouseIds || []).map(id => parseInt(id)).filter(id => !isNaN(id)),
                spouseId: editingUser.spouseId ? parseInt(editingUser.spouseId) : null,
                isCoordinator: editingUser.isCoordinator || false,
                birthDate: editingUser.birthDate,
                dataPolicyAccepted: editingUser.dataPolicyAccepted,
                dataTreatmentAuthorized: editingUser.dataTreatmentAuthorized,
                minorConsentAuthorized: editingUser.minorConsentAuthorized
            };
            await api.put(`/users/${userId}`, payload);
            setSuccess('Usuario actualizado');
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            handleError(err, 'update');
        } finally {
            setSubmitting(false);
        }
    }, [editingUser, fetchUsers]);

    const handleDeleteUser = useCallback(async (userId, confirmCallback) => {
        // If confirmCallback is provided, call it to trigger confirmation
        if (confirmCallback) {
            confirmCallback(userId);
            return;
        }

        // Fallback to window.confirm if no confirmCallback provided (backward compatibility)
        if (!window.confirm('¿Eliminar este usuario?')) return;

        try {
            await api.delete(`/users/${userId}`);
            setSuccess('Usuario eliminado');
            fetchUsers();
        } catch (err) {
            handleError(err, 'delete');
        }
    }, [fetchUsers]);

    const resetPassword = async (user, tempPassword) => {
        setError('');
        setSuccess('');
        
        try {
            const response = await api.post(`/auth/force-password-change/${user.id}`, { newTempPassword: tempPassword });
            
            setSuccess(`Contraseña de ${user.fullName} reseteada exitosamente. Contraseña temporal: ${tempPassword}`);
            setPasswordResetUser(null);
            fetchUsers();
        } catch (err) {
            handleError(err, 'password_reset');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePasswordReset = resetPassword;

    // Use allLeaders state (fetched separately) instead of filtering from users
    // This ensures leaders are always available regardless of current filters
    const pastores = allLeaders.pastores;
    const lideresDoce = allLeaders.lideresDoce;
    const lideresCelula = allLeaders.lideresCelula;

    // Ya no necesitamos filtrar localmente ya que el backend maneja los filtros
    const filteredUsers = users;

    const canEdit = (() => {
        if (!currentUser) return false;
        // Check both roles array and single role property for backward compatibility
        const roles = currentUser.roles || [currentUser.role];
        return roles.some(r => ['ADMIN', 'PASTOR', 'LIDER_DOCE'].includes(r));
    })();

    const canCreateUsers = (() => {
        if (!currentUser) return false;
        // Check both roles array and single role property for backward compatibility
        const roles = currentUser.roles || [currentUser.role];
        return roles.some(r => ['ADMIN', 'LIDER_DOCE'].includes(r));
    })();

    // isAdmin is now taken from useAuth()

    const getAssignableRoles = useCallback(() => {
        if (!currentUser || !currentUser.roles) return [];
        if (currentUser.roles.includes('ADMIN')) return ['DISCIPULO', 'LIDER_CELULA', 'LIDER_DOCE', 'PASTOR', 'ADMIN'];
        if (currentUser.roles.includes('PASTOR')) return ['DISCIPULO', 'LIDER_CELULA', 'LIDER_DOCE', 'PASTOR'];
        return ['DISCIPULO', 'LIDER_CELULA'];
    }, [currentUser]);

    // Funciones de paginación
    const handlePageChange = useCallback((newPage) => {
        setCurrentPage(newPage);
    }, []);

    const handleNextPage = useCallback(() => {
        setCurrentPage(prev => prev + 1);
    }, []);

    const handlePrevPage = useCallback(() => {
        setCurrentPage(prev => Math.max(1, prev - 1));
    }, []);

    // Calcular información de paginación
    const totalPages = Math.ceil(totalUsers / usersPerPage) || 1;
    const paginationInfo = {
        page: currentPage,
        pages: totalPages,
        total: totalUsers,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
        onNext: handleNextPage,
        onPrev: handlePrevPage
    };

    // Resetear página cuando cambian los filtros
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, roleFilter, sexFilter, liderDoceFilter]);

    // Helper para calcular edad (usado en exportToExcel)
    const calculateAge = (birthDate) => {
        if (!birthDate) return null;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    // Función para exportar usuarios a Excel
    const exportToExcel = useCallback(async () => {
        if (!isUserAdmin) {
            setError('No tienes permisos para exportar datos');
            return;
        }

        try {
            // Obtener todos los usuarios (sin paginación para ADMIN)
            const params = new URLSearchParams();
            params.append('export', 'true');
            if (roleFilter) params.append('role', roleFilter);
            if (searchTerm) params.append('search', searchTerm);
            if (sexFilter) params.append('sexFilter', sexFilter);
            if (liderDoceFilter) params.append('liderDoceFilter', liderDoceFilter);

            const response = await api.get(`/users?${params.toString()}`);
            const usersData = response.data.users || response.data || [];

            // Preparar datos para Excel
            const excelData = usersData.map(user => {
                const age = calculateAge(user.birthDate);
                const primaryRole = user.roles?.find(r => ['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO', 'INVITADO'].includes(r)) || 'SIN_ROL';

                return {
                    'ID': user.id,
                    'Documento': user.documentNumber || '',
                    'Nombre Completo': user.fullName,
                    'Email': user.email,
                    'Teléfono': user.phone || '',
                    'Sexo': user.sex === 'HOMBRE' ? 'Hombre' : user.sex === 'MUJER' ? 'Mujer' : '',
                    'Fecha de Nacimiento': user.birthDate ? new Date(user.birthDate).toLocaleDateString('es-ES') : '',
                    'Edad': age || '',
                    'Ciudad': user.city || '',
                    'Dirección': user.address || '',
                    'Barrio': user.neighborhood || '',
                    'Estado Civil': user.maritalStatus ? user.maritalStatus.replace(/_/g, ' ') : '',
                    'Rol Principal': primaryRole.replace(/_/g, ' '),
                    'Roles Secundarios': (user.secondaryRoles || []).map(r => r.replace(/_/g, ' ')).join(', ') || '',
                    'Es Coordinador': user.isCoordinator ? 'Sí' : 'No',
                    'Política de Datos': user.dataPolicyAccepted ? 'Sí' : 'No',
                    'Tratamiento de Datos': user.dataTreatmentAuthorized ? 'Sí' : 'No',
                    'Consentimiento Menor': user.minorConsentAuthorized ? 'Sí' : user.sex === 'MENOR' ? 'No' : 'N/A',
                    'Fecha Registro': user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES') : ''
                };
            });

            // Crear hoja de trabajo
            const worksheet = XLSX.utils.json_to_sheet(excelData);

            // Ajustar ancho de columnas
            const colWidths = [
                { wch: 10 }, // ID
                { wch: 15 }, // Documento
                { wch: 30 }, // Nombre Completo
                { wch: 25 }, // Email
                { wch: 15 }, // Teléfono
                { wch: 10 }, // Sexo
                { wch: 15 }, // Fecha Nacimiento
                { wch: 8 },  // Edad
                { wch: 20 }, // Ciudad
                { wch: 30 }, // Dirección
                { wch: 20 }, // Barrio
                { wch: 15 }, // Estado Civil
                { wch: 15 }, // Rol Principal
                { wch: 25 }, // Roles Secundarios
                { wch: 12 }, // Es Coordinador
                { wch: 12 }, // Política de Datos
                { wch: 15 }, // Tratamiento de Datos
                { wch: 15 }, // Consentimiento Menor
                { wch: 15 }  // Fecha Registro
            ];
            worksheet['!cols'] = colWidths;

            // Estilar encabezados
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const addr = XLSX.utils.encode_col(C) + "1";
                if (!worksheet[addr]) continue;
                worksheet[addr].s = {
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "2563EB" } },
                    alignment: { horizontal: "center", vertical: "center" }
                };
            }

            // Crear libro de trabajo
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");

            // Generar nombre de archivo con fecha
            const date = new Date().toISOString().split('T')[0];
            const filename = `Usuarios_Iglesia_${date}.xlsx`;

            // Descargar archivo
            XLSX.writeFile(workbook, filename);

            setSuccess(`Exportados ${usersData.length} usuarios exitosamente`);
        } catch (err) {
            handleError(err, 'export');
        }
    }, [isUserAdmin, roleFilter, searchTerm, sexFilter, liderDoceFilter, handleError]);

    return {
        users,
        loading,
        error,
        success,
        searchTerm,
        setSearchTerm,
        roleFilter,
        setRoleFilter,
        sexFilter,
        setSexFilter,
        liderDoceFilter,
        setLiderDoceFilter,
        editingUser,
        setEditingUser,
        showCreateForm,
        setShowCreateForm,
        submitting,
        currentUser,
        formData,
        setFormData,
        pastores,
        lideresDoce,
        lideresCelula,
        filteredUsers,
        fetchUsers,
        handleCreateUser,
        handleUpdateUser,
        handleDeleteUser,
        handlePasswordReset,
        passwordResetUser,
        setPasswordResetUser,
        getAssignableRoles,
        canEdit,
        canCreateUsers,
        isAdmin: isUserAdmin,
        showErrorModal,
        setShowErrorModal,
        errorDetails,
        handleError,
        // Paginación
        currentPage,
        setCurrentPage: handlePageChange,
        totalUsers,
        usersPerPage,
        totalPages,
        pagination: paginationInfo,
        exportToExcel
    };
};

export default useUserManagement;
