import React from 'react';
import { computeLevels } from '../utils/transformCouples';
import { canAddToNode, canRemoveFromNode } from '../utils/permissions';
import { Users, UserPlus, UserMinus } from '@phosphor-icons/react';

export default function CardsView({ root, currentUser, onAddUser, onRemoveUser }) {
  const levels = computeLevels(root);
  return (
    <div className="space-y-6">
      {levels.map((levelNodes, depth) => (
        <section key={depth}>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Nivel {depth}</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {levelNodes.map(node => {
              const canAdd = canAddToNode({ node, ancestors: [], currentUser });
              const canRemove = canRemoveFromNode({ node, ancestors: [], currentUser, level: depth });
              const guestsCount = (node.guests?.assigned?.length || 0) + (node.guests?.invited?.length || 0);
              const disciplesCount = node.disciples?.length || 0;
              return (
                <div key={node.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm transition-colors">
                  <div className="flex items-start gap-2">
                    <div className="relative w-10 h-10 shrink-0">
                      <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-blue-200 dark:bg-blue-900/50 flex items-center justify-center text-[10px] text-blue-700 dark:text-blue-300 font-bold border border-white dark:border-gray-800">1</div>
                      <div className="absolute left-3 top-2 w-8 h-8 rounded-full bg-green-200 dark:bg-green-900/50 flex items-center justify-center text-[10px] text-green-700 dark:text-green-300 font-bold border border-white dark:border-gray-800">2</div>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold truncate text-gray-900 dark:text-gray-100">
                        {(node.partners || []).map(p => p.fullName).join(' & ')}
                      </h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(node.roles || []).map(r => (
                          <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                            {r === 'ADMIN' ? 'Admin' : r === 'PASTOR' ? 'Pastor' : r === 'LIDER_DOCE' ? 'Doce' : r === 'LIDER_CELULA' ? 'Célula' : 'Discípulo'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-end gap-1">
                        <Users size={14} /> {disciplesCount}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-end gap-1 mt-0.5">
                        <UserPlus size={14} /> {guestsCount}
                      </div>
                    </div>
                  </div>

                  {/* Guests List */}
                  {guestsCount > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-wider flex items-center gap-1">
                        <UserPlus size={12} /> Invitados ({guestsCount})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[...(node.guests?.assigned || []), ...(node.guests?.invited || [])].map((g, i) => (
                          <span key={`${g.id}-${i}`} className="text-[10px] px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800 rounded-full font-medium">
                            {g.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    {canAdd && (
                      <button 
                        onClick={() => onAddUser(node)} 
                        className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded flex items-center gap-1 transition-colors border border-blue-200 dark:border-blue-800/50"
                      >
                        <UserPlus size={12} />Agregar
                      </button>
                    )}
                    {canRemove && (node.partners || []).map(p => (
                      <button 
                        key={p.id} 
                        onClick={() => onRemoveUser(p)} 
                        className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded flex items-center gap-1 transition-colors border border-red-200 dark:border-red-800/50"
                      >
                        <UserMinus size={12} /> Eliminar
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
