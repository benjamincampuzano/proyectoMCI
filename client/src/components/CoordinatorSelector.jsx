import React, { useState } from 'react';
import { Crown, UserPlus, Shield } from '@phosphor-icons/react';
import PropTypes from 'prop-types';
import AsyncSearchSelect from './ui/AsyncSearchSelect';
import { Button } from './ui';
import api from '../utils/api';

/**
 * CoordinatorSelector - Component for selecting and assigning a LIDER_DOCE as coordinator
 * with module-specific admin privileges (keeps LIDER_DOCE role but gets isCoordinator flag)
 */
const CoordinatorSelector = ({ moduleCoordinator, moduleName, onCoordinatorChange, disabled = false }) => {
    const [isAssigning, setIsAssigning] = useState(false);
    const [selectedCoordinator, setSelectedCoordinator] = useState(null);

    // Fetch LIDER_DOCE users for selection
    const fetchLiderDoceUsers = async (searchTerm) => {
        try {
            const response = await api.get('/users/search', {
                params: {
                    role: 'LIDER_DOCE',
                    search: searchTerm,
                    limit: 10
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching LIDER_DOCE users:', error);
            throw error;
        }
    };

    // Assign coordinator with module-specific admin profile
    const handleAssignCoordinator = async () => {
        if (!selectedCoordinator) return;

        setIsAssigning(true);
        try {
            // Update user to set isCoordinator flag but keep LIDER_DOCE role
            await api.put(`/users/${selectedCoordinator.id}`, {
                isCoordinator: true
            });

            // Update the coordinator in parent component
            onCoordinatorChange(selectedCoordinator);
            setSelectedCoordinator(null);
            
            // Trigger a refresh of the parent component to ensure persistence
            setTimeout(() => {
                onCoordinatorChange({
                    ...selectedCoordinator,
                    role: 'LIDER_DOCE'
                });
            }, 100);
        } catch (error) {
            console.error('Error assigning coordinator:', error);
        } finally {
            setIsAssigning(false);
        }
    };

    // Remove coordinator assignment
    const handleRemoveCoordinator = async () => {
        if (!moduleCoordinator) return;

        try {
            // Update user to remove isCoordinator flag but keep LIDER_DOCE role
            await api.put(`/users/${moduleCoordinator.id}`, {
                isCoordinator: false
            });
            
            // Clear coordinator state
            onCoordinatorChange(null);
            
            // Ensure the state is cleared
            setTimeout(() => {
                onCoordinatorChange(null);
            }, 100);
        } catch (error) {
            console.error('Error removing coordinator:', error);
        }
    };

    // Custom render for user items
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
                <span>LIDER_DOCE</span>
            </div>
        </div>
    );

    // Custom render for selected user
    const renderSelectedUser = (user) => (
        <div className="flex items-center gap-2">
            <Crown size={16} className="text-purple-600 dark:text-purple-400" />
            <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                    {user.fullName}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400">
                    Coordinador privilegios
                </div>
            </div>
        </div>
    );

    if (disabled) {
        return (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
                <Crown size={16} className="text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    Sin permisos para gestionar coordinadores
                </span>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Current Coordinator Display */}
            {moduleCoordinator ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg shadow-sm">
                    {renderSelectedUser(moduleCoordinator)}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveCoordinator}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        Remover
                    </Button>
                </div>
            ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
                    <Crown size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        Sin coordinador asignado
                    </span>
                </div>
            )}

            {/* Coordinator Selection */}
            {!moduleCoordinator && (
                <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-sm">
                        <AsyncSearchSelect
                            fetchItems={fetchLiderDoceUsers}
                            onSelect={setSelectedCoordinator}
                            selectedValue={selectedCoordinator}
                            placeholder="Buscar LIDER_DOCE..."
                            labelKey="fullName"
                            renderItem={renderUserItem}
                            renderSelected={renderSelectedUser}
                            disabled={disabled}
                        />
                    </div>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAssignCoordinator}
                        disabled={!selectedCoordinator || isAssigning}
                        loading={isAssigning}
                        className="flex items-center gap-2"
                    >
                        <UserPlus size={16} />
                        {isAssigning ? 'Asignando...' : 'Asignar como Coordinador'}
                    </Button>
                </div>
            )}
        </div>
    );
};

CoordinatorSelector.propTypes = {
    moduleCoordinator: PropTypes.shape({
        id: PropTypes.number,
        fullName: PropTypes.string,
        email: PropTypes.string
    }),
    moduleName: PropTypes.string.isRequired,
    onCoordinatorChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool
};

export default CoordinatorSelector;
