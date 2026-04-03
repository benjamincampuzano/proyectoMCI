import React, { useState, useEffect } from 'react';
import { AngularLogoIcon, UserPlus, Shield, CaretDown, CaretUp } from '@phosphor-icons/react';
import PropTypes from 'prop-types';
import AsyncSearchSelect from './ui/AsyncSearchSelect';
import { Button } from './ui';
import api from '../utils/api';

/**
 * CoordinatorSelector - Component for selecting and assigning a LIDER_DOCE as coordinator
 * with module-specific admin privileges (keeps LIDER_DOCE role but gets isCoordinator flag)
 */
const CoordinatorSelector = ({ moduleCoordinator, moduleName, onCoordinatorChange, disabled = false, currentUserId, isModuleCoordinator }) => {
    const [isAssigning, setIsAssigning] = useState(false);
    const [selectedCoordinator, setSelectedCoordinator] = useState(null);
    
    // Subcoordinator state
    const [subCoordinator, setSubCoordinator] = useState(null);
    const [selectedSubCoordinator, setSelectedSubCoordinator] = useState(null);
    const [isAssigningSub, setIsAssigningSub] = useState(false);
    const [showSubSection, setShowSubSection] = useState(false);

    // Determines if the current user has permission to manage subcoordinators 
    // (They must be the coordinator of this module, or an admin/pastor (which usually passes disabled=false))
    const canManageSubcoordinator = !disabled || (moduleCoordinator && moduleCoordinator.id === currentUserId && isModuleCoordinator);

    useEffect(() => {
        if (moduleCoordinator) {
            fetchSubCoordinator();
        } else {
            setSubCoordinator(null);
            setShowSubSection(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [moduleCoordinator, moduleName]);

    const fetchSubCoordinator = async () => {
        try {
            const res = await api.get(`/coordinators/module/${moduleName.toLowerCase()}/subcoordinator`);
            setSubCoordinator(res.data);
        } catch (error) {
            console.error('Error fetching subcoordinator:', error);
            setSubCoordinator(null);
        }
    };

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

    // Fetch Candidates for subcoordinator
    const fetchSubCandidates = async (searchTerm) => {
        try {
            const response = await api.get(`/coordinators/module/${moduleName.toLowerCase()}/candidates`, {
                params: { search: searchTerm }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching candidates:', error);
            throw error;
        }
    };

    // Assign coordinator with module-specific admin profile
    const handleAssignCoordinator = async () => {
        if (!selectedCoordinator) return;

        setIsAssigning(true);
        try {
            // Assign coordinator to specific module
            const response = await api.post(`/coordinators/module/${moduleName.toLowerCase()}`, {
                userId: selectedCoordinator.id
            });

            // Update the coordinator in parent component
            onCoordinatorChange(response.data);
            setSelectedCoordinator(null);
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
            // Remove coordinator from specific module
            await api.delete(`/coordinators/module/${moduleName.toLowerCase()}`);
            
            // Clear coordinator state
            onCoordinatorChange(null);
        } catch (error) {
            console.error('Error removing coordinator:', error);
        }
    };

    const handleAssignSubCoordinator = async () => {
        if (!selectedSubCoordinator) return;
        setIsAssigningSub(true);
        try {
            const res = await api.post(`/coordinators/module/${moduleName.toLowerCase()}/subcoordinator`, {
                userId: selectedSubCoordinator.id
            });
            setSubCoordinator(res.data);
            setSelectedSubCoordinator(null);
        } catch (error) {
            console.error('Error assigning subcoordinator:', error);
        } finally {
            setIsAssigningSub(false);
        }
    };

    const handleRemoveSubCoordinator = async () => {
        if (!subCoordinator) return;
        try {
            await api.delete(`/coordinators/module/${moduleName.toLowerCase()}/subcoordinator`);
            setSubCoordinator(null);
        } catch (error) {
            console.error('Error removing subcoordinator:', error);
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
                <span>USER</span>
            </div>
        </div>
    );

    // Custom render for selected user
    const renderSelectedUser = (user, title = "Coordinador") => (
        <div className="flex items-center gap-2">
            <AngularLogoIcon size={16} className="text-purple-600 dark:text-purple-400" />
            <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                    {user.fullName}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400">
                    {title}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-3">
            {/* Current Coordinator Display - Always visible */}
            {moduleCoordinator ? (
                <div className="flex flex-col gap-2">
                    <div className={`inline-flex items-center justify-between gap-4 px-3 py-1.5 border rounded-lg shadow-sm ${
                        disabled 
                            ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600' 
                            : 'bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800'
                    }`}>
                        <div className="flex items-center gap-2">
                            {renderSelectedUser(moduleCoordinator)}
                            {canManageSubcoordinator && (
                                <button 
                                    onClick={() => setShowSubSection(!showSubSection)}
                                    className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                                    title="Gestionar Subcoordinador"
                                >
                                    {showSubSection ? <CaretUp size={16} /> : <CaretDown size={16} />}
                                </button>
                            )}
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

                    {/* Subcoordinator Section */}
                    {showSubSection && canManageSubcoordinator && (
                        <div className="pl-6 border-l-2 border-purple-200 dark:border-purple-800 space-y-2 mt-1">
                            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                Subcoordinador
                            </div>
                            
                            {subCoordinator ? (
                                <div className="inline-flex items-center justify-between gap-4 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                                    {renderSelectedUser(subCoordinator, "Subcoordinador")}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleRemoveSubCoordinator}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ml-2"
                                    >
                                        Remover
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 max-w-xs">
                                        <AsyncSearchSelect
                                            fetchItems={fetchSubCandidates}
                                            onSelect={setSelectedSubCoordinator}
                                            selectedValue={selectedSubCoordinator}
                                            placeholder="Buscar profesor/auxiliar..."
                                            labelKey="fullName"
                                            renderItem={renderUserItem}
                                            renderSelected={renderSelectedUser}
                                        />
                                    </div>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handleAssignSubCoordinator}
                                        disabled={!selectedSubCoordinator || isAssigningSub}
                                        loading={isAssigningSub}
                                        className="flex items-center gap-2"
                                    >
                                        <UserPlus size={16} />
                                        Asignar
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
                    <AngularLogoIcon size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        Sin coordinador asignado
                    </span>
                </div>
            )}

            {/* Coordinator Selection - Only for users with permissions */}
            {!disabled && !moduleCoordinator && (
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
    disabled: PropTypes.bool,
    currentUserId: PropTypes.number,
    isModuleCoordinator: PropTypes.bool
};

export default CoordinatorSelector;
