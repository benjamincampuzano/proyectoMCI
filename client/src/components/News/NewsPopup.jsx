import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { Modal, Button } from '../ui';
import { Megaphone, X, Info } from '@phosphor-icons/react';

const NewsPopup = () => {
    const { user, updateProfile } = useAuth();
    const [news, setNews] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            // Check if dismissed in this session or popup disabled in profile
            const isDismissed = sessionStorage.getItem('newsPopupDismissed') === 'true';
            
            // Si el usuario explícitamente desactivó el popup o ya lo cerró en esta sesión
            if (!user || user.showNewsPopup === false || isDismissed) {
                setLoading(false);
                return;
            }

            try {
                const response = await api.get('/news/active');
                if (response.data && response.data.length > 0) {
                    setNews(response.data);
                    setIsOpen(true);
                }
            } catch (error) {
                // Error handled silently as per security request
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, [user]);

    const handleClose = () => {
        setIsOpen(false);
        if (dontShowAgain) {
            // Dismiss only for the current session (browser session)
            sessionStorage.setItem('newsPopupDismissed', 'true');
        }
    };

    if (!isOpen || news.length === 0) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Noticias y Eventos Recientes"
            maxWidth="max-w-3xl"
        >
            <div className="p-6">
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {news.map((item) => (
                        <div key={item.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                            {item.imageUrl && (
                                <div className="w-full h-48 overflow-hidden">
                                    <img 
                                        src={item.imageUrl} 
                                        alt={item.title} 
                                        className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500" 
                                    />
                                </div>
                            )}
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                        <Megaphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                                        {item.title}
                                    </h3>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                    {item.content}
                                </p>
                                <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 italic">
                                    <span>Por: {item.authorName}</span>
                                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                checked={dontShowAgain}
                                onChange={(e) => setDontShowAgain(e.target.checked)}
                                className="peer sr-only"
                            />
                            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-md transition-all group-hover:border-blue-500 peer-checked:bg-blue-600 peer-checked:border-blue-600"></div>
                            <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity left-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
                            No volver a mostrar durante esta sesión
                        </span>
                    </label>
                    <Button 
                        variant="primary" 
                        onClick={handleClose}
                        className="w-full sm:w-auto px-10"
                    >
                        Entendido
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default NewsPopup;
