import { useState, useEffect } from 'react';
import { X, FloppyDisk, Warning } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import MultiUserSelect from './MultiUserSelect';

const GoalForm = ({ isOpen, onClose, onSuccess, initialData = null }) => {
    const { hasAnyRole } = useAuth();
    const [formData, setFormData] = useState({
        type: 'ENCUENTRO_REGISTRATIONS',
        targetValue: '',
        targetValues: {}, // Map of userId -> targetValue
        encuentroId: '',
        conventionId: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        userIds: []
    });

    const [encuentros, setEncuentros] = useState([]);
    const [convenciones, setConvenciones] = useState([]);
    const [selectedUsersDetails, setSelectedUsersDetails] = useState([]); // To show names
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState('');

    const isPastorOrAdmin = hasAnyRole(['ADMIN', 'PASTOR']);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                targetValue: (initialData.targetValue ?? '').toString(),
                targetValues: initialData.userId ? { [initialData.userId]: (initialData.targetValue ?? '').toString() } : {},
                encuentroId: (initialData.encuentroId ?? '').toString(),
                conventionId: (initialData.conventionId ?? '').toString(),
                userIds: initialData.userId ? [initialData.userId] : [], // Handle legacy/edit mode
                month: initialData.month || new Date().getMonth() + 1,
                year: initialData.year || new Date().getFullYear(),
                type: initialData.type || 'ENCUENTRO_REGISTRATIONS'
            });
        }
    }, [initialData]);

    useEffect(() => {
        const fetchUsers = async () => {
            if (formData.userIds.length === 0) {
                setSelectedUsersDetails([]);
                return;
            }
            try {
                const res = await api.get('/users');
                const selected = res.data.filter(u => formData.userIds.includes(u.id));
                setSelectedUsersDetails(selected);

                // Initialize targetValues for new selections if they don't exist
                const newTargetValues = { ...formData.targetValues };
                let modified = false;
                formData.userIds.forEach(id => {
                    if (newTargetValues[id] === undefined) {
                        newTargetValues[id] = formData.targetValue || '';
                        modified = true;
                    }
                });
                if (modified) {
                    setFormData(prev => ({ ...prev, targetValues: newTargetValues }));
                }
            } catch (err) {
                console.error('Error fetching selected users:', err);
            }
        };

        if (isOpen) fetchUsers();
    }, [formData.userIds, isOpen]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setFetching(true);
                const [encRes, convRes] = await Promise.all([
                    api.get('/encuentros'),
                    api.get('/convenciones')
                ]);

                setEncuentros(encRes.data);
                setConvenciones(convRes.data);
            } catch (err) {
                console.error('Error fetching form data:', err);
                setError('Error al cargar la información necesaria para el formulario');
                setEncuentros([]);
                setConvenciones([]);
            } finally {
                setFetching(false);
            }
        };

        if (isOpen) fetchData();
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation: userIds is mandatory
        if (!formData.userIds || formData.userIds.length === 0) {
            setError('Por favor seleccione al menos un Líder Responsable');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let response;
            // If editing a single goal, we use PUT. If creating (possibly multiple), we use POST.
            if (initialData && initialData.id) {
                // If editing, we only edit the FIRST one or the specific one. 
                // But GoalForm is reused, so if we came from a single goal edit, 
                // initialData.id is present.
                response = await api.put(`/metas/${initialData.id}`, {
                    ...formData,
                    userId: formData.userIds[0] // Backend PUT expect single userId
                });
            } else {
                response = await api.post('/metas', formData);
            }

            if (response.status !== 200 && response.status !== 201) throw new Error('Error al guardar la meta');

            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md h-[95vh] rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-300 flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 flex-shrink-0">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">
                        {initialData ? 'Editar Meta' : 'Nueva Meta'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400">
                                <Warning size={20} />
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Seleccione la Meta</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                disabled={fetching}
                            >
                                <option value="ENCUENTRO_REGISTRATIONS">Encuentro: Inscritos</option>
                                <option value="ENCUENTRO_CONVERSIONS">Encuentro: Graduados U. de la Vida</option>
                                <option value="CONVENTION_REGISTRATIONS">Convención: Inscritos</option>
                                <option value="CELL_COUNT">Células: Cantidad</option>
                            </select>
                        </div>

                        {formData.type.includes('ENCUENTRO') && (
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Seleccionar Encuentro</label>
                                <select
                                    value={formData.encuentroId}
                                    onChange={(e) => setFormData({ ...formData, encuentroId: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                    required
                                >
                                    <option value="">Seleccione...</option>
                                    {encuentros.map(e => (
                                        <option key={e.id} value={e.id}>{e.name} ({new Date(e.startDate).getFullYear()})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {formData.type.includes('CONVENTION') && (
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Seleccionar Convención</label>
                                <select
                                    value={formData.conventionId}
                                    onChange={(e) => setFormData({ ...formData, conventionId: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                    required
                                >
                                    <option value="">Seleccione...</option>
                                    {convenciones.map(c => (
                                        <option key={c.id} value={c.id}>{c.theme} ({c.year})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {formData.type.includes('CELL') && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Mes</label>
                                    <input
                                        type="number"
                                        min="1" max="12"
                                        value={formData.month}
                                        onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Año</label>
                                    <input
                                        type="number"
                                        value={formData.year}
                                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {isPastorOrAdmin && (
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">Líderes Responsables</label>
                                <MultiUserSelect
                                    value={formData.userIds}
                                    onChange={(ids) => setFormData({ ...formData, userIds: ids })}
                                    roleFilter="LIDER_DOCE"
                                    placeholder="Seleccione uno o más líderes..."
                                />
                                <p className="text-[10px] text-gray-500 px-1">La meta se calculará basándose en la red de cada Líder 12 seleccionado.</p>
                            </div>
                        )}

                        <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest font-black text-gray-400">
                                    {formData.userIds.length > 1 ? 'Valor Objetivo General (Aplicar a todos)' : 'Valor Objetivo'}
                                </label>
                                <input
                                    type="number"
                                    value={formData.targetValue}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const newTargets = { ...formData.targetValues };
                                        // If user changes the global value, update all individual ones that haven't been manually set?
                                        // Or just update all of them for simplicity.
                                        formData.userIds.forEach(id => {
                                            newTargets[id] = val;
                                        });
                                        setFormData({ ...formData, targetValue: val, targetValues: newTargets });
                                    }}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-medium text-xl font-bold"
                                    placeholder="Ej: 100"
                                    required={formData.userIds.length <= 1}
                                />
                            </div>

                            {formData.userIds.length > 1 && (
                                <div className="space-y-3 animate-in slide-in-from-top duration-300">
                                    <label className="text-[10px] uppercase tracking-widest font-black text-blue-500">Objetivos Individuales</label>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {selectedUsersDetails.map(user => (
                                            <div key={user.id} className="flex items-center gap-3 bg-gray-50/50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300 truncate">{user.fullName}</p>
                                                    <p className="text-[10px] text-gray-500 truncate">Red de este líder</p>
                                                </div>
                                                <div className="w-24">
                                                    <input
                                                        type="number"
                                                        value={formData.targetValues[user.id] || ''}
                                                        onChange={(e) => {
                                                            const newValues = { ...formData.targetValues, [user.id]: e.target.value };
                                                            setFormData({ ...formData, targetValues: newValues });
                                                        }}
                                                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-bold text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 outline-none"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Submit Button - Fixed at bottom outside scroll area */}
                    <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="p-6">
                            <button
                                type="submit"
                                disabled={loading || fetching}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                                {loading || fetching ? (
                                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <FloppyDisk size={20} />
                                        {initialData ? 'Actualizar Meta' : 'Establecer Objetivo'}
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

export default GoalForm;

