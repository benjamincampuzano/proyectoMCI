
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

  const coupleRoot = useMemo(() => {
    const fullNetwork = buildCoupleNetwork(network);
    return getRootNodeForRole(fullNetwork, currentUser);
  }, [network, currentUser]);
  
  const unassigned = useMemo(() => {
    const result = getUnassignedUsers({ allUsers, coupleRoot });
    console.log('NetworkTree - getUnassignedUsers:', result.length, 'users');
    return result;
  }, [allUsers, coupleRoot]);

  useEffect(() => {
    (async () => {
      try {
        // Obtener todos los usuarios sin límite (usar limite muy alto)
        const response = await api.get('/users?limit=99999');
        const usersData = response.data?.users || response.data || [];
        setAllUsers(Array.isArray(usersData) ? usersData : []);
        console.log('NetworkTree - loaded users:', usersData.length);
      } catch (error) {
        console.error('Error loading users:', error);
        setAllUsers([]);
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

  const handleRemoveUser = (partner) => {
    setPartnerToRemove(partner);
    setShowRemoveConfirm(true);
  };

  const performRemoveUser = async () => {
    try {
      setLoading(true);
      await api.delete(`/network/remove/${partnerToRemove.id}`);
      onNetworkChange?.();
      const response = await api.get('/users');
      setAllUsers(Array.isArray(response.data) ? response.data : []);
      setShowRemoveConfirm(false);
      setPartnerToRemove(null);
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
