import { useState } from 'react';
import useUserManagement from '../hooks/useUserManagement';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Download, Shield, UserList } from '@phosphor-icons/react';
import { PageHeader, Button } from '../components/ui';
import UserFilters from '../components/UserManagement/UserFilters';
import UserTable from '../components/UserManagement/UserTable';
import UserFormModal from '../components/UserManagement/UserFormModal';
import PasswordResetModal from '../components/UserManagement/PasswordResetModal';
import ErrorModal from '../components/ErrorModal';
import CoordinatorManagement from '../components/UserManagement/CoordinatorManagement';

const UserManagement = () => {
    const [activeTab, setActiveTab] = useState('users');
    const { user: currentUser } = useAuth();
    const {
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
        formData,
        setFormData,
        pastores,
        lideresDoce,
        lideresCelula,
        handleCreateUser,
        handleUpdateUser,
        handleDeleteUser,
        handlePasswordReset,
        passwordResetUser,
        setPasswordResetUser,
        canEdit,
        canCreateUsers,
        isAdmin,
        getAssignableRoles,
        showErrorModal,
        setShowErrorModal,
        errorDetails,
        pagination,
        totalUsers,
        exportToExcel,
        validatePasswordRealTime,
        calculateAge,
        relatedUsersCache,
        fetchRelatedUsers
    } = useUserManagement();

    return (
        <div className="space-y-10 pb-32 animate-in fade-in duration-700">
            <PageHeader
                title={<div className="flex items-center gap-4"><Users className="text-[var(--ln-brand-indigo)]" size={32} weight="bold" />Gestión de Usuarios</div>}
                description="Panel administrativo para el control de perfiles, roles y permisos de la red ministerial."
                action={
                    <div className="flex gap-3">
                        {isAdmin && (
                            <Button
                                onClick={exportToExcel}
                                icon={Download}
                                variant="secondary"
                                className="shadow-lg"
                            >
                                Exportar
                            </Button>
                        )}
                        {canCreateUsers && (
                            <Button
                                onClick={() => setShowCreateForm(true)}
                                icon={UserPlus}
                                size="lg"
                                className="shadow-xl shadow-[var(--ln-brand-indigo)]/10"
                            >
                                Registrar Usuario
                            </Button>
                        )}
                    </div>
                }
            />

            {/* Tabs */}
            <div className="bg-[var(--ln-bg-panel)]/50 backdrop-blur-xl rounded-[24px] border border-[var(--ln-border-standard)] p-2 shadow-lg">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                            activeTab === 'users'
                                ? 'bg-[var(--ln-brand-indigo)] text-white shadow-lg'
                                : 'text-[var(--ln-text-secondary)] hover:bg-white/5'
                        }`}
                    >
                        <UserList size={18} />
                        Usuarios
                    </button>
                    <button
                        onClick={() => setActiveTab('coordinators')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                            activeTab === 'coordinators'
                                ? 'bg-purple-500 text-white shadow-lg'
                                : 'text-[var(--ln-text-secondary)] hover:bg-white/5'
                        }`}
                    >
                        <Shield size={18} />
                        Coordinadores de Módulos
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'users' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                            <span className="text-[13px] weight-510">{error}</span>
                        </div>
                    )}
                    {success && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                            <span className="text-[13px] weight-510">{success}</span>
                        </div>
                    )}

                    <UserFilters
                        nombreFilter={nombreFilter}
                        setNombreFilter={setNombreFilter}
                        liderDoceFilter={liderDoceFilter}
                        setLiderDoceFilter={setLiderDoceFilter}
                        redFilter={redFilter}
                        setRedFilter={setRedFilter}
                        sexoFilter={sexoFilter}
                        setSexoFilter={setSexoFilter}
                        rolFilter={rolFilter}
                        setRolFilter={setRolFilter}
                        asignacionesFilter={asignacionesFilter}
                        setAsignacionesFilter={setAsignacionesFilter}
                        lideresDoce={lideresDoce}
                        totalCount={totalUsers}
                        filteredCount={users.length}
                        currentUser={currentUser}
                    />

                    <div className="bg-[var(--ln-bg-panel)]/50 backdrop-blur-xl rounded-[32px] border border-[var(--ln-border-standard)] overflow-hidden shadow-2xl relative">
                        <div className="px-10 py-8 border-b border-[var(--ln-border-standard)] bg-white/[0.02] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-[var(--ln-brand-indigo)]/10 rounded-xl text-[var(--ln-brand-indigo)]">
                                    <Users size={20} weight="bold" />
                                </div>
                                <div>
                                    <h3 className="text-lg weight-590 text-[var(--ln-text-primary)] tracking-tight">Directorio de Usuarios</h3>
                                    <p className="text-[12px] text-[var(--ln-text-tertiary)] opacity-60">Resultados de búsqueda y jerarquía ministerial.</p>
                                </div>
                            </div>
                            
                            {!loading && users.length > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] text-[11px] weight-700 text-[var(--ln-text-quaternary)] uppercase tracking-widest shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Base de Datos Dinámica
                                </div>
                            )}
                        </div>

                        <UserTable
                            users={users}
                            loading={loading}
                            canEdit={canEdit}
                            pagination={pagination}
                            onEdit={(user) => setEditingUser({
                                ...user,
                                birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '',
                                pastorIds: user.pastorIds || (user.pastorId ? [user.pastorId] : []),
                                pastorSpouseIds: user.pastorSpouseIds || [],
                                liderDoceIds: user.liderDoceIds || (user.liderDoceId ? [user.liderDoceId] : []),
                                liderDoceSpouseIds: user.liderDoceSpouseIds || [],
                                liderCelulaIds: user.liderCelulaIds || (user.liderCelulaId ? [user.liderCelulaId] : []),
                                liderCelulaSpouseIds: user.liderCelulaSpouseIds || [],
                                spouseId: user.spouseId || '',
                                neighborhood: user.neighborhood || '',
                                role: user.roles?.find(r => ['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO', 'INVITADO'].includes(r)) || user.roles?.[0] || 'DISCIPULO',
                                sex: user.sex || '',
                                documentType: user.documentType || ''
                            })}
                            onDelete={handleDeleteUser}
                            onResetPassword={setPasswordResetUser}
                        />
                        
                        {/* Environmental Decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--ln-brand-indigo)] opacity-[0.02] blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>
            )}

            {activeTab === 'coordinators' && (
                <div className="animate-in fade-in duration-300">
                    <CoordinatorManagement />
                </div>
            )}

            {/* Modales Informativos y de Acción */}
            <UserFormModal
                isOpen={showCreateForm}
                onClose={() => setShowCreateForm(false)}
                title="Registrar Nuevo Usuario"
                formData={formData}
                setFormData={setFormData}
                mode="create"
                onSubmit={handleCreateUser}
                submitting={submitting}
                pastores={pastores}
                lideresDoce={lideresDoce}
                lideresCelula={lideresCelula}
                users={users}
                isAdmin={isAdmin}
                validatePasswordRealTime={validatePasswordRealTime}
                calculateAge={calculateAge}
                getAssignableRoles={getAssignableRoles}
                relatedUsersCache={relatedUsersCache}
                fetchRelatedUsers={fetchRelatedUsers}
            />

            {editingUser && (
                <UserFormModal
                    isOpen={!!editingUser}
                    onClose={() => setEditingUser(null)}
                    title={`Editar Perfil: ${editingUser.fullName}`}
                    formData={editingUser}
                    setFormData={setEditingUser}
                    mode="edit"
                    onSubmit={() => handleUpdateUser(editingUser.id)}
                    submitting={submitting}
                    pastores={pastores}
                    lideresDoce={lideresDoce}
                    lideresCelula={lideresCelula}
                    users={users}
                    isAdmin={isAdmin}
                    validatePasswordRealTime={validatePasswordRealTime}
                    calculateAge={calculateAge}
                    getAssignableRoles={getAssignableRoles}
                    relatedUsersCache={relatedUsersCache}
                    fetchRelatedUsers={fetchRelatedUsers}
                />
            )}

            <PasswordResetModal
                isOpen={!!passwordResetUser}
                onClose={() => setPasswordResetUser(null)}
                user={passwordResetUser}
                onConfirm={handlePasswordReset}
                submitting={submitting}
            />

            <ErrorModal
                isOpen={showErrorModal}
                onClose={() => setShowErrorModal(false)}
                title={errorDetails.title}
                message={errorDetails.message}
                type={errorDetails.type}
            />
        </div>
    );
};

export default UserManagement;
