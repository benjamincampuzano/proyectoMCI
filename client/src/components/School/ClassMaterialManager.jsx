import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { X, FileText, Video, Question, FloppyDisk, Plus, Trash, Link, Play, Eye } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { Button } from '../ui';

// Funciones utilitarias para extraer información de URLs (disponibles para ambos componentes)
const getDocumentName = (url) => {
    if (url.includes('docs.google.com')) {
        const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
            return `Documento Google ${match[1].substring(0, 8)}...`;
        }
    }
    if (url.includes('drive.google.com')) {
        const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
            return `Archivo Drive ${match[1].substring(0, 8)}...`;
        }
    }
    // Extraer nombre del archivo de la URL
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    if (fileName && fileName.includes('.')) {
        return fileName;
    }
    return 'Documento';
};

// Componente para mostrar enlaces con nombres personalizados y vistas previas
const ContentLink = ({ link, type }) => {
    const [showPreview, setShowPreview] = useState(false);

    const getVideoInfo = (url) => {
        if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
            const videoId = url.includes('youtube.com/watch') 
                ? url.split('v=')[1]?.split('&')[0]
                : url.split('youtu.be/')[1]?.split('?')[0];
            
            if (videoId) {
                return {
                    name: 'Video YouTube',
                    thumbnail: `https://img.youtube.com/vi/${videoId}/default.jpg`,
                    previewUrl: `https://www.youtube.com/embed/${videoId}`
                };
            }
        }
        if (url.includes('vimeo.com')) {
            const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
            if (videoId) {
                return {
                    name: 'Video Vimeo',
                    thumbnail: `https://vumbnail.com/${videoId}.jpg`,
                    previewUrl: `https://player.vimeo.com/video/${videoId}`
                };
            }
        }
        return {
            name: 'Video',
            thumbnail: null,
            previewUrl: null
        };
    };

    const getQuizInfo = (url) => {
        if (url.includes('forms.gle') || url.includes('google.com/forms')) {
            return {
                name: 'Formulario Google',
                icon: '📝'
            };
        }
        if (url.includes('quizizz.com')) {
            return {
                name: 'Quizizz',
                icon: '🎯'
            };
        }
        if (url.includes('kahoot.it')) {
            return {
                name: 'Kahoot!',
                icon: '🎮'
            };
        }
        return {
            name: 'Cuestionario',
            icon: '📋'
        };
    };

    if (type === 'documents') {
        // Manejar tanto strings como objetos {name, url}
        const doc = typeof link === 'string' ? { name: getDocumentName(link), url: link } : link;
        return (
            <a 
                href={doc.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 text-sm p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all flex items-center justify-between group"
            >
                <div className="flex items-center gap-2">
                    <FileText size={16} className="text-orange-500" />
                    <span className="text-gray-700 dark:text-gray-200 truncate">{doc.name || 'Documento sin nombre'}</span>
                </div>
                <Link size={16} className="text-gray-400 group-hover:text-blue-500" />
            </a>
        );
    }

    if (type === 'videoLinks') {
        const videoInfo = getVideoInfo(link);
        return (
            <div className="flex-1">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-red-500 dark:hover:border-red-400 hover:shadow-md transition-all">
                    <div className="p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Video size={16} className="text-red-500" />
                                <span className="text-gray-700 dark:text-gray-200 truncate">{videoInfo.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {videoInfo.previewUrl && (
                                    <button
                                        onClick={() => setShowPreview(!showPreview)}
                                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                        title="Vista previa"
                                    >
                                        {showPreview ? <Eye size={14} /> : <Play size={14} />}
                                    </button>
                                )}
                                <a 
                                    href={link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                    title="Abrir en nueva pestaña"
                                >
                                    <Link size={16} className="text-gray-400 hover:text-blue-500" />
                                </a>
                            </div>
                        </div>
                    </div>
                    {showPreview && videoInfo.previewUrl && (
                        <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                            <iframe
                                src={videoInfo.previewUrl}
                                className="w-full h-40 rounded"
                                frameBorder="0"
                                allowFullScreen
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (type === 'quizLinks') {
        const quizInfo = getQuizInfo(link);
        return (
            <a 
                href={link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 text-sm p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-500 dark:hover:border-purple-400 hover:shadow-md transition-all flex items-center justify-between group"
            >
                <div className="flex items-center gap-2">
                    <Question size={16} className="text-purple-500" />
                    <span className="text-gray-700 dark:text-gray-200 truncate">{quizInfo.icon} {quizInfo.name}</span>
                </div>
                <Link size={16} className="text-gray-400 group-hover:text-blue-500" />
            </a>
        );
    }

    return (
        <a 
            href={link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 text-sm p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all flex items-center justify-between group"
        >
            <span className="text-gray-700 dark:text-gray-200 truncate">Enlace</span>
            <Link size={16} className="text-gray-400 group-hover:text-blue-500" />
        </a>
    );
};

const ClassMaterialManager = ({ moduleId, classNumber, onClose, readOnly = false }) => {
    const [material, setMaterial] = useState({
        description: '',
        documents: [], // Array de objetos {name, url}
        videoLinks: [],
        quizLinks: []
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    
    useEffect(() => {
        fetchMaterials();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [moduleId, classNumber]);

    const fetchMaterials = async () => {
        try {
            const res = await api.get(`/school/modules/${moduleId}/materials`);
            const classMat = res.data.find(m => m.classNumber === classNumber);
            if (classMat) {
                // Convertir URLs de documentos a objetos {name, url} si vienen del backend como strings
                const documents = (classMat.documents || []).map(doc => {
                    if (typeof doc === 'string') {
                        return {
                            name: getDocumentName(doc),
                            url: doc
                        };
                    }
                    // Si ya es un objeto, asegurar que tenga ambas propiedades
                    return {
                        name: doc.name || getDocumentName(doc.url),
                        url: doc.url || doc
                    };
                });
                
                setMaterial({
                    description: classMat.description || '',
                    documents,
                    videoLinks: classMat.videoLinks || [],
                    quizLinks: classMat.quizLinks || []
                });
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching materials', error);
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            
            // Enviar documentos como objetos {name, url} - el backend ahora lo soporta
            const materialToSave = {
                ...material,
                documents: material.documents.map(doc => {
                    if (typeof doc === 'string') {
                        // Convertir strings a objetos para consistencia
                        return {
                            name: getDocumentName(doc),
                            url: doc
                        };
                    }
                    return doc; // Ya es un objeto {name, url}
                })
            };
            
            await api.post(`/school/modules/${moduleId}/materials/${classNumber}`, materialToSave);
            setSaving(false);
            onClose();
        } catch (error) {
            toast.error('Error saving materials');
            setSaving(false);
        }
    };

    const addItem = (field) => {
        if (field === 'documents') {
            setMaterial({ 
                ...material, 
                [field]: [...material[field], { name: '', url: '' }] 
            });
        } else {
            setMaterial({ ...material, [field]: [...material[field], ""] });
        }
    };

    const updateItem = (field, index, value, subField = null) => {
        const newList = [...material[field]];
        if (field === 'documents' && subField) {
            // Para documentos: actualizar name o url específico
            const currentItem = newList[index];
            // Asegurarnos de que el objeto tenga la estructura correcta
            const updatedItem = {
                name: currentItem?.name || '',
                url: currentItem?.url || '',
                ...currentItem, // Mantener cualquier propiedad existente
                [subField]: value // Actualizar el campo específico
            };
            newList[index] = updatedItem;
        } else {
            // Para videos y quizzes: actualizar directamente
            newList[index] = value;
        }
        setMaterial({ ...material, [field]: newList });
    };

    const removeItem = (field, index) => {
        setMaterial({ 
            ...material, 
            [field]: material[field].filter((_, i) => i !== index) 
        });
    };

    if (loading) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-md bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Material de Clase {classNumber}</h3>
                        <p className="text-xs text-gray-500 uppercase font-semibold mt-1">Gestión de Contenidos Didácticos</p>
                    </div>
                    <Button onClick={onClose} variant="ghost" size="icon" className="p-2">
                        <X size={20} className="text-gray-500" />
                    </Button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <FileText size={16} className="text-blue-500" />
                            Descripción / Guía de la Clase
                        </label>
                        {readOnly ? (
                            <div className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 text-sm whitespace-pre-wrap min-h-[100px]">
                                {material.description || 'No hay descripción disponible para esta clase.'}
                            </div>
                        ) : (
                            <textarea
                                className="w-full p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                                rows="3"
                                value={material.description}
                                onChange={e => setMaterial({ ...material, description: e.target.value })}
                                placeholder="Escribe un resumen o instrucciones para esta clase..."
                            />
                        )}
                    </div>

                    {/* Links Section */}
                    {[
                        { label: 'Documentos (URLs)', field: 'documents', icon: <FileText size={16} />, color: 'text-orange-500', placeholder: 'https://docs.google.com/...' },
                        { label: 'Videos (YouTube/Vimeo)', field: 'videoLinks', icon: <Video size={16} />, color: 'text-red-500', placeholder: 'https://youtube.com/watch?v=...' },
                        { label: 'Cuestionarios (Forms/Quiz)', field: 'quizLinks', icon: <Question size={16} />, color: 'text-purple-500', placeholder: 'https://forms.gle/...' }
                    ].map((section) => (
                        <div key={section.field} className="space-y-3 bg-gray-50 dark:bg-gray-900/40 p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                                <label className={`text-sm font-bold flex items-center gap-2 ${section.color}`}>
                                    {section.icon}
                                    {section.label}
                                </label>
                                {!readOnly && (
                                    <Button
                                        onClick={() => addItem(section.field)}
                                        variant="outline"
                                        size="sm"
                                        icon={Plus}
                                    >
                                        Añadir
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-2">
                                {material[section.field].map((link, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        {readOnly ? (
                                            <ContentLink 
                                                link={link} 
                                                type={section.field}
                                            />
                                        ) : (
                                            <>
                                                {section.field === 'documents' ? (
                                                    // Campos separados para documentos: nombre y URL
                                                    <div className="flex-1 flex gap-2">
                                                        <input
                                                            type="text"
                                                            className="flex-1 text-sm p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                                                            value={link.name || ''}
                                                            onChange={e => updateItem(section.field, idx, e.target.value, 'name')}
                                                            placeholder="Nombre del documento"
                                                        />
                                                        <input
                                                            type="text"
                                                            className="flex-1 text-sm p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                                                            value={link.url || ''}
                                                            onChange={e => updateItem(section.field, idx, e.target.value, 'url')}
                                                            placeholder="URL del documento"
                                                        />
                                                    </div>
                                                ) : (
                                                    // Campo único para videos y cuestionarios
                                                    <input
                                                        type="text"
                                                        className="flex-1 text-sm p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                                                        value={link}
                                                        onChange={e => updateItem(section.field, idx, e.target.value)}
                                                        placeholder={section.placeholder}
                                                    />
                                                )}
                                                <Button onClick={() => removeItem(section.field, idx)} variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                    <Trash size={16} />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                ))}
                                {material[section.field].length === 0 && (
                                    <p className="text-xs text-gray-400 italic">No hay enlaces agregados aún.</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end gap-3">
                    <Button onClick={onClose} variant="secondary">
                        {readOnly ? 'Cerrar' : 'Cancelar'}
                    </Button>
                    {!readOnly && (
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            variant="primary"
                            icon={saving ? null : FloppyDisk}
                        >
                            {saving ? 'Guardando...' : 'Guardar Información'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClassMaterialManager;
