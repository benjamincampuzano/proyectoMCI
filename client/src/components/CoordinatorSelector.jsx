import React, { useState } from 'react';
import { AngularLogoIcon, UserPlus, Shield } from '@phosphor-icons/react';
import PropTypes from 'prop-types';
import AsyncSearchSelect from './ui/AsyncSearchSelect';
import { Button } from './ui';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

/**
 * CoordinatorSelector - Component for selecting and assigning a LIDER_DOCE as coordinator
 * with module-specific admin privileges (keeps LIDER_DOCE role but gets isCoordinator flag)
 */
const normalizeModule = (name) => {
    if (!name) return '';
    return name.toLowerCase().trim().replace(/\s+/g, '-');
};

const CoordinatorSelector = ({ moduleCoordinator, moduleName, onCoordinatorChange, disabled = false }) => {
    const { user } = useAuth();
    const [isAssigning, setIsAssigning] = useState(false);
    const [selectedCoordinator, setSelectedCoordinator] = useState(null);
    
    // Permission check for coordinator assignment: must be Admin or Pastor (disabled=false)
    const canManageCoordinator = !disabled;

    // Fetch LIDER_DOCE users for coordinator selection
    const fetchLiderDoceUsers = async (searchTerm) => {
        try {
            // Don't search if term is too short
            if (!searchTerm || searchTerm.length < 3) {
                return [];
            }
            
            const response = await api.get('/users/search', {
                params: {
                    search: searchTerm,
                    role: 'LIDER_DOCE'
                }
            });
            // Filter out current user to prevent self-assignment
            const users = response.data || [];
            return users.filter(u => u.id !== user.id);
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    };

    // Assign coordinator with module-specific admin profile
    const handleAssignCoordinator = async () => {
        if (!selectedCoordinator) return;

        // Prevent self-assignment
        if (selectedCoordinator.id === user.id) {
            toast.error('No puedes asignarte a ti mismo como coordinador. Por favor, selecciona a otro usuario.');
            return;
        }

        setIsAssigning(true);
        try {
            // Assign coordinator to specific module
            const response = await api.post(`/coordinators/module/${normalizeModule(moduleName)}`, {
                userId: selectedCoordinator.id
            });

            // Update the coordinator in parent component
            onCoordinatorChange(response.data);
            setSelectedCoordinator(null);
        } catch (error) {
            console.error('Error assigning coordinator:', error);
            if (error.response?.status === 400 && error.response?.data?.message?.includes('Cannot assign yourself')) {
                toast.error('No puedes asignarte a ti mismo como coordinador. Por favor, selecciona a otro usuario.');
            } else {
                toast.error('Error al asignar coordinador: ' + (error.response?.data?.message || error.message));
            }
        } finally {
            setIsAssigning(false);
        }
    };

    // Remove coordinator (strip them of module admin status)
    const handleRemoveCoordinator = async () => {
        if (!moduleCoordinator) return;

        try {
            // Remove coordinator from specific module
            await api.delete(`/coordinators/module/${normalizeModule(moduleName)}`);
            
            // Clear coordinator state
            onCoordinatorChange(null);
        } catch (error) {
            console.error('Error removing coordinator:', error);
        }
    };

    // Custom render for user item in dropdown
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
    const renderSelectedUser = (user, title = "Coordinador") => (
        <div className="flex items-center gap-2">
            <AngularLogoIcon size={16} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <div className="min-w-0">
                <div className="font-medium text-gray-900 dark:text-gray-100 text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[150px] md:max-w-none">
                    {user.fullName}
                </div>
                <div className="text-[10px] sm:text-xs text-purple-600 dark:text-purple-400 hidden sm:block">
                    {title}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-3">
            {/* Current Coordinator Display */}
            {moduleCoordinator ? (
                <div className={`inline-flex items-center justify-between gap-4 px-3 py-1.5 border rounded-lg shadow-sm ${
                    disabled 
                        ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600' 
                        : 'bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800'
                }`}>
                    <div className="flex items-center gap-2">
                        {renderSelectedUser(moduleCoordinator)}
                    </div>
                    {!disabled && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveCoordinator}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ml-4"
                        >
                            Remover
                        </Button>
                    )}
                </div>
            ) : (
                /* Static placeholder if no coordinator and no permission to assign */
                disabled && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
                        <AngularLogoIcon size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Sin coordinador asignado
                        </span>
                    </div>
                )
            )}

            {/* Coordinator Selection - Only for users with permissions (Admins/Pastors) */}
            {!disabled && !moduleCoordinator && (
                <div className="flex items-center gap-3">
                    <div className="flex-1 w-64 min-w-[200px]">
                        <AsyncSearchSelect
                            fetchItems={fetchLiderDoceUsers}
                            onSelect={setSelectedCoordinator}
                            selectedValue={selectedCoordinator}
                            placeholder="Buscar usuario..."
                            labelKey="fullName"
                            renderItem={renderUserItem}
                            renderSelected={renderSelectedUser}
                        />
                    </div>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAssignCoordinator}
                        disabled={!selectedCoordinator || isAssigning}
                        loading={isAssigning}
                        className="flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all duration-300 active:scale-95"
                    >
                        <UserPlus size={16} />
                        Asignar
                    </Button>
                </div>
            )}
        </div>
    );
};

CoordinatorSelector.propTypes = {
    moduleCoordinator: PropTypes.object,
    moduleName: PropTypes.string.isRequired,
    onCoordinatorChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool
};

export default CoordinatorSelector;
