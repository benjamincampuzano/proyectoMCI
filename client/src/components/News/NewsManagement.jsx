import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Button, Input, PageHeader } from '../ui';
import { Plus, PencilSimple, Trash, Eye, EyeSlash, Image as ImageIcon, Check, X, Megaphone } from '@phosphor-icons/react';
import toast from 'react-hot-toast';

const NewsManagement = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        imageUrl: '',
        isActive: true
    });
    const [currentId, setCurrentId] = useState(null);

    useEffect(() => {
        fetchNews();
    }, []);

    const fetchNews = async () => {
        try {
            setLoading(true);
            const response = await api.get('/news');
            setNews(response.data);
        } catch (error) {
            toast.error('Error al cargar las noticias');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const resetForm = () => {
        setFormData({ title: '', content: '', imageUrl: '', isActive: true });
        setIsEditing(false);
        setCurrentId(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`/news/${currentId}`, formData);
                toast.success('Noticia actualizada');
            } else {
                await api.post('/news', formData);
                toast.success('Noticia creada');
            }
            fetchNews();
            resetForm();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al guardar la noticia');
        }
    };

    const handleEdit = (item) => {
        setFormData({
            title: item.title,
            content: item.content,
            imageUrl: item.imageUrl || '',
            isActive: item.isActive
        });
        setCurrentId(item.id);
        setIsEditing(true);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar esta noticia?')) return;
        try {
            await api.delete(`/news/${id}`);
            toast.success('Noticia eliminada');
            fetchNews();
        } catch (error) {
            toast.error('Error al eliminar noticia');
        }
    };

    const toggleStatus = async (item) => {
        try {
            await api.put(`/news/${item.id}`, { isActive: !item.isActive });
            toast.success(item.isActive ? 'Noticia desactivada' : 'Noticia activada');
            fetchNews();
        } catch (error) {
            toast.error('Error al cambiar estado');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <PageHeader 
                    title="Administración de Noticias" 
                    description="Crea y gestiona las noticias que verán los usuarios al ingresar."
                />
                {!showForm && (
                    <Button 
                        variant="primary" 
                        icon={Plus} 
                        onClick={() => setShowForm(true)}
                        className="w-full sm:w-auto"
                    >
                        Nueva Noticia
                    </Button>
                )}
            </div>

            {showForm && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm animate-in slide-in-from-top duration-300">
                    <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
                        {isEditing ? <PencilSimple size={24} /> : <Plus size={24} />}
                        {isEditing ? 'Editar Noticia' : 'Nueva Noticia'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Título"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            required
                            placeholder="Ej: Gran Vigilia de Oración"
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contenido</label>
                            <textarea
                                name="content"
                                value={formData.content}
                                onChange={handleInputChange}
                                required
                                rows="4"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                                placeholder="Escribe el contenido de la noticia o evento..."
                            ></textarea>
                        </div>
                        <Input
                            label="URL de Imagen (Opcional)"
                            name="imageUrl"
                            value={formData.imageUrl}
                            onChange={handleInputChange}
                            placeholder="https://ejemplo.com/imagen.jpg"
                            icon={ImageIcon}
                        />
                        <div className="flex items-center gap-2 py-2">
                            <input
                                type="checkbox"
                                name="isActive"
                                checked={formData.isActive}
                                onChange={handleInputChange}
                                id="isActive"
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Publicar inmediatamente (Activa)
                            </label>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button variant="outline" type="button" onClick={resetForm} icon={X}>
                                Cancelar
                            </Button>
                            <Button variant="primary" type="submit" icon={Check}>
                                {isEditing ? 'Actualizar' : 'Publicar'}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 h-64 rounded-2xl animate-pulse border border-gray-100 dark:border-gray-700"></div>
                    ))
                ) : news.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <Megaphone size={48} className="mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-500 dark:text-gray-400">No hay noticias creadas aún.</p>
                    </div>
                ) : (
                    news.map((item) => (
                        <div key={item.id} className={`group bg-white dark:bg-gray-800 border ${item.isActive ? 'border-gray-200 dark:border-gray-700' : 'border-dashed border-gray-300 dark:border-gray-600 opacity-75'} rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
                            {item.imageUrl && (
                                <div className="h-40 overflow-hidden relative">
                                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    {!item.isActive && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Inactiva</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-1">{item.title}</h4>
                                    <div className="flex gap-1 shrink-0">
                                        <button 
                                            onClick={() => handleEdit(item)} 
                                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <PencilSimple size={18} />
                                        </button>
                                        <button 
                                            onClick={() => toggleStatus(item)} 
                                            className={`p-1.5 ${item.isActive ? 'text-green-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30' : 'text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30'} rounded-lg transition-colors`}
                                            title={item.isActive ? 'Desactivar' : 'Activar'}
                                        >
                                            {item.isActive ? <Eye size={18} /> : <EyeSlash size={18} />}
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(item.id)} 
                                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash size={18} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-4 h-15">
                                    {item.content}
                                </p>
                                <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-gray-400 font-medium pt-3 border-t border-gray-50 dark:border-gray-700">
                                    <span className="flex items-center gap-1 uppercase tracking-tight">
                                        Por: {item.authorName}
                                    </span>
                                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NewsManagement;
