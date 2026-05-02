import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { validatePassword } from '../utils/passwordValidator';

const useUserManagement = () => {
    const [users, setUsers] = useState([]);
    const [allLeaders, setAllLeaders] = useState({ pastores: [], lideresDoce: [], lideresCelula: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [nombreFilter, setNombreFilter] = useState('');
    const [liderDoceFilter, setLiderDoceFilter] = useState('');
    const [redFilter, setRedFilter] = useState('');
    const [sexoFilter, setSexoFilter] = useState('');
    const [rolFilter, setRolFilter] = useState('');
    const [asignacionesFilter, setAsignacionesFilter] = useState('');
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

    // Cache for related users (spouse, pastors, leaders) to avoid "Cargando..." issue
    const [relatedUsersCache, setRelatedUsersCache] = useState({});

    // Function to fetch related users by IDs to avoid "Cargando..." issue
    const fetchRelatedUsers = useCallback(async (userIds) => {
        if (!userIds || userIds.length === 0) return {};
        
        try {
            const ids = userIds.filter(id => id && !relatedUsersCache[id]);
            if (ids.length === 0) return relatedUsersCache;
            
            const response = await api.get('/users/by-ids', { 
                params: { ids: ids.join(',') },
                paramsSerializer: params => {
                    return Object.keys(params)
                        .map(key => `${key}=${encodeURIComponent(params[key])}`)
                        .join('&');
                }
            });
            
            const usersData = response.data.users || response.data || [];
            const newCache = { ...relatedUsersCache };
            usersData.forEach(user => {
                if (user.id) newCache[user.id] = user;
            });
            
            setRelatedUsersCache(newCache);
            return newCache;
        } catch (err) {
            console.error('Error fetching related users:', err);
            return relatedUsersCache;
        }
    }, [relatedUsersCache]);

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
            if (nombreFilter) params.append('search', nombreFilter);
            if (liderDoceFilter) params.append('liderDoceFilter', liderDoceFilter);
            if (redFilter) params.append('network', redFilter);
            if (sexoFilter) params.append('sex', sexoFilter);
            if (rolFilter) params.append('role', rolFilter);
            if (asignacionesFilter) params.append('asignaciones', asignacionesFilter);

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
    }, [currentPage, nombreFilter, liderDoceFilter, redFilter, sexoFilter, rolFilter, asignacionesFilter, usersPerPage, currentUser, auth]);

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
    }, [nombreFilter, liderDoceFilter, redFilter, sexoFilter, rolFilter, asignacionesFilter]);

    const validatePasswordRealTime = useCallback((password, fullName = '') => {
        const result = validatePassword(password, { fullName });
        if (result.isValid) return [];

        const req = result.requirements || {};
        const errors = [];

        if (req.length === false) errors.push('Mínimo 8 caracteres');
        if (req.upper === false) errors.push('Al menos una mayúscula');
        if (req.lower === false) errors.push('Al menos una minúscula');
        if (req.number === false) errors.push('Al menos un número');
        if (req.symbol === false) errors.push('Al menos un símbolo');

        if (errors.length === 0 && result.message) return [result.message];
        return errors;
    }, []);

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
            setLoading(true);
            // Obtener todos los usuarios (sin paginación para ADMIN)
            const params = new URLSearchParams();
            params.append('export', 'true');
            if (nombreFilter) params.append('search', nombreFilter);
            if (liderDoceFilter) params.append('liderDoceFilter', liderDoceFilter);
            if (redFilter) params.append('network', redFilter);
            if (sexoFilter) params.append('sex', sexoFilter);
            if (rolFilter) params.append('role', rolFilter);
            if (asignacionesFilter) params.append('asignaciones', asignacionesFilter);

            const response = await api.get(`/users?${params.toString()}`);
            const usersData = response.data.users || response.data || [];

            // Crear libro de trabajo
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Usuarios');

            // Definir columnas
            worksheet.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Documento', key: 'documentNumber', width: 15 },
                { header: 'Nombre Completo', key: 'fullName', width: 30 },
                { header: 'Email', key: 'email', width: 25 },
                { header: 'Teléfono', key: 'phone', width: 15 },
                { header: 'Sexo', key: 'sex', width: 10 },
                { header: 'Fecha de Nacimiento', key: 'birthDate', width: 15 },
                { header: 'Edad', key: 'age', width: 8 },
                { header: 'Ciudad', key: 'city', width: 20 },
                { header: 'Dirección', key: 'address', width: 30 },
                { header: 'Barrio', key: 'neighborhood', width: 20 },
                { header: 'Estado Civil', key: 'maritalStatus', width: 15 },
                { header: 'Rol Principal', key: 'primaryRole', width: 15 },
                { header: 'Roles Secundarios', key: 'secondaryRoles', width: 25 },
                { header: 'Es Coordinador', key: 'isCoordinator', width: 12 },
                { header: 'Política de Datos', key: 'dataPolicy', width: 12 },
                { header: 'Tratamiento de Datos', key: 'dataTreatment', width: 15 },
                { header: 'Consentimiento Menor', key: 'minorConsent', width: 15 },
                { header: 'Fecha Registro', key: 'createdAt', width: 15 }
            ];

            // Preparar y añadir datos
            usersData.forEach(user => {
                const age = calculateAge(user.birthDate);
                const primaryRole = user.roles?.find(r => ['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO', 'INVITADO'].includes(r)) || 'SIN_ROL';

                worksheet.addRow({
                    id: user.id,
                    documentNumber: user.documentNumber || '',
                    fullName: user.fullName,
                    email: user.email,
                    phone: user.phone || '',
                    sex: user.sex === 'HOMBRE' ? 'Hombre' : user.sex === 'MUJER' ? 'Mujer' : '',
                    birthDate: user.birthDate ? new Date(user.birthDate).toLocaleDateString('es-ES') : '',
                    age: age || '',
                    city: user.city || '',
                    address: user.address || '',
                    neighborhood: user.neighborhood || '',
                    maritalStatus: user.maritalStatus ? user.maritalStatus.replace(/_/g, ' ') : '',
                    primaryRole: primaryRole.replace(/_/g, ' '),
                    secondaryRoles: (user.secondaryRoles || []).map(r => r.replace(/_/g, ' ')).join(', ') || '',
                    isCoordinator: user.isCoordinator ? 'Sí' : 'No',
                    dataPolicy: user.dataPolicyAccepted ? 'Sí' : 'No',
                    dataTreatment: user.dataTreatmentAuthorized ? 'Sí' : 'No',
                    minorConsent: user.minorConsentAuthorized ? 'Sí' : user.sex === 'MENOR' ? 'No' : 'N/A',
                    createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES') : ''
                });
            });

            // Estilar encabezados
            const headerRow = worksheet.getRow(1);
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF2563EB' }
                };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            // Generar nombre de archivo con fecha
            const date = new Date().toISOString().split('T')[0];
            const filename = `Usuarios_Iglesia_${date}.xlsx`;

            // Escribir el buffer y descargar
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, filename);

            setSuccess(`Exportados ${usersData.length} usuarios exitosamente`);
        } catch (err) {
            handleError(err, 'export');
        } finally {
            setLoading(false);
        }
    }, [isUserAdmin, nombreFilter, liderDoceFilter, redFilter, sexoFilter, rolFilter, asignacionesFilter, handleError]);

    return {
        users,
        loading,
        error,
        success,
        nombreFilter,
        setNombreFilter,
        liderDoceFilter,
        setLiderDoceFilter,
        redFilter,
        setRedFilter,
        sexoFilter,
        setSexoFilter,
        rolFilter,
        setRolFilter,
        asignacionesFilter,
        setAsignacionesFilter,
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
        exportToExcel,
        validatePasswordRealTime,
        calculateAge,
        // Related users cache for "Cargando..." fix
        relatedUsersCache,
        fetchRelatedUsers
    };
};

export default useUserManagement;
