
// components/tree/CoupleNodeTree.jsx
import React, { useState, memo } from 'react';
import CoupleCard from './CoupleCard';
import GuestNode from './GuestNode';
import { canAddToNode, canRemoveFromNode, canManageAssignments } from '../utils/permissions';

export default memo(function CoupleNodeTree({ 
  node, 
  level = 0, 
  currentUser, 
  ancestors = [], 
  onAddUser, 
  onRemoveUser, 
  onDropUser,
  expandedNodes,
  onToggleNode,
  onSelectLeader,
  selectedLeader
}) {
  const [localExpanded, setLocalExpanded] = useState(level < 2);
  
  const isExpanded = expandedNodes?.has(node.id) ?? localExpanded;
  const canAdd = canAddToNode({ node, ancestors, currentUser });
  const canRemove = canRemoveFromNode({ node, ancestors, currentUser, level });
  const canManage = canManageAssignments(currentUser);

  const handleToggle = () => {
    if (onToggleNode) {
      onToggleNode(node.id);
    } else {
      setLocalExpanded(!isExpanded);
    }
  };

  const handleSelectLeader = () => {
    if (onSelectLeader) {
      onSelectLeader(node);
    }
  };

  const handleDropUser = (data) => {
    if (!node) {
      console.error('Node is undefined in CoupleNodeTree handleDropUser');
      return;
    }
    onDropUser({
      user: data.user,
      targetNode: node,
      ancestors: [...ancestors, node]
    });
  };

  return (
    <div className={`${level > 0 ? 'ml-2 mt-1' : ''}`}>
      {/* Connection line for child nodes */}
      {level > 0 && (
        <div className="absolute left-0 top-0 w-3 h-3 border-l-2 border-b-2 border-gray-400 dark:border-gray-600 rounded-bl-lg" />
      )}
      
      {/* Node card */}
      <div className="relative">
        <CoupleCard 
          node={node} 
          expanded={isExpanded}
          onToggle={handleToggle}
          canAdd={canAdd}
          canRemove={canRemove}
          onAdd={() => onAddUser(node)} 
          onRemovePartner={(partner) => onRemoveUser(partner)}
          onDropUser={handleDropUser}
          canManageAssignments={canManage}
          onSelectLeader={handleSelectLeader}
          isSelected={selectedLeader?.id === node.id}
        />
      </div>

      {/* Children section */}
      {isExpanded && (node.disciples?.length > 0 || (node.guests?.assigned?.length > 0 || node.guests?.invited?.length > 0)) && (
        <div className="relative mt-2 pl-3">
          {/* Vertical line for children */}
          <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-gray-400 dark:bg-gray-600" />
          
          <div className="flex flex-col gap-3">
            {/* Disciples */}
            {node.disciples?.map((child) => (
              <div key={child.id} className="relative">
                <div className="absolute left-0 top-6 w-1.5 h-0.5 bg-gray-400 dark:bg-gray-600" />
                <div className="ml-1 min-w-[280px] flex-1">
                  <CoupleNodeTree 
                    node={child} 
                    level={level + 1}
                    currentUser={currentUser}
                    ancestors={[...ancestors, node]} 
                    onAddUser={onAddUser}
                    onRemoveUser={onRemoveUser}
                    onDropUser={onDropUser}
                    expandedNodes={expandedNodes}
                    onToggleNode={onToggleNode}
                    onSelectLeader={onSelectLeader}
                    selectedLeader={selectedLeader}
                  />
                </div>
              </div>
            ))}

            {/* Guests (Assigned) */}
            {node.guests?.assigned?.map((guest) => (
              <div key={`assigned-${guest.id}`} className="relative">
                <div className="absolute left-0 top-6 w-1.5 h-0.5 bg-gray-400 dark:bg-gray-600" />
                <div className="ml-1 min-w-[280px] flex-1">
                  <GuestNode guest={guest} />
                </div>
              </div>
            ))}

            {/* Guests (Invited by) */}
            {node.guests?.invited?.map((guest) => (
              <div key={`invited-${guest.id}`} className="relative">
                <div className="absolute left-0 top-6 w-1.5 h-0.5 bg-gray-400 dark:bg-gray-600" />
                <div className="ml-1 min-w-[280px] flex-1">
                  <GuestNode guest={guest} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
