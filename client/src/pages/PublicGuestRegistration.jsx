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
        servidorCode: '',
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
            const res = await axios.get(`${API_URL}/auth/public/users/search?search=${term}&excludeRoles=ADMIN,PASTOR`);
            dispatch({ type: 'SET_FOUND_USERS', payload: res.data });
            dispatch({ type: 'SET_DROPDOWN_OPEN', payload: true });
        } catch (err) {
            console.error('Error searching users:', err);
            console.error('Search error response:', err.response);
            
            // Fallback: show common users if the API fails
            if (err.response?.status === 404 || err.response?.status === 401) {
                const fallbackUsers = [
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
        <div className="min-h-[100dvh] bg-[var(--ln-bg-marketing)] flex items-center justify-center p-4 relative transition-colors duration-300">
            {/* Linear-style subtle static elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--ln-brand-indigo)] opacity-[0.03] rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--ln-accent-violet)] opacity-[0.02] rounded-full blur-[120px]"></div>
            </div>

            <button
                onClick={toggleTheme}
                className="fixed top-8 right-8 p-3 rounded-xl z-50 transition-all duration-300 bg-white/[0.05] border border-[var(--ln-border-standard)] text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] hover:bg-white/[0.1] shadow-sm backdrop-blur-md group"
                aria-label="Toggle theme"
            >
                <div className="group-hover:rotate-12 transition-transform">
                    {theme === 'dark' ? <Sun size={20} weight="regular" /> : <Moon size={20} weight="regular" />}
                </div>
            </button>

            <div className="ln-card p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-10 shadow-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-10">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] flex items-center gap-2 transition-colors text-sm font-medium"
                        type="button"
                    >
                        <ArrowLeft size={18} />
                        <span>Volver</span>
                    </button>
                    <div className="text-right">
                        <h1 className="text-3xl weight-590 text-[var(--ln-text-primary)] tracking-[-0.7px] mb-2">Registro de Invitado</h1>
                        <p className="text-[14px] text-[var(--ln-text-secondary)] italic">¡Es un gusto tenerte aquí!</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm font-medium" role="alert">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl mb-6 text-sm font-medium" role="status">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[11px] weight-590 uppercase tracking-widest mb-2 text-[var(--ln-text-tertiary)] ml-1">Nombre Completo *</label>
                            <input
                                id="name"
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Nombre completo"
                                className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] transition-all placeholder:text-[var(--ln-text-tertiary)]/50"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] weight-590 uppercase tracking-widest mb-2 text-[var(--ln-text-tertiary)] ml-1">Teléfono *</label>
                            <input
                                id="phone"
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="Teléfono"
                                className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] transition-all placeholder:text-[var(--ln-text-tertiary)]/50"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[11px] weight-590 uppercase tracking-widest mb-2 text-[var(--ln-text-tertiary)] ml-1">Sexo *</label>
                            <select
                                id="sex"
                                name="sex"
                                value={formData.sex}
                                onChange={handleChange}
                                className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] transition-all"
                                required
                            >
                                <option value="">Seleccionar...</option>
                                <option value="HOMBRE">Hombre</option>
                                <option value="MUJER">Mujer</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] weight-590 uppercase tracking-widest mb-2 text-[var(--ln-text-tertiary)] ml-1">Fecha de Nacimiento</label>
                            <input
                                id="birthDate"
                                type="date"
                                name="birthDate"
                                value={formData.birthDate}
                                onChange={handleChange}
                                className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[11px] weight-590 uppercase tracking-widest mb-2 text-[var(--ln-text-tertiary)] ml-1">Dirección</label>
                            <input
                                id="address"
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] transition-all placeholder:text-[var(--ln-text-tertiary)]/50"
                                placeholder="Dirección"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] weight-590 uppercase tracking-widest mb-2 text-[var(--ln-text-tertiary)] ml-1">Ciudad</label>
                            <input
                                id="city"
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] transition-all placeholder:text-[var(--ln-text-tertiary)]/50"
                                placeholder="Ciudad"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] weight-590 uppercase tracking-widest mb-2 text-[var(--ln-text-tertiary)] ml-1">Barrio</label>
                        <input
                            id="neighborhood"
                            type="text"
                            name="neighborhood"
                            value={formData.neighborhood}
                            onChange={handleChange}
                            className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] transition-all placeholder:text-[var(--ln-text-tertiary)]/50"
                            placeholder="Nombre del barrio"
                        />
                    </div>
                    <div className="relative" ref={dropdownRef}>
                        <label className="block text-[11px] weight-590 uppercase tracking-widest mb-2 text-[var(--ln-text-tertiary)] ml-1">¿Quién te invitó? *</label>
                        <div
                            className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl flex items-center justify-between cursor-pointer hover:border-[var(--ln-brand-indigo)]/50 transition-all"
                            onClick={() => dispatch({ type: 'SET_DROPDOWN_OPEN', payload: !isDropdownOpen })}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && dispatch({ type: 'SET_DROPDOWN_OPEN', payload: !isDropdownOpen })}
                            role="combobox"
                            tabIndex={0}
                            aria-expanded={isDropdownOpen}
                            aria-haspopup="listbox"
                        >
                            {selectedInviter ? (
                                <div className="flex items-center justify-between w-full">
                                    <span className="font-medium text-[var(--ln-accent-violet)]">{selectedInviter.fullName}</span>
                                    <X
                                        size={18}
                                        className="text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] transition-colors"
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
                                <span className="text-[var(--ln-text-tertiary)]">Buscar por nombre...</span>
                            )}
                            <CaretDownIcon size={20} className={`text-[var(--ln-text-tertiary)] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isDropdownOpen && (
                            <div className="absolute z-50 w-full mt-2 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-xl shadow-2xl max-h-60 overflow-hidden flex flex-col" role="listbox">
                                <div className="p-3 border-b border-[var(--ln-border-standard)]">
                                    <div className="relative">
                                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--ln-text-tertiary)]" size={18} />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            placeholder="Escribe al menos 3 letras..."
                                            className="w-full pl-10 pr-4 py-2 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] transition-all"
                                            onClick={(e) => e.stopPropagation()}
                                            aria-label="Buscar persona que invitó"
                                        />
                                    </div>
                                </div>
                                <div className="overflow-y-auto">
                                    {searchLoading ? (
                                        <div className="p-4 text-center text-[var(--ln-text-tertiary)]">Buscando...</div>
                                    ) : foundUsers.length === 0 ? (
                                        <div className="p-4 text-center text-[var(--ln-text-tertiary)]">
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
                                                className="px-4 py-3 cursor-pointer border-b last:border-b-0 border-[var(--ln-border-standard)] transition-colors hover:bg-white/[0.05]"
                                                role="option"
                                                tabIndex={0}
                                            >
                                                <p className="text-sm font-medium text-[var(--ln-text-primary)]">{user.fullName}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    

                    <div>
                        <label className="block text-[11px] weight-590 uppercase tracking-widest mb-2 text-[var(--ln-text-tertiary)] ml-1">Petición de Oración (Opcional)</label>
                        <textarea
                            id="prayerRequest"
                            name="prayerRequest"
                            value={formData.prayerRequest}
                            onChange={handleChange}
                            rows="3"
                            className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] transition-all resize-none placeholder:text-[var(--ln-text-tertiary)]/50"
                            placeholder="¿Cómo podemos orar por ti?"
                        />
                    </div>
                    
                    {/* Código de Servidor - Campo Obligatorio */}
                    <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <label className="block text-[11px] weight-590 uppercase tracking-widest mb-1 text-[var(--ln-text-tertiary)] ml-1">
                            Código de Servidor *
                        </label>
                        <input
                            id="servidorCode"
                            type="text"
                            name="servidorCode"
                            value={formData.servidorCode}
                            onChange={handleChange}
                            placeholder="000000"
                            maxLength={6}
                            className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] transition-all placeholder:text-[var(--ln-text-tertiary)]/50 text-center tracking-widest font-mono text-base"
                            required
                        />
                        <p className="text-[10px] text-gray-400 mt-1 ml-1">
                            Código proporcionado por el coordinador del módulo Ganar
                        </p>
                    </div>
                    
                    {/* Data Authorization Checks */}
                    <div className="bg-white/[0.02] p-6 rounded-xl border border-[var(--ln-border-standard)] space-y-4">
                        <label className="flex items-start gap-4 cursor-pointer group">
                            <input
                                type="checkbox"
                                name="dataPolicyAccepted"
                                required
                                className="mt-1 w-5 h-5 rounded border-[var(--ln-border-standard)] bg-[var(--ln-input-bg)] text-[var(--ln-brand-indigo)] focus:ring-[var(--ln-brand-indigo)] transition-colors"
                                checked={formData.dataPolicyAccepted}
                                onChange={handleChange}
                            />
                            <span className="text-sm text-[var(--ln-text-secondary)] group-hover:text-[var(--ln-text-primary)] transition-colors leading-relaxed">
                                Declaro que he leído y acepto la <a href={DATA_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-[var(--ln-accent-violet)] hover:text-[var(--ln-accent-hover)] hover:underline font-semibold">Política de Tratamiento de Datos Personales</a> de MCI.
                            </span>
                        </label>
                        <label className="flex items-start gap-4 cursor-pointer group">
                            <input
                                type="checkbox"
                                name="dataTreatmentAuthorized"
                                required
                                className="mt-1 w-5 h-5 rounded border-[var(--ln-border-standard)] bg-[var(--ln-input-bg)] text-[var(--ln-brand-indigo)] focus:ring-[var(--ln-brand-indigo)] transition-colors"
                                checked={formData.dataTreatmentAuthorized}
                                onChange={handleChange}
                            />
                            <span className="text-sm text-[var(--ln-text-secondary)] group-hover:text-[var(--ln-text-primary)] transition-colors leading-relaxed">
                                Autorizo de manera expresa el tratamiento de mis datos personales conforme a la Ley 1581 de 2012.
                            </span>
                        </label>
                        <label className="flex items-start gap-4 cursor-pointer group">
                            <input
                                type="checkbox"
                                name="minorConsentAuthorized"
                                required={isMinor}
                                className="mt-1 w-5 h-5 rounded border-[var(--ln-border-standard)] bg-[var(--ln-input-bg)] text-[var(--ln-brand-indigo)] focus:ring-[var(--ln-brand-indigo)] transition-colors"
                                checked={formData.minorConsentAuthorized}
                                onChange={handleChange}
                            />
                            <span className="text-sm text-[var(--ln-text-secondary)] group-hover:text-[var(--ln-text-primary)] transition-colors leading-relaxed">
                                {isMinor ? (
                                    <a href="/login" className="font-semibold text-[var(--ln-accent-violet)] hover:text-[var(--ln-accent-hover)] transition-colors">Inicia sesión aquí</a>
                                ) : (
                                    "En caso de registrar información de menores de edad, declaro contar con la autorización de su representante legal."
                                )}
                            </span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#5e6ad2] hover:bg-[#828fff] text-white font-medium py-3 px-4 rounded-md transition-all shadow-lg shadow-[#5e6ad2]/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    >
                        {loading ? (
                            <Spinner size={20} className="animate-spin" aria-hidden="true" />
                        ) : (
                            <>
                                <UserPlus size={20} aria-hidden="true" />
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
