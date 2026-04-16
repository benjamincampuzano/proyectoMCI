// components/tree/CoupleCard.jsx
import React from 'react';
import { CaretDown, CaretRight, Users, UserPlus, UserMinus, Crown, Star } from '@phosphor-icons/react';

function generateUserColors(userId) {
  if (!userId) return { primary: '#374151', secondary: '#4B5563' };

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colorGuitarIcons = [
    { primary: '#374151', secondary: '#4B5563' },
    { primary: '#1E3A8A', secondary: '#2563EB' },
    { primary: '#1C4532', secondary: '#059669' },
    { primary: '#14532D', secondary: '#16A34A' },
    { primary: '#7C2D12', secondary: '#EA580C' },
    { primary: '#92400E', secondary: '#F59E0B' },
    { primary: '#581C87', secondary: '#7C3AED' },
    { primary: '#881337', secondary: '#BE185D' },
    { primary: '#991B1B', secondary: '#DC2626' },
    { primary: '#0F766E', secondary: '#0891B2' },
    { primary: '#1E293B', secondary: '#334155' },
  ];

  return colorGuitarIcons[Math.abs(hash) % colorGuitarIcons.length];
}

function Avatar({ userId, name, size = 6 }) {
  const colors = generateUserColors(userId);
  return (
    <div
      className={`w-${size} h-${size} shrink-0 rounded-full flex items-center justify-center text-white font-bold text-[10px] border border-white dark:border-gray-800`}
      style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
    >
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

export default function CoupleCard({
  node,
  expanded,
  onToggle,
  canAdd,
  canRemove,
  onAdd,
  onRemovePartner,
  canManageAssignments,
  onSelectLeader,
  isSelected,
}) {
  const guestsCount = (node.guests?.assigned?.length || 0) + (node.guests?.invited?.length || 0);
  const disciplesCount = node.disciples?.length || 0;

  const handleCardClick = (e) => {
    if (e.shiftKey && onSelectLeader) onSelectLeader();
    else onToggle();
  };

  /* ── Role helpers ── */
  const roleLabel = (role) => ({
    PASTOR: 'PASTOR',
    LIDER_DOCE: 'LIDER 12',
    LIDER_CELULA: 'LIDER CELULA',
    DISCIPULO: 'DISCIPULO',
  }[role] ?? role);

  const roleChipColor = (role) => ({
    PASTOR: 'bg-emerald-600 border-emerald-700 text-white shadow-sm',
    LIDER_DOCE: 'bg-amber-600  border-amber-700  text-white shadow-sm',
    LIDER_CELULA: 'bg-blue-600   border-blue-700   text-white shadow-sm',
    DISCIPULO: 'bg-purple-600  border-purple-700  text-white shadow-sm',
  }[role] ?? 'bg-gray-600 border-gray-700 text-white shadow-sm');

  const cardBg = () => {
    const priority = ['PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO'];
    for (const r of priority) {
      if (node.roles?.includes(r)) return {
        PASTOR: 'bg-emerald-50/80 border-emerald-200  dark:bg-emerald-900/10 dark:border-emerald-800',
        LIDER_DOCE: 'bg-amber-50/80   border-amber-200   dark:bg-amber-900/10  dark:border-amber-800',
        LIDER_CELULA: 'bg-blue-50/80    border-blue-200    dark:bg-blue-900/10   dark:border-blue-800',
        DISCIPULO: 'bg-purple-50/80 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800',
      }[r];
    }
    return 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700';
  };

  const roles = node.roles || [];
  const names = (node.partners || []).map(p => p.fullName).join(' y ');
  
  return (
    <div
      className={`group relative rounded-lg border shadow-sm transition-all duration-200
        hover:shadow-md ${cardBg()}
        ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        ${canManageAssignments ? 'hover:scale-[1.01]' : ''}
      `}
      onClick={handleCardClick}
      title={`${isSelected ? 'Líder seleccionado. ' : ''}Click para ${expanded ? 'contraer' : 'expandir'}`}
    >
      {/* ── Single row ── */}
      <div className="flex items-center gap-2 px-3 py-2 min-w-0">

        {/* Avatars (semi-stacked) */}
        <div className="relative shrink-0 flex items-center pr-2">
          <Avatar userId={node.partners?.[0]?.id} name={node.partners?.[0]?.fullName} size={10} />
          {node.partners?.[1] && (
            <div className="-ml-2 transition-transform group-hover:translate-x-1.5">
              <Avatar userId={node.partners[1]?.id} name={node.partners[1]?.fullName} size={10} />
            </div>
          )}
          {isSelected && (
            <div className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold border border-white" >✓</div>
          )}
        </div>

        {/* Names — more prominent base text */}
        <span className="font-bold text-base text-gray-900 dark:text-gray-100 truncate min-w-0 flex-1 uppercase tracking-tight">
          {names}
        </span>

        {/* Role chips — all unified roles */}
        <div className="flex items-center gap-1.5 shrink-0">
          {roles.map(role => (
            <span key={role} className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-extrabold border uppercase tracking-wider ${roleChipColor(role)}`}>
              {roleLabel(role)}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-5 shrink-0 text-xs">
          {disciplesCount > 0 && (
            <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400" title={`${disciplesCount} discípulos`}>
              <Users size={13} />
              <span className="font-medium">{disciplesCount}</span>
            </span>
          )}
          {guestsCount > 0 && (
            <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400" title={`${guestsCount} invitados`}>
              <UserPlus size={13} />
              <span className="font-medium">{guestsCount}</span>
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 border-l border-gray-200 dark:border-gray-700 pl-2">
          {canAdd && (
            <button
              onClick={(e) => { e.stopPropagation(); onAdd?.(); }}
              className="p-1 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800 transition-colors"
              title="Agregar usuario"
            >
              <UserPlus size={12} />
            </button>
          )}
          {/* Remove buttons — inline, only when canRemove */}
          {canRemove && (node.partners || []).map(partner => (
            <button
              key={partner.id}
              onClick={(e) => { e.stopPropagation(); onRemovePartner?.(partner); }}
              className="p-1 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-800/50 dark:text-red-400 rounded border border-red-200 dark:border-red-800 transition-colors"
              title={`Remover ${partner.fullName}`}
            >
              <UserMinus size={12} />
            </button>
          ))}
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label={expanded ? 'Contraer' : 'Expandir'}
          >
            {expanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
