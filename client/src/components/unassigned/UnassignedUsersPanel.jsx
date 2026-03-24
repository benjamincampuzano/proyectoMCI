
// components/unassigned/UnassignedUsersPanel.jsx
import React,{useMemo,useState}from'react';import{X,MagnifyingGlass}from'@phosphor-icons/react';import{getUnassignedUsers}from'../../utils/unassigned';
export default function Panel({open,onClose,coupleRoot,allUsers=[]}){
 const[search,setSearch]=useState('');
 const unassigned=useMemo(()=>getUnassignedUsers({allUsers,coupleRoot}),[allUsers,coupleRoot]);
 const filtered=useMemo(()=>!search?unassigned:unassigned.filter(u=>u.fullName.toLowerCase().includes(search.toLowerCase())),[search,unassigned]);
 return(<div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-xl transition-transform ${open?'translate-x-0':'translate-x-full'}`}>
  <div className='p-3 border-b flex justify-between'><h3>Sin asignar ({filtered.length})</h3><button onClick={onClose}><X/></button></div>
  <div className='p-3 border-b'><div className='relative'><MagnifyingGlass className='absolute left-2 top-2'/><input value={search} onChange={e=>setSearch(e.target.value)} className='pl-8 border w-full'/></div></div>
  <div className='p-3 overflow-y-auto'>
   {filtered.map(u=>(<div key={u.id} draggable onDragStart={e=>{e.dataTransfer.setData('application/x-user',JSON.stringify({id:u.id,name:u.fullName}));}} className='border p-2 mb-2'>{u.fullName}</div>))}
  </div>
 </div>);
}
