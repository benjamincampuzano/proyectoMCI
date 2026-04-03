import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const useUserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [sexFilter, setSexFilter] = useState('');
    const [liderDoceFilter, setLiderDoceFilter] = useState('');
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
        liderDoceIds: [],
        liderCelulaIds: [],
        pastorId: '', // Keep for backward compatibility if needed by components
        liderDoceId: '',
        liderCelulaId: '',
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

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (err) {
            setError('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

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

            if (payload.liderDoceIds && payload.liderDoceIds.length > 0) {
                payload.liderDoceIds = payload.liderDoceIds.map(id => parseInt(id)).filter(id => !isNaN(id));
            } else delete payload.liderDoceIds;

            if (payload.liderCelulaIds && payload.liderCelulaIds.length > 0) {
                payload.liderCelulaIds = payload.liderCelulaIds.map(id => parseInt(id)).filter(id => !isNaN(id));
            } else delete payload.liderCelulaIds;

            // Handle legacy single IDs if they were set instead of arrays
            if (payload.pastorId && (!payload.pastorIds || payload.pastorIds.length === 0)) payload.pastorIds = [parseInt(payload.pastorId)].filter(id => !isNaN(id));
            if (payload.liderDoceId && (!payload.liderDoceIds || payload.liderDoceIds.length === 0)) payload.liderDoceIds = [parseInt(payload.liderDoceId)].filter(id => !isNaN(id));
            if (payload.liderCelulaId && (!payload.liderCelulaIds || payload.liderCelulaIds.length === 0)) payload.liderCelulaIds = [parseInt(payload.liderCelulaId)].filter(id => !isNaN(id));

            delete payload.pastorId;
            delete payload.liderDoceId;
            delete payload.liderCelulaId;

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
                pastorIds: [], liderDoceIds: [], liderCelulaIds: [],
                pastorId: '', liderDoceId: '', liderCelulaId: '',
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
                liderDoceIds: (editingUser.liderDoceIds || []).map(id => parseInt(id)).filter(id => !isNaN(id)),
                liderCelulaIds: (editingUser.liderCelulaIds || []).map(id => parseInt(id)).filter(id => !isNaN(id)),
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
            const response = await api.post(`/auth/reset-password/${user.id}`, { newTempPassword: tempPassword });
            
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

    const pastores = users.filter(u => u.roles?.includes('PASTOR'));
    const lideresDoce = users.filter(u => u.roles?.includes('LIDER_DOCE'));
    const lideresCelula = users.filter(u => u.roles?.includes('LIDER_CELULA'));

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const fullName = u.fullName || '';
            const email = u.email || '';
            const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = roleFilter === '' || u.roles?.includes(roleFilter);
            const matchesSex = sexFilter === '' || u.sex === sexFilter;
            const matchesLiderDoce = liderDoceFilter === '' || u.liderDoceId === parseInt(liderDoceFilter);
            return matchesSearch && matchesRole && matchesSex && matchesLiderDoce;
        });
    }, [liderDoceFilter, roleFilter, searchTerm, sexFilter, users]);

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
    };
};

export default useUserManagement;
