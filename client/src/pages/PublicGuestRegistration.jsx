import { useReducer, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Loader, X, Search, ChevronDown, UserPlus, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { sileo as toast } from 'sileo';
import { DATA_POLICY_URL } from '../constants/policies';

const INITIAL_STATE = {
    formData: {
        documentType: 'NO_SPECIFIED',
        documentNumber: 'NO_SPECIFIED',
        name: '',
        birthDate: '',
        sex: '',
        phone: '',
        address: '',
        city: '',
        prayerRequest: '',
        invitedById: null,
        dataPolicyAccepted: false,
        dataTreatmentAuthorized: false,
        minorConsentAuthorized: false,
    },
    loading: false,
    searchLoading: false,
    error: '',
    success: '',
    searchTerm: '',
    foundUsers: [],
    selectedInviter: null,
    isDropdownOpen: false,
};

const reducer = (state, action) => {
    switch (action.type) {
        case 'SET_FIELD':
            return {
                ...state,
                formData: { ...state.formData, [action.field]: action.value },
                error: '',
                success: ''
            };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_SEARCH_LOADING':
            return { ...state, searchLoading: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload, success: '' };
        case 'SET_SUCCESS':
            return { ...state, success: action.payload, error: '' };
        case 'SET_SEARCH_TERM':
            return { ...state, searchTerm: action.payload };
        case 'SET_FOUND_USERS':
            return { ...state, foundUsers: action.payload };
        case 'SET_SELECTED_INVITER':
            return {
                ...state,
                selectedInviter: action.payload,
                formData: { ...state.formData, invitedById: action.payload?.id || null }
            };
        case 'SET_DROPDOWN_OPEN':
            return { ...state, isDropdownOpen: action.payload };
        case 'RESET_FORM':
            return { ...INITIAL_STATE, success: action.success || '' };
        default:
            return state;
    }
};

const PublicGuestRegistration = () => {
    const navigate = useNavigate();
    const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
    const dropdownRef = useRef(null);

    const {
        formData,
        loading,
        searchLoading,
        error,
        success,
        searchTerm,
        foundUsers,
        selectedInviter,
        isDropdownOpen
    } = state;

    const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api';

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                dispatch({ type: 'SET_DROPDOWN_OPEN', payload: false });
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = async (term) => {
        dispatch({ type: 'SET_SEARCH_TERM', payload: term });
        if (term.length < 3) {
            dispatch({ type: 'SET_FOUND_USERS', payload: [] });
            return;
        }

        dispatch({ type: 'SET_SEARCH_LOADING', payload: true });
        try {
            const res = await axios.get(`${API_URL}/auth/public/users/search?search=${term}`);
            dispatch({ type: 'SET_FOUND_USERS', payload: res.data });
            dispatch({ type: 'SET_DROPDOWN_OPEN', payload: true });
        } catch (err) {
            toast.error('Error al buscar usuarios. Por favor intenta nuevamente.');
        } finally {
            dispatch({ type: 'SET_SEARCH_LOADING', payload: false });
        }
    };

    const handleSelectInviter = (user) => {
        dispatch({ type: 'SET_SELECTED_INVITER', payload: user });
        dispatch({ type: 'SET_DROPDOWN_OPEN', payload: false });
        dispatch({ type: 'SET_SEARCH_TERM', payload: '' });
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        dispatch({
            type: 'SET_FIELD',
            field: name,
            value: type === 'checkbox' ? checked : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.invitedById) {
            dispatch({ type: 'SET_ERROR', payload: 'Por favor seleccione quién lo invitó' });
            return;
        }

        dispatch({ type: 'SET_LOADING', payload: true });

        try {
            await axios.post(`${API_URL}/auth/public/guests`, formData);
            const successMsg = '¡Invitado registrado exitosamente! Pronto nos pondremos en contacto contigo.';
            dispatch({ type: 'RESET_FORM', success: successMsg });

            // Redirect after 3 seconds
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            dispatch({ type: 'SET_ERROR', payload: err.response?.data?.message || 'Error al registrar invitado' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const calculateAge = (birthDate) => {
        if (!birthDate) return null;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const isMinor = formData.birthDate ? calculateAge(formData.birthDate) < 18 : false;

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-2xl border border-gray-700">
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-gray-400 hover:text-white flex items-center space-x-2 transition-colors"
                        type="button"
                    >
                        <ArrowLeft size={20} />
                        <span>Volver</span>
                    </button>
                    <div className="text-right">
                        <h1 className="text-2xl font-bold text-white">Registro de Invitado</h1>
                        <p className="text-gray-400 mt-1 italic">¡Estamos felices de tenerte!</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded mb-6 text-sm" role="alert">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="bg-green-500/10 border border-green-500 text-green-500 p-4 rounded mb-6 text-sm font-medium" role="status">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-2">Nombre Completo *</label>
                            <input
                                id="name"
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-400 mb-2">Teléfono *</label>
                            <input
                                id="phone"
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
                            <label htmlFor="sex" className="block text-sm font-medium text-gray-400 mb-2">Sexo</label>
                            <select
                                id="sex"
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
                            <label htmlFor="birthDate" className="block text-sm font-medium text-gray-400 mb-2">Fecha de Nacimiento</label>
                            <input
                                id="birthDate"
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
                            <label htmlFor="address" className="block text-sm font-medium text-gray-400 mb-2">Dirección</label>
                            <input
                                id="address"
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Calle 123 #45-67"
                            />
                        </div>
                        <div>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-400 mb-2">Ciudad</label>
                            <input
                                id="city"
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
                            onClick={() => dispatch({ type: 'SET_DROPDOWN_OPEN', payload: !isDropdownOpen })}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && dispatch({ type: 'SET_DROPDOWN_OPEN', payload: !isDropdownOpen })}
                            role="combobox"
                            tabIndex={0}
                            aria-expanded={isDropdownOpen}
                            aria-haspopup="listbox"
                        >
                            {selectedInviter ? (
                                <div className="flex items-center justify-between w-full">
                                    <span className="font-medium text-blue-400">{selectedInviter.fullName}</span>
                                    <X
                                        size={18}
                                        className="text-gray-500 hover:text-white"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            dispatch({ type: 'SET_SELECTED_INVITER', payload: null });
                                        }}
                                        role="button"
                                        aria-label="Eliminar invitado"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.stopPropagation();
                                                dispatch({ type: 'SET_SELECTED_INVITER', payload: null });
                                            }
                                        }}
                                        tabIndex={0}
                                    />
                                </div>
                            ) : (
                                <span className="text-gray-500">Buscar por nombre...</span>
                            )}
                            <ChevronDown size={20} className={`text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isDropdownOpen && (
                            <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-h-60 overflow-hidden flex flex-col" role="listbox">
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
                                            aria-label="Buscar persona que invitó"
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
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        handleSelectInviter(user);
                                                    }
                                                }}
                                                className="px-4 py-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0 transition-colors"
                                                role="option"
                                                tabIndex={0}
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
                        <label htmlFor="prayerRequest" className="block text-sm font-medium text-gray-400 mb-2">Petición de Oración (Opcional)</label>
                        <textarea
                            id="prayerRequest"
                            name="prayerRequest"
                            value={formData.prayerRequest}
                            onChange={handleChange}
                            rows="3"
                            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors resize-none"
                            placeholder="¿Cómo podemos orar por ti?"
                        />
                    </div>

                    {/* Data Authorization Checks */}
                    <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-700 space-y-4">
                        <label className="flex items-start gap-4 cursor-pointer group">
                            <input
                                type="checkbox"
                                name="dataPolicyAccepted"
                                required
                                className="mt-1 w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-800"
                                checked={formData.dataPolicyAccepted}
                                onChange={handleChange}
                            />
                            <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                                Declaro que he leído y acepto la <a href={DATA_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-semibold">Política de Tratamiento de Datos Personales</a> de MCI.
                            </span>
                        </label>
                        <label className="flex items-start gap-4 cursor-pointer group">
                            <input
                                type="checkbox"
                                name="dataTreatmentAuthorized"
                                required
                                className="mt-1 w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-800"
                                checked={formData.dataTreatmentAuthorized}
                                onChange={handleChange}
                            />
                            <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                                Autorizo de manera expresa el tratamiento de mis datos personales conforme a la Ley 1581 de 2012.
                            </span>
                        </label>
                        <label className="flex items-start gap-4 cursor-pointer group">
                            <input
                                type="checkbox"
                                name="minorConsentAuthorized"
                                required={isMinor}
                                className="mt-1 w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-800"
                                checked={formData.minorConsentAuthorized}
                                onChange={handleChange}
                            />
                            <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                                {isMinor ? (
                                    <span className="text-blue-500 font-semibold">
                                        Cuento con el documento de autorización física/digital firmado por el padre o tutor legal para el tratamiento de datos del menor. (Obligatorio para menores)
                                    </span>
                                ) : (
                                    "En caso de registrar información de menores de edad, declaro contar con la autorización de su representante legal."
                                )}
                            </span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center space-x-2 text-lg"
                    >
                        {loading ? (
                            <Loader size={24} className="animate-spin" aria-hidden="true" />
                        ) : (
                            <>
                                <UserPlus size={24} aria-hidden="true" />
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
