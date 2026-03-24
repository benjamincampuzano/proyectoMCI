import React, { useMemo, useState, useCallback } from 'react';
import { canAddToNode, canRemoveFromNode } from '../utils/permissions';

const ROLE_COLORS = {
  PASTOR: { primary: '#059669', bg: '#f0fdf4', border: '#16a34a' },
  LIDER_DOCE: { primary: '#d97706', bg: '#fffbeb', border: '#d97706' },
  LIDER_CELULA: { primary: '#2563eb', bg: '#eff6ff', border: '#3b82f6' },
  DISCIPULO: { primary: '#9333ea', bg: '#faf5ff', border: '#a855f7' },
  DEFAULT: { primary: '#4b5563', bg: '#f9fafb', border: '#6b7280' }
};

const getRoleColor = (roles = []) => {
  const priority = ['PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO'];
  for (const r of priority) {
    if (roles.includes(r)) return ROLE_COLORS[r];
  }
  return ROLE_COLORS.DEFAULT;
};

// Simple radial layout without external libs
function layoutRadial(root, expandedNodes, radiusStep = 160) {
  const nodes = [];
  const links = [];

  function dfs(node, depth, parent, angleStart, angleEnd) {
    const angle = (angleStart + angleEnd) / 2;
    const r = depth * radiusStep;
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    nodes.push({ node, depth, x, y });
    if (parent) links.push({ source: parent, target: { node, x, y } });

    const isExpanded = expandedNodes.has(node.id);
    if (!isExpanded) return;

    const children = node.disciples || [];
    const step = (angleEnd - angleStart) / Math.max(1, children.length);
    children.forEach((child, i) => {
      const start = angleStart + i * step;
      const end = angleStart + (i + 1) * step;
      dfs(child, depth + 1, { node, x, y }, start, end);
    });
  }

  // Start with full circle for children; root at center
  dfs(root, 0, null, 0, 2 * Math.PI);
  return { nodes, links };
}

export default function RadialView({ root, currentUser, onAddUser, onRemoveUser, size = 1000 }) {
  const [expandedNodes, setExpandedNodes] = useState(new Set([root.id]));
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const { nodes, links } = useMemo(() => layoutRadial(root, expandedNodes), [root, expandedNodes]);
  const center = { x: size / 2, y: size / 2 };

  const toggleNode = useCallback((nodeId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  // Zoom handler
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    const delta = -e.deltaY * zoomSpeed;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(5, prev.scale + delta))
    }));
  };

  // Pan handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    setTransform(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy
    }));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const canCache = new Map();
  function computePerms(n) {
    if (canCache.has(n.id)) return canCache.get(n.id);
    const perms = {
      add: canAddToNode({ node: n, ancestors: [], currentUser }),
      remove: canRemoveFromNode({ node: n, ancestors: [], currentUser, level: 0 })
    };
    canCache.set(n.id, perms);
    return perms;
  }

  return (
    <div 
      className="w-full h-[800px] overflow-hidden bg-white dark:bg-gray-900 rounded-xl shadow-inner border border-gray-100 dark:border-gray-800 relative cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Zoom controls overlay */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <button 
          onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(5, prev.scale + 0.2) }))}
          className="w-10 h-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-full shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center font-bold text-xl hover:bg-white dark:hover:bg-gray-700 transition-colors"
        >
          +
        </button>
        <button 
          onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(0.1, prev.scale - 0.2) }))}
          className="w-10 h-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-full shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center font-bold text-xl hover:bg-white dark:hover:bg-gray-700 transition-colors"
        >
          -
        </button>
        <button 
          onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
          className="w-10 h-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-full shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs hover:bg-white dark:hover:bg-gray-700 transition-colors"
        >
          RESET
        </button>
      </div>

      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="mx-auto block text-gray-900 dark:text-gray-100">
        <g transform={`translate(${center.x + transform.x}, ${center.y + transform.y}) scale(${transform.scale})`}>
          {/* links */}
          {links.map((l, idx) => (
            <line 
              key={idx} 
              x1={l.source.x} y1={l.source.y} 
              x2={l.target.x} y2={l.target.y} 
              stroke="currentColor" 
              strokeWidth={1.5 / transform.scale} 
              strokeOpacity={0.2}
            />
          ))}

          {/* nodes */}
          {nodes.map((n, idx) => {
            const guests = (n.node.guests?.assigned?.length || 0) + (n.node.guests?.invited?.length || 0);
            const disciplesCount = n.node.disciples?.length || 0;
            const label = n.node.partners.map(p => p.fullName).join(' y ');
            const perms = computePerms(n.node);
            const r = 20;
            const isExpanded = expandedNodes.has(n.node.id);
            const hasChildren = disciplesCount > 0;
            const colors = getRoleColor(n.node.roles);

            return (
              <g 
                key={n.node.id || idx} 
                transform={`translate(${n.x}, ${n.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(n.node.id);
                }}
                className="cursor-pointer transition-transform duration-200 hover:scale-110"
              >
                {/* Circle with role color */}
                <circle 
                  r={r} 
                  fill={colors.bg} 
                  stroke={colors.primary} 
                  strokeWidth={2} 
                />
                
                {/* Expand/Collapse indicator if has children */}
                {hasChildren && (
                  <circle 
                    r={6} 
                    cx={r * 0.7} 
                    cy={-r * 0.7} 
                    fill={isExpanded ? "#ef4444" : "#10b981"} 
                    className="stroke-white dark:stroke-gray-900"
                  />
                )}

                <title>
                  {label}{'\n'}
                  Roles: {n.node.roles?.join(', ') || 'Sin rol'}{'\n'}
                  Discípulos: {disciplesCount}{'\n'}
                  Invitados: {guests}
                </title>

                {perms.add && (
                  <text 
                    y={5} 
                    textAnchor="middle" 
                    fontSize="14" 
                    fontWeight="bold"
                    fill={colors.primary} 
                    style={{ pointerEvents: 'none' }}
                  >
                    +
                  </text>
                )}

                {/* label below */}
                <text 
                  y={r + 14} 
                  textAnchor="middle" 
                  fontSize={11 / Math.sqrt(transform.scale)} 
                  fontWeight="600"
                  fill="currentColor"
                  className="select-none"
                >
                  {label}
                </text>
                
                {/* Disciples count indicator */}
                {disciplesCount > 0 && (
                  <text 
                    y={r + 26} 
                    textAnchor="middle" 
                    fontSize={9 / Math.sqrt(transform.scale)} 
                    fill="currentColor" 
                    className="opacity-60"
                  >
                    {disciplesCount} {disciplesCount === 1 ? 'discípulo' : 'discípulos'}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}