// components/tree/GuestNode.jsx
import React from 'react';
import { UserPlus } from '@phosphor-icons/react';

export default function GuestNode({ guest }) {
  const getStatusBadgeColor = (status) => {
    const colors = {
      NUEVO: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      CONTACTADO: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
      CONSOLIDADO: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      GANADO: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-700';
  };

  const getStatusLabel = (status) => {
    const labels = {
      NUEVO: 'Nuevo',
      CONTACTADO: 'Llamado',
      CONSOLIDADO: 'Visitado',
      GANADO: 'Consolidado',
    };
    return labels[status] || status;
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 shrink-0">
        <UserPlus size={16} weight="bold" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate uppercase tracking-tight">
          {guest.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-extrabold tracking-wider ${getStatusBadgeColor(guest.status)}`}>
            {getStatusLabel(guest.status)}
          </span>
          {guest.phone && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
              {guest.phone}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
