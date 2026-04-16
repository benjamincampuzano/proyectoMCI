import { useState } from 'react';
import { Warning, Spinner, UserMinus } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Modal from './ui/Modal';

const RemoveUserDialog = ({ isOpen, onClose, user, onUserRemoved }) => {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleRemoveUser = async () => {
        try {
            setSubmitting(true);
            setError(null);
            const response = await api.delete(`/network/remove/${user.id}`);
            const data = response.data;

            toast.success(data.message);
            if (onUserRemoved) {
                onUserRemoved();
            }
            handleClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setError(null);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Confirmar Eliminación"
            size="sm"
        >
            <Modal.Content>
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <p className="text-[14px] weight-510 text-[var(--ln-text-secondary)]">
                        ¿Estás seguro de que deseas remover a este usuario de la red?
                    </p>

                    {/* User Info Card */}
                    <div className="bg-[var(--ln-bg-panel)]/50 border border-[var(--ln-border-standard)] rounded-2xl p-5 group hover:border-[var(--ln-border-primary)] transition-all">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-[15px] weight-590 text-[var(--ln-text-primary)]">{user?.fullName}</h3>
                            <p className="text-[13px] weight-510 text-[var(--ln-text-tertiary)]">{user?.email}</p>
                        </div>
                        <div className="mt-4">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] weight-700 uppercase tracking-widest bg-[var(--ln-brand-indigo)]/10 text-[var(--ln-brand-indigo)] border border-[var(--ln-brand-indigo)]/20">
                                {Array.isArray(user?.roles) ? user.roles[0]?.replace(/_/g, ' ') : user?.role?.replace(/_/g, ' ') || 'Usuario'}
                            </span>
                        </div>
                    </div>

                    {/* Security Warning */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex gap-4">
                        <Warning className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-[11px] weight-700 text-amber-600 uppercase tracking-widest">Aviso Importante</p>
                            <p className="text-[13px] weight-510 text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                                El usuario será removido de esta red. Si tiene discípulos a cargo, estos **permanecerán** bajo su liderazgo.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs weight-590 animate-shake">
                            {error}
                        </div>
                    )}
                </div>
            </Modal.Content>

            <Modal.Footer className="flex justify-end gap-3">
                <button
                    onClick={handleClose}
                    disabled={submitting}
                    className="px-4 py-2 text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] weight-510 text-sm transition-all"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleRemoveUser}
                    disabled={submitting}
                    className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-xl weight-590 text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-red-500/10"
                >
                    {submitting ? (
                        <Spinner className="w-4 h-4 animate-spin" />
                    ) : (
                        <UserMinus className="w-4 h-4" weight="bold" />
                    )}
                    Remover Usuario
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default RemoveUserDialog;
