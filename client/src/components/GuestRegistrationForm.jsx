import { useState, useEffect } from 'react';
import { FloppyDiskIcon, SpinnerIcon, X, UserPlus } from '@phosphor-icons/react';
import { AsyncSearchSelect } from './ui';
import api from '../utils/api';

const GuestRegistrationForm = ({ isOpen, onClose, onGuestCreated }) => {
    const [formData, setFormData] = useState({
        documentType: '',
        documentNumber: '',
        name: '',
        birthDate: '',
        sex: '',
        phone: '',
        address: '',
        neighborhood: '',
        city: '',
        prayerRequest: '',
        invitedById: null,
        assignedToId: null,
        dataPolicyAccepted: false,
        dataTreatmentAuthorized: false,
        minorConsentAuthorized: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(user);

        // Auto-assign DISCIPULO to themselves
        if (user && user.roles?.includes('DISCIPULO')) {
            setFormData(prev => ({ 
                ...prev, 
                assignedToId: user.id,
                assignedTo: { id: user.id, fullName: user.fullName }
            }));
        }
    }, []);

    const getAssignedToFetchItems = () => {
        const roles = currentUser?.roles || [];
        
        if (roles.includes('DISCIPULO')) {
            // DISCIPULO is auto-assigned, no search needed
            return () => Promise.resolve([]);
        }
        
        // All other roles can search any user except ADMIN and PASTOR
        return (term) => api.get('/users/search', { 
            params: { 
                search: term,
                excludeRoles: 'ADMIN,PASTOR'
            } 
        }).then(res => res.data);
    };

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        const name = e.target.name;
        setFormData({ ...formData, [name]: value });
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        const roles = currentUser?.roles || [];
        if (roles.some(r => ['ADMIN', 'LIDER_DOCE'].includes(r)) && !formData.invitedById) {
            // Let it pass, backend handles defaults
        }

        try {
            const res = await api.post('/guests', formData);
            setSuccess('Invitado registrado exitosamente');
            setFormData({
                documentType: '',
                documentNumber: '',
                name: '',
                birthDate: '',
                sex: '',
                phone: '',
                address: '',
                neighborhood: '',
                city: '',
                prayerRequest: '',
                invitedById: null,
                assignedToId: null,
                dataPolicyAccepted: false,
                dataTreatmentAuthorized: false,
                minorConsentAuthorized: false,
            });

            if (onGuestCreated) {
                onGuestCreated(res.data.guest);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al registrar invitado');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFormData({
            documentType: '',
            documentNumber: '',
            name: '',
            birthDate: '',
            sex: '',
            phone: '',
            address: '',
            neighborhood: '',
            city: '',
            prayerRequest: '',
            invitedById: null,
            assignedToId: null,
            dataPolicyAccepted: false,
            dataTreatmentAuthorized: false,
            minorConsentAuthorized: false,
        });
        setError('');
        setSuccess('');
    };

    if (!isOpen) return null;

    // PASTOR no puede crear invitados - mostrar mensaje informativo
    if (currentUser?.roles?.includes('PASTOR')) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center sm:p-4">
                <div className="bg-white dark:bg-gray-800 sm:rounded-2xl shadow-xl w-full h-full sm:h-auto sm:max-w-md flex flex-col">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Registrar Nuevo Invitado</h3>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                    <div className="p-6">
                        <div className="bg-blue-900/20 border border-blue-500 text-blue-300 px-4 py-3 rounded">
                            <p className="font-semibold mb-2">Información</p>
                            <p>Los usuarios con rol PASTOR no pueden crear invitados directamente.</p>
                            <p className="mt-2">Los invitados deben ser creados por:</p>
                            <ul className="list-disc list-inside ml-4 mt-1">
                                <li>LIDER_DOCE</li>
                                <li>LIDER_CELULA</li>
                                <li>DISCIPULO</li>
                            </ul>
                            <p className="mt-2 text-sm">Puede ver todos los invitados de su red en la lista de invitados.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center sm:p-4 safe-area-inset">
            <div className="bg-white dark:bg-gray-800 sm:rounded-2xl shadow-xl w-full h-[100dvh] sm:h-auto sm:max-w-2xl sm:max-h-[95vh] flex flex-col overflow-hidden relative z-[101]">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                        <span className="hidden sm:inline">Registrar Nuevo Invitado</span>
                        <span className="sm:hidden">Nuevo Invitado</span>
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                        {error && (
                            <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="bg-green-900/20 border border-green-500 text-green-400 px-4 py-3 rounded mb-4">
                                {success}
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Nombre Completo <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Teléfono <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Fecha de Nacimiento
                                    </label>
                                    <input
                                        type="date"
                                        name="birthDate"
                                        value={formData.birthDate}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Sexo
                                    </label>
                                    <select
                                        name="sex"
                                        value={formData.sex}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="HOMBRE">Hombre</option>
                                        <option value="MUJER">Mujer</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Dirección
                                    </label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Barrio
                                    </label>
                                    <input
                                        type="text"
                                        name="neighborhood"
                                        value={formData.neighborhood}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Ciudad
                                    </label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Invitado Por <span className="text-red-400">*</span>
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Asignado a
                                </label>
                                <AsyncSearchSelect
                                    fetchItems={getAssignedToFetchItems()}
                                    selectedValue={formData.assignedTo}
                                    onSelect={(user) => setFormData({ ...formData, assignedToId: user?.id, assignedTo: user })}
                                    placeholder={currentUser?.roles?.includes('DISCIPULO') ? "Auto-asignado a ti mismo" : "Seleccionar Líder responsable..."}
                                    labelKey="fullName"
                                    disabled={currentUser?.roles?.includes('DISCIPULO')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Petición de Oración
                                </label>
                                <textarea
                                    name="prayerRequest"
                                    value={formData.prayerRequest}
                                    onChange={handleChange}
                                    rows="4"
                                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
                                    placeholder="Escriba la petición de oración del invitado..."
                                />
                            </div>

                            {/* Data Authorization Checks */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        name="dataPolicyAccepted"
                                        required
                                        className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                        checked={formData.dataPolicyAccepted}
                                        onChange={handleChange}
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                        Declaro que he leído y acepto la <strong>Política de Tratamiento de Datos Personales</strong> de MCI.
                                    </span>
                                </label>
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        name="dataTreatmentAuthorized"
                                        required
                                        className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                        checked={formData.dataTreatmentAuthorized}
                                        onChange={handleChange}
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                        Autorizo de manera expresa el tratamiento de mis datos conforme a la <strong>Ley 1581 de 2012</strong>.
                                    </span>
                                </label>
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        name="minorConsentAuthorized"
                                        className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                        checked={formData.minorConsentAuthorized}
                                        onChange={handleChange}
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                        En caso de registrar información de menores, declaro contar con autorización del representante legal.
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Footer - Fixed at bottom outside scroll area */}
                    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
                        <div className="p-4 sm:p-6 flex justify-end gap-2 sm:gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base whitespace-nowrap"
                            >
                                {loading ? (
                                    <SpinnerIcon size={18} className="animate-spin" />
                                ) : (
                                    <>
                                        <FloppyDiskIcon size={18} />
                                        <span>Registrar</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GuestRegistrationForm;