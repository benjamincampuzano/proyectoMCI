import { useState, useEffect } from 'react';
import { PencilIcon } from '@phosphor-icons/react';
import { Modal } from './ui';
import api from '../utils/api';
import toast from 'react-hot-toast';
import GuestEditForm from './guests/GuestEditForm';

const GuestEditModal = ({ isOpen, onClose, guest, onGuestUpdated }) => {
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        void Promise.resolve().then(() => setCurrentUser(user));
    }, []);

    const canEditAllFields = () => {
        const roles = currentUser?.roles || [];
        return roles.includes('ADMIN') || roles.includes('LIDER_DOCE');
    };

    const handleSubmit = async (values) => {
        if (!guest?.id) return;
        try {
            const res = await api.put(`/guests/${guest.id}`, values);
            toast.success('Invitado actualizado exitosamente');
            onGuestUpdated?.(res.data.guest);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al actualizar invitado');
            throw err;
        }
    };

    if (!isOpen || !guest) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[var(--ln-accent-blue)]/10">
                        <PencilIcon className="w-5 h-5 text-[var(--ln-accent-blue)]" />
                    </div>
                    <span>Editar Invitado</span>
                </div>
            }
            size="lg"
        >
            <GuestEditForm
                guest={guest}
                canEditAllFields={canEditAllFields()}
                onSubmit={handleSubmit}
                onCancel={onClose}
            />
        </Modal>
    );
};

export default GuestEditModal;
