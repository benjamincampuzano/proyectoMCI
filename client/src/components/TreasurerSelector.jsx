import React, { useState } from 'react';
import { UserPlus, Shield, Money } from '@phosphor-icons/react';
import PropTypes from 'prop-types';
import AsyncSearchSelect from './ui/AsyncSearchSelect';
import { Button } from './ui';
import api from '../utils/api';

/**
 * TreasurerSelector - Component for selecting and assigning a Treasurer for a module
 * Allows selecting users with roles: LIDER_DOCE, LIDER_CELULA, or DISCIPULO
 */
const normalizeModule = (name) => {
    if (!name) return '';
    return name.toLowerCase().trim().replace(/\s+/g, '-');
};

const TreasurerSelector = ({ moduleTreasurer, moduleName, onTreasurerChange, disabled = false, currentUserId, isModuleCoordinator }) => {
    const [isAssigning, setIsAssigning] = useState(false);
    const [selectedTreasurer, setSelectedTreasurer] = useState(null);

    // Permission check: Admin/Pastor (disabled=false) or the Module Coordinator
    const canManageTreasurer = !disabled || isModuleCoordinator;

    // Fetch any user for selection (only Admin/Pastor can assign)
    const fetchCandidateUsers = async (searchTerm) => {
        try {
            const response = await api.get('/users/search', {
                params: {
                    search: searchTerm,
                    limit: 20
                }
            });
            return response.data || [];
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    };

    const handleAssignTreasurer = async () => {
        if (!selectedTreasurer) return;
        setIsAssigning(true);
        try {
            const response = await api.post(`/coordinators/module/${normalizeModule(moduleName)}/treasurer`, {
                userId: selectedTreasurer.id
            });
            onTreasurerChange(response.data);
            setSelectedTreasurer(null);
        } catch (error) {
            console.error('Error assigning treasurer:', error);
        } finally {
            setIsAssigning(false);
        }
    };

    const handleRemoveTreasurer = async () => {
        if (!moduleTreasurer) return;
        try {
            await api.delete(`/coordinators/module/${normalizeModule(moduleName)}/treasurer`);
            onTreasurerChange(null);
        } catch (error) {
            console.error('Error removing treasurer:', error);
        }
    };

    const renderUserItem = (user) => (
        <div className="flex items-center justify-between w-full">
            <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{user.fullName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <Shield size={12} />
                <span>USUARIO</span>
            </div>
        </div>
    );

    const renderSelectedUser = (user) => (
        <div className="flex items-center gap-2">
            <Money size={16} className="text-emerald-600 dark:text-emerald-400" />
            <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{user.fullName}</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">Tesorero</div>
            </div>
        </div>
    );

    return (
        <div className="space-y-3">
            {moduleTreasurer ? (
                <div className={`inline-flex items-center justify-between gap-4 px-3 py-1.5 border rounded-lg shadow-sm ${
                    !canManageTreasurer 
                        ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600' 
                        : 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800'
                }`}>
                    {renderSelectedUser(moduleTreasurer)}
                    {canManageTreasurer && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveTreasurer}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ml-4"
                        >
                            Remover
                        </Button>
                    )}
                </div>
            ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
                    <Money size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Sin tesorero asignado</span>
                </div>
            )}

            {canManageTreasurer && !moduleTreasurer && (
                <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-sm">
                        <AsyncSearchSelect
                            fetchItems={fetchCandidateUsers}
                            onSelect={setSelectedTreasurer}
                            selectedValue={selectedTreasurer}
                            placeholder="Buscar tesorero..."
                            labelKey="fullName"
                            renderItem={renderUserItem}
                            renderSelected={renderSelectedUser}
                        />
                    </div>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAssignTreasurer}
                        disabled={!selectedTreasurer || isAssigning}
                        loading={isAssigning}
                        className="flex items-center gap-2"
                    >
                        <UserPlus size={16} />
                        {isAssigning ? 'Asignando...' : 'Asignar como Tesorero'}
                    </Button>
                </div>
            )}
        </div>
    );
};

TreasurerSelector.propTypes = {
    moduleTreasurer: PropTypes.shape({
        id: PropTypes.number,
        fullName: PropTypes.string,
        email: PropTypes.string
    }),
    moduleName: PropTypes.string.isRequired,
    onTreasurerChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    currentUserId: PropTypes.number,
    isModuleCoordinator: PropTypes.bool
};

export default TreasurerSelector;
