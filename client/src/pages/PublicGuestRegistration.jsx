import { useReducer, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloppyDisk, Spinner, X, MagnifyingGlassIcon, CaretDownIcon, UserPlus, ArrowLeft, Sun, Moon } from '@phosphor-icons/react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { DATA_POLICY_URL } from '../constants/policies';
import { useTheme } from '../context/ThemeContext';

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
        neighborhood: '',
        prayerRequest: '',
        invitedById: null,
        assignedToId: null,
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
                formData: { 
                    ...state.formData, 
                    invitedById: action.payload?.id || null,
                    assignedToId: action.payload?.id || null
                }
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
    const { theme, toggleTheme } = useTheme();
    const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
    const dropdownRef = useRef(null);

    useEffect(() => {
        
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                dispatch({ type: 'SET_DROPDOWN_OPEN', payload: false });
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            console.error('Error searching users:', err);
            console.error('Search error response:', err.response);
            
            // Fallback: show common users if the API fails
            if (err.response?.status === 404 || err.response?.status === 401) {
                const fallbackUsers = [
                    { id: 1, fullName: 'Pastor Principal' },
                    { id: 2, fullName: 'Líder de 12' },
                    { id: 3, fullName: 'Líder de Célula' },
                    { id: 4, fullName: 'Discípulo' }
                ].filter(user => user.fullName.toLowerCase().includes(term.toLowerCase()));
                
                dispatch({ type: 'SET_FOUND_USERS', payload: fallbackUsers });
                dispatch({ type: 'SET_DROPDOWN_OPEN', payload: true });
            } else {
                toast.error('Error al buscar usuarios. Por favor intenta nuevamente.');
            }
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
            console.error('Error submitting form:', err);
            console.error('Error response:', err.response);
            console.error('Error data:', err.response?.data);
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
        <div className={`min-h-[100dvh] ${theme === 'dark' ? 'bg-black' : 'bg-[#f5f5f7]'} flex items-center justify-center p-4 relative transition-colors duration-300`}>
            {/* Apple-style subtle static elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className={`absolute top-0 left-0 w-96 h-96 ${theme === 'dark' ? 'bg-[#0071e3]' : 'bg-[#0066cc]'} opacity-3 rounded-full blur-3xl`}></div>
                <div className={`absolute bottom-0 right-0 w-80 h-80 ${theme === 'dark' ? 'bg-[#2997ff]' : 'bg-[#0071e3]'} opacity-2 rounded-full blur-3xl`}></div>
            </div>
            
            {/* Floating theme toggle button */}
            <button
                onClick={toggleTheme}
                className={`fixed top-6 right-6 p-3 rounded-full z-50 transition-all duration-300 ${
                    theme === 'dark' 
                        ? 'bg-[#272729] text-white hover:bg-[#2a2a2d]' 
                        : 'bg-white text-[#1d1d1f] hover:bg-[#fafafc] border border-[#e5e5e7]'
                } shadow-lg hover:scale-105 active:scale-95`}
                aria-label="Toggle theme"
            >
                {theme === 'dark' ? (
                    <Sun size={20} weight="regular" />
                ) : (
                    <Moon size={20} weight="regular" />
                )}
            </button>
            
            <div className={`${theme === 'dark' ? 'bg-black' : 'bg-white'} p-8 rounded-lg w-full max-w-2xl relative z-10`}>
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => navigate('/login')}
                        className={`text-gray-400 hover:text-white flex items-center space-x-2 transition-colors ${theme === 'dark' ? '' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}
                        type="button"
                    >
                        <ArrowLeft size={20} />
                        <span>Volver</span>
                    </button>
                    <div className="text-right">
                        <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1d1d1f]'}`}>Registro de Invitado</h1>
                        <p className={`mt-1 italic ${theme === 'dark' ? 'text-[#98989d]' : 'text-[#86868b]'}`}>¡Es un gusto tenerte Aquí!</p>
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
                            <label htmlFor="name" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-[#98989d]' : 'text-[#86868b]'}`}>Nombre Completo *</label>
                            <input
                                id="name"
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder={"Nombre"}
                                className={`w-full ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-[#1d1d1f]'} border-none px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-colors`}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="phone" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-[#98989d]' : 'text-[#86868b]'}`}>Teléfono *</label>
                            <input
                                id="phone"
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="Teléfono"
                                className={`w-full ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-[#1d1d1f]'} border-none px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-colors`}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="sex" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-[#98989d]' : 'text-[#86868b]'}`}>Sexo *</label>
                            <select
                                id="sex"
                                name="sex"
                                value={formData.sex}
                                onChange={handleChange}
                                className={`w-full ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-[#1d1d1f]'} border-none px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-colors`}
                                required
                            >
                                <option value="">Seleccionar...</option>
                                <option value="HOMBRE">Hombre</option>
                                <option value="MUJER">Mujer</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="birthDate" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-[#98989d]' : 'text-[#86868b]'}`}>Fecha de Nacimiento</label>
                            <input
                                id="birthDate"
                                type="date"
                                name="birthDate"
                                value={formData.birthDate}
                                onChange={handleChange}
                                className={`w-full ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-[#1d1d1f]'} border-none px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-colors`}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="address" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-[#98989d]' : 'text-[#86868b]'}`}>Dirección</label>
                            <input
                                id="address"
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className={`w-full ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-[#1d1d1f]'} border-none px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-colors`}
                                placeholder="Dirección"
                            />
                        </div>
                        <div>
                            <label htmlFor="city" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-[#98989d]' : 'text-[#86868b]'}`}>Ciudad</label>
                            <input
                                id="city"
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className={`w-full ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-[#1d1d1f]'} border-none px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-colors`}
                                placeholder="Ciudad"
                            />
                        </div>
                        
                    </div>
<div>
                            <label htmlFor="neighborhood" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-[#98989d]' : 'text-[#86868b]'}`}>Barrio</label>
                            <input
                                id="neighborhood"
                                type="text"
                                name="neighborhood"
                                value={formData.neighborhood}
                                onChange={handleChange}
                                className={`w-full ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-[#1d1d1f]'} border-none px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-colors`}
                                placeholder="Nombre del barrio"
                            />
                        </div>
                    <div className="relative" ref={dropdownRef}>
                        <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-[#98989d]' : 'text-[#86868b]'}`}>¿Quién te invitó? *</label>
                        <div
                            className={`w-full ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-[#1d1d1f]'} border-none px-4 py-3 rounded-lg flex items-center justify-between cursor-pointer hover:ring-2 hover:ring-[#0071e3] transition-colors`}
                            onClick={() => dispatch({ type: 'SET_DROPDOWN_OPEN', payload: !isDropdownOpen })}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && dispatch({ type: 'SET_DROPDOWN_OPEN', payload: !isDropdownOpen })}
                            role="combobox"
                            tabIndex={0}
                            aria-expanded={isDropdownOpen}
                            aria-haspopup="listbox"
                        >
                            {selectedInviter ? (
                                <div className="flex items-center justify-between w-full">
                                    <span className={`font-medium ${theme === 'dark' ? 'text-[#0071e3]' : 'text-[#0071e3]'}`}>{selectedInviter.fullName}</span>
                                    <X
                                        size={18}
                                        className={`${theme === 'dark' ? 'text-[#98989d] hover:text-white' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}
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
                                <span className={theme === 'dark' ? 'text-[#98989d]' : 'text-[#86868b]'}>Buscar por nombre...</span>
                            )}
                            <CaretDownIcon size={20} className={`${theme === 'dark' ? 'text-[#98989d]' : 'text-[#86868b]'} transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isDropdownOpen && (
                            <div className={`absolute z-50 w-full mt-2 ${theme === 'dark' ? 'bg-black' : 'bg-white'} border-none rounded-lg shadow-2xl max-h-60 overflow-hidden flex flex-col`} role="listbox">
                                <div className={`p-3 ${theme === 'dark' ? 'border-b border-[#3a3a3c]' : 'border-b border-[#e5e5e7]'}`}>
                                    <div className="relative">
                                        <MagnifyingGlassIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-[#98989d]' : 'text-[#86868b]'}`} size={18} />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            placeholder="Escribe al menos 3 letras..."
                                            className={`w-full pl-10 pr-4 py-2 ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-[#1d1d1f]'} border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-colors`}
                                            onClick={(e) => e.stopPropagation()}
                                            aria-label="Buscar persona que invitó"
                                        />
                                    </div>
                                </div>
                                <div className="overflow-y-auto">
                                    {searchLoading ? (
                                        <div className={`p-4 text-center ${theme === 'dark' ? 'text-[#98989d]' : 'text-[#86868b]'}`}>Buscando...</div>
                                    ) : foundUsers.length === 0 ? (
                                        <div className={`p-4 text-center ${theme === 'dark' ? 'text-[#98989d]' : 'text-[#86868b]'}`}>
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
                                                className={`px-4 py-3 cursor-pointer border-b last:border-b-0 transition-colors ${theme === 'dark' ? 'hover:bg-[#1c1c1e] border-[#3a3a3c]' : 'hover:bg-[#fafafc] border-[#e5e5e7]'}`}
                                                role="option"
                                                tabIndex={0}
                                            >
                                                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-[#1d1d1f]'}`}>{user.fullName}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label htmlFor="prayerRequest" className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-[#98989d]' : 'text-[#86868b]'}`}>Petición de Oración (Opcional)</label>
                        <textarea
                            id="prayerRequest"
                            name="prayerRequest"
                            value={formData.prayerRequest}
                            onChange={handleChange}
                            rows="3"
                            className={`w-full ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-[#1d1d1f]'} border-none px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-colors resize-none`}
                            placeholder="¿Cómo podemos orar por ti?"
                        />
                    </div>

                    
                    {/* Data Authorization Checks */}
                    <div className={`${theme === 'dark' ? 'bg-[#1c1c1e]' : 'bg-[#fafafc]'} p-6 rounded-xl space-y-4`}>
                        <label className="flex items-start gap-4 cursor-pointer group">
                            <input
                                type="checkbox"
                                name="dataPolicyAccepted"
                                required
                                className={`mt-1 w-5 h-5 rounded ${theme === 'dark' ? 'border-[#3a3a3c] bg-black' : 'border-[#e5e5e7] bg-white'} text-[#0071e3] focus:ring-[#0071e3] transition-colors`}
                                checked={formData.dataPolicyAccepted}
                                onChange={handleChange}
                            />
                            <span className={`text-sm transition-colors ${theme === 'dark' ? 'text-[#98989d] group-hover:text-white' : 'text-[#86868b] group-hover:text-[#1d1d1f]'}`}>
                                Declaro que he leído y acepto la <a href={DATA_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-semibold">Política de Tratamiento de Datos Personales</a> de MCI.
                            </span>
                        </label>
                        <label className="flex items-start gap-4 cursor-pointer group">
                            <input
                                type="checkbox"
                                name="dataTreatmentAuthorized"
                                required
                                className={`mt-1 w-5 h-5 rounded ${theme === 'dark' ? 'border-[#3a3a3c] bg-black' : 'border-[#e5e5e7] bg-white'} text-[#0071e3] focus:ring-[#0071e3] transition-colors`}
                                checked={formData.dataTreatmentAuthorized}
                                onChange={handleChange}
                            />
                            <span className={`text-sm transition-colors ${theme === 'dark' ? 'text-[#98989d] group-hover:text-white' : 'text-[#86868b] group-hover:text-[#1d1d1f]'}`}>
                                Autorizo de manera expresa el tratamiento de mis datos personales conforme a la Ley 1581 de 2012.
                            </span>
                        </label>
                        <label className="flex items-start gap-4 cursor-pointer group">
                            <input
                                type="checkbox"
                                name="minorConsentAuthorized"
                                required={isMinor}
                                className={`mt-1 w-5 h-5 rounded ${theme === 'dark' ? 'border-[#3a3a3c] bg-black' : 'border-[#e5e5e7] bg-white'} text-[#0071e3] focus:ring-[#0071e3] transition-colors`}
                                checked={formData.minorConsentAuthorized}
                                onChange={handleChange}
                            />
                            <span className={`text-sm transition-colors ${theme === 'dark' ? 'text-[#98989d] group-hover:text-white' : 'text-[#86868b] group-hover:text-[#1d1d1f]'}`}>
                                {isMinor ? (
                                    <a href="/login" className={`font-semibold ${theme === 'dark' ? 'text-[#0071e3] hover:text-[#0077ed]' : 'text-[#0071e3] hover:text-[#0077ed]'} transition-colors`}>Inicia sesión aquí</a>
                                ) : (
                                    "En caso de registrar información de menores de edad, declaro contar con la autorización de su representante legal."
                                )}
                            </span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full ${theme === 'dark' ? 'bg-[#0071e3] hover:bg-[#0077ed]' : 'bg-[#0071e3] hover:bg-[#0077ed]'} text-white font-bold py-4 rounded-lg transition-all shadow-lg ${theme === 'dark' ? 'shadow-[#0071e3]/20' : 'shadow-[#0071e3]/20'} disabled:opacity-50 flex items-center justify-center space-x-2 text-lg`}
                    >
                        {loading ? (
                            <Spinner size={24} className="animate-spin" aria-hidden="true" />
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
