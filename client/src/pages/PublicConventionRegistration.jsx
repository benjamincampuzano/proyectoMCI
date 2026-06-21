import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, CaretDown, CheckCircle, Spinner, Sun, Moon, UserPlus } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useTheme } from '../context/ThemeContext';

const INITIAL_FORM = {
    fullName: '',
    phone: '',
    sex: '',
    needsTransport: false,
    needsAccommodation: false
};

const PublicConventionRegistration = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [conventions, setConventions] = useState([]);
    const [selectedConventionId, setSelectedConventionId] = useState('');
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [loadingConventions, setLoadingConventions] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const loadConventions = async () => {
            setLoadingConventions(true);
            try {
                const response = await api.get('/public/convenciones');
                setConventions(response.data || []);
                if (response.data?.length > 0) {
                    setSelectedConventionId(String(response.data[0].id));
                }
            } catch (requestError) {
                console.error('Error loading public conventions:', requestError);
                setError('No se pudieron cargar las convenciones disponibles.');
            } finally {
                setLoadingConventions(false);
            }
        };

        loadConventions();
    }, []);

    const selectedConvention = useMemo(
        () => conventions.find((convention) => String(convention.id) === String(selectedConventionId)),
        [conventions, selectedConventionId]
    );

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setFormData((current) => ({
            ...current,
            [name]: type === 'checkbox' ? checked : value
        }));
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!selectedConventionId) {
            setError('Selecciona una convención.');
            return;
        }

        if (!formData.fullName.trim()) {
            setError('El nombre completo es obligatorio.');
            return;
        }

        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            await api.post(`/public/convenciones/${selectedConventionId}/registrations`, {
                ...formData,
                fullName: formData.fullName.trim(),
                phone: formData.phone.trim()
            });

            setSuccess('Tu solicitud quedó registrada y pendiente de aprobación.');
            setFormData(INITIAL_FORM);
            toast.success('Solicitud enviada');
        } catch (requestError) {
            const apiError = requestError.response?.data?.error || requestError.response?.data?.message;
            setError(apiError || 'No se pudo enviar la solicitud.');
            toast.error(apiError || 'No se pudo enviar la solicitud.');
        } finally {
            setSubmitting(false);
        }
    };

    const currentConventionLabel = selectedConvention
        ? `${selectedConvention.type} ${selectedConvention.year}`
        : 'Convención';

    return (
        <div className="min-h-[100dvh] bg-[var(--ln-bg-marketing)] relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-8%] left-[-8%] w-[36%] h-[36%] bg-[var(--ln-brand-indigo)] opacity-[0.04] blur-[120px] rounded-full" />
                <div className="absolute bottom-[-8%] right-[-8%] w-[36%] h-[36%] bg-[var(--ln-accent-violet)] opacity-[0.03] blur-[120px] rounded-full" />
            </div>

            <button
                onClick={toggleTheme}
                className="fixed top-4 sm:top-8 right-4 sm:right-8 p-2.5 sm:p-3 rounded-xl z-50 transition-all duration-300 bg-white/[0.05] border border-[var(--ln-border-standard)] text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] hover:bg-white/[0.1] shadow-sm backdrop-blur-md group"
                aria-label="Toggle theme"
                type="button"
            >
                <div className="group-hover:rotate-12 transition-transform">
                    {theme === 'dark' ? <Sun size={20} weight="regular" /> : <Moon size={20} weight="regular" />}
                </div>
            </button>

            <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 lg:py-12 animate-in fade-in duration-500">
                <div className="flex items-center justify-between gap-4 mb-8">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] flex items-center gap-2 transition-colors text-xs sm:text-sm font-medium"
                        type="button"
                    >
                        <ArrowLeft size={18} />
                        <span>Volver</span>
                    </button>
                    <div className="text-right">
                        <p className="text-[11px] weight-590 uppercase tracking-widest text-[var(--ln-text-tertiary)] mb-2">
                            Registro público
                        </p>
                        <h1 className="text-3xl lg:text-5xl font-semibold text-[var(--ln-text-primary)] tracking-[-0.04em]">
                            Convenciones
                        </h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 lg:gap-8">
                    <section className="ln-card p-6 lg:p-8">
                        <div className="mb-6">
                            <p className="text-sm text-[var(--ln-text-secondary)] max-w-2xl">
                                Selecciona la convención a la que deseas postularte. Tu solicitud quedará pendiente hasta que el coordinador la apruebe.
                            </p>
                        </div>

                        {loadingConventions ? (
                            <div className="flex flex-col items-center justify-center min-h-[260px] text-[var(--ln-text-secondary)] gap-3">
                                <Spinner size={28} className="animate-spin text-[var(--ln-brand-indigo)]" />
                                <span className="text-sm weight-510 text-[var(--ln-text-tertiary)]">Cargando convenciones...</span>
                            </div>
                        ) : conventions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center min-h-[260px] bg-[var(--ln-bg-panel)] rounded-2xl border border-dashed border-[var(--ln-border-standard)] p-8 text-center">
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-[var(--ln-border-standard)]">
                                    <Calendar size={24} className="text-[var(--ln-text-tertiary)] opacity-40" />
                                </div>
                                <h3 className="text-base weight-590 text-[var(--ln-text-primary)] tracking-tight mb-1">Sin convenciones</h3>
                                <p className="text-sm text-[var(--ln-text-tertiary)] max-w-[280px]">No hay convenciones disponibles por el momento.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {conventions.map((convention) => {
                                    const isSelected = String(convention.id) === String(selectedConventionId);

                                    return (
                                        <button
                                            key={convention.id}
                                            type="button"
                                            onClick={() => setSelectedConventionId(String(convention.id))}
                                            className={`text-left rounded-2xl border p-5 transition-all active:scale-[0.98] ${
                                                isSelected
                                                    ? 'border-[var(--ln-brand-indigo)] bg-[var(--ln-brand-indigo)]/10 shadow-[0_0_0_1px_rgba(113,112,255,0.35)]'
                                                    : 'border-[var(--ln-border-standard)] bg-[var(--ln-bg-panel)] hover:border-[var(--ln-brand-indigo)]/40 hover:bg-white/[0.03]'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-[11px] weight-590 uppercase tracking-widest text-[var(--ln-text-tertiary)] mb-2">
                                                        {convention.type}
                                                    </p>
                                                    <h2 className="text-xl weight-590 text-[var(--ln-text-primary)] tracking-[-0.3px]">
                                                        {convention.year}
                                                    </h2>
                                                    {convention.theme && (
                                                        <p className="mt-2 text-sm text-[var(--ln-text-secondary)] line-clamp-2">
                                                            {convention.theme}
                                                        </p>
                                                    )}
                                                </div>
                                                {isSelected && (
                                                    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs bg-[var(--ln-brand-indigo)] text-white">
                                                        <CheckCircle size={14} />
                                                        Seleccionada
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-4 flex flex-col gap-2 text-sm text-[var(--ln-text-secondary)]">
                                                <span className="inline-flex items-center gap-2">
                                                    <Calendar size={16} />
                                                    {new Date(convention.startDate).toLocaleDateString()} - {new Date(convention.endDate).toLocaleDateString()}
                                                </span>
                                                <span>
                                                    Registrados aprobados: {convention.registeredCount || 0}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section className="ln-card p-6 lg:p-8">
                        <div className="mb-6">
                            <p className="text-[11px] weight-590 uppercase tracking-widest text-[var(--ln-text-tertiary)] mb-2">
                                Formulario
                            </p>
                            <h2 className="text-2xl weight-590 text-[var(--ln-text-primary)] tracking-[-0.3px]">
                                {currentConventionLabel}
                            </h2>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 sm:p-4 rounded-xl mb-6 text-[12px] sm:text-sm font-medium" role="alert">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 sm:p-4 rounded-xl mb-6 text-[12px] sm:text-sm font-medium" role="status">
                                {success}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[11px] weight-590 uppercase tracking-widest mb-2 text-[var(--ln-text-tertiary)] ml-1">
                                    Nombre completo *
                                </label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] transition-all placeholder:text-[var(--ln-text-tertiary)]/50 text-sm"
                                    placeholder="Escribe tu nombre completo"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] weight-590 uppercase tracking-widest mb-2 text-[var(--ln-text-tertiary)] ml-1">
                                    Teléfono
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] transition-all placeholder:text-[var(--ln-text-tertiary)]/50 text-sm"
                                    placeholder="Opcional"
                                />
                            </div>

                            {selectedConvention && ['HOMBRES', 'MUJERES'].includes(selectedConvention.type) && (
                                <div>
                                    <label className="block text-[11px] weight-590 uppercase tracking-widest mb-2 text-[var(--ln-text-tertiary)] ml-1">
                                        Sexo *
                                    </label>
                                    <div className="relative">
                                        <select
                                            name="sex"
                                            value={formData.sex}
                                            onChange={handleChange}
                                            className="w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] transition-all text-sm appearance-none cursor-pointer pr-10"
                                            required
                                        >
                                            <option value="">Selecciona una opción</option>
                                            <option value="HOMBRE">Hombre</option>
                                            <option value="MUJER">Mujer</option>
                                        </select>
                                        <CaretDown
                                            size={16}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ln-text-tertiary)] pointer-events-none"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="bg-white/[0.02] p-4 sm:p-5 rounded-xl border border-[var(--ln-border-standard)] space-y-3">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        name="needsTransport"
                                        checked={formData.needsTransport}
                                        onChange={handleChange}
                                        className="mt-1 w-5 h-5 rounded border-[var(--ln-border-standard)] bg-[var(--ln-input-bg)] text-[var(--ln-brand-indigo)] focus:ring-[var(--ln-brand-indigo)] transition-colors"
                                    />
                                    <span className="text-[12px] sm:text-sm text-[var(--ln-text-secondary)] group-hover:text-[var(--ln-text-primary)] transition-colors leading-relaxed">Necesito transporte</span>
                                </label>
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        name="needsAccommodation"
                                        checked={formData.needsAccommodation}
                                        onChange={handleChange}
                                        className="mt-1 w-5 h-5 rounded border-[var(--ln-border-standard)] bg-[var(--ln-input-bg)] text-[var(--ln-brand-indigo)] focus:ring-[var(--ln-brand-indigo)] transition-colors"
                                    />
                                    <span className="text-[12px] sm:text-sm text-[var(--ln-text-secondary)] group-hover:text-[var(--ln-text-primary)] transition-colors leading-relaxed">Necesito hospedaje</span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || loadingConventions || !selectedConvention}
                                className="w-full bg-[var(--ln-brand-indigo)] hover:bg-[var(--ln-accent-hover)] text-white font-medium py-3 sm:py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-[var(--ln-brand-indigo)]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-[13px] sm:text-[14px] active:scale-[0.98]"
                            >
                                {submitting ? (
                                    <Spinner size={20} className="animate-spin" />
                                ) : (
                                    <UserPlus size={20} />
                                )}
                                Enviar solicitud
                            </button>
                        </form>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PublicConventionRegistration;
