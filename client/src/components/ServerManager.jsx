import { useState, useEffect } from 'react';
import { Plus, Users, Trash, X, Copy, CheckCircle, MagnifyingGlass, Lightbulb } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button, AsyncSearchSelect } from './ui';
import ConfirmationModal from './ConfirmationModal';

const ServerManager = () => {
    const { user, hasAnyRole } = useAuth();
    const [servidores, setServidores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [description, setDescription] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [copiedCode, setCopiedCode] = useState(null);

    // Delete Confirmation Modal State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [servidorToDelete, setServidorToDelete] = useState(null);

    // Status toggle confirmation
    const [showStatusConfirm, setShowStatusConfirm] = useState(false);
    const [servidorToToggle, setServidorToToggle] = useState(null);

    useEffect(() => {
        fetchServidores();
    }, [refreshTrigger]);

    const fetchServidores = async () => {
        setLoading(true);
        try {
            const res = await api.get('/servidores');
            setServidores(res.data.servidores || []);
        } catch (error) {
            console.error('Error fetching servidores:', error);
            toast.error('Error al cargar la lista de servidores');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateServidor = async () => {
        if (!selectedUser) {
            toast.error('Por favor seleccione un usuario');
            return;
        }

        try {
            await api.post('/servidores', {
                userId: selectedUser.id,
                description: description || null
            });
            toast.success('Servidor creado exitosamente');
            setShowModal(false);
            setSelectedUser(null);
            setDescription('');
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            const message = error.response?.data?.message || 'Error al crear el servidor';
            toast.error(message);
        }
    };

    const handleDeleteServidor = async () => {
        if (!servidorToDelete) return;

        try {
            await api.delete(`/servidores/${servidorToDelete.id}`);
            toast.success('Servidor eliminado exitosamente');
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            const message = error.response?.data?.message || 'Error al eliminar el servidor';
            toast.error(message);
        }
    };

    const handleToggleStatus = async () => {
        if (!servidorToToggle) return;

        try {
            await api.put(`/servidores/${servidorToToggle.id}/status`, {
                isActive: !servidorToToggle.isActive
            });
            toast.success(`Servidor ${servidorToToggle.isActive ? 'desactivado' : 'activado'} exitosamente`);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            const message = error.response?.data?.message || 'Error al cambiar el estado del servidor';
            toast.error(message);
        }
    };

    const copyToClipboard = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        toast.success('Código copiado al portapapeles');
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const filteredServidores = servidores.filter(s => {
        const searchLower = searchTerm.toLowerCase();
        return (
            s.code.toLowerCase().includes(searchLower) ||
            s.user.fullName.toLowerCase().includes(searchLower) ||
            s.user.email.toLowerCase().includes(searchLower) ||
            (s.description && s.description.toLowerCase().includes(searchLower))
        );
    });

    const canManage = hasAnyRole(['ADMIN', 'PASTOR', 'LIDER_DOCE']);

    if (loading && servidores.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Cargando servidores...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Gestión de Servidores
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Administrar códigos de registro para los registradores de invitados
                    </p>
                </div>
                {canManage && (
                    <Button
                        variant="success"
                        icon={Plus}
                        onClick={() => {
                            setSelectedUser(null);
                            setDescription('');
                            setShowModal(true);
                        }}
                    >
                        Nuevo Servidor
                    </Button>
                )}
            </div>

            {/* Search */}
            <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por código, nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Servidores</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{servidores.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Activos</p>
                    <p className="text-2xl font-bold text-green-600">{servidores.filter(s => s.isActive).length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Inactivos</p>
                    <p className="text-2xl font-bold text-red-600">{servidores.filter(s => !s.isActive).length}</p>
                </div>
            </div>

            {/* Servidores List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Código
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Usuario
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Roles
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Descripción
                                </th>
                                {canManage && (
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredServidores.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={canManage ? 6 : 5}
                                        className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                                    >
                                        {searchTerm
                                            ? 'No se encontraron servidores con ese criterio de búsqueda'
                                            : 'No hay servidores registrados'}
                                    </td>
                                </tr>
                            ) : (
                                filteredServidores.map((servidor) => (
                                    <tr key={servidor.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <code className="px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded text-sm font-mono text-gray-900 dark:text-white">
                                                    {servidor.code}
                                                </code>
                                                <button
                                                    onClick={() => copyToClipboard(servidor.code)}
                                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                    title="Copiar código"
                                                >
                                                    {copiedCode === servidor.code ? (
                                                        <CheckCircle size={16} className="text-green-500" />
                                                    ) : (
                                                        <Copy size={16} />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {servidor.user.fullName}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {servidor.user.email}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {servidor.user.roles.slice(0, 2).map((role, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                                                    >
                                                        {role}
                                                    </span>
                                                ))}
                                                {servidor.user.roles.length > 2 && (
                                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                                                        +{servidor.user.roles.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                    servidor.isActive
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                                }`}
                                            >
                                                {servidor.isActive ? (
                                                    <>
                                                        <Lightbulb size={12} />
                                                        Activo
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lightbulb size={12} />
                                                        Inactivo
                                                    </>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                                                {servidor.description || '-'}
                                            </p>
                                        </td>
                                        {canManage && (
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setServidorToToggle(servidor);
                                                            setShowStatusConfirm(true);
                                                        }}
                                                        className={`p-1.5 rounded-lg transition-colors ${
                                                            servidor.isActive
                                                                ? 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'
                                                                : 'text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30'
                                                        }`}
                                                        title={servidor.isActive ? 'Desactivar' : 'Activar'}
                                                    >
                                                        {servidor.isActive ? <Lightbulb size={18} /> : <Lightbulb size={18} />}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setServidorToDelete(servidor);
                                                            setShowDeleteConfirm(true);
                                                        }}
                                                        className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                Nuevo Servidor
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Seleccionar Usuario *
                                </label>
                                <AsyncSearchSelect
                                    fetchItems={(term) =>
                                        api.get('/servidores/available-users', {
                                            params: { search: term }
                                        }).then((res) => res.data.users || [])
                                    }
                                    selectedValue={selectedUser}
                                    onSelect={(user) => setSelectedUser(user)}
                                    placeholder="Buscar usuario..."
                                    labelKey="fullName"
                                />
                                {selectedUser && (
                                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {selectedUser.fullName}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {selectedUser.email}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Descripción (opcional)
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Registrador de Invitados"
                                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                    <strong>Nota:</strong> Al crear un servidor, se generará automáticamente un código numérico de 6 dígitos que el usuario deberá ingresar para registrar invitados.
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setShowModal(false)}>
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleCreateServidor}
                                disabled={!selectedUser}
                            >
                                Crear Servidor
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => {
                    handleDeleteServidor();
                    setShowDeleteConfirm(false);
                }}
                title="Eliminar Servidor"
                message={`¿Está seguro de que desea eliminar el servidor de ${servidorToDelete?.user.fullName}? El código ${servidorToDelete?.code} ya no podrá ser utilizado para registrar invitados.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
            />

            {/* Status Toggle Confirmation */}
            <ConfirmationModal
                isOpen={showStatusConfirm}
                onClose={() => setShowStatusConfirm(false)}
                onConfirm={() => {
                    handleToggleStatus();
                    setShowStatusConfirm(false);
                }}
                title={servidorToToggle?.isActive ? 'Desactivar Servidor' : 'Activar Servidor'}
                message={`¿Está seguro de que desea ${servidorToToggle?.isActive ? 'desactivar' : 'activar'} el servidor de ${servidorToToggle?.user.fullName}? ${
                    servidorToToggle?.isActive
                        ? 'El código no podrá ser utilizado para registrar nuevos invitados.'
                        : 'El código podrá ser utilizado nuevamente para registrar invitados.'
                }`}
                confirmText={servidorToToggle?.isActive ? 'Desactivar' : 'Activar'}
                cancelText="Cancelar"
                variant={servidorToToggle?.isActive ? 'warning' : 'success'}
            />
        </div>
    );
};

export default ServerManager;
