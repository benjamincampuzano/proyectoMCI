import { useState, useEffect, useRef } from 'react';
import {
    Image,
    VideoCamera,
    UploadSimple,
    LinkSimple,
    FloppyDiskBack,
    Trash
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api, { resolveMediaUrl } from '../../utils/api';
import { Button } from '../ui';

const DEFAULT_SETTING = {
    mediaType: 'IMAGE',
    mediaUrl: '',
    welcomeTitle: 'Bienvenido a Somos MCI Manizales',
    welcomeSubtitle: 'Ingresa a tu cuenta para continuar'
};

const inputClass = 'w-full bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] text-[var(--ln-text-primary)] px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--ln-brand-indigo)]/20 focus:border-[var(--ln-brand-indigo)] transition-all placeholder:text-[var(--ln-text-tertiary)]/50 text-sm';

const TypeButton = ({ active, onClick, icon: Icon, label }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[13px] font-medium transition-all border ${
            active
                ? 'bg-[var(--ln-brand-indigo)] text-white border-transparent shadow-lg shadow-[var(--ln-brand-indigo)]/20'
                : 'bg-white/[0.02] border-[var(--ln-border-standard)] text-[var(--ln-text-secondary)] hover:bg-white/[0.05] hover:text-[var(--ln-text-primary)]'
        }`}
    >
        <Icon size={18} weight={active ? 'bold' : 'regular'} />
        {label}
    </button>
);

const LoginSettings = () => {
    const [setting, setSetting] = useState(DEFAULT_SETTING);
    const [urlInput, setUrlInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        api.get('/login-setting')
            .then((res) => {
                setSetting({
                    mediaType: res.data.mediaType || 'IMAGE',
                    mediaUrl: res.data.mediaUrl || '',
                    welcomeTitle: res.data.welcomeTitle || DEFAULT_SETTING.welcomeTitle,
                    welcomeSubtitle: res.data.welcomeSubtitle || DEFAULT_SETTING.welcomeSubtitle
                });
                setUrlInput(res.data.mediaUrl || '');
            })
            .catch(() => {});
    }, []);

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const res = await api.post('/login-setting/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setSetting((prev) => ({
                ...prev,
                mediaType: res.data.mediaType || prev.mediaType,
                mediaUrl: res.data.mediaUrl
            }));
            setUrlInput(res.data.mediaUrl);
            toast.success('Archivo subido correctamente. Guarda los cambios para aplicarlo.');
        } catch (error) {
            toast.error(error.response?.data?.error || error.response?.data?.message || 'Error al subir el archivo.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleReset = () => {
        setSetting((prev) => ({ ...prev, mediaType: 'IMAGE', mediaUrl: '' }));
        setUrlInput('');
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await api.put('/login-setting', {
                mediaType: setting.mediaType,
                mediaUrl: urlInput.trim(),
                welcomeTitle: setting.welcomeTitle,
                welcomeSubtitle: setting.welcomeSubtitle
            });
            setSetting({
                mediaType: res.data.mediaType || 'IMAGE',
                mediaUrl: res.data.mediaUrl || '',
                welcomeTitle: res.data.welcomeTitle || DEFAULT_SETTING.welcomeTitle,
                welcomeSubtitle: res.data.welcomeSubtitle || DEFAULT_SETTING.welcomeSubtitle
            });
            setUrlInput(res.data.mediaUrl || '');
            toast.success('Configuración de bienvenida guardada.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al guardar la configuración.');
        } finally {
            setSaving(false);
        }
    };

    const previewSrc = resolveMediaUrl(setting.mediaUrl) || setting.mediaUrl;

    return (
        <div className="animate-in fade-in duration-300 space-y-8">
            <div className="bg-[var(--ln-bg-panel)]/50 backdrop-blur-xl rounded-[32px] border border-[var(--ln-border-standard)] overflow-hidden shadow-2xl">
                <div className="px-8 sm:px-10 py-8 border-b border-[var(--ln-border-standard)] bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[var(--ln-brand-indigo)]/10 rounded-xl text-[var(--ln-brand-indigo)]">
                            <Image size={20} weight="bold" />
                        </div>
                        <div>
                            <h3 className="text-lg weight-590 text-[var(--ln-text-primary)] tracking-tight">Pantalla de Bienvenida del Login</h3>
                            <p className="text-[12px] text-[var(--ln-text-tertiary)] opacity-60">
                                Elige la imagen o video que verán los usuarios al iniciar sesión.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-8 sm:p-10 grid lg:grid-cols-2 gap-8">
                    {/* Previsualización */}
                    <div>
                        <label className="block text-[11px] weight-590 uppercase tracking-widest mb-3 text-[var(--ln-text-tertiary)]">Vista previa</label>
                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-[var(--ln-border-standard)] bg-black/40">
                            {previewSrc ? (
                                setting.mediaType === 'VIDEO' ? (
                                    <video
                                        key={previewSrc}
                                        src={previewSrc}
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                        controls
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <img src={previewSrc} alt="Vista previa" className="w-full h-full object-cover" />
                                )
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#0b0c10] via-[#17181f] to-[#241a33] flex flex-col items-center justify-center p-6 text-center">
                                    <div className="w-14 h-14 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center mb-3">
                                        <VideoCamera size={24} className="text-white/50" />
                                    </div>
                                    <p className="text-[12px] text-white/60 font-medium">
                                        Diseño predeterminado sin imagen/video
                                    </p>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10 pointer-events-none" />
                            <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                                <p className="text-[15px] weight-590 text-white tracking-[-0.3px] truncate">
                                    {setting.welcomeTitle || DEFAULT_SETTING.welcomeTitle}
                                </p>
                                <p className="text-[11px] text-white/70 truncate">
                                    {setting.welcomeSubtitle || DEFAULT_SETTING.welcomeSubtitle}
                                </p>
                            </div>
                        </div>
                        <p className="text-[11px] text-[var(--ln-text-tertiary)] opacity-60 mt-3">
                            El texto de bienvenida se superpone al medio en el lado izquierdo de la pantalla de acceso.
                        </p>
                    </div>

                    {/* Controles */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[11px] weight-590 uppercase tracking-widest mb-3 text-[var(--ln-text-tertiary)]">Tipo de medio</label>
                            <div className="flex gap-3">
                                <TypeButton
                                    active={setting.mediaType === 'IMAGE'}
                                    onClick={() => setSetting((prev) => ({ ...prev, mediaType: 'IMAGE' }))}
                                    icon={Image}
                                    label="Imagen"
                                />
                                <TypeButton
                                    active={setting.mediaType === 'VIDEO'}
                                    onClick={() => setSetting((prev) => ({ ...prev, mediaType: 'VIDEO' }))}
                                    icon={VideoCamera}
                                    label="Video"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] weight-590 uppercase tracking-widest mb-3 text-[var(--ln-text-tertiary)]">Subir archivo</label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,video/ogg,video/quicktime"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <Button
                                variant="ghost"
                                icon={UploadSimple}
                                loading={uploading}
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full"
                            >
                                {uploading ? 'Subiendo archivo...' : `Seleccionar ${setting.mediaType === 'VIDEO' ? 'video' : 'imagen'}`}
                            </Button>
                            <p className="text-[11px] text-[var(--ln-text-tertiary)] opacity-60 mt-2">
                                Imágenes (jpg, png, webp, gif, svg) o videos (mp4, webm, ogg, mov). Máximo 30MB.
                            </p>
                        </div>

                        <div>
                            <label className="block text-[11px] weight-590 uppercase tracking-widest mb-3 text-[var(--ln-text-tertiary)]">
                                <LinkSimple size={13} className="inline mr-1 -mt-0.5" />
                                O pega una URL externa
                            </label>
                            <input
                                type="text"
                                value={urlInput}
                                onChange={(e) => {
                                    setUrlInput(e.target.value);
                                    setSetting((prev) => ({ ...prev, mediaUrl: e.target.value.trim() }));
                                }}
                                className={inputClass}
                                placeholder="https://... o /media/archivo.jpg"
                            />
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] weight-590 uppercase tracking-widest mb-2 text-[var(--ln-text-tertiary)]">Título de bienvenida</label>
                                <input
                                    type="text"
                                    value={setting.welcomeTitle}
                                    onChange={(e) => setSetting((prev) => ({ ...prev, welcomeTitle: e.target.value }))}
                                    className={inputClass}
                                    maxLength={60}
                                    placeholder="Bienvenido a Somos MCI Manizales"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] weight-590 uppercase tracking-widest mb-2 text-[var(--ln-text-tertiary)]">Subtítulo</label>
                                <input
                                    type="text"
                                    value={setting.welcomeSubtitle}
                                    onChange={(e) => setSetting((prev) => ({ ...prev, welcomeSubtitle: e.target.value }))}
                                    className={inputClass}
                                    maxLength={120}
                                    placeholder="Ingresa a tu cuenta para continuar"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 pt-2">
                            <Button
                                onClick={handleSave}
                                loading={saving}
                                icon={FloppyDiskBack}
                            >
                                Guardar cambios
                            </Button>
                            <Button
                                onClick={handleReset}
                                variant="ghost"
                                icon={Trash}
                            >
                                Usar diseño predeterminado
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginSettings;