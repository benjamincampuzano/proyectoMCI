import { useState, useEffect } from 'react';
import { FloppyDiskIcon, SpinnerIcon, PencilIcon } from '@phosphor-icons/react';
import { Modal } from './ui';
import { AsyncSearchSelect } from './ui';
import api from '../utils/api';
import toast from 'react-hot-toast';

const GuestEditModal = ({ isOpen, onClose, guest, onGuestUpdated }) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        city: '',
        birthDate: '',
        sex: '',
        status: 'NUEVO',
        prayerRequest: '',
        invitedById: null,
        assignedToId: null,
        invitedBy: null,
        assignedTo: null,
    });
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(user);
    }, []);

    // Load guest data when modal opens
    useEffect(() => {
        if (guest && isOpen) {
            setFormData({
                name: guest.name || '',
                phone: guest.phone || '',
                address: guest.address || '',
                city: guest.city || '',
                birthDate: guest.birthDate ? new Date(guest.birthDate).toISOString().split('T')[0] : '',
                sex: guest.sex || '',
                status: guest.status || 'NUEVO',
                prayerRequest: guest.prayerRequest || '',
                invitedById: guest.invitedBy?.id || null,
                assignedToId: guest.assignedTo?.id || null,
                invitedBy: guest.invitedBy || null,
                assignedTo: guest.assignedTo || null,
            });
        }
    }, [guest, isOpen]);

    const canEditAllFields = () => {
        const roles = currentUser?.roles || [];
        return roles.includes('ADMIN') || roles.includes('LIDER_DOCE');
    };

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        const name = e.target.name;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!guest?.id) return;

        setLoading(true);
        try {
            const res = await api.put(`/guests/${guest.id}`, {
                name: formData.name,
                phone: formData.phone,
                address: formData.address,
                city: formData.city,
                birthDate: formData.birthDate || null,
                sex: formData.sex || null,
                status: formData.status,
                prayerRequest: formData.prayerRequest,
                invitedById: formData.invitedById,
                assignedToId: formData.assignedToId,
            });

            toast.success('Invitado actualizado exitosamente');
            onGuestUpdated?.(res.data.guest);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al actualizar invitado');
        } finally {
            setLoading(false);
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
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <Modal.Content className="flex-1 overflow-y-auto">
                    <div className="space-y-5">
                        {/* Basic Info Section */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--ln-text-secondary)] mb-2">
                                    Nombre Completo <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-lg text-[var(--ln-text-primary)] focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-colors"
                                    required
                                    disabled={!canEditAllFields()}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--ln-text-secondary)] mb-2">
                                    Teléfono <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-lg text-[var(--ln-text-primary)] focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-colors"
                                    required
                                    disabled={!canEditAllFields()}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--ln-text-secondary)] mb-2">
                                    Fecha de Nacimiento
                                </label>
                                <input
                                    type="date"
                                    name="birthDate"
                                    value={formData.birthDate}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-lg text-[var(--ln-text-primary)] focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-colors"
                                    disabled={!canEditAllFields()}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--ln-text-secondary)] mb-2">
                                    Sexo
                                </label>
                                <select
                                    name="sex"
                                    value={formData.sex}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-lg text-[var(--ln-text-primary)] focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-colors"
                                    disabled={!canEditAllFields()}
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="HOMBRE">Hombre</option>
                                    <option value="MUJER">Mujer</option>
                                </select>
                            </div>
                        </div>

                        {/* Address Section */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--ln-text-secondary)] mb-2">
                                    Dirección
                                </label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-lg text-[var(--ln-text-primary)] focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-colors"
                                    disabled={!canEditAllFields()}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--ln-text-secondary)] mb-2">
                                    Ciudad
                                </label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-lg text-[var(--ln-text-primary)] focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-colors"
                                    disabled={!canEditAllFields()}
                                />
                            </div>
                        </div>

                        {/* Status - All roles can edit */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--ln-text-secondary)] mb-2">
                                Estado
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-lg text-[var(--ln-text-primary)] focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-colors"
                            >
                                <option value="NUEVO">Nuevo</option>
                                <option value="CONTACTADO">Llamado</option>
                                <option value="CONSOLIDADO">Visitado</option>
                                <option value="GANADO">Consolidado</option>
                            </select>
                        </div>

                        {/* Assignment Section - Admin/LIDER_DOCE only */}
                        {canEditAllFields() && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--ln-text-secondary)] mb-2">
                                        Invitado Por
                                    </label>
                                    <AsyncSearchSelect
                                        fetchItems={(term) =>
                                            api.get('/users/search', {
                                                params: {
                                                    search: term,
                                                    excludeRoles: 'ADMIN,PASTOR'
                                                }
                                            }).then((res) => res.data)
                                        }
                                        selectedValue={formData.invitedBy}
                                        onSelect={(user) => setFormData({ ...formData, invitedById: user?.id, invitedBy: user })}
                                        placeholder="Buscar usuario que invitó..."
                                        labelKey="fullName"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[var(--ln-text-secondary)] mb-2">
                                        Asignado a
                                    </label>
                                    <AsyncSearchSelect
                                        fetchItems={(term) =>
                                            api.get('/users/search', {
                                                params: {
                                                    search: term,
                                                    excludeRoles: 'ADMIN,PASTOR'
                                                }
                                            }).then((res) => res.data)
                                        }
                                        selectedValue={formData.assignedTo}
                                        onSelect={(user) => setFormData({ ...formData, assignedToId: user?.id, assignedTo: user })}
                                        placeholder="Seleccionar Líder responsable..."
                                        labelKey="fullName"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Prayer Request */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--ln-text-secondary)] mb-2">
                                Petición de Oración
                            </label>
                            <textarea
                                name="prayerRequest"
                                value={formData.prayerRequest}
                                onChange={handleChange}
                                rows="3"
                                className="w-full px-4 py-2.5 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-lg text-[var(--ln-text-primary)] focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-colors resize-none"
                                placeholder="Escriba la petición de oración del invitado..."
                                disabled={!canEditAllFields()}
                            />
                        </div>
                    </div>
                </Modal.Content>

                <Modal.Footer className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 text-sm font-medium text-[var(--ln-text-secondary)] bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-lg hover:bg-[var(--ln-bg-elevated)] transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center justify-center gap-2 bg-[var(--ln-brand-indigo)] hover:bg-[var(--ln-brand-indigo-hover)] text-white px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                        {loading ? (
                            <SpinnerIcon size={18} className="animate-spin" />
                        ) : (
                            <>
                                <FloppyDiskIcon size={18} />
                                <span>Guardar Cambios</span>
                            </>
                        )}
                    </button>
                </Modal.Footer>
            </form>
        </Modal>
    );
};

export default GuestEditModal;
