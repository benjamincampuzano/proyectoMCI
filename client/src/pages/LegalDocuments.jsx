import { useState, useEffect } from 'react';
import { FileTextIcon, Plus, Trash, ArrowSquareOut, Spinner, UploadSimple, LinkIcon } from '@phosphor-icons/react';
import { Button } from '../components/ui';
import ActionModal from '../components/ActionModal';
import ConfirmationModal from '../components/ConfirmationModal';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ALLOWED_EXTENSIONS = ['.doc', '.docx', '.pdf', '.jpg', '.png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const validateFile = (file) => {
    const ext = file.name.includes('.') ? `.${file.name.split('.').pop().toLowerCase()}` : '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return 'Formato no permitido. Solo se aceptan archivos .doc, .docx, .pdf, .jpg o .png.';
    }
    if (file.size > MAX_FILE_SIZE) {
        return 'El archivo excede el tamaño máximo permitido de 5MB.';
    }
    return null;
};

const validateDriveUrl = (url) => {
    const trimmed = url.trim();
    if (!/^https?:\/\/.+/i.test(trimmed)) {
        return 'Ingresa una URL válida (https://...)';
    }
    if (!/drive\.google\.com|docs\.google\.com/i.test(trimmed)) {
        return 'Solo se permiten enlaces de Google Drive';
    }
    return null;
};

const LegalDocuments = ({ canEdit: canEditProp }) => {
    const { isAdmin } = useAuth();
    const canEdit = canEditProp !== undefined ? canEditProp : isAdmin();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'url'
    const [formData, setFormData] = useState({ name: '', file: null, url: '' });
    const [fileError, setFileError] = useState('');
    const [urlError, setUrlError] = useState('');
    const [openingId, setOpeningId] = useState(null);

    // Delete Confirmation Modal State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState(null);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const res = await api.get('/legal-documents');
            setDocuments(res.data);
        } catch {
            setError('Error al cargar los documentos legales.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(fetchDocuments);
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0] || null;
        setFormData({ ...formData, file });
        setFileError(file ? validateFile(file) : '');
    };

    const resetUploadForm = () => {
        setShowUploadModal(false);
        setFormData({ name: '', file: null, url: '' });
        setFileError('');
        setUrlError('');
        setUploadMode('file');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setFileError('');
        setUrlError('');

        if (uploadMode === 'file') {
            if (!formData.file) {
                setFileError('Debes adjuntar un archivo');
                return;
            }
            const fileValidation = validateFile(formData.file);
            if (fileValidation) {
                setFileError(fileValidation);
                return;
            }
        } else {
            if (!formData.url.trim()) {
                setUrlError('Debes ingresar un enlace de Google Drive');
                return;
            }
            const urlValidation = validateDriveUrl(formData.url);
            if (urlValidation) {
                setUrlError(urlValidation);
                return;
            }
        }

        setSubmitting(true);
        try {
            if (uploadMode === 'file') {
                const form = new FormData();
                form.append('name', formData.name);
                form.append('file', formData.file);

                await api.post('/legal-documents', form, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('/legal-documents', {
                    name: formData.name,
                    url: formData.url.trim()
                });
            }
            resetUploadForm();
            fetchDocuments();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al subir el documento');
        } finally {
            setSubmitting(false);
        }
    };

    const openDocument = async (doc) => {
        setError('');
        // Enlaces externos (Google Drive) se abren directamente
        if (doc.isExternal) {
            window.open(doc.url, '_blank', 'noopener,noreferrer');
            return;
        }

        setOpeningId(doc.id);
        const win = window.open('', '_blank');
        try {
            const res = await api.get(`/legal-documents/${doc.id}/download`, { responseType: 'blob' });
            const blobUrl = window.URL.createObjectURL(res.data);
            if (win) {
                win.location.href = blobUrl;
            } else {
                window.open(blobUrl, '_blank', 'noopener,noreferrer');
            }
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
        } catch {
            win?.close();
            setError('Error al abrir el documento');
        } finally {
            setOpeningId(null);
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
        } catch {
            setError('Error al eliminar el documento');
        }
    };

    return (
        <div className="space-y-6">
            {canEdit && (
                <div className="flex justify-end">
                    <Button
                        variant="primary"
                        icon={Plus}
                        onClick={() => setShowUploadModal(true)}
                    >
                        Agregar Documento
                    </Button>
                </div>
            )}

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
                        Aún no se han compartido documentos legales.                         Los coordinadores pueden agregar nuevas políticas aquí.
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
                                {canEdit && (
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
                                    <button
                                        onClick={() => openDocument(doc)}
                                        disabled={openingId === doc.id}
                                        className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium hover:underline text-sm disabled:opacity-50"
                                    >
                                        {openingId === doc.id ? (
                                            <>
                                                <Spinner className="animate-spin" size={16} />
                                                Abriendo...
                                            </>
                                        ) : (
                                            <>
                                                <ArrowSquareOut size={16} />
                                                Ver Documento
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ActionModal
                isOpen={showUploadModal}
                onClose={resetUploadForm}
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

                    <div className="flex gap-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-700/50">
                        <button
                            type="button"
                            onClick={() => {
                                setUploadMode('file');
                                setFileError('');
                                setUrlError('');
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                uploadMode === 'file'
                                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <UploadSimple size={16} />
                            Subir Archivo
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setUploadMode('url');
                                setFileError('');
                                setUrlError('');
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                uploadMode === 'url'
                                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <LinkIcon size={16} />
                            Enlace Google Drive
                        </button>
                    </div>

                    {uploadMode === 'file' ? (
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Archivo del Documento</label>
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus-within:border-blue-500">
                                <UploadSimple size={20} className="text-gray-400 shrink-0" />
                                <input
                                    key="file-input"
                                    required
                                    type="file"
                                    accept=".doc,.docx,.pdf,.jpg,.png"
                                    className="w-full text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-600 dark:file:bg-blue-900/30 dark:file:text-blue-400 file:cursor-pointer cursor-pointer"
                                    onChange={handleFileChange}
                                />
                            </div>
                            {formData.file && (
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {formData.file.name} ({(formData.file.size / (1024 * 1024)).toFixed(2)} MB)
                                </p>
                            )}
                            {fileError ? (
                                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fileError}</p>
                            ) : (
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Formatos permitidos: .doc, .docx, .pdf, .jpg, .png — tamaño máximo 5MB.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Enlace de Google Drive</label>
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus-within:border-blue-500">
                                <LinkIcon size={20} className="text-gray-400 shrink-0" />
                                <input
                                    key="url-input"
                                    required
                                    type="url"
                                    className="w-full text-sm text-gray-700 dark:text-gray-300 focus:outline-none bg-transparent"
                                    placeholder="https://drive.google.com/file/d/..."
                                    value={formData.url}
                                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                                />
                            </div>
                            {urlError ? (
                                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{urlError}</p>
                            ) : (
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    El documento se enlazará desde Google Drive sin ocupar espacio en el proyecto.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={resetUploadForm}
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
