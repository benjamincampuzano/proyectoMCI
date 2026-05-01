import React, { useMemo, useState, useCallback, useRef } from 'react';
import { canAddToNode, canRemoveFromNode } from '../../utils/permissions';

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

// Returns the total number of visible leaf slots in a subtree.
// A leaf (no children, or collapsed) counts as 1.
// A node with children counts as the sum of its children's weights.
// Minimum weight of 1 ensures nodes always get some angular space.
function subtreeWeight(node, expandedNodes) {
  const isExpanded = expandedNodes.has(node.id);
  if (!isExpanded) return 1;

  const children = getChildren(node);
  if (children.length === 0) return 1;

  return children.reduce((sum, child) => sum + subtreeWeight(child, expandedNodes), 0);
}

function getChildren(node) {
  return [
    ...(node.disciples || []),
    ...(node.guests?.assigned?.map(g => ({
      ...g, isGuest: true,
      id: `guest-assigned-${g.id}`,
      partners: [{ fullName: g.name }]
    })) || []),
    ...(node.guests?.invited?.map(g => ({
      ...g, isGuest: true,
      id: `guest-invited-${g.id}`,
      partners: [{ fullName: g.name }]
    })) || [])
  ];
}

function layoutRadial(root, expandedNodes, radiusStep = 160) {
  const nodes = [];
  const links = [];

  // Minimum arc length per leaf node (in radians) to avoid tight clusters.
  // At depth 1 with radius=160, arc = radius * angle, so MIN_ARC / radius gives min angle.
  const MIN_ARC = 48; // px — roughly node diameter + padding

  function dfs(node, depth, parent, angleStart, angleEnd) {
    const angle = (angleStart + angleEnd) / 2;
    const r = depth * radiusStep;
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    nodes.push({ node, depth, x, y });
    if (parent) links.push({ source: parent, target: { node, x, y } });

    const isExpanded = expandedNodes.has(node.id);
    if (!isExpanded) return;

    const children = getChildren(node);
    if (children.length === 0) return;

    const childRadius = (depth + 1) * radiusStep;

    // Compute weight for each child subtree
    const weights = children.map(c => subtreeWeight(c, expandedNodes));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    // Available arc span — may need to grow if MIN_ARC constraint demands it
    const requestedSpan = angleEnd - angleStart;

    // Minimum angle per unit weight so nodes don't overlap at this radius
    const minAnglePerWeight = MIN_ARC / childRadius;
    const minTotalAngle = totalWeight * minAnglePerWeight;

    // Use the larger of requested span or min required span
    const span = Math.max(requestedSpan, minTotalAngle);

    // Re-center the (potentially expanded) span around the midpoint
    const mid = (angleStart + angleEnd) / 2;
    const adjustedStart = mid - span / 2;

    let cursor = adjustedStart;
    children.forEach((child, i) => {
      const childAngle = (weights[i] / totalWeight) * span;
      dfs(child, depth + 1, { node, x, y }, cursor, cursor + childAngle);
      cursor += childAngle;
    });
  }

  dfs(root, 0, null, 0, 2 * Math.PI);
  return { nodes, links };
}

// ─── Animated primitives using WAAPI (no extra deps) ─────────────────────────

/**
 * AnimatedNode: smoothly animates position (tx,ty) and opacity.
 * - First mount : spring pop-in
 * - Position change : slide to new coords
 * - Opacity change : crossfade dim ↔ bright
 */
function AnimatedNode({ tx, ty, opacity = 1, nodeKey, children, onClick }) {
  const ref = useRef(null);
  const prevPos = useRef({ x: tx, y: ty });
  const prevOpacity = useRef(opacity);
  const mountedRef = useRef(false);

  React.useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    if (!mountedRef.current) {
      el.animate(
        [
          { opacity: 0, transform: `translate(${tx}px, ${ty}px) scale(0.2)` },
          { opacity, transform: `translate(${tx}px, ${ty}px) scale(1.1)` },
          { opacity, transform: `translate(${tx}px, ${ty}px) scale(1)` }
        ],
        { duration: 420, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' }
      );
      mountedRef.current = true;
    } else {
      const from = prevPos.current;
      const fromOp = prevOpacity.current;
      if (from.x !== tx || from.y !== ty || fromOp !== opacity) {
        el.animate(
          [
            { opacity: fromOp, transform: `translate(${from.x}px, ${from.y}px)` },
            { opacity, transform: `translate(${tx}px, ${ty}px)` }
          ],
          { duration: 480, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
        );
      }
    }
    prevPos.current = { x: tx, y: ty };
    prevOpacity.current = opacity;
  }, [tx, ty, opacity]);

  return (
    <g
      ref={ref}
      style={{ transform: `translate(${tx}px, ${ty}px)`, opacity, cursor: 'pointer' }}
      onClick={onClick}
    >
      {children}
    </g>
  );
}

/**
 * AnimatedLine: animates opacity changes smoothly via WAAPI.
 */
function AnimatedLine({ x1, y1, x2, y2, strokeWidth, opacity = 1, lineKey }) {
  const ref = useRef(null);
  const prev = useRef({ x1, y1, x2, y2, opacity });
  const mounted = useRef(false);

  React.useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    if (!mounted.current) {
      el.animate(
        [{ opacity: 0 }, { opacity }],
        { duration: 300, easing: 'ease', fill: 'forwards' }
      );
      mounted.current = true;
    } else {
      const p = prev.current;
      const changed = p.x1 !== x1 || p.y1 !== y1 || p.x2 !== x2 || p.y2 !== y2 || p.opacity !== opacity;
      if (changed) {
        el.animate(
          [
            { opacity: p.opacity, transform: `translate(${p.x1 - x1}px, ${p.y1 - y1}px)` },
            { opacity, transform: `translate(0px, 0px)` }
          ],
          { duration: 450, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
        );
      }
    }
    prev.current = { x1, y1, x2, y2, opacity };
    el.setAttribute('x1', x1);
    el.setAttribute('y1', y1);
    el.setAttribute('x2', x2);
    el.setAttribute('y2', y2);
  }, [x1, y1, x2, y2, opacity]);

  return (
    <line
      ref={ref}
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeOpacity={0.25}
      style={{ opacity }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RadialView({ root, currentUser, onAddUser, onRemoveUser, size = 1000 }) {
  const [expandedNodes, setExpandedNodes] = useState(new Set([root.id]));
  const [focusedNodeId, setFocusedNodeId] = useState(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // radiusStep aumentado para separar mejor los anillos
  const { nodes, links } = useMemo(() => layoutRadial(root, expandedNodes, 190), [root, expandedNodes]);
  const center = { x: size / 2, y: size / 2 };

  // Construye un Set con los IDs que deben estar "iluminados" cuando hay foco:
  // el nodo foco + sus hijos directos + su padre directo
  const litNodeIds = useMemo(() => {
    if (!focusedNodeId) return null;
    const lit = new Set([focusedNodeId]);

    // Buscar el nodo foco en el árbol para obtener hijos y padre
    function findInTree(node, targetId, parent) {
      if (node.id === targetId) {
        // hijos directos
        getChildren(node).forEach(c => lit.add(c.id));
        // padre
        if (parent) lit.add(parent.id);
        return true;
      }
      for (const child of getChildren(node)) {
        if (findInTree(child, targetId, node)) return true;
      }
      return false;
    }
    findInTree(root, focusedNodeId, null);
    return lit;
  }, [focusedNodeId, root]);

  const toggleNode = useCallback((nodeId) => {
    setFocusedNodeId(prev => prev === nodeId ? null : nodeId);
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const handleWheel = (e) => {
    const delta = -e.deltaY * 0.001;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(5, prev.scale + delta))
    }));
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const canCache = useRef(new Map());
  function computePerms(n) {
    if (canCache.current.has(n.id)) return canCache.current.get(n.id);
    const perms = {
      add: canAddToNode({ node: n, ancestors: [], currentUser }),
      remove: canRemoveFromNode({ node: n, ancestors: [], currentUser, level: 0 })
    };
    canCache.current.set(n.id, perms);
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
      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        {[
          { label: '+', action: () => setTransform(p => ({ ...p, scale: Math.min(5, p.scale + 0.2) })) },
          { label: '−', action: () => setTransform(p => ({ ...p, scale: Math.max(0.1, p.scale - 0.2) })) },
          { label: '⌂', action: () => setTransform({ x: 0, y: 0, scale: 1 }) }
        ].map(({ label, action }) => (
          <button
            key={label}
            onClick={action}
            className="w-10 h-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-full shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center font-bold text-xl hover:bg-white dark:hover:bg-gray-700 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      <svg
        width="100%" height="100%"
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto block text-gray-900 dark:text-gray-100"
        onClick={() => setFocusedNodeId(null)}
      >
        {/*
          We use a <g> with a static translate to center,
          and handle pan/zoom via a nested <g> with inline style transform.
          This way WAAPI animations on child nodes use pixel coords relative
          to the radial origin (0,0), keeping math simple.
        */}
        <g transform={`translate(${center.x}, ${center.y})`}>
          <g style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transition: isDragging ? 'none' : 'transform 0.05s linear'
          }}>

            {/* Links */}
            {links.map((l, idx) => {
              const key = `${l.source.node?.id ?? 'root'}-${l.target.node?.id ?? idx}`;
              const isLit = !litNodeIds ||
                litNodeIds.has(l.source.node?.id) ||
                litNodeIds.has(l.target.node?.id);
              return (
                <AnimatedLine
                  key={key}
                  lineKey={key}
                  x1={l.source.x} y1={l.source.y}
                  x2={l.target.x} y2={l.target.y}
                  strokeWidth={1.5 / transform.scale}
                  opacity={isLit ? 1 : 0.08}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((n, idx) => {
              const isGuest = n.node.isGuest;
              const guestsCount = (n.node.guests?.assigned?.length || 0) + (n.node.guests?.invited?.length || 0);
              const disciplesCount = n.node.disciples?.length || 0;
              const label = n.node.partners
                ? n.node.partners.map(p => p.fullName).join(' y ')
                : n.node.name;
              const perms = isGuest ? { add: false, remove: false } : computePerms(n.node);
              const r = isGuest ? 12 : 20;
              const isExpanded = expandedNodes.has(n.node.id);
              const isFocused = n.node.id === focusedNodeId;
              const hasChildren = disciplesCount > 0;
              const colors = isGuest
                ? { primary: '#10b981', bg: '#f0fdf4', border: '#16a34a' }
                : getRoleColor(n.node.roles);
              const nodeKey = String(n.node.id ?? idx);

              // Opacidad: si hay foco y este nodo no está en el grupo iluminado → dim
              const nodeOpacity = litNodeIds
                ? (litNodeIds.has(n.node.id) ? 1 : 0.15)
                : 1;

              return (
                <AnimatedNode
                  key={nodeKey}
                  nodeKey={nodeKey}
                  tx={n.x}
                  ty={n.y}
                  opacity={nodeOpacity}
                  onClick={(e) => { e.stopPropagation(); toggleNode(n.node.id); }}
                >
                  {/* Main circle */}
                  <circle
                    r={r}
                    fill={colors.bg}
                    stroke={colors.primary}
                    strokeWidth={isFocused ? 3 : 2}
                    style={{ transition: 'stroke-width 0.2s ease' }}
                  />

                  {/* Focus highlight ring */}
                  {isFocused && (
                    <circle
                      r={r + 10}
                      fill="none"
                      stroke={colors.primary}
                      strokeWidth={2}
                      strokeOpacity={0.6}
                    >
                      <animate attributeName="r" values={`${r + 8};${r + 14};${r + 8}`} dur="1.8s" repeatCount="indefinite" />
                      <animate attributeName="stroke-opacity" values="0.6;0.1;0.6" dur="1.8s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Pulse ring when expanded */}
                  {isExpanded && hasChildren && (
                    <circle
                      r={r + 6}
                      fill="none"
                      stroke={colors.primary}
                      strokeWidth={1.5}
                      strokeOpacity={0.4}
                      strokeDasharray="4 3"
                    >
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0" to="360"
                        dur="8s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Expand/collapse badge */}
                  {hasChildren && (
                    <circle
                      r={6}
                      cx={r * 0.7}
                      cy={-r * 0.7}
                      fill={isExpanded ? '#ef4444' : '#10b981'}
                      stroke="white"
                      strokeWidth={1.5}
                    >
                      <animate
                        attributeName="r"
                        values="6;7;6"
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Guest-count badge */}
                  {!isGuest && n.node.roles?.includes('DISCIPULO') && guestsCount > 0 && (
                    <circle
                      r={4}
                      cx={-r * 0.7}
                      cy={-r * 0.7}
                      fill="#10b981"
                      stroke="white"
                      strokeWidth={1}
                    />
                  )}

                  <title>
                    {label}{'\n'}
                    Roles: {n.node.roles?.join(', ') || 'Sin rol'}{'\n'}
                    Discípulos: {disciplesCount}{'\n'}
                    Invitados: {guestsCount}
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
                </AnimatedNode>
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
}
