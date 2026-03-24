
// utils/permissions.js
export function isSelfOrPartner(node, currentUserId){return node?.partners?.some(p=>p.id===currentUserId);} 
export function isAncestorOrSelfPartner(anc,node,id){return isSelfOrPartner(node,id)||anc?.some(a=>isSelfOrPartner(a,id));}
export function canAddToNode({node,ancestors=[],currentUser}){
 const r=currentUser?.roles||[];const id=currentUser?.id;
 if(r.includes('ADMIN'))return true;
 if(r.includes('PASTOR')||r.includes('LIDER_DOCE')||r.includes('LIDER_CELULA'))return isAncestorOrSelfPartner(ancestors,node,id);
 return false;}
export function canRemoveFromNode({node,ancestors=[],currentUser,level=0}){
 const r=currentUser?.roles||[];const id=currentUser?.id;
 if(level===0)return false;
 if(r.includes('ADMIN'))return true;
 if(r.includes('PASTOR')||r.includes('LIDER_DOCE')||r.includes('LIDER_CELULA'))return isAncestorOrSelfPartner(ancestors,node,id);
 return false;}
export function canManageAssignments(u){const r=u?.roles||[];return r.includes('ADMIN')||r.includes('PASTOR')||r.includes('LIDER_DOCE')||r.includes('LIDER_CELULA');}
