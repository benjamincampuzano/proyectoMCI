import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, X, UserPlusIcon} from '@phosphor-icons/react';
import api from '../utils/api';

const MultiUserSelect = ({ value = [], onChange, label, placeholder = "Seleccionar usuarios...", roleFilter }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen, searchTerm, roleFilter]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Load selected users details when value changes
    useEffect(() => {
        if (value && value.length > 0) {
            fetchSelectedUsers(value);
        } else {
            setSelectedUsers([]);
        }
    }, [value]);

    const fetchUsers = async () => {
        if (!searchTerm && !isOpen) return; // Don't fetch if closed and no search
        
        setLoading(true);
        try {
            const params = {
                search: searchTerm,
                limit: 20
            };

            if (roleFilter) {
                params.role = roleFilter;
            }

            const res = await api.get('/users/search', { params });
            let results = Array.isArray(res.data) ? res.data : [];

            // Filter out already selected users
            const filteredUsers = results.filter(user => !value.includes(user.id));

            setUsers(filteredUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSelectedUsers = async (userIds) => {
        if (!userIds || userIds.length === 0) return;
        
        try {
            // Fetch users one by one or using search if many.
            // For now, since we usually have few selected, and searching by ID isn't directly supported in a single call easily without a specific endpoint,
            // we use the search endpoint with names or just accept the current limitation but optimized.
            // Better: use /users and rely on backend pagination if it were better, 
            // but for now let's use search with an empty term to get a subset or keep it simple if the list is small.
            
            // Optimization: If we have the users in the current 'users' list, we can take them.
            // But usually we need to fetch them from DB for the initial load.
            const res = await api.get('/users', { params: { limit: 100 } }); // Fetch a larger batch but not ALL if possible
            const selected = Array.isArray(res.data?.users) ? res.data.users.filter(user => userIds.includes(user.id)) : [];
            setSelectedUsers(selected);
        } catch (error) {
            console.error('Error fetching selected users:', error);
        }
    };

    const handleSelect = (user) => {
        const newValue = [...value, user.id];
        onChange(newValue);
        setSearchTerm('');
    };

    const handleRemove = (userId) => {
        const newValue = value.filter(id => id !== userId);
        onChange(newValue);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {label && (
                <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80 mb-2">
                    {label}
                </label>
            )}

            {/* Selected Users Display */}
            {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {selectedUsers.map(user => (
                        <div
                            key={user.id}
                            className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-600 text-[#1d1d1f] dark:text-white px-3 py-1 rounded-full text-sm"
                        >
                            <span>{user.fullName}</span>
                            <button
                                onClick={() => handleRemove(user.id)}
                                className="hover:bg-blue-700 rounded-full p-0.5"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input/Dropdown Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsOpen(!isOpen)}
                role="combobox"
                tabIndex={0}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                className="w-full px-4 py-2 bg-white dark:bg-[#1d1d1f] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg text-[#1d1d1f] dark:text-white cursor-pointer flex items-center justify-between hover:border-[#0071e3] transition-colors"
            >
                <span className="text-[#86868b] dark:text-[#98989d]">{placeholder}</span>
                <UserPlusIcon size={20} className="text-[#86868b] dark:text-[#98989d]" />
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-[#272729] border border-[#d1d1d6] dark:border-[#3a3a3c] rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-gray-200 dark:border-[#3a3a3c]">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar..."
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-[#d1d1d6] dark:border-gray-600 rounded-lg text-[#1d1d1f] dark:text-white text-sm focus:outline-none focus:border-[#0071e3]"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-[#86868b] dark:text-[#98989d]">Cargando...</div>
                        ) : users.length === 0 ? (
                            <div className="p-4 text-center text-[#86868b] dark:text-[#98989d]">No se encontraron usuarios</div>
                        ) : (
                            users.map((user) => (
                                <div
                                    key={user.id}
                                    onClick={() => handleSelect(user)}
                                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelect(user)}
                                    role="option"
                                    tabIndex={0}
                                    className="px-4 py-3 hover:bg-[#f5f5f7] dark:hover:bg-[#272729] cursor-pointer border-b border-gray-200 dark:border-[#3a3a3c] last:border-b-0"
                                >
                                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-white">{user.fullName}</p>
                                    <p className="text-xs text-[#86868b] dark:text-[#98989d]">{user.email}</p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                        {Array.isArray(user.roles) ? user.roles.join(', ').replace(/_/g, ' ') : (typeof user.role === 'string' ? user.role.replace(/_/g, ' ') : (Array.isArray(user.role) ? user.role.join(', ').replace(/_/g, ' ') : 'Usuario'))}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiUserSelect;
