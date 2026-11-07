import React, { useState, useEffect } from 'react';
import { Users, UserPlus, X, MagnifyingGlass } from '@phosphor-icons/react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Modal, Button, AsyncSearchSelect, Input, Badge, Spinner } from './ui';

const BulkAssignmentModal = ({ isOpen, onClose, onSuccess }) => {
    const [selectedCellId, setSelectedCellId] = useState('');
    const [selectedCell, setSelectedCell] = useState(null);
    const [people, setPeople] = useState([]);
    const [selectedPeople, setSelectedPeople] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [fetchingPeople, setFetchingPeople] = useState(false);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [liderDoceFilter, setLiderDoceFilter] = useState(null);
    const [roleFilter, setRoleFilter] = useState('');
    const [networkFilter, setNetworkFilter] = useState('');

    const fetchUnassignedPeople = async () => {
        setFetchingPeople(true);
        try {
            const response = await api.get('/users/without-cell', {
                params: {
                    search: searchTerm,
                    liderDoceId: liderDoceFilter?.id,
                    role: roleFilter,
                    network: networkFilter,
                    limit: 500 // Fetch a larger set for bulk assignment
                }
            });
            setPeople(response.data.users || []);
        } catch (error) {
            console.error('Error fetching unassigned people:', error);
            toast.error('Error al cargar personas sin célula');
        } finally {
            setFetchingPeople(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            void Promise.resolve().then(() => fetchUnassignedPeople());
        }
    }, [isOpen, searchTerm, liderDoceFilter, roleFilter, networkFilter]);

    const togglePerson = (id) => {
        const newSelected = new Set(selectedPeople);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedPeople(newSelected);
    };

    const toggleAll = () => {
        if (selectedPeople.size === people.length) {
            setSelectedPeople(new Set());
        } else {
            setSelectedPeople(new Set(people.map(p => p.id)));
        }
    };

    const handleBulkAssign = async () => {
        if (!selectedCellId) {
            toast.error('Por favor, selecciona una célula de destino');
            return;
        }
        if (selectedPeople.size === 0) {
            toast.error('Por favor, selecciona al menos una persona');
            return;
        }

        setLoading(true);
        try {
            const memberIds = Array.from(selectedPeople);

            const response = await api.post('/enviar/cells/bulk-assign', {
                cellId: selectedCellId,
                memberIds: memberIds,
                guestIds: [] // Expand this if we add guest support to this modal
            });

            toast.success(`${response.data.assignedMembers} personas asignadas exitosamente`);
            setSelectedPeople(new Set());
            setSelectedCellId('');
            setSelectedCell(null);
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            const msg = error.response?.data?.error || 'Error al realizar la asignación masiva';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Asignación Masiva de Células"
            size="lg"
        >
            <div className="space-y-6">
                {/* Target Cell Selection */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 space-y-3">
                    <label className="block text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                        <Users size={18} />
                        Seleccionar Célula de Destino
                    </label>
                    <AsyncSearchSelect
                        fetchItems={async (term) => {
                            const res = await api.get('/enviar/cells');
                            const cells = res.data || [];
                            if (!term) return cells;
                            return cells.filter(c => c.name.toLowerCase().includes(term.toLowerCase()));
                        }}
                        selectedValue={selectedCell}
                        onSelect={(cell) => { setSelectedCellId(cell?.id || ''); setSelectedCell(cell || null); }}
                        placeholder="Buscar célula..."
                        labelKey="name"
                        renderItem={(cell) => (
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">{cell.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Líder: {cell.leader?.fullName || 'N/A'}</div>
                            </div>
                        )}
                    />
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="relative">
                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <Input
                            className="pl-9"
                            placeholder="Buscar persona..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <AsyncSearchSelect
                        fetchItems={async (term) => {
                            const res = await api.get('/users/search', { params: { search: term, role: 'LIDER_DOCE' } });
                            return res.data || [];
                        }}
                        selectedValue={liderDoceFilter}
                        onSelect={(u) => setLiderDoceFilter(u)}
                        placeholder="Líder 12"
                        labelKey="fullName"
                    />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="">Todos los roles</option>
                        <option value="DISCIPULO">Discípulo</option>
                        <option value="LIDER_CELULA">Líder de Célula</option>
                    </select>
                    <select
                        value={networkFilter}
                        onChange={(e) => setNetworkFilter(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="">Todas las redes</option>
                        <option value="MUJERES">Mujeres</option>
                        <option value="HOMBRES">Hombres</option>
                        <option value="JOVENES">Jóvenes</option>
                    </select>
                </div>

                {/* People Table */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {people.length} personas encontradas
                        </span>
                        <button
                            onClick={toggleAll}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                            {selectedPeople.size === people.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                        </button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                        {fetchingPeople ? (
                            <div className="p-8 flex justify-center"><Spinner /></div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                                    <tr>
                                        <th className="p-3 w-10">
                                            <input
                                                type="checkbox"
                                                className="rounded"
                                                checked={selectedPeople.size === people.length && people.length > 0}
                                                onChange={toggleAll}
                                            />
                                        </th>
                                        <th className="p-3 font-semibold text-gray-700 dark:text-gray-300">Nombre</th>
                                        <th className="p-3 font-semibold text-gray-700 dark:text-gray-300">Red</th>
                                        <th className="p-3 font-semibold text-gray-700 dark:text-gray-300">Líder 12</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {people.map(person => (
                                        <tr
                                            key={person.id}
                                            className={`hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors ${selectedPeople.has(person.id) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                                            onClick={() => togglePerson(person.id)}
                                        >
                                            <td className="p-3">
                                                <input
                                                    type="checkbox"
                                                    className="rounded"
                                                    checked={selectedPeople.has(person.id)}
                                                    onChange={() => {}} // Handled by row onClick
                                                />
                                            </td>
                                            <td className="p-3">
                                                <div className="font-medium text-gray-900 dark:text-white">{person.fullName}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{person.email}</div>
                                            </td>
                                            <td className="p-3">
                                                <Badge variant="secondary">{person.profile?.network || 'N/A'}</Badge>
                                            </td>
                                            <td className="p-3 text-gray-600 dark:text-gray-400">
                                                {person.hierarchy?.find(h => h.role === 'LIDER_DOCE')?.parentName || 'Sin red'}
                                            </td>
                                        </tr>
                                    ))}
                                    {people.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="p-8 text-center text-gray-500">No se encontraron personas sin célula.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleBulkAssign}
                        disabled={loading || selectedPeople.size === 0 || !selectedCellId}
                        loading={loading}
                        icon={UserPlus}
                    >
                        Asignar {selectedPeople.size > 0 ? `${selectedPeople.size} Personas` : 'Personas'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default BulkAssignmentModal;
