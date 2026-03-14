import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

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
        documentType: 'CC',
        documentNumber: '',
        fullName: '',
        birthDate: '',
        email: '',
        password: '',
        role: 'DISCIPULO',
        sex: 'HOMBRE',
        phone: '',
        address: '',
        city: 'Manizales',
        maritalStatus: 'SOLTERO',
        network: '',
        pastorId: '',
        liderDoceId: '',
        liderCelulaId: '',
        dataPolicyAccepted: false,
        dataTreatmentAuthorized: false,
        minorConsentAuthorized: false
    });

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (err) {
            setError('Error al cargar usuarios');
            toast.error('Error al cargar la lista de usuarios');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleCreateUser = useCallback(async (e) => {
        if (e) e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const payload = { ...formData };

            if (payload.pastorId) payload.pastorId = parseInt(payload.pastorId);
            else delete payload.pastorId;

            if (payload.liderDoceId) payload.liderDoceId = parseInt(payload.liderDoceId);
            else delete payload.liderDoceId;

            if (payload.liderCelulaId) payload.liderCelulaId = parseInt(payload.liderCelulaId);
            else delete payload.liderCelulaId;

            // No eliminamos campos vacíos si queremos que sean requeridos y tratados como tales
            // Object.keys(payload).forEach(key => payload[key] === '' && delete payload[key]);

            await api.post('/users', payload);
            setSuccess('Usuario creado exitosamente');
            toast.success('¡Usuario creado correctamente!');
            setShowCreateForm(false);
            setFormData({
                documentType: 'CC', documentNumber: '', fullName: '', birthDate: '',
                email: '', password: '', role: 'DISCIPULO',
                sex: 'HOMBRE', phone: '', address: '', city: 'Manizales',
                maritalStatus: 'SOLTERO', network: '',
                pastorId: '', liderDoceId: '', liderCelulaId: '',
                dataPolicyAccepted: false, dataTreatmentAuthorized: false, minorConsentAuthorized: false
            });
            fetchUsers();
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al crear usuario';
            setError(msg);
            toast.error(msg, { duration: 5000 });
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
                documentType: editingUser.documentType,
                documentNumber: editingUser.documentNumber,
                maritalStatus: editingUser.maritalStatus || null,
                network: editingUser.network || null,
                pastorId: editingUser.pastorId ? parseInt(editingUser.pastorId) : null,
                liderDoceId: editingUser.liderDoceId ? parseInt(editingUser.liderDoceId) : null,
                liderCelulaId: editingUser.liderCelulaId ? parseInt(editingUser.liderCelulaId) : null,
                birthDate: editingUser.birthDate,
                dataPolicyAccepted: editingUser.dataPolicyAccepted,
                dataTreatmentAuthorized: editingUser.dataTreatmentAuthorized,
                minorConsentAuthorized: editingUser.minorConsentAuthorized
            };
            await api.put(`/users/${userId}`, payload);
            setSuccess('Usuario actualizado');
            toast.success('¡Perfil actualizado con éxito!');
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al actualizar';
            setError(msg);
            toast.error(msg, { duration: 5000 });
        } finally {
            setSubmitting(false);
        }
    }, [editingUser, fetchUsers]);

    const handleDeleteUser = useCallback(async (userId, confirmCallback) => {
        if (confirmCallback) {
            confirmCallback(userId);
            return;
        }

        if (!window.confirm('¿Eliminar este usuario?')) return;

        try {
            await api.delete(`/users/${userId}`);
            toast.success('Usuario eliminado permanentemente');
            fetchUsers();
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al eliminar';
            setError(msg);
            toast.error(msg);
        }
    }, [fetchUsers]);

    const pastores = users.filter(u => u.roles?.includes('PASTOR'));
    const lideresDoce = users.filter(u => u.roles?.includes('LIDER_DOCE'));
    const lideresCelula = users.filter(u => u.roles?.includes('LIDER_CELULA'));

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch = u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.email.toLowerCase().includes(searchTerm.toLowerCase());
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
        getAssignableRoles,
        canEdit,
        isAdmin: isUserAdmin,
    };
};

export default useUserManagement;
