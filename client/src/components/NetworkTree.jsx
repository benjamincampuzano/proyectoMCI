
// NetworkTree.jsx
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { FlowArrow, CardsThree, UsersThree, Users } from '@phosphor-icons/react';
import CoupleNodeTree from './tree/CoupleNodeTree';
import UnassignedUsersModal from './unassigned/UnassignedUsersModal';
import AssignConfirmDialog from './common/AssignConfirmDialog';
import RadialView from './radial/RadialView';
import { buildCoupleNetwork } from '../utils/transformCouples';
import { getUnassignedUsers } from '../utils/unassigned';
import api from '../utils/api';
import CardsView from './cards/CardsView';
import ConfirmationModal from './ConfirmationModal';

const VIEW_TREE = 'tree';
const VIEW_RADIAL = 'radial';
const VIEW_CARDS = 'cards';

export default function NetworkTree({ network, currentUser, onNetworkChange }) {
  const [view, setView] = useState(VIEW_TREE);
  const [unassignedOpen, setUnassignedOpen] = useState(false);
  const [selectedLeaderForModal, setSelectedLeaderForModal] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [pendingAssign, setPendingAssign] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [partnerToRemove, setPartnerToRemove] = useState(null);
  const allUsersFetched = useRef(false);

  const coupleRoot = useMemo(() => {
    return buildCoupleNetwork(network);
  }, [network]);

  // Transform backend network data to match UserFormFields structure
  // Keep original object arrays for display, add ID arrays for consistency with form
  const normalizedNetwork = useMemo(() => {
    if (!network) return null;

    return {
      ...network,
      // Keep original object arrays for display (getAuthorityCards needs fullName)
      pastores: network.pastores || [],
      lideresDoce: network.lideresDoce || [],
      lideresCelula: network.lideresCelula || [],
      // Add ID arrays to match UserFormFields structure
      pastorIds: network.pastores?.map(p => p.id) || [],
      pastorSpouseIds: network.pastores?.map(p => p.spouseId).filter(Boolean) || [],
      liderDoceIds: network.lideresDoce?.map(ld => ld.id) || [],
      liderDoceSpouseIds: network.lideresDoce?.map(ld => ld.spouseId).filter(Boolean) || [],
      liderCelulaIds: network.lideresCelula?.map(lc => lc.id) || [],
      liderCelulaSpouseIds: network.lideresCelula?.map(lc => lc.spouseId).filter(Boolean) || []
    };
  }, [network]);

  const unassigned = useMemo(() => {
    if (!coupleRoot) return [];
    const isAdmin = currentUser?.roles?.includes('ADMIN');
    const result = getUnassignedUsers({ allUsers, coupleRoot, isAdmin });
    return result;
  }, [allUsers, coupleRoot, currentUser]);

  useEffect(() => {
    if (!coupleRoot?.id) return;

    const defaultExpanded = new Set();

    const seedExpandedNodes = (node, level = 0) => {
      if (!node || level > 1) return;

      defaultExpanded.add(node.id);
      (node.disciples || []).forEach((child) => seedExpandedNodes(child, level + 1));
    };

    seedExpandedNodes(coupleRoot);
    setExpandedNodes(defaultExpanded);
  }, [coupleRoot]);

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const response = await api.get('/users', {
          params: {
            limit: 10000,
            includeUnassigned: true,
            _t: Date.now()
          }
        });
        const usersData = response.data?.users || response.data || [];
        setAllUsers(Array.isArray(usersData) ? usersData : []);
      } catch (error) {
        console.error('Error loading users:', error);
        setAllUsers([]);
      }
    };

    fetchAllUsers();

    const channel = new BroadcastChannel('network_updates');
    channel.onmessage = (event) => {
      if (event.data === 'network_changed') {
        fetchAllUsers();
      }
    };

    return () => {
      channel.close();
    };
  }, [network]);

  const confirmAssign = async () => {
    if (!pendingAssign) return;

    try {
      setLoading(true);
      await api.post('/network/assign', {
        userId: pendingAssign.userId,
        leaderId: pendingAssign.leaderId
      });

      setAllUsers(prev => Array.isArray(prev) ? prev.filter(u => u.id !== pendingAssign.userId) : []);
      setPendingAssign(null);
      onNetworkChange?.();
    } catch (error) {
      console.error('Error assigning user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUser = async (userId, leaderId) => {
    try {
      await api.post('/network/assign', { userId, leaderId });
      setAllUsers(prev => Array.isArray(prev) ? prev.filter(u => u.id !== userId) : []);
      onNetworkChange?.();
    } catch (error) {
      console.error('Error assigning user:', error);
      alert('Error al asignar usuario: ' + (error.message || 'Error desconocido'));
    }
  };

  const handleUnassignedModalOpen = useCallback(() => {
    setSelectedLeaderForModal(coupleRoot);
    setUnassignedOpen(true);
  }, [coupleRoot]);

  const handleAddUserToNode = useCallback((node) => {
    setSelectedLeaderForModal(node);
    setUnassignedOpen(true);
  }, []);

  const handleRemoveUser = useCallback((partner) => {
    setPartnerToRemove(partner);
    setShowRemoveConfirm(true);
  }, []);

  const performRemoveUser = async () => {
    try {
      setLoading(true);
      await api.delete(`/network/remove/${partnerToRemove.id}`);
      onNetworkChange?.();
      setAllUsers(prev => Array.isArray(prev) ? prev.filter(u => u.id !== partnerToRemove.id) : []);
      setShowRemoveConfirm(false);
      setPartnerToRemove(null);
    } catch (error) {
      console.error('Error removing user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLeader = useCallback((leader) => {
    setSelectedLeaderForModal(leader);
  }, []);

  const toggleNodeExpansion = useCallback((nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  const getPrimaryNetworkRole = (roles = []) => {
    const priority = ['DISCIPULO', 'LIDER_CELULA', 'LIDER_DOCE', 'PASTOR', 'ADMIN'];
    return priority.find((role) => roles.includes(role)) || roles[0] || 'DISCIPULO';
  };

  const getAuthorityCards = useCallback(() => {
    const pairs = Array.isArray(normalizedNetwork?.partners) ? normalizedNetwork.partners : [];
    const role = getPrimaryNetworkRole(normalizedNetwork?.roles || []);
    const currentUserId = currentUser?.id != null ? String(currentUser.id) : null;

    const cards = [];
    const addCards = (labelBase, tone, iconClass, items, limit = 2) => {
      items.slice(0, limit).forEach((person, index) => {
        cards.push({
          label: `${labelBase} ${index + 1}`,
          tone,
          iconClass,
          person,
        });
      });
    };

    const partnerDisplayName = (() => {
      if (pairs.length === 0) return null;

      const partnerNames = pairs
        .filter((partner) => {
          if (currentUserId === null) return true;
          return String(partner.id) !== currentUserId;
        })
        .map((partner) => partner.fullName)
        .filter(Boolean);

      if (partnerNames.length > 0) {
        return partnerNames.join(' y ');
      }

      return pairs
        .map((partner) => partner.fullName)
        .filter(Boolean)
        .join(' y ') || null;
    })();

    if (partnerDisplayName) {
      cards.push({
        label: 'Pareja',
        tone: 'text-pink-500',
        iconClass: 'bg-pink-500/10 border-pink-500/20',
        displayName: partnerDisplayName,
        person: {
          id: `${normalizedNetwork.id}-pair`,
          fullName: partnerDisplayName,
        },
      });
    }

    const authorityByRole = {
      LIDER_DOCE: ['pastores'],
      LIDER_CELULA: ['pastores', 'lideresDoce'],
      DISCIPULO: ['pastores', 'lideresDoce', 'lideresCelula'],
    };

    const tierConfig = {
      pastores: {
        labelBase: 'Pastor',
        tone: 'text-emerald-500',
        iconClass: 'bg-emerald-500/10 border-emerald-500/20',
      },
      lideresDoce: {
        labelBase: 'Líder Doce',
        tone: 'text-purple-500',
        iconClass: 'bg-purple-500/10 border-purple-500/20',
      },
      lideresCelula: {
        labelBase: 'Líder Célula',
        tone: 'text-[var(--ln-brand-indigo)]',
        iconClass: 'bg-[var(--ln-brand-indigo)]/10 border-[var(--ln-brand-indigo)]/20',
      },
    };

    const tiersToShow = authorityByRole[role] || [];
    tiersToShow.forEach((tierKey) => {
      const items = Array.isArray(normalizedNetwork?.[tierKey]) ? normalizedNetwork[tierKey] : [];
      const config = tierConfig[tierKey];
      addCards(config.labelBase, config.tone, config.iconClass, items, 2);
    });

    return cards;
  }, [normalizedNetwork, currentUser]);

  const renderAuthorityCard = (label, iconClass, toneClass, person, index, displayName) => {
    if (!person) return null;

    return (
      <div
        key={`${label}-${person.id ?? index}`}
        className="flex-1 min-w-[220px] bg-white/5 dark:bg-black/20 rounded-[14px] p-3 border border-[var(--ln-border-standard)] hover:border-[var(--ln-text-primary)]/20 transition-all group"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${iconClass}`}>
            <Users size={14} weight="bold" />
          </div>
          <span className={`text-[9px] weight-590 uppercase tracking-widest ${toneClass}`}>
            {label}
          </span>
        </div>
        <div className="text-[var(--ln-text-primary)] weight-510 text-sm">
          {displayName || person.fullName}
        </div>
      </div>
    );
  };

  const authorityCards = getAuthorityCards();

  if (!network) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
        <Users size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
        <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Selecciona un líder para ver su red de discipulado</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Elige un líder de la lista para comenzar</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[var(--ln-bg-panel)]/50 backdrop-blur-xl rounded-[32px] border border-[var(--ln-border-standard)] p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl weight-590 text-[var(--ln-text-primary)] tracking-tight flex items-center gap-2.5">
              <FlowArrow className="w-5 h-5 text-[var(--ln-brand-indigo)]" weight="bold" />
              Red de Discipulado
            </h2>
            <div className="flex items-center gap-3 mt-1.5">
              <p className="text-[13px] text-[var(--ln-text-tertiary)] opacity-70">
                {normalizedNetwork.partners && normalizedNetwork.partners.length > 1
                  ? `${normalizedNetwork.partners[0].fullName} & ${normalizedNetwork.partners[1].fullName}`
                  : normalizedNetwork.fullName}
              </p>
              <span className="w-1 h-1 rounded-full bg-[var(--ln-border-standard)]" />
              <p className="text-[11px] weight-510 text-amber-500 uppercase tracking-widest">
                {unassigned.length} por asignar
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Unassigned users button */}
            <button
              onClick={handleUnassignedModalOpen}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl border border-amber-500/20 transition-all active:scale-95 group"
            >
              <UsersThree size={18} weight="bold" />
              <span className="text-[13px] weight-590">Usuarios sin Asignar</span>
              <span className="bg-amber-500 text-white px-2 py-0.5 rounded-md text-[10px] weight-700">
                {unassigned.length}
              </span>
            </button>

            <span className="hidden lg:block w-px h-8 bg-[var(--ln-border-standard)] mx-2" />

            {/* View switcher */}
            <div className="flex p-1 bg-white/[0.03] border border-[var(--ln-border-standard)] rounded-xl">
              <button
                className={`px-4 py-1.5 text-[12px] weight-590 rounded-lg transition-all flex items-center gap-2
                                ${view === VIEW_TREE
                    ? 'bg-[var(--ln-brand-indigo)] text-white shadow-lg shadow-[var(--ln-brand-indigo)]/20'
                    : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-white/5'
                  }`}
                onClick={() => setView(VIEW_TREE)}
              >
                <FlowArrow size={14} weight="bold" />
                Árbol
              </button>
              <button
                className={`px-4 py-1.5 text-[12px] weight-590 rounded-lg transition-all flex items-center gap-2
                                ${view === VIEW_RADIAL
                    ? 'bg-[var(--ln-brand-indigo)] text-white shadow-lg shadow-[var(--ln-brand-indigo)]/20'
                    : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-white/5'
                  }`}
                onClick={() => setView(VIEW_RADIAL)}
              >
                <span className="text-[14px]">⭕</span>
                Radial
              </button>
              <button
                className={`px-4 py-1.5 text-[12px] weight-590 rounded-lg transition-all flex items-center gap-2
                                ${view === VIEW_CARDS
                    ? 'bg-[var(--ln-brand-indigo)] text-white shadow-lg shadow-[var(--ln-brand-indigo)]/20'
                    : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-white/5'
                  }`}
                onClick={() => setView(VIEW_CARDS)}
              >
                <CardsThree size={14} weight="bold" />
                Tarjetas
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content container */}
      <div className="bg-white/[0.02] rounded-[32px] border border-[var(--ln-border-standard)] overflow-hidden">
        {authorityCards.length > 0 && (
          <div className="p-6 border-b border-[var(--ln-border-standard)] bg-[var(--ln-bg-panel)]/40">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[var(--ln-brand-indigo)]/10 rounded-xl flex items-center justify-center text-[var(--ln-brand-indigo)] border border-[var(--ln-brand-indigo)]/20">
                <Users size={20} weight="bold" />
              </div>
              <div>
                <h3 className="text-lg weight-590 text-[var(--ln-text-primary)] tracking-tight">
                  Línea de Autoridad
                </h3>
                <p className="text-[12px] text-[var(--ln-text-tertiary)] opacity-70">
                  Cobertura directa sobre esta red.
                </p>
              </div>
            </div>

            <div className="flex flex-row gap-4 overflow-x-auto">
              {authorityCards.map((card, idx) =>
                renderAuthorityCard(card.label, card.iconClass, card.tone, card.person, idx, card.displayName)
              )}
            </div>
          </div>
        )}

        {view === VIEW_TREE && (
          <div className="p-6">
            <div className="mb-4 flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-400">
            </div>
            <div className="grid grid-cols-1 gap-6">
              <CoupleNodeTree
                node={coupleRoot}
                currentUser={currentUser}
                onAddUser={handleAddUserToNode}
                onRemoveUser={handleRemoveUser}
                expandedNodes={expandedNodes}
                onToggleNode={toggleNodeExpansion}
                onSelectLeader={handleSelectLeader}
                selectedLeader={selectedLeaderForModal}
              />
            </div>
          </div>
        )}

        {view === VIEW_RADIAL && (
          <div className="p-6">
            <RadialView
              root={coupleRoot}
              currentUser={currentUser}
              onAddUser={handleAddUserToNode}
              onRemoveUser={handleRemoveUser}
            />
          </div>
        )}

        {view === VIEW_CARDS && (
          <div className="p-6">
            <CardsView
              root={coupleRoot}
              currentUser={currentUser}
              onAddUser={handleAddUserToNode}
              onRemoveUser={handleRemoveUser}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <UnassignedUsersModal
        isOpen={unassignedOpen}
        onClose={() => setUnassignedOpen(false)}
        coupleRoot={coupleRoot}
        allUsers={allUsers}
        selectedLeader={selectedLeaderForModal}
        onAssign={handleAssignUser}
        currentUser={currentUser}
      />

      <AssignConfirmDialog
        open={!!pendingAssign}
        user={pendingAssign ? { name: pendingAssign.userName } : {}}
        leaderName={pendingAssign?.leaderName}
        loading={loading}
        onConfirm={confirmAssign}
        onCancel={() => setPendingAssign(null)}
      />

      {/* Remove User Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRemoveConfirm}
        onClose={() => {
          setShowRemoveConfirm(false);
          setPartnerToRemove(null);
        }}
        onConfirm={performRemoveUser}
        title="Remover de la Red"
        message={`¿Estás seguro de que deseas remover a ${partnerToRemove?.fullName} de la red de discipulado?`}
        confirmText="Remover Usuario"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
      >
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-red-600 dark:text-red-400 mt-0.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-red-800 dark:text-red-200 font-semibold mb-1">
                ⚠️ Acción Irreversible
              </h4>
              <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
                <li>• Se removerá al usuario de la red de discipulado</li>
                <li>• Perderá la conexión actual con su líder</li>
                <li>• Podrá ser reasignado a otro líder</li>
              </ul>
            </div>
          </div>
        </div>
      </ConfirmationModal>
    </div>
  );
}
