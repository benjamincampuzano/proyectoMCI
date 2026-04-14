import { Eye, EyeClosedIcon } from '@phosphor-icons/react';
import PropTypes from 'prop-types';
import { AsyncSearchSelect } from '../ui';
import api from '../../utils/api';

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
    getAssignableRoles
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Tipo de Documento</label>
                <select
                    className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    value={formData.documentType || ''}
                    onChange={e => setFormData({ ...formData, documentType: e.target.value })}
                >
                    <option value="">Seleccionar...</option>
                    <option value="RC">RC</option>
                    <option value="TI">TI</option>
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="PP">PPT</option>
                    <option value="PEP">PEP</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Número de Documento</label>
                <input
                    type="text"
                    className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    value={formData.documentNumber || ''}
                    onChange={e => setFormData({ ...formData, documentNumber: e.target.value })}
                    placeholder="12345678"
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Nombre Completo</label>
                <input required type="text" className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Fecha de Nacimiento</label>
                <input
                    type="date"
                    className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    value={formData.birthDate || ''}
                    onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email</label>
                <input required
                    type="email"
                    className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    value={formData.email}
                    placeholder="tu_email@email.com"
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
            </div>

            {mode === 'create' && (
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Password</label>
                    <div className="relative">
                        <input
                            required
                            type={showPassword ? "text" : "Contraseña"}
                            placeholder="Mínimo 8 caracteres"
                            className="w-full p-2 pr-10 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                            value={formData.password}
                            onChange={e => {
                                setFormData({ ...formData, password: e.target.value });
                                setPasswordErrors(validatePasswordRealTime(e.target.value, formData.fullName));
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            {showPassword ? <Eye size={20} /> : <EyeClosedIcon size={20} />}
                        </button>
                    </div>
                    {passwordErrors.length > 0 && (
                        <div className="mt-1 space-y-1">
                            {passwordErrors.map((error, idx) => (
                                <p key={idx} className="text-xs text-red-600 dark:text-red-400">
                                    ⚠️ {error}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Estado Civil</label>
                <select
                    className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
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
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">RED</label>
                <select
                    className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    value={formData.network || ''}
                    onChange={e => setFormData({ ...formData, network: e.target.value })}
                >
                    <option value="">Seleccione...</option>
                    <option value="MUJERES">Mujeres</option>
                    <option value="HOMBRES">Hombres</option>
                    <option value="KIDS">Kids (5 a 7 años)</option>
                    <option value="TEENS">Teens (8 a 10 años)</option>
                    <option value="ROCAS">Rocas (11 a 14 años)</option>
                    <option value="JOVENES">Jovenes (15 años en adelante solteros)</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Cónyuge (Opcional)</label>
                <AsyncSearchSelect
                    fetchItems={(term) => {
                        const params = { search: term };
                        if (formData.sex === 'HOMBRE') params.sex = 'MUJER';
                        else if (formData.sex === 'MUJER') params.sex = 'HOMBRE';
                        
                        return api.get('/users/search', { params })
                            .then(res => (res.data || []).filter(u => u.id !== formData.id));
                    }}
                    selectedValue={users.find(u => u.id === parseInt(formData.spouseId)) || (formData.spouseId ? { id: formData.spouseId, fullName: 'Cargando...' } : null)}
                    onSelect={(user) => setFormData({ ...formData, spouseId: user?.id || '' })}
                    placeholder="Buscar cónyuge..."
                    labelKey="fullName"
                    disabled={!['CASADO', 'UNION_LIBRE'].includes(formData.maritalStatus)}
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Rol</label>
                <select
                    className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    value={formData.role || ''}
                    onChange={e => setFormData({ ...formData, role: e.target.value, pastorId: '', liderDoceId: '', liderCelulaId: '' })}
                >
                    {getAssignableRoles && getAssignableRoles().map(r => (
                        <option key={r} value={r}>{r.replace('_', ' ')}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Sexo</label>
                <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.sex || ''} onChange={e => setFormData({ ...formData, sex: e.target.value })}>
                    <option value="">Seleccionar...</option>
                    <option value="HOMBRE">Hombre</option>
                    <option value="MUJER">Mujer</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Teléfono</label>
                <input type="text" className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Dirección</label>
                <input type="text" className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Barrio</label>
                <input type="text" className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.neighborhood || ''} onChange={e => setFormData({ ...formData, neighborhood: e.target.value })} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Ciudad</label>
                <input
                    type="text"
                    className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    value={formData.city || ''}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Manizales"
                />
            </div>

            {/* Dynamic Leader Selection */}
            {formData.role === 'PASTOR' && (
                <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm">
                    ℹ️ El rol PASTOR es líder de sí mismo por defecto.
                </div>
            )}

            {(formData.role === 'LIDER_DOCE' || formData.role === 'LIDER_CELULA' || formData.role === 'DISCIPULO') && (
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                    <h3 className="md:col-span-2 font-semibold text-gray-900 dark:text-white">Asignación de Líderes Parejas</h3>

                    {/* PASTORES (for LIDER_DOCE) */}
                    {formData.role === 'LIDER_DOCE' && (
                        <>
                            {[0, 1].map(index => (
                                <div key={`pastor-${index}`}>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Pastor ({index + 1})</label>
                                    <AsyncSearchSelect
                                        fetchItems={(term) => api.get('/users/search', { params: { search: term, role: 'PASTOR' } }).then(res => res.data)}
                                        selectedValue={pastores.find(p => p.id === parseInt((formData.pastorIds || [])[index])) || ((formData.pastorIds || [])[index] ? { id: formData.pastorIds[index], fullName: 'Cargando...' } : null)}
                                        onSelect={(user) => {
                                            const newPastorIds = [...(formData.pastorIds || [])];
                                            newPastorIds[index] = user?.id || '';
                                            
                                            let newPastorSpouseIds = [...(formData.pastorSpouseIds || [])];
                                            if (user?.spouseId) {
                                                newPastorSpouseIds[index] = user.spouseId.toString();
                                            } else {
                                                newPastorSpouseIds[index] = '';
                                            }
                                            
                                            setFormData({
                                                ...formData,
                                                pastorIds: newPastorIds,
                                                pastorSpouseIds: newPastorSpouseIds,
                                            });
                                        }}
                                        placeholder="Buscar pastor..."
                                        labelKey="fullName"
                                    />
                                </div>
                            ))}
                        </>
                    )}

                    {/* LIDERES DOCE (for LIDER_CELULA and DISCIPULO) */}
                    {(formData.role === 'LIDER_CELULA' || formData.role === 'DISCIPULO') && (
                        <>
                            {[0, 1].map(index => (
                                <div key={`ld-${index}`}>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Líder 12 ({index + 1})</label>
                                    <AsyncSearchSelect
                                        fetchItems={(term) => api.get('/users/search', { params: { search: term, role: 'LIDER_DOCE' } }).then(res => res.data)}
                                        selectedValue={lideresDoce.find(l => l.id === parseInt((formData.liderDoceIds || [])[index])) || ((formData.liderDoceIds || [])[index] ? { id: formData.liderDoceIds[index], fullName: 'Cargando...' } : null)}
                                        onSelect={(user) => {
                                            const newLiderDoceIds = [...(formData.liderDoceIds || [])];
                                            newLiderDoceIds[index] = user?.id || '';
                                            
                                            let newLiderDoceSpouseIds = [...(formData.liderDoceSpouseIds || [])];
                                            if (user?.spouseId) {
                                                newLiderDoceSpouseIds[index] = user.spouseId.toString();
                                            } else {
                                                newLiderDoceSpouseIds[index] = '';
                                            }
                                            
                                            setFormData({
                                                ...formData,
                                                liderDoceIds: newLiderDoceIds,
                                                liderDoceSpouseIds: newLiderDoceSpouseIds,
                                            });
                                        }}
                                        placeholder="Buscar líder de 12..."
                                        labelKey="fullName"
                                    />
                                </div>
                            ))}
                        </>
                    )}

                    {/* LIDERES CELULA (for DISCIPULO) */}
                    {formData.role === 'DISCIPULO' && (
                        <>
                            {[0, 1].map(index => (
                                <div key={`lc-${index}`}>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Líder Célula ({index + 1})</label>
                                    <AsyncSearchSelect
                                        fetchItems={(term) => {
                                            const params = { search: term, role: 'LIDER_CELULA' };
                                            if ((formData.liderDoceIds || []).some(id => id)) {
                                                params.liderDoceId = formData.liderDoceIds.find(id => id);
                                            }
                                            return api.get('/users/search', { params }).then(res => res.data);
                                        }}
                                        selectedValue={lideresCelula.find(lc => lc.id === parseInt((formData.liderCelulaIds || [])[index])) || ((formData.liderCelulaIds || [])[index] ? { id: formData.liderCelulaIds[index], fullName: 'Cargando...' } : null)}
                                        onSelect={(user) => {
                                            const newLiderCelulaIds = [...(formData.liderCelulaIds || [])];
                                            newLiderCelulaIds[index] = user?.id || '';
                                            
                                            let newLiderCelulaSpouseIds = [...(formData.liderCelulaSpouseIds || [])];
                                            if (user?.spouseId) {
                                                newLiderCelulaSpouseIds[index] = user.spouseId.toString();
                                            } else {
                                                newLiderCelulaSpouseIds[index] = '';
                                            }
                                            
                                            setFormData({
                                                ...formData,
                                                liderCelulaIds: newLiderCelulaIds,
                                                liderCelulaSpouseIds: newLiderCelulaSpouseIds,
                                            });
                                        }}
                                        placeholder="Buscar líder de célula..."
                                        labelKey="fullName"
                                    />
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}

            {/* Data Authorization Checks */}
            <div className="md:col-span-2 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3 mt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        required={mode === 'create'}
                        disabled={!isAdmin}
                        className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        checked={formData.dataPolicyAccepted || false}
                        onChange={e => setFormData({ ...formData, dataPolicyAccepted: e.target.checked })}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        Acepta la Política de Tratamiento de Datos Personales de MCI.
                    </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        required={mode === 'create'}
                        disabled={!isAdmin}
                        className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        checked={formData.dataTreatmentAuthorized || false}
                        onChange={e => setFormData({ ...formData, dataTreatmentAuthorized: e.target.checked })}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        Autoriza el tratamiento de datos conforme a la Ley 1581 de 2012.
                    </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        disabled={!isAdmin}
                        required={calculateAge(formData.birthDate) < 18}
                        className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        checked={formData.minorConsentAuthorized || false}
                        onChange={e => setFormData({ ...formData, minorConsentAuthorized: e.target.checked })}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        {calculateAge(formData.birthDate) < 18 ? (
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                Cuento con el documento de autorización física/digital firmado por el padre o tutor legal. (Obligatorio)
                            </span>
                        ) : (
                            "Cuenta con autorización del representante legal (para menores)."
                        )}
                    </span>
                </label>
                {!isAdmin && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 italic">
                        * Solo un administrador puede modificar el estado de autorización de datos.
                    </p>
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
};

export default UserFormFields;
