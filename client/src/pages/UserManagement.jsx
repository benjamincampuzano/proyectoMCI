import useUserManagement from '../hooks/useUserManagement';
import { Users, UserPlus } from '@phosphor-icons/react';
import { PageHeader, Button } from '../components/ui';
import UserFilters from '../components/UserManagement/UserFilters';
import UserTable from '../components/UserManagement/UserTable';
import UserFormModal from '../components/UserManagement/UserFormModal';

const UserManagement = () => {
    const {
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
        formData,
        setFormData,
        pastores,
        lideresDoce,
        lideresCelula,
        filteredUsers,
        handleCreateUser,
        handleUpdateUser,
        handleDeleteUser,
        canEdit,
        isAdmin,
    } = useUserManagement();

    // Validate password in real-time
    const validatePasswordRealTime = (password, fullName) => {
        const errors = [];

        if (password.length > 0 && password.length < 8) {
            errors.push('La contraseña debe tener al menos 8 caracteres');
        }

        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSymbols = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (password.length >= 8 && !(hasUpperCase && hasLowerCase && hasNumbers && hasSymbols)) {
            errors.push('Debe incluir mayúsculas, minúsculas, números y símbolos');
        }

        if (fullName && password.length > 0) {
            const names = fullName.toLowerCase().split(' ').filter(n => n.length > 2);
            if (names.some(name => password.toLowerCase().includes(name))) {
                errors.push('La contraseña no debe contener tu nombre');
            }
        }

        return errors;
    };

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

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
            <PageHeader
                title={<div className="flex items-center gap-3"><Users className="text-blue-600" size={32} />Gestión de Usuarios</div>}
                description="Administra perfiles, roles y jerarquía de la iglesia."
                action={
                    canEdit && (
                        <Button
                            onClick={() => setShowCreateForm(true)}
                            icon={UserPlus}
                            className="shadow-lg shadow-blue-500/20"
                        >
                            Nuevo Usuario
                        </Button>
                    )
                }
            />

            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm">{error}</div>}
            {success && <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-sm">{success}</div>}

            <UserFilters
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                roleFilter={roleFilter}
                setRoleFilter={setRoleFilter}
                sexFilter={sexFilter}
                setSexFilter={setSexFilter}
                liderDoceFilter={liderDoceFilter}
                setLiderDoceFilter={setLiderDoceFilter}
                lideresDoce={lideresDoce}
            />

            <UserTable
                users={filteredUsers}
                loading={loading}
                canEdit={canEdit}
                onEdit={(user) => setEditingUser({
                    ...user,
                    birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '',
                    pastorId: user.pastorId || '',
                    liderDoceId: user.liderDoceId || '',
                    liderCelulaId: user.liderCelulaId || '',
                    role: user.roles?.[0] || 'DISCIPULO'
                })}
                onDelete={handleDeleteUser}
            />

            <UserFormModal
                isOpen={showCreateForm}
                onClose={() => setShowCreateForm(false)}
                title="Crear Nuevo Usuario"
                formData={formData}
                setFormData={setFormData}
                mode="create"
                onSubmit={handleCreateUser}
                submitting={submitting}
                pastores={pastores}
                lideresDoce={lideresDoce}
                lideresCelula={lideresCelula}
                isAdmin={isAdmin}
                validatePasswordRealTime={validatePasswordRealTime}
                calculateAge={calculateAge}
            />

            {editingUser && (
                <UserFormModal
                    isOpen={!!editingUser}
                    onClose={() => setEditingUser(null)}
                    title={`Editar: ${editingUser.fullName}`}
                    formData={editingUser}
                    setFormData={setEditingUser}
                    mode="edit"
                    onSubmit={() => handleUpdateUser(editingUser.id)}
                    submitting={submitting}
                    pastores={pastores}
                    lideresDoce={lideresDoce}
                    lideresCelula={lideresCelula}
                    isAdmin={isAdmin}
                    validatePasswordRealTime={validatePasswordRealTime}
                    calculateAge={calculateAge}
                />
            )}
        </div>
    );
};

export default UserManagement;
