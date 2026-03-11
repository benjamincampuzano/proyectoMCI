import { useState, useEffect } from 'react';
import { FileTextIcon, Plus, Trash, ArrowSquareOut, Spinner, ShieldCheck, LinkIcon } from '@phosphor-icons/react';
import { PageHeader, Button } from '../components/ui';
import ActionModal from '../components/ActionModal';
import ConfirmationModal from '../components/ConfirmationModal';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const LegalDocuments = () => {
    const { isAdmin } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', url: '' });

    // Delete Confirmation Modal State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState(null);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const res = await api.get('/legal-documents');
            setDocuments(res.data);
        } catch (err) {
            setError('Error al cargar los documentos legales.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            await api.post('/legal-documents', formData);
            setShowUploadModal(false);
            setFormData({ name: '', url: '' });
            fetchDocuments();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al subir el documento');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        // Find the document to show details in the confirmation modal
        const document = documents.find(d => d.id === id);
        setDocumentToDelete(document);
        setShowDeleteConfirm(true);
    };

    const performDelete = async () => {
        if (!documentToDelete) return;

        try {
            await api.delete(`/legal-documents/${documentToDelete.id}`);
            fetchDocuments();
        } catch (err) {
            setError('Error al eliminar el documento');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Documentos Legales"
                description="Sección de políticas y autorizaciones para el tratamiento de datos personales."
                icon={ShieldCheck}
                action={isAdmin() && (
                    <Button
                        variant="primary"
                        icon={Plus}
                        onClick={() => setShowUploadModal(true)}
                    >
                        Agregar Documento
                    </Button>
                )}
            />

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-3">
                    <span className="text-lg">⚠️</span>
                    <p>{error}</p>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Spinner className="animate-spin text-blue-500" size={40} />
                    <p className="text-gray-500 dark:text-gray-400 animate-pulse">Cargando documentos...</p>
                </div>
            ) : documents.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-200 dark:border-gray-700 text-center space-y-4 shadow-sm">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto text-gray-400">
                        <FileTextIcon size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">No hay documentos cargados</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                        Aún no se han compartido documentos legales. Los administradores pueden agregar nuevas políticas aquí.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {documents.map((doc) => (
                        <div
                            key={doc.id}
                            className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 hover:shadow-xl hover:border-blue-500/50 transition-all duration-300 relative overflow-hidden shadow-sm"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                {isAdmin() && (
                                    <button
                                        onClick={() => handleDelete(doc.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Eliminar documento"
                                    >
                                        <Trash size={18} />
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-col h-full space-y-4">
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                    <FileTextIcon size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {doc.name}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Cargado el {new Date(doc.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <a
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium hover:underline text-sm"
                                    >
                                        <LinkIcon size={16} />
                                        Ver Documento
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ActionModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                title="Agregar Nuevo Documento Legal"
            >
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Nombre del Documento</label>
                        <input
                            required
                            type="text"
                            className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                            placeholder="Ej: Autorización Tratamiento Datos Menores (Tutor)"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">URL del Documento</label>
                        <input
                            required
                            type="url"
                            className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                            placeholder="https://..."
                            value={formData.url}
                            onChange={e => setFormData({ ...formData, url: e.target.value })}
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Proporcione el enlace directo al documento (PDF, Google Drive, etc.)
                        </p>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={() => setShowUploadModal(false)}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/30"
                        >
                            {submitting ? (
                                <div className="flex items-center gap-2">
                                    <Spinner className="animate-spin" size={18} />
                                    <span>Subiendo...</span>
                                </div>
                            ) : 'Agregar Documento'}
                        </button>
                    </div>
                </form>
            </ActionModal>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setDocumentToDelete(null);
                }}
                onConfirm={performDelete}
                title="Eliminar Documento Legal"
                message="¿Estás seguro de eliminar este documento?"
                confirmText="Eliminar Documento"
                confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
            >
                {documentToDelete && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Documento:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{documentToDelete.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Fecha de carga:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{new Date(documentToDelete.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                        <div className="text-red-600 dark:text-red-400 mt-0.5">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="text-red-800 dark:text-red-200 font-semibold mb-1">
                                ⚠️ Acción Irreversible
                            </h4>
                            <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
                                <li>• Se eliminará el documento legal</li>
                                <li>• Los usuarios ya no tendrán acceso al documento</li>
                                <li>• No se puede deshacer esta acción</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </ConfirmationModal>
        </div>
    );
};

export default LegalDocuments;
