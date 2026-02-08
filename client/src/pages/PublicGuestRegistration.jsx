import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Loader, X, Search, ChevronDown, UserPlus, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const PublicGuestRegistration = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        documentType: '',
        documentNumber: '',
        name: '',
        birthDate: '',
        sex: '',
        phone: '',
        address: '',
        city: '',
        prayerRequest: '',
        invitedById: null,
    });
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [foundUsers, setFoundUsers] = useState([]);
    const [selectedInviter, setSelectedInviter] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api';

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = async (term) => {
        setSearchTerm(term);
        if (term.length < 3) {
            setFoundUsers([]);
            return;
        }

        setSearchLoading(true);
        try {
            const res = await axios.get(`${API_URL}/auth/public/users/search?search=${term}`);
            setFoundUsers(res.data);
            setIsDropdownOpen(true);
        } catch (err) {
            console.error('Error searching users:', err);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSelectInviter = (user) => {
        setSelectedInviter(user);
        setFormData({ ...formData, invitedById: user.id });
        setIsDropdownOpen(false);
        setSearchTerm('');
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.invitedById) {
            setError('Por favor seleccione quién lo invitó');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await axios.post(`${API_URL}/auth/public/guests`, formData);
            setSuccess('¡Invitado registrado exitosamente! Pronto nos pondremos en contacto contigo.');
            setFormData({
                documentType: '',
                documentNumber: '',
                name: '',
                birthDate: '',
                sex: '',
                phone: '',
                address: '',
                city: '',
                prayerRequest: '',
                invitedById: null,
            });
            setSelectedInviter(null);

            // Redirect after 3 seconds
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al registrar invitado');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-2xl border border-gray-700">
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-gray-400 hover:text-white flex items-center space-x-2 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span>Volver</span>
                    </button>
                    <div className="text-right">
                        <h2 className="text-2xl font-bold text-white">Registro de Invitado</h2>
                        <p className="text-gray-400 mt-1 italic">¡Estamos felices de tenerte!</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded mb-6 text-sm">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="bg-green-500/10 border border-green-500 text-green-500 p-4 rounded mb-6 text-sm font-medium">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Nombre Completo *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Teléfono *</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Tipo de Documento</label>
                            <select
                                name="documentType"
                                value={formData.documentType}
                                onChange={handleChange}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                            >
                                <option value="">Seleccionar...</option>
                                <option value="RC">RC (Registro Civil)</option>
                                <option value="TI">TI (Tarjeta Identidad)</option>
                                <option value="CC">CC (Cédula Ciudadanía)</option>
                                <option value="CE">CE (Cédula Extranjería)</option>
                                <option value="PP">Pasaporte</option>
                                <option value="PEP">PEP</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Número de Documento</label>
                            <input
                                type="text"
                                name="documentNumber"
                                value={formData.documentNumber}
                                onChange={handleChange}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="123456789"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Sexo</label>
                            <select
                                name="sex"
                                value={formData.sex}
                                onChange={handleChange}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                            >
                                <option value="">Seleccionar...</option>
                                <option value="HOMBRE">Hombre</option>
                                <option value="MUJER">Mujer</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Fecha de Nacimiento</label>
                            <input
                                type="date"
                                name="birthDate"
                                value={formData.birthDate}
                                onChange={handleChange}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Dirección</label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Calle 123 #45-67"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Ciudad</label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Manizales"
                            />
                        </div>
                    </div>

                    <div className="relative" ref={dropdownRef}>
                        <label className="block text-sm font-medium text-gray-400 mb-2">¿Quién te invitó? *</label>
                        <div
                            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg flex items-center justify-between cursor-pointer hover:border-blue-500 transition-colors"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            {selectedInviter ? (
                                <div className="flex items-center justify-between w-full">
                                    <span className="font-medium text-blue-400">{selectedInviter.fullName}</span>
                                    <X
                                        size={18}
                                        className="text-gray-500 hover:text-white"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedInviter(null);
                                            setFormData({ ...formData, invitedById: null });
                                        }}
                                    />
                                </div>
                            ) : (
                                <span className="text-gray-500">Buscar por nombre...</span>
                            )}
                            <ChevronDown size={20} className={`text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isDropdownOpen && (
                            <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-h-60 overflow-hidden flex flex-col">
                                <div className="p-3 border-b border-gray-700">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            placeholder="Escribe al menos 3 letras..."
                                            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                                            onClick={(e) => e.stopPropagation()}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="overflow-y-auto">
                                    {searchLoading ? (
                                        <div className="p-4 text-center text-gray-500">Buscando...</div>
                                    ) : foundUsers.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500">
                                            {searchTerm.length < 3 ? 'Escribe para buscar' : 'No se encontraron resultados'}
                                        </div>
                                    ) : (
                                        foundUsers.map((user) => (
                                            <div
                                                key={user.id}
                                                onClick={() => handleSelectInviter(user)}
                                                className="px-4 py-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0 transition-colors"
                                            >
                                                <p className="text-sm font-medium text-white">{user.fullName}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Petición de Oración (Opcional)</label>
                        <textarea
                            name="prayerRequest"
                            value={formData.prayerRequest}
                            onChange={handleChange}
                            rows="3"
                            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors resize-none"
                            placeholder="¿Cómo podemos orar por ti?"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center space-x-2 text-lg"
                    >
                        {loading ? (
                            <Loader size={24} className="animate-spin" />
                        ) : (
                            <>
                                <UserPlus size={24} />
                                <span>Registrarme</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PublicGuestRegistration;
