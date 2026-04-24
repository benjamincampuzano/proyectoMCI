import { useState } from 'react';
import PropTypes from 'prop-types';
import { 
    Users, 
    UserPlus, 
    Shield, 
    UserCircle, 
    Money,
    Trash,
    X,
    CheckCircle,
    AngularLogoIcon,
    PersonIcon
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import useCoordinatorManagement from '../../hooks/useCoordinatorManagement';
import { useAuth } from '../../hooks/useAuth';
import { Button, AsyncSearchSelect } from '../ui';
import ConfirmationModal from '../ConfirmationModal';

const MODULE_COLORS = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    orange: 'bg-orange-500',
    cyan: 'bg-cyan-500',
    indigo: 'bg-indigo-500'
};

const CoordinatorManagement = () => {
    const { hasAnyRole } = useAuth();
    const isAdminOrPastor = hasAnyRole(['ADMIN', 'PASTOR']);

    const {
        coordinators,
        loading,
        selectedModule,
        setSelectedModule,
        moduleData,
        availableModules,
        assignCoordinator,
        removeCoordinator,
        assignSubCoordinator,
        removeSubCoordinator,
        assignTreasurer,
        removeTreasurer,
        searchUsers
    } = useCoordinatorManagement();

    const [selectedUser, setSelectedUser] = useState({
        coordinator: null,
        subCoordinator: null,
        treasurer: null
    });
    const [assigning, setAssigning] = useState({
        coordinator: false,
        subCoordinator: false,
        treasurer: false
    });

    // Confirmation modals
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmData, setConfirmData] = useState(null);

    const currentModule = availableModules.find(m => m.id === selectedModule);

    const handleSearchUsers = async (term, role) => {
        return searchUsers(term, role);
    };

    const handleAssign = async (type) => {
        const user = selectedUser[type];
        if (!user) {
            toast.error('Por favor selecciona un usuario');
            return;
        }

        setAssigning(prev => ({ ...prev, [type]: true }));
        try {
            switch (type) {
                case 'coordinator':
                    await assignCoordinator(selectedModule, user.id);
                    break;
                case 'subCoordinator':
                    await assignSubCoordinator(selectedModule, user.id);
                    break;
                case 'treasurer':
                    await assignTreasurer(selectedModule, user.id);
                    break;
                default:
                    break;
            }
            setSelectedUser(prev => ({ ...prev, [type]: null }));
        } catch (error) {
            // Error already handled in hook
        } finally {
            setAssigning(prev => ({ ...prev, [type]: false }));
        }
    };

    const openConfirmRemove = (type, name) => {
        setConfirmAction(type);
        setConfirmData({ name });
        setShowConfirmModal(true);
    };

    const handleConfirmRemove = async () => {
        try {
            switch (confirmAction) {
                case 'coordinator':
                    await removeCoordinator(selectedModule);
                    break;
                case 'subCoordinator':
                    await removeSubCoordinator(selectedModule);
                    break;
                case 'treasurer':
                    await removeTreasurer(selectedModule);
                    break;
                default:
                    break;
            }
        } catch (error) {
            // Error already handled in hook
        } finally {
            setShowConfirmModal(false);
            setConfirmAction(null);
            setConfirmData(null);
        }
    };

    const renderUserItem = (user) => (
        <div className="flex items-center justify-between w-full">
            <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                    {user.fullName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    {user.email}
                </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                <Shield size={12} />
                <span>{user.roles?.[0] || 'USUARIO'}</span>
            </div>
        </div>
    );

    const AssignmentCard = ({ 
        title, 
        icon: Icon, 
        color,
        data, 
        type,
        placeholder = "Buscar usuario...",
        role = 'LIDER_DOCE'
    }) => (
        <div className="bg-[var(--ln-bg-panel)]/50 backdrop-blur-xl rounded-[24px] border border-[var(--ln-border-standard)] overflow-hidden shadow-lg">
            <div className="px-6 py-5 border-b border-[var(--ln-border-standard)] bg-white/[0.02] flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-${color}-500/10 text-${color}-500`}>
                    <Icon size={20} weight="bold" />
                </div>
                <div>
                    <h3 className="text-base font-semibold text-[var(--ln-text-primary)]">{title}</h3>
                </div>
            </div>

            <div className="p-6 space-y-4">
                {data ? (
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full bg-${color}-500/20 flex items-center justify-center`}>
                                    <Icon size={20} className={`text-${color}-500`} />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{data.fullName}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{data.email}</p>
                                </div>
                            </div>
                            {isAdminOrPastor && (
                                <button
                                    onClick={() => openConfirmRemove(type, data.fullName)}
                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Remover"
                                >
                                    <Trash size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 text-center border border-gray-200 dark:border-gray-700 border-dashed">
                        <Icon size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Sin {title.toLowerCase()} asignado
                        </p>
                    </div>
                )}

                {isAdminOrPastor && !data && (
                    <div className="space-y-3 pt-2">
                        <AsyncSearchSelect
                            fetchItems={(term) => handleSearchUsers(term, role)}
                            onSelect={(user) => setSelectedUser(prev => ({ ...prev, [type]: user }))}
                            selectedValue={selectedUser[type]}
                            placeholder={placeholder}
                            labelKey="fullName"
                            renderItem={renderUserItem}
                        />
                        <Button
                            variant="primary"
                            onClick={() => handleAssign(type)}
                            disabled={!selectedUser[type] || assigning[type]}
                            loading={assigning[type]}
                            className="w-full"
                            icon={UserPlus}
                        >
                            Asignar {title}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );

    if (!isAdminOrPastor) {
        return (
            <div className="min-h-[40vh] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield size={32} className="text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Acceso Restringido
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Solo administradores y pastores pueden gestionar coordinadores de módulos.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Module Selector */}
            <div className="bg-[var(--ln-bg-panel)]/50 backdrop-blur-xl rounded-[24px] border border-[var(--ln-border-standard)] p-6 shadow-lg">
                <label className="block text-sm font-medium text-[var(--ln-text-secondary)] mb-3">
                    Seleccionar Módulo
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {availableModules.map((module) => (
                        <button
                            key={module.id}
                            onClick={() => setSelectedModule(module.id)}
                            className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                                selectedModule === module.id
                                    ? `border-${module.color}-500 bg-${module.color}-500/10 shadow-lg shadow-${module.color}-500/10`
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                        >
                            <div className={`w-3 h-3 rounded-full ${MODULE_COLORS[module.color]} mb-2`} />
                            <p className={`font-medium ${
                                selectedModule === module.id 
                                    ? `text-${module.color}-600 dark:text-${module.color}-400` 
                                    : 'text-gray-900 dark:text-white'
                            }`}>
                                {module.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {module.description}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Current Module Header */}
            {currentModule && (
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${MODULE_COLORS[currentModule.color]} shadow-lg`}>
                        <Users size={24} className="text-white" weight="bold" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-[var(--ln-text-primary)]">
                            {currentModule.name}
                        </h2>
                        <p className="text-sm text-[var(--ln-text-secondary)]">
                            {currentModule.description}
                        </p>
                    </div>
                </div>
            )}

            {/* Assignment Cards */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-[24px] animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <AssignmentCard
                        title="Coordinador"
                        icon={AngularLogoIcon}
                        color="purple"
                        data={moduleData.coordinator}
                        type="coordinator"
                        placeholder="Buscar Líder de 12..."
                        role="LIDER_DOCE"
                    />
                    <AssignmentCard
                        title="Subcoordinador"
                        icon={PersonIcon}
                        color="blue"
                        data={moduleData.subCoordinator}
                        type="subCoordinator"
                        placeholder="Buscar usuario..."
                        role="LIDER_DOCE,LIDER_CELULA,DISCIPULO"
                    />
                    <AssignmentCard
                        title="Tesorero"
                        icon={Money}
                        color="emerald"
                        data={moduleData.treasurer}
                        type="treasurer"
                        placeholder="Buscar usuario..."
                        role="LIDER_DOCE,LIDER_CELULA,DISCIPULO"
                    />
                </div>
            )}

            {/* Coordinators Overview */}
            <div className="bg-[var(--ln-bg-panel)]/50 backdrop-blur-xl rounded-[24px] border border-[var(--ln-border-standard)] overflow-hidden shadow-lg mt-8">
                <div className="px-6 py-5 border-b border-[var(--ln-border-standard)] bg-white/[0.02]">
                    <h3 className="text-lg font-semibold text-[var(--ln-text-primary)]">
                        Vista General de Coordinadores
                    </h3>
                    <p className="text-sm text-[var(--ln-text-secondary)] mt-1">
                        Todos los coordinadores asignados en el sistema
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Usuario
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Módulos Coordinados
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Rol
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Estado
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {coordinators.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No hay coordinadores registrados
                                    </td>
                                </tr>
                            ) : (
                                coordinators.map((coordinator) => (
                                    <tr key={coordinator.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {coordinator.fullName}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {coordinator.email}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {coordinator.coordinatedModules?.map((mod, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full"
                                                    >
                                                        {mod}
                                                    </span>
                                                ))}
                                                {!coordinator.coordinatedModules?.length && (
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                                                {coordinator.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                coordinator.isCurrentlyCoordinating
                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                            }`}>
                                                {coordinator.isCurrentlyCoordinating ? (
                                                    <><CheckCircle size={12} /> Activo</>
                                                ) : (
                                                    'Inactivo'
                                                )}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => {
                    setShowConfirmModal(false);
                    setConfirmAction(null);
                    setConfirmData(null);
                }}
                onConfirm={handleConfirmRemove}
                title={`Remover ${confirmAction ? confirmAction === 'coordinator' ? 'Coordinador' : confirmAction === 'subCoordinator' ? 'Subcoordinador' : 'Tesorero' : ''}`}
                message={confirmData ? `¿Estás seguro de que deseas remover a ${confirmData.name} como ${confirmAction === 'coordinator' ? 'coordinador' : confirmAction === 'subCoordinator' ? 'subcoordinador' : 'tesorero'} del módulo ${currentModule?.name}?` : ''}
                confirmText="Remover"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    );
};

CoordinatorManagement.propTypes = {};

export default CoordinatorManagement;
