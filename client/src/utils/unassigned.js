
// utils/unassigned.js
function collect(root){const s=new Set();(function dfs(n){if(!n)return; n.partners?.forEach(p=>s.add(p.id)); n.disciples?.forEach(dfs);} )(root); return s;}
export function getUnassignedUsers({allUsers=[],coupleRoot}){if(!coupleRoot)return[];const ids=collect(coupleRoot);return Array.isArray(allUsers) ? allUsers.filter(u=>!ids.has(u.id)) : [];}
