// components/unassigned/UnassignedUsersModal.jsx
import React, { useMemo, useState } from 'react';
import { X, MagnifyingGlass, UserPlus } from '@phosphor-icons/react';
import { getUnassignedUsers } from '../../utils/unassigned';

export default function UnassignedUsersModal({ isOpen, onClose, coupleRoot, allUsers = [], selectedLeader, onAssign }) {
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  const unassigned = useMemo(() => getUnassignedUsers({ allUsers, coupleRoot }), [allUsers, coupleRoot]);
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return unassigned;
    return unassigned.filter(u =>
      (u.fullName && u.fullName.toLowerCase().includes(s)) ||
      (u.email && u.email.toLowerCase().includes(s)) ||
      (u.phone && String(u.phone).includes(s))
    );
  }, [search, unassigned]);

  if (!isOpen) return null;

  const defaultLeaderId = selectedLeader?.partners?.[0]?.id;
  const defaultLeaderName = selectedLeader?.partners?.map(p => p.fullName).join(' & ');

  const handleAssign = async (userId) => {
    if (!onAssign || !defaultLeaderId) return;
    try {
      setBusyId(userId);
      await onAssign(userId, defaultLeaderId);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Usuarios sin asignar</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {filtered.length} usuarios no pertenecen a ningún nodo{defaultLeaderId ? ` · Asignar a: ${defaultLeaderName}` : ' · Selecciona un líder en el árbol para asignar'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X className="w-6 h-6"/>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"/>
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {search ? 'No se encontraron usuarios con ese criterio' : 'No hay usuarios sin asignar'}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(u => (
                <div 
                  key={u.id} 
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-move"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-user', JSON.stringify({
                      id: u.id,
                      name: u.fullName,
                      fullName: u.fullName
                    }));
                    e.currentTarget.classList.add('opacity-50');
                  }}
                  onDragEnd={(e) => {
                    e.currentTarget.classList.remove('opacity-50');
                  }}
                >
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">{u.fullName}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{Array.isArray(u.roles) ? u.roles.join(', ').replace(/_/g,' ') : 'Usuario'}</span>
                    <button
                      disabled={!defaultLeaderId || busyId === u.id}
                      onClick={() => handleAssign(u.id)}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-1"
                      title={defaultLeaderId ? `Asignar a ${defaultLeaderName}` : 'Selecciona un líder en el árbol'}
                    >
                      <UserPlus size={16}/> {busyId === u.id ? 'Asignando…' : 'Asignar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}