// components/unassigned/UnassignedUsersModal.jsx
import React, { useMemo, useState } from 'react';
import { X, MagnifyingGlass, UserPlus } from '@phosphor-icons/react';
import { getUnassignedUsers } from '../../utils/unassigned';
import { canManageAssignments } from '../../utils/permissions';
import { ROLES } from '../../constants/roles';

export default function UnassignedUsersModal({ isOpen, onClose, coupleRoot, allUsers = [], selectedLeader, onAssign, currentUser }) {
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  // Verificar permisos del usuario actual
  const hasAssignmentPermission = currentUser ? canManageAssignments(currentUser) : false;
  
  const unassigned = useMemo(() => {
    console.log('UnassignedUsersModal - allUsers:', allUsers?.length, 'coupleRoot:', coupleRoot?.id);
    const result = getUnassignedUsers({ allUsers, coupleRoot });
    console.log('UnassignedUsersModal - result:', result.length, 'users');
    return result;
  }, [allUsers, coupleRoot]);
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
    if (!hasAssignmentPermission) {
      alert('No tienes permisos para realizar esta acción');
      return;
    }
    
    if (!onAssign) {
      alert('Error: función de asignación no disponible');
      return;
    }
    
    if (!defaultLeaderId) {
      alert('Por favor selecciona un líder antes de asignar usuarios');
      return;
    }
    
    try {
      setBusyId(userId);
      await onAssign(userId, defaultLeaderId);
    } catch (error) {
      alert('Error al asignar usuario: ' + (error.message || 'Error desconocido'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
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
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">{u.fullName}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{Array.isArray(u.roles) ? u.roles.join(', ').replace(/_/g,' ') : 'Usuario'}</span>
                    <button
                      disabled={!hasAssignmentPermission || !defaultLeaderId || busyId === u.id}
                      onClick={() => handleAssign(u.id)}
                      className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${
                        !hasAssignmentPermission || !defaultLeaderId || busyId === u.id
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      title={
                        !hasAssignmentPermission 
                          ? 'No tienes permisos para asignar usuarios'
                          : !defaultLeaderId 
                          ? 'Selecciona un líder en el árbol (usa Shift+Click en un líder)'
                          : busyId === u.id
                          ? 'Asignando en progreso...'
                          : `Asignar a ${defaultLeaderName}`
                      }
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