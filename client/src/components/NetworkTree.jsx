
// NetworkTree.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { FlowArrow, CardsThree, UsersThree, UserPlus, UserMinus, Users, CaretDown, CaretRight } from '@phosphor-icons/react';
import CoupleNodeTree from './tree/CoupleNodeTree';
import UnassignedUsersModal from './unassigned/UnassignedUsersModal';
import AssignConfirmDialog from './common/AssignConfirmDialog';
import RadialView from './radial/RadialView';
import { buildCoupleNetwork } from './utils/transformCouples';
import { getRootNodeForRole } from './utils/buildHierarchy';
import { getUnassignedUsers } from './utils/unassigned';
import api from '../utils/api';
import CardsView from './cards/CardsView';

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

  const coupleRoot = useMemo(() => {
    const fullNetwork = buildCoupleNetwork(network);
    return getRootNodeForRole(fullNetwork, currentUser);
  }, [network, currentUser]);
  const unassigned = useMemo(() => getUnassignedUsers({ allUsers, coupleRoot }), [allUsers, coupleRoot]);

  useEffect(() => {
    (async () => {
      try {
        const response = await api.get('/users');
        setAllUsers(response.data || []);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    })();
  }, []);

  const confirmAssign = async () => {
    if (!pendingAssign) return;

    try {
      setLoading(true);
      await api.post('/network/assign', {
        userId: pendingAssign.userId,
        leaderId: pendingAssign.leaderId
      });

      setAllUsers(prev => prev.filter(u => u.id !== pendingAssign.userId));
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
      setAllUsers(prev => prev.filter(u => u.id !== userId));
      onNetworkChange?.();
    } catch (error) {
      console.error('Error assigning user:', error);
    }
  };

  const handleUnassignedModalOpen = () => {
    // Open modal with current network's root leader as selected if available
    setSelectedLeaderForModal(coupleRoot);
    setUnassignedOpen(true);
  };

  const handleAddUserToNode = (node) => {
    setSelectedLeaderForModal(node);
    setUnassignedOpen(true);
  };

  const handleRemoveUser = async (partner) => {
    if (!window.confirm(`¿Estás seguro de que deseas remover a ${partner.fullName} de la red de discipulado?`)) return;
    try {
      setLoading(true);
      await api.delete(`/network/remove/${partner.id}`);
      onNetworkChange?.();
      const response = await api.get('/users');
      setAllUsers(response.data || []);
    } catch (error) {
      console.error('Error removing user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLeader = (leader) => {
    setSelectedLeaderForModal(leader);
  };

  const toggleNodeExpansion = (nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Red de Discipulado</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {network.partners && network.partners.length > 1 
                ? `${network.partners[0].fullName} & ${network.partners[1].fullName}`
                : network.fullName} • {unassigned.length} usuarios sin asignar
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Unassigned users button */}
            <button
              onClick={handleUnassignedModalOpen}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors shadow-sm"
              title={`${selectedLeaderForModal ? `Asignar usuarios a ${selectedLeaderForModal.partners?.map(p => p.fullName).join(' & ')}` : 'Ver usuarios sin asignar (selecciona un líder con Shift+click para asignar)'}`}
            >
              <UsersThree size={18} />
              <span className="font-medium">Sin Asignar</span>
              <span className="bg-amber-600 px-2 py-0.5 rounded-full text-xs font-bold">
                {unassigned.length}
              </span>
            </button>

            {/* View switcher */}
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden shadow-sm">
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors ${view === VIEW_TREE
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                onClick={() => setView(VIEW_TREE)}
                title="Vista Árbol"
              >
                <FlowArrow size={16} className="inline mr-2" />
                Árbol
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium border-l border-gray-200 dark:border-gray-600 transition-colors ${view === VIEW_RADIAL
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                onClick={() => setView(VIEW_RADIAL)}
                title="Vista Radial"
              >
                <div className="inline mr-2">⭕</div>
                Radial
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium border-l border-gray-200 dark:border-gray-600 transition-colors ${view === VIEW_CARDS
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                onClick={() => setView(VIEW_CARDS)}
                title="Vista de Tarjetas"
              >
                <CardsThree size={16} className="inline mr-2" />
                Tarjetas
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        {view === VIEW_TREE && (
          <div className="p-6">
            <div className="mb-4 flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <CaretDown size={14} />
                <span>Ministerio de</span>
              </div>
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
    </div>
  );
}
