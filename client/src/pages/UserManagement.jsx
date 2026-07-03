import { useState } from 'react';
import useUserManagement from '../hooks/useUserManagement';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Download, Shield, UserList, WhatsappLogo, X } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { getWhatsAppPhone } from '../utils/phone';
import { PageHeader, Button } from '../components/ui';
import UserFilters from '../components/UserManagement/UserFilters';
import UserTable from '../components/UserManagement/UserTable';
import UserFormModal from '../components/UserManagement/UserFormModal';
import PasswordResetModal from '../components/UserManagement/PasswordResetModal';
import ErrorModal from '../components/ErrorModal';
import CoordinatorManagement from '../components/UserManagement/CoordinatorManagement';

const VALID_ROLES = ['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO', 'INVITADO'];

const ALERT_STYLES = {
    error: {
        container: 'bg-red-500/10 border border-red-500/20 text-red-500',
        dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]',
    },
    success: {
        container: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500',
        dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
    },
};

const AlertBanner = ({ type, message }) => {
    if (!message) return null;
    const styles = ALERT_STYLES[type];
    return (
        <div className={`${styles.container} p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2`}>
            <div className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
            <span className="text-[13px] weight-510">{message}</span>
        </div>
    );
};

const TabButton = ({ active, onClick, icon: Icon, label, activeColor }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            active
                ? `${activeColor} text-white shadow-lg`
                : 'text-[var(--ln-text-secondary)] hover:bg-white/5'
        }`}
    >
        <Icon size={18} />
        {label}
    </button>
);

const UserManagement = () => {
    const [activeTab, setActiveTab] = useState('users');
    const [whatsappUser, setWhatsappUser] = useState(null);
    const [whatsappData, setWhatsappData] = useState({
        stage: '',
        templateKey: '',
        previewText: ''
    });
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
        unassignedFilter,
        setUnassignedFilter,
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

    const handleEditUser = (user) => {
        setEditingUser({
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
            role: user.roles?.find((r) => VALID_ROLES.includes(r)) || user.roles?.[0] || 'DISCIPULO',
            sex: user.sex || '',
            documentType: user.documentType || '',
            encuentro: user.encuentro || false,
            discipular1A: user.discipular1A || false,
            discipular1B: user.discipular1B || false,
            discipular2A: user.discipular2A || false,
            discipular2B: user.discipular2B || false,
            discipular3A: user.discipular3A || false,
            discipular3B: user.discipular3B || false,
        });
    };

    const WHATSAPP_TEMPLATES = {
        Bienvenida: {
            A: "¡Hola [Nombre]! 👋 Qué alegría que nos acompañaras hoy en [Nombre de la Iglesia]. Esperamos que te hayas sentido como en casa. ¡Bendiciones!",
            B: "Hola [Nombre], soy [Nombre del Líder] de la iglesia. Me dio mucho gusto conocerte hoy. Si tienes alguna duda o necesitas algo, aquí estoy para servirte. 😊",
            C: "¡Hola [Nombre]! Gracias por venir hoy con [Nombre de la persona que lo invitó]. Fue un gusto tenerte con nosotros. ¡Te esperamos el próximo domingo!"
        },
        Consolidacion: {
            A: "Hola [Nombre], espero que estés teniendo una excelente semana. ✨ Me quedé pensando en ti y quería saludarte. ¿Cómo va todo?",
            B: "¡Hola [Nombre]! En la iglesia tenemos grupos pequeños llamados 'Células' donde nos conocemos mejor y estudiamos la Biblia. Tenemos una muy cerca de tu casa, ¿te gustaría visitarla esta semana?",
            C: "Hola [Nombre], te saludo con mucho cariño. Queríamos saber si hay algo por lo que podamos estar orando por ti o tu familia esta semana. 🙏"
        },
        Integracion: {
            A: "¡Hola [Nombre]! Estamos iniciando un curso básico para conocer más sobre la fe y la Biblia. Creo que te gustaría mucho. ¿Te gustaría que te enviara la información? 📖",
            B: "¡Hola [Nombre]! Se acerca nuestra [Nombre de la Convención/Evento] y me encantaría que fueras mi invitado especial. Será un tiempo increíble. ¿Cuento contigo? 🎫"
        },
        Recuperacion: {
            A: "¡Hola [Nombre]! Te hemos extrañado los últimos domingos. Espero que todo esté bien. ¡Te enviamos un abrazo fuerte! 🤗",
            B: "Hola [Nombre], pasaba por aquí para decirte que te recordamos con cariño en la iglesia. Ojalá podamos vernos pronto. ¡Dios te bendiga!"
        }
    };

    const getCleanName = (name) => {
        if (!name) return '';
        const firstName = name.trim().split(' ')[0].toLowerCase();
        return firstName.charAt(0).toUpperCase() + firstName.slice(1);
    };

    const generateWhatsappMessage = (stage, templateKey) => {
        if (!stage || !templateKey || !whatsappUser) return '';
        let msg = WHATSAPP_TEMPLATES[stage][templateKey];

        const userName = getCleanName(whatsappUser.fullName);
        msg = msg.replace(/\[Nombre\]/g, userName);

        if (currentUser) {
            const leaderName = getCleanName(currentUser.profile?.fullName || currentUser.email);
            msg = msg.replace(/\[Nombre del Líder\]/g, leaderName);
        }

        msg = msg.replace(/\[Nombre de la persona que lo invitó\]/g, 'nosotros');
        msg = msg.replace(/\[Nombre de la Iglesia\]/g, 'la iglesia');
        msg = msg.replace(/\[Nombre de la Convención\/Evento\]/g, 'próxima reunión');

        return msg;
    };

    const handleWhatsAppClick = (user) => {
        setWhatsappUser(user);
        setWhatsappData({ stage: '', templateKey: '', previewText: '' });
    };

    const handleWhatsappStageChange = (stage) => {
        setWhatsappData(prev => ({ ...prev, stage, templateKey: '', previewText: '' }));
    };

    const handleWhatsappTemplateChange = (templateKey) => {
        const text = generateWhatsappMessage(whatsappData.stage, templateKey);
        setWhatsappData(prev => ({ ...prev, templateKey, previewText: text }));
    };

    const handleSendWhatsapp = async () => {
        if (!whatsappData.previewText.trim()) {
            toast.error('El mensaje no puede estar vacío');
            return;
        }

        try {
            await api.post(`/users/${whatsappUser.id}/whatsapp-log`, {
                message: whatsappData.previewText
            });
        } catch (error) {
            console.error('Error saving whatsapp log:', error);
        }

        const text = encodeURIComponent(whatsappData.previewText);
        const whatsappPhone = getWhatsAppPhone(whatsappUser.phone);
        window.open(`https://wa.me/${whatsappPhone}?text=${text}`, '_blank');

        setWhatsappUser(null);
        // Refresh user list to show updated lastWhatsApp fields
        window.location.reload();
    };

    const modalSharedProps = {
        submitting,
        pastores,
        lideresDoce,
        lideresCelula,
        users,
        isAdmin,
        validatePasswordRealTime,
        calculateAge,
        getAssignableRoles,
        relatedUsersCache,
        fetchRelatedUsers,
    };

    const headerTitle = (
        <div className="flex items-center gap-4">
            <Users className="text-[var(--ln-brand-indigo)]" size={32} weight="bold" />
            Gestión de Usuarios
        </div>
    );

    return (
        <div className="space-y-10 pb-32 animate-in fade-in duration-700">
            <PageHeader
                title={headerTitle}
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

            <div className="bg-[var(--ln-bg-panel)]/50 backdrop-blur-xl rounded-[24px] border border-[var(--ln-border-standard)] p-2 shadow-lg">
                <div className="flex gap-2">
                    <TabButton
                        active={activeTab === 'users'}
                        onClick={() => setActiveTab('users')}
                        icon={UserList}
                        label="Usuarios"
                        activeColor="bg-[var(--ln-brand-indigo)]"
                    />
                    <TabButton
                        active={activeTab === 'coordinators'}
                        onClick={() => setActiveTab('coordinators')}
                        icon={Shield}
                        label="Coordinadores de Módulos"
                        activeColor="bg-purple-500"
                    />
                </div>
            </div>

            {activeTab === 'users' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <AlertBanner type="error" message={error} />
                    <AlertBanner type="success" message={success} />

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
                        unassignedFilter={unassignedFilter}
                        setUnassignedFilter={setUnassignedFilter}
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
                            onEdit={handleEditUser}
                            onDelete={handleDeleteUser}
                            onResetPassword={setPasswordResetUser}
                            onWhatsApp={handleWhatsAppClick}
                        />
                        
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
                {...modalSharedProps}
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
                    {...modalSharedProps}
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

            {whatsappUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
                            <div className="flex items-center gap-2">
                                <WhatsappLogo className="w-5 h-5 text-green-500" weight="bold" />
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Enviar Mensaje
                                </h3>
                            </div>
                            <button onClick={() => setWhatsappUser(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Elige el tipo de mensaje</label>
                                <select
                                    value={whatsappData.stage}
                                    onChange={(e) => handleWhatsappStageChange(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-white"
                                >
                                    <option value="">Seleccione una etapa...</option>
                                    <option value="Bienvenida">Bienvenida (Inmediato)</option>
                                    <option value="Consolidacion">Consolidación (Seguimiento)</option>
                                    <option value="Integracion">Integración (Llamado a la acción)</option>
                                    <option value="Recuperacion">Recuperación (Cuando deja de asistir)</option>
                                </select>
                            </div>

                            {whatsappData.stage && (
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Plantilla</label>
                                    <div className="flex gap-2">
                                        {Object.keys(WHATSAPP_TEMPLATES[whatsappData.stage]).map((key) => (
                                            <button
                                                key={key}
                                                onClick={() => handleWhatsappTemplateChange(key)}
                                                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${whatsappData.templateKey === key
                                                    ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                Opción {key}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {whatsappData.templateKey && (
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex justify-between">
                                        <span>Previsualización (Puedes editarlo)</span>
                                    </label>
                                    <textarea
                                        value={whatsappData.previewText}
                                        onChange={(e) => setWhatsappData({ ...whatsappData, previewText: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 bg-transparent dark:text-white resize-none"
                                        rows="6"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setWhatsappUser(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSendWhatsapp}
                                disabled={!whatsappData.previewText.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm flex items-center gap-2"
                            >
                                <WhatsappLogo className="w-4 h-4" weight="bold" />
                                Enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
