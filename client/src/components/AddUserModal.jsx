import { useState, useEffect } from 'react';
import { X, MagnifyingGlass, UserPlus, Spinner } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../utils/api';

/**
 * Modal component for adding users to a leader's network
 * Displays available users and allows selection and assignment
 */
const AddUserModal = ({ isOpen, onClose, leaderId, leaderName, onUserAdded }) => {
    const [availableUsers, setAvailableUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Fetch available users when modal opens
    useEffect(() => {
        if (isOpen && leaderId) {
            fetchAvailableUsers();
        }
    }, [isOpen, leaderId]);

    // Filter users based on search term
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredUsers(availableUsers);
        } else {
            const term = searchTerm.toLowerCase();
            const filtered = availableUsers.filter(user =>
                (user.fullName && user.fullName.toLowerCase().includes(term)) ||
                (user.email && user.email.toLowerCase().includes(term)) ||
                (user.phone && user.phone.includes(term))
            );
            setFilteredUsers(filtered);
        }
    }, [searchTerm, availableUsers]);

    const fetchAvailableUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get(`/network/available-users/${leaderId}`);
            const data = response.data;
            setAvailableUsers(data);
            setFilteredUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignUser = async () => {
        if (!selectedUserId) {
            setError('Por favor selecciona un usuario');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            const response = await api.post('/network/assign', {
                userId: selectedUserId,
                leaderId: leaderId
            });

            const data = response.data;

            // Show success notification
            toast.success(data.message);

            // Notify parent component
            if (onUserAdded) {
                onUserAdded();
            }

            // Close modal
            handleClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setSearchTerm('');
        setSelectedUserId(null);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

const AddUserModal = ({ isOpen, onClose, leaderId, leaderName, onUserAdded }) => {
    const [availableUsers, setAvailableUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && leaderId) {
            fetchAvailableUsers();
        }
    }, [isOpen, leaderId]);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredUsers(availableUsers);
        } else {
            const term = searchTerm.toLowerCase();
            const filtered = availableUsers.filter(user =>
                (user.fullName && user.fullName.toLowerCase().includes(term)) ||
                (user.email && user.email.toLowerCase().includes(term)) ||
                (user.phone && user.phone.includes(term))
            );
            setFilteredUsers(filtered);
        }
    }, [searchTerm, availableUsers]);

    const fetchAvailableUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get(`/network/available-users/${leaderId}`);
            const data = response.data;
            setAvailableUsers(data);
            setFilteredUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignUser = async () => {
        if (!selectedUserId) {
            setError('Por favor selecciona un usuario');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            const response = await api.post('/network/assign', {
                userId: selectedUserId,
                leaderId: leaderId
            });

            const data = response.data;
            toast.success(data.message);
            if (onUserAdded) {
                onUserAdded();
            }
            handleClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setSearchTerm('');
        setSelectedUserId(null);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[4px] z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-[var(--ln-bg-panel)]/95 backdrop-blur-xl rounded-[24px] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-[var(--ln-border-standard)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--ln-border-standard)] bg-white/5">
                    <div>
                        <h2 className="text-xl weight-590 text-[var(--ln-text-primary)] tracking-tight flex items-center gap-2.5">
                            <UserPlus className="w-5 h-5 text-[var(--ln-brand-indigo)]" weight="bold" />
                            Agregar a la Red
                        </h2>
                        <p className="text-[13px] text-[var(--ln-text-tertiary)] mt-1">
                            Añadiendo a la red de: <span className="weight-590 text-[var(--ln-text-primary)]">{leaderName}</span>
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-white/10 transition-all active:scale-95"
                        disabled={submitting}
                    >
                        <X size={20} weight="bold" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="px-8 py-5 border-b border-[var(--ln-border-standard)] bg-white/[0.02]">
                    <div className="relative group">
                        <MagnifyingGlass className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[var(--ln-text-tertiary)] w-4 h-4 transition-colors group-focus-within:text-[var(--ln-brand-indigo)]" weight="bold" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email o teléfono..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] rounded-xl focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-all text-sm placeholder:text-[var(--ln-text-tertiary)]/50"
                            disabled={loading || submitting}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                            <Spinner className="w-8 h-8 text-[var(--ln-brand-indigo)] animate-spin" weight="bold" />
                            <span className="mt-4 text-sm text-[var(--ln-text-tertiary)] tracking-wide">Analizando red de usuarios...</span>
                        </div>
                    ) : error ? (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-sm font-medium animate-in slide-in-from-top-2">
                            {error}
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-20 flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center mb-4 border border-[var(--ln-border-standard)]">
                                <MagnifyingGlass className="w-6 h-6 text-[var(--ln-text-tertiary)] opacity-30" />
                            </div>
                            <p className="text-[var(--ln-text-tertiary)] text-sm max-w-[240px] leading-relaxed">
                                {searchTerm ? 'No se encontraron resultados para tu búsqueda.' : 'No hay usuarios disponibles en este momento.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {filteredUsers.map((user) => (
                                <div
                                    key={user.id}
                                    onClick={() => setSelectedUserId(user.id)}
                                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedUserId(user.id)}
                                    role="button"
                                    tabIndex={0}
                                    className={`
                                        p-4 rounded-xl border transition-all duration-300 group relative overflow-hidden
                                        ${selectedUserId === user.id
                                            ? 'border-[var(--ln-brand-indigo)] bg-[var(--ln-brand-indigo)]/[0.04] shadow-sm'
                                            : 'border-[var(--ln-border-standard)] hover:border-[var(--ln-text-primary)]/20 hover:bg-white/[0.02]'
                                        }
                                    `}
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="weight-590 text-[var(--ln-text-primary)] text-[14px] truncate">{user.fullName}</h3>
                                                {selectedUserId === user.id && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--ln-brand-indigo)] animate-pulse" />
                                                )}
                                            </div>
                                            <p className="text-[12px] text-[var(--ln-text-tertiary)] truncate opacity-70">{user.email}</p>
                                            
                                            {/* Reassignment Warning */}
                                            {(user.pastorId || user.liderDoceId || user.liderCelulaId) && (
                                                <div className="mt-3 p-2.5 rounded-lg bg-amber-500/[0.05] border border-amber-500/10">
                                                    <div className="flex items-center gap-1.5 text-amber-500 text-[10px] weight-590 uppercase tracking-wider mb-1">
                                                        <span>⚠ Reasignación requerida</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-amber-500/70">
                                                        {user.pastor && (
                                                            <div className="flex items-center gap-1">
                                                                <span className="opacity-50">PT:</span>
                                                                <span className="weight-510">{user.pastor.fullName}</span>
                                                            </div>
                                                        )}
                                                        {user.liderDoce && (
                                                            <div className="flex items-center gap-1">
                                                                <span className="opacity-50">L12:</span>
                                                                <span className="weight-510">{user.liderDoce.fullName}</span>
                                                            </div>
                                                        )}
                                                        {user.liderCelula && (
                                                            <div className="flex items-center gap-1">
                                                                <span className="opacity-50">LC:</span>
                                                                <span className="weight-510">{user.liderCelula.fullName}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`
                                                px-2.5 py-1 text-[10px] weight-590 rounded-md border
                                                ${user.roles?.includes('ADMIN') ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                    user.roles?.includes('PASTOR') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                        user.roles?.includes('LIDER_DOCE') ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                                            user.roles?.includes('LIDER_CELULA') ? 'bg-[var(--ln-brand-indigo)]/10 text-[var(--ln-brand-indigo)] border-[var(--ln-brand-indigo)]/20' :
                                                                'bg-white/5 text-[var(--ln-text-tertiary)] border-[var(--ln-border-standard)]'}
                                            `}>
                                                {user.roles ? user.roles[0].replace(/_/g, ' ') : 'Usuario'}
                                            </span>
                                            {user.phone && (
                                                <span className="text-[11px] text-[var(--ln-text-tertiary)] opacity-40">{user.phone}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-[var(--ln-border-standard)] bg-white/[0.04]">
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={handleClose}
                            className="px-5 py-2 text-[13px] weight-510 text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] transition-all"
                            disabled={submitting}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleAssignUser}
                            disabled={!selectedUserId || submitting}
                            className={`
                                px-6 py-2 rounded-xl text-[13px] weight-510 transition-all flex items-center gap-2.5 shadow-lg
                                ${!selectedUserId || submitting 
                                    ? 'bg-white/5 text-[var(--ln-text-tertiary)]/50 cursor-not-allowed border border-[var(--ln-border-standard)] shadow-none' 
                                    : 'bg-[var(--ln-brand-indigo)] text-white hover:bg-[var(--ln-accent-hover)] shadow-[var(--ln-brand-indigo)]/20 active:scale-[0.98]'
                                }
                            `}
                        >
                            {submitting ? (
                                <>
                                    <Spinner className="w-4 h-4 animate-spin" />
                                    <span>Asignando...</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4" weight="bold" />
                                    <span>Agregar a la Red</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddUserModal;
