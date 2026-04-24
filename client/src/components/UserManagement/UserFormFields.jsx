import { Eye, EyeClosed, MapPin } from '@phosphor-icons/react';
import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { AsyncSearchSelect } from '../ui';
import api from '../../utils/api';
import './UserFormFields.css';

const UserFormFields = ({
    formData,
    setFormData,
    mode = 'create',
    pastores,
    lideresDoce,
    lideresCelula,
    users = [],
    isAdmin,
    showPassword,
    setShowPassword,
    passwordErrors,
    setPasswordErrors,
    validatePasswordRealTime,
    calculateAge,
    getAssignableRoles,
    relatedUsersCache = {},
    fetchRelatedUsers
}) => {
    // Fetch related users when editing to avoid "Cargando..." issue
    useEffect(() => {
        if (mode === 'edit' && fetchRelatedUsers) {
            const relatedIds = [];
            
            // Add spouse ID
            if (formData.spouseId) {
                relatedIds.push(formData.spouseId);
            }
            
            // Add pastor IDs
            if (formData.pastorIds) {
                formData.pastorIds.forEach(id => {
                    if (id) relatedIds.push(id);
                });
            }
            
            // Add lider doce IDs
            if (formData.liderDoceIds) {
                formData.liderDoceIds.forEach(id => {
                    if (id) relatedIds.push(id);
                });
            }
            
            // Add lider celula IDs
            if (formData.liderCelulaIds) {
                formData.liderCelulaIds.forEach(id => {
                    if (id) relatedIds.push(id);
                });
            }
            
            if (relatedIds.length > 0) {
                fetchRelatedUsers(relatedIds);
            }
        }
    }, [mode, formData.spouseId, formData.pastorIds, formData.liderDoceIds, formData.liderCelulaIds, fetchRelatedUsers]);
    const inputGroup = (label, children, required = false) => (
        <div className="space-y-1.5 group">
            <label className="text-[11px] weight-700 text-[var(--ln-text-secondary)] uppercase tracking-wider flex items-center gap-1.5 px-1 group-focus-within:text-[var(--ln-brand-indigo)] transition-all">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
        </div>
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            {/* Sección: Identidad y Contacto */}
            {inputGroup("Tipo de Documento", 
                <select
                    className="ln-input appearance-none"
                    value={formData.documentType || ''}
                    onChange={e => setFormData({ ...formData, documentType: e.target.value })}
                >
                    <option value="">Seleccionar...</option>
                    <option value="RC">Registro Civil</option>
                    <option value="TI">Tarjeta Identidad</option>
                    <option value="CC">Cédula Ciudadanía</option>
                    <option value="CE">Cédula Extranjería</option>
                    <option value="PP">PPT (Permiso Temporal)</option>
                </select>
            , true)}

            {inputGroup("Número de Documento", 
                <div className="relative">
                    <input
                        type="text"
                        className="ln-input pl-11"
                        value={formData.documentNumber || ''}
                        onChange={e => setFormData({ ...formData, documentNumber: e.target.value })}
                        placeholder="Sin puntos ni comas"
                        required
                    />
                </div>
            , true)}

            {inputGroup("Nombre Completo", 
                <div className="relative">
                    <input 
                        required 
                        type="text" 
                        className="ln-input pl-11" 
                        value={formData.fullName} 
                        onChange={e => setFormData({ ...formData, fullName: e.target.value })} 
                        placeholder="Nombres y Apellidos"
                    />
                </div>
            , true)}

            {inputGroup("Fecha de Nacimiento", 
                <div className="relative">
                    <input
                        type="date"
                        className="ln-input pl-11"
                        value={formData.birthDate || ''}
                        onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                        required
                    />
                </div>
            , true)}

            {inputGroup("Sexo", 
                <select
                    className="ln-input appearance-none"
                    value={formData.sex || ''}
                    onChange={e => setFormData({ ...formData, sex: e.target.value })}
                    required
                >
                    <option value="">Seleccione...</option>
                    <option value="HOMBRE">Hombre</option>
                    <option value="MUJER">Mujer</option>
                </select>
            , true)}
            {inputGroup("Teléfono / WhatsApp", 
                <div className="relative">
                    <input 
                        type="text" 
                        className="ln-input pl-11" 
                        value={formData.phone || ''} 
                        onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                        placeholder="Teléfono"
                    />
                </div>
            )}
            {inputGroup("Email", 
                <div className="relative">
                    <input 
                        required
                        type="email"
                        className="ln-input pl-11"
                        value={formData.email}
                        placeholder="correo electronico"
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                </div>
            , true)}

            {/* Campo de Contraseña - Solo en modo create */}
            {mode === 'create' && inputGroup("Contraseña",
                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        className="ln-input pr-12"
                        value={formData.password || ''}
                        onChange={e => {
                            const newPassword = e.target.value;
                            setFormData({ ...formData, password: newPassword });
                            if (validatePasswordRealTime && setPasswordErrors) {
                                setPasswordErrors(validatePasswordRealTime(newPassword, formData.fullName));
                            }
                        }}
                        placeholder="Mínimo 8 caracteres"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword && setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] text-[var(--ln-text-secondary)] hover:text-[var(--ln-brand-indigo)] hover:border-[var(--ln-brand-indigo)]/30 hover:bg-[var(--ln-brand-indigo)]/10 transition-all"
                        title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                        {showPassword ? <EyeClosed size={16} /> : <Eye size={16} />}
                    </button>
                    {passwordErrors && passwordErrors.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                            {passwordErrors.map((error, idx) => (
                                <p key={idx} className="text-[11px] text-red-500 flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-red-500" />
                                    {error}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            , true)}

            {/* Sección: Entorno Civil y Red */}
            {inputGroup("Estado Civil", 
                <select
                    className="ln-input appearance-none"
                    value={formData.maritalStatus || ''}
                    onChange={e => setFormData({ ...formData, maritalStatus: e.target.value })}
                >
                    <option value="">Seleccione...</option>
                    <option value="SOLTERO">Soltero/a</option>
                    <option value="CASADO">Casado/a</option>
                    <option value="DIVORCIADO">Divorciado/a</option>
                    <option value="VIUDO">Viudo/a</option>
                    <option value="UNION_LIBRE">Unión de hecho/libre</option>
                    <option value="SEPARADO">Separado/a</option>
                </select>
            )}

            {inputGroup("Cónyuge Ministerial", 
                <AsyncSearchSelect
                    fetchItems={(term) => {
                        const params = { search: term };
                        if (formData.sex === 'HOMBRE') params.sex = 'MUJER';
                        else if (formData.sex === 'MUJER') params.sex = 'HOMBRE';
                        
                        return api.get('/users/search', { params })
                            .then(res => (res.data || []).filter(u => u.id !== formData.id));
                    }}
                    selectedValue={
                        users.find(u => u.id === parseInt(formData.spouseId)) || 
                        relatedUsersCache[formData.spouseId] || 
                        (formData.spouseId ? { id: formData.spouseId, fullName: 'Cargando...' } : null)
                    }
                    onSelect={(user) => setFormData({ ...formData, spouseId: user?.id || '' })}
                    placeholder="Buscar por nombre..."
                    labelKey="fullName"
                    disabled={!['CASADO', 'UNION_LIBRE'].includes(formData.maritalStatus)}
                />
            )}

            {inputGroup("RED Ministerial", 
                <select
                    className="ln-input appearance-none"
                    value={formData.network || ''}
                    onChange={e => setFormData({ ...formData, network: e.target.value })}
                    required
                >
                    <option value="">Seleccione...</option>
                    <option value="MUJERES">RED de Mujeres</option>
                    <option value="HOMBRES">RED de Hombres</option>
                    <option value="KIDS">MCI Kids 1 (5 a 7 años)</option>
                    <option value="ROCAS">MCI Kids 2 (8 a 10 años)</option>
                    <option value="TEENS">MCI Teens (11 a 13 años)</option>
                    <option value="JOVENES">MCI Jóvenes (14+ solteros)</option>
                </select>
            , true)}

            {inputGroup("Barrio",
                <div className="relative">
                    <input
                        type="text"
                        className="ln-input pl-11"
                        value={formData.neighborhood || ''}
                        onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                        placeholder="Nombre del barrio"
                    />
                </div>
            )}

            {inputGroup("Ciudad",
                <div className="relative">
                    <input
                        type="text"
                        className="ln-input pl-11"
                        value={formData.city || ''}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Nombre de la ciudad"
                    />
                </div>
            )}

            {/* Sección: Jerarquía Ministerial */}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                            {inputGroup("Dirección", 
                <div className="relative">
                    <input 
                        type="text" 
                        className="ln-input" 
                        value={formData.address || ''} 
                        onChange={e => setFormData({ ...formData, address: e.target.value })} 
                        placeholder="Dirección completa"
                    />
                </div>
            )}
                
                {inputGroup("Perfil / Rol Principal", 
                    <select
                        className="ln-input appearance-none font-bold text-[var(--ln-brand-indigo)]"
                        value={formData.role || ''}
                        onChange={e => setFormData({ ...formData, role: e.target.value, pastorId: '', liderDoceId: '', liderCelulaId: '' })}
                    >
                        {getAssignableRoles && getAssignableRoles().map(r => (
                            <option key={r} value={r}>{r.replace('_', ' ')}</option>
                        ))}
                    </select>
                , true)}

                <div className="sm:col-span-2 text-[11px] weight-510 text-[var(--ln-brand-indigo)]/70 px-1">
                    {formData.role === 'PASTOR' ? 
                        "ℹ️ El perfil de Pastor tiene autonomía jerárquica total." : 
                        "ℹ️ Asigne los líderes por pareja para mantener la integridad de la red."
                    }
                </div>

                {(formData.role === 'LIDER_DOCE' || formData.role === 'LIDER_CELULA' || formData.role === 'DISCIPULO') && (
                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                        {/* PASTORES (for LIDER_DOCE) */}
                        {formData.role === 'LIDER_DOCE' && (
                            <>
                                {[0, 1].map(index => (
                                    <div key={`pastor-${index}`}>
                                        {inputGroup(`Pastor Liderazgo (${index + 1})`, 
                                            <AsyncSearchSelect
                                                fetchItems={(term) => api.get('/users/search', { params: { search: term, role: 'PASTOR' } }).then(res => res.data)}
                                                selectedValue={
                                                    pastores.find(p => p.id === parseInt((formData.pastorIds || [])[index])) ||
                                                    relatedUsersCache[(formData.pastorIds || [])[index]] ||
                                                    ((formData.pastorIds || [])[index] ? { id: formData.pastorIds[index], fullName: 'Cargando...' } : null)
                                                }
                                                onSelect={(user) => {
                                                    const newPastorIds = [...(formData.pastorIds || [])];
                                                    newPastorIds[index] = user?.id || '';
                                                    let newPastorSpouseIds = [...(formData.pastorSpouseIds || [])];
                                                    newPastorSpouseIds[index] = user?.spouseId?.toString() || '';
                                                    setFormData({ ...formData, pastorIds: newPastorIds, pastorSpouseIds: newPastorSpouseIds });
                                                }}
                                                placeholder="Buscar pastor tutor..."
                                                labelKey="fullName"
                                            />
                                        )}
                                    </div>
                                ))}
                            </>
                        )}

                        {/* LIDERES DOCE (for LIDER_CELULA and DISCIPULO) */}
                        {(formData.role === 'LIDER_CELULA' || formData.role === 'DISCIPULO') && (
                            <>
                                {[0, 1].map(index => (
                                    <div key={`ld-${index}`}>
                                        {inputGroup(`Líder 12 (${index + 1})`, 
                                            <AsyncSearchSelect
                                                fetchItems={(term) => api.get('/users/search', { params: { search: term, role: 'LIDER_DOCE' } }).then(res => res.data)}
                                                selectedValue={
                                                    lideresDoce.find(l => l.id === parseInt((formData.liderDoceIds || [])[index])) ||
                                                    relatedUsersCache[(formData.liderDoceIds || [])[index]] ||
                                                    ((formData.liderDoceIds || [])[index] ? { id: formData.liderDoceIds[index], fullName: 'Cargando...' } : null)
                                                }
                                                onSelect={(user) => {
                                                    const newLiderDoceIds = [...(formData.liderDoceIds || [])];
                                                    newLiderDoceIds[index] = user?.id || '';
                                                    let newLiderDoceSpouseIds = [...(formData.liderDoceSpouseIds || [])];
                                                    newLiderDoceSpouseIds[index] = user?.spouseId?.toString() || '';
                                                    setFormData({ ...formData, liderDoceIds: newLiderDoceIds, liderDoceSpouseIds: newLiderDoceSpouseIds });
                                                }}
                                                placeholder="Buscar líder de 12..."
                                                labelKey="fullName"
                                            />
                                        )}
                                    </div>
                                ))}
                            </>
                        )}

                        {/* LIDERES CELULA (for DISCIPULO) */}
                        {formData.role === 'DISCIPULO' && (
                            <>
                                {[0, 1].map(index => (
                                    <div key={`lc-${index}`}>
                                        {inputGroup(`Líder Célula(${index + 1})`, 
                                            <AsyncSearchSelect
                                                fetchItems={(term) => {
                                                    const params = { search: term, role: 'LIDER_CELULA' };
                                                    const parentId = (formData.liderDoceIds || []).find(id => id);
                                                    if (parentId) params.liderDoceId = parentId;
                                                    return api.get('/users/search', { params }).then(res => res.data);
                                                }}
                                                selectedValue={
                                                    lideresCelula.find(lc => lc.id === parseInt((formData.liderCelulaIds || [])[index])) ||
                                                    relatedUsersCache[(formData.liderCelulaIds || [])[index]] ||
                                                    ((formData.liderCelulaIds || [])[index] ? { id: formData.liderCelulaIds[index], fullName: 'Cargando...' } : null)
                                                }
                                                onSelect={(user) => {
                                                    const newLiderCelulaIds = [...(formData.liderCelulaIds || [])];
                                                    newLiderCelulaIds[index] = user?.id || '';
                                                    let newLiderCelulaSpouseIds = [...(formData.liderCelulaSpouseIds || [])];
                                                    newLiderCelulaSpouseIds[index] = user?.spouseId?.toString() || '';
                                                    setFormData({ ...formData, liderCelulaIds: newLiderCelulaIds, liderCelulaSpouseIds: newLiderCelulaSpouseIds });
                                                }}
                                                placeholder="Buscar líder de célula..."
                                                labelKey="fullName"
                                            />
                                        )}
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Sección: Auditoría y Consentimiento */}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-start gap-3 p-3 rounded-2xl bg-[var(--ln-bg-panel)]/50 border border-[var(--ln-border-standard)] hover:border-[var(--ln-brand-indigo)]/30 transition-all cursor-pointer group shadow-sm">
                    <div className="relative flex items-center mt-0.5">
                        <input
                            type="checkbox"
                            required={mode === 'create'}
                            disabled={!isAdmin}
                            className="w-5 h-5 rounded-lg border-[var(--ln-border-standard)] text-[var(--ln-brand-indigo)] focus:ring-[var(--ln-brand-indigo)]/20 bg-white shadow-sm transition-all disabled:opacity-40"
                            checked={formData.dataPolicyAccepted || false}
                            onChange={e => setFormData({ ...formData, dataPolicyAccepted: e.target.checked })}
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[13.5px] weight-590 text-[var(--ln-text-primary)] group-hover:text-[var(--ln-brand-indigo)] transition-colors">Política de MCI</span>
                        <span className="text-[11px] text-[var(--ln-text-tertiary)] opacity-60">Aceptación de la Política de Tratamiento de MCI Global.</span>
                    </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-2xl bg-[var(--ln-bg-panel)]/50 border border-[var(--ln-border-standard)] hover:border-[var(--ln-brand-indigo)]/30 transition-all cursor-pointer group shadow-sm">
                    <div className="relative flex items-center mt-0.5">
                        <input
                            type="checkbox"
                            required={mode === 'create'}
                            disabled={!isAdmin}
                            className="w-5 h-5 rounded-lg border-[var(--ln-border-standard)] text-[var(--ln-brand-indigo)] focus:ring-[var(--ln-brand-indigo)]/20 bg-white shadow-sm transition-all disabled:opacity-40"
                            checked={formData.dataTreatmentAuthorized || false}
                            onChange={e => setFormData({ ...formData, dataTreatmentAuthorized: e.target.checked })}
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[13.5px] weight-590 text-[var(--ln-text-primary)] group-hover:text-[var(--ln-brand-indigo)] transition-colors">Ley 1581 (2012)</span>
                        <span className="text-[11px] text-[var(--ln-text-tertiary)] opacity-60">Autorización previa y explícita para recolección de datos.</span>
                    </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-[var(--ln-brand-indigo)]/5 border border-[var(--ln-brand-indigo)]/10 hover:border-[var(--ln-brand-indigo)]/30 transition-all cursor-pointer group shadow-md sm:col-span-2">
                    <div className="relative flex items-center mt-1">
                        <input
                            type="checkbox"
                            disabled={!isAdmin}
                            required={calculateAge(formData.birthDate) < 18}
                            className="w-6 h-6 rounded-lg border-[var(--ln-brand-indigo)]/30 text-[var(--ln-brand-indigo)] focus:ring-[var(--ln-brand-indigo)]/20 bg-white transition-all disabled:opacity-40"
                            checked={formData.minorConsentAuthorized || false}
                            onChange={e => setFormData({ ...formData, minorConsentAuthorized: e.target.checked })}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[14px] weight-700 text-[var(--ln-brand-indigo)]">Autorización para Menores de Edad</span>
                        <span className="text-[12px] weight-510 text-[var(--ln-text-secondary)] opacity-80 leading-relaxed">
                            {calculateAge(formData.birthDate) < 18 ? 
                                "El registro requiere firma física de los padres o tutor legal para ser válido en el sistema." : 
                                "Consentimiento del representante legal para el manejo de información sensible."
                            }
                        </span>
                    </div>
                </label>

                {!isAdmin && (
                    <div className="flex items-center gap-2 p-3 bg-orange-500/5 rounded-xl border border-orange-500/10 animate-pulse sm:col-span-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                        <p className="text-[11px] weight-700 text-orange-500/80 uppercase tracking-widest">
                            Auditoría de Acceso: Edición restringida a Administradores
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

UserFormFields.propTypes = {
    formData: PropTypes.object.isRequired,
    setFormData: PropTypes.func.isRequired,
    mode: PropTypes.oneOf(['create', 'edit']),
    pastores: PropTypes.array.isRequired,
    lideresDoce: PropTypes.array.isRequired,
    lideresCelula: PropTypes.array.isRequired,
    users: PropTypes.array,
    isAdmin: PropTypes.bool.isRequired,
    showPassword: PropTypes.bool,
    setShowPassword: PropTypes.func,
    passwordErrors: PropTypes.array,
    setPasswordErrors: PropTypes.func,
    validatePasswordRealTime: PropTypes.func.isRequired,
    calculateAge: PropTypes.func.isRequired,
    getAssignableRoles: PropTypes.func,
    relatedUsersCache: PropTypes.object,
    fetchRelatedUsers: PropTypes.func,
};

export default UserFormFields;
