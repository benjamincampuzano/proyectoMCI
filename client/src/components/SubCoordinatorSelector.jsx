import React, { useState } from 'react';
import { UserPlus, Shield, PersonIcon } from '@phosphor-icons/react';
import PropTypes from 'prop-types';
import AsyncSearchSelect from './ui/AsyncSearchSelect';
import { Button } from './ui';
import api from '../utils/api';

/**
 * SubCoordinatorSelector - Component for selecting and assigning a Sub-coordinator for a module
 * Allows selecting users based on module-specific candidate criteria (Professor/Auxiliary roles)
 */
const normalizeModule = (name) => {
    if (!name) return '';
    return name.toLowerCase().trim().replace(/\s+/g, '-');
};

const SubCoordinatorSelector = ({ moduleSubCoordinator, moduleName, onSubCoordinatorChange, disabled = false, currentUserId, isModuleCoordinator }) => {
    const [isAssigning, setIsAssigning] = useState(false);
    const [selectedSubCoordinator, setSelectedSubCoordinator] = useState(null);

    // Permission check: Admin/Pastor (disabled=false) or the Module Coordinator
    const canManageSubCoordinator = !disabled || isModuleCoordinator;

    // Fetch users with specific roles for sub-coordinator selection
    const fetchCandidateUsers = async (searchTerm) => {
        try {
            // Don't search if term is too short
            if (!searchTerm || searchTerm.length < 3) {
                return [];
            }
            
            const response = await api.get('/users/search', {
                params: {
                    search: searchTerm,
                    role: 'LIDER_DOCE,LIDER_CELULA,DISCIPULO'
                }
            });
            return response.data || [];
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    };

    const handleAssignSubCoordinator = async () => {
        if (!selectedSubCoordinator) return;
        setIsAssigning(true);
        try {
            const response = await api.post(`/coordinators/module/${normalizeModule(moduleName)}/subcoordinator`, {
                userId: selectedSubCoordinator.id
            });
            // The response might be the assigned user object or a message
            // We'll trust the component to refresh its state via the parent
            onSubCoordinatorChange(response.data);
            setSelectedSubCoordinator(null);
        } catch (error) {
            console.error('Error assigning sub-coordinator:', error);
        } finally {
            setIsAssigning(false);
        }
    };

    const handleRemoveSubCoordinator = async () => {
        if (!moduleSubCoordinator) return;
        try {
            await api.delete(`/coordinators/module/${normalizeModule(moduleName)}/subcoordinator`);
            onSubCoordinatorChange(null);
        } catch (error) {
            console.error('Error removing sub-coordinator:', error);
        }
    };

    const renderUserItem = (user) => (
        <div className="flex items-center justify-between w-full">
            <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{user.fullName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
            </div>
            <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400">
                <Shield size={12} />
                <span>{user.roles ? user.roles.join(', ') : 'USUARIO'}</span>
            </div>
        </div>
    );

    const renderSelectedUser = (user) => (
        <div className="flex items-center gap-2">
            <PersonIcon size={16} className="text-indigo-600 dark:text-indigo-400" />
            <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{user.fullName}</div>
                <div className="text-xs text-indigo-600 dark:text-indigo-400">Subcoordinador</div>
            </div>
        </div>
    );

    return (
        <div className="space-y-3">
            {moduleSubCoordinator ? (
                <div className={`inline-flex items-center justify-between gap-4 px-3 py-1.5 border rounded-lg shadow-sm ${!canManageSubCoordinator
                    ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                    : 'bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-indigo-200 dark:border-indigo-800'
                    }`}>
                    {renderSelectedUser(moduleSubCoordinator)}
                    {canManageSubCoordinator && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveSubCoordinator}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ml-2"
                        >
                            Remover
                        </Button>
                    )}
                </div>
            ) : (
                canManageSubCoordinator && (
                    <div className="flex items-center gap-3">
                        <div className="flex-1 w-64 min-w-[200px]">
                            <AsyncSearchSelect
                                fetchItems={fetchCandidateUsers}
                                onSelect={setSelectedSubCoordinator}
                                selectedValue={selectedSubCoordinator}
                                placeholder="Buscar usuario..."
                                labelKey="fullName"
                                renderItem={renderUserItem}
                                renderSelected={renderSelectedUser}
                            />
                        </div>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleAssignSubCoordinator}
                            disabled={!selectedSubCoordinator || isAssigning}
                            loading={isAssigning}
                            className="flex items-center gap-2"
                        >
                            <UserPlus size={16} />
                            Asignar
                        </Button>
                    </div>
                )
            )}
        </div>
    );
};

SubCoordinatorSelector.propTypes = {
    moduleSubCoordinator: PropTypes.object,
    moduleName: PropTypes.string.isRequired,
    onSubCoordinatorChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    currentUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    isModuleCoordinator: PropTypes.bool
};

export default SubCoordinatorSelector;
