import { Eye, EyeOff } from 'lucide-react';
import PropTypes from 'prop-types';

const UserFormFields = ({
    formData,
    setFormData,
    mode = 'create',
    pastores,
    lideresDoce,
    lideresCelula,
    isAdmin,
    showPassword,
    setShowPassword,
    passwordErrors,
    setPasswordErrors,
    validatePasswordRealTime,
    calculateAge
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Tipo de Documento</label>
                <select
                    className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    value={formData.documentType}
                    onChange={e => setFormData({ ...formData, documentType: e.target.value })}
                >
                    <option value="">Seleccionar...</option>
                    <option value="RC">RC</option>
                    <option value="TI">TI</option>
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="PP">PP</option>
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
                <input required type="email" className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>

            {mode === 'create' && (
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Password</label>
                    <div className="relative">
                        <input
                            required
                            type={showPassword ? "text" : "password"}
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
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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
                    <option value="JOVENES">Jovenes (14 años en adelante solteros)</option>
                    <option value="ROCAS">Rocas (11 a 13 años)</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Rol</label>
                <select
                    className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value, pastorId: '', liderDoceId: '', liderCelulaId: '' })}
                >
                    {/* getAssignableRoles logic would be outside or passed in */}
                    {['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO'].map(r => (
                        <option key={r} value={r}>{r.replace('_', ' ')}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Sexo</label>
                <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value })}>
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
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Ciudad</label>
                <input
                    type="text"
                    className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    value={formData.city || ''}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Ciudad"
                />
            </div>

            {/* Dynamic Leader Selection */}
            {formData.role === 'PASTOR' && (
                <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm">
                    ℹ️ El rol PASTOR es líder de sí mismo por defecto.
                </div>
            )}

            {formData.role === 'LIDER_DOCE' && (
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Asignar a Pastor</label>
                    <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.pastorId} onChange={e => setFormData({ ...formData, pastorId: e.target.value })}>
                        <option value="">-- Sin Asignar --</option>
                        {pastores.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                    </select>
                </div>
            )}

            {formData.role === 'LIDER_CELULA' && (
                <>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Asignar a Líder 12</label>
                        <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.liderDoceId} onChange={e => setFormData({ ...formData, liderDoceId: e.target.value })}>
                            <option value="">-- Sin Asignar --</option>
                            {lideresDoce.map(l => <option key={l.id} value={l.id}>{l.fullName}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Asignar a Pastor (Opcional)</label>
                        <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.pastorId} onChange={e => setFormData({ ...formData, pastorId: e.target.value })}>
                            <option value="">-- Sin Asignar --</option>
                            {pastores.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                        </select>
                    </div>
                </>
            )}

            {formData.role === 'DISCIPULO' && (
                <>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Líder 12</label>
                        <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.liderDoceId} onChange={e => setFormData({ ...formData, liderDoceId: e.target.value, liderCelulaId: '' })}>
                            <option value="">-- Sin Asignar --</option>
                            {lideresDoce.map(l => <option key={l.id} value={l.id}>{l.fullName}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Líder Célula</label>
                        <select className="w-full p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" value={formData.liderCelulaId} onChange={e => setFormData({ ...formData, liderCelulaId: e.target.value })}>
                            <option value="">-- Sin Asignar --</option>
                            {lideresCelula
                                .filter(lc => !formData.liderDoceId || lc.liderDoceId === parseInt(formData.liderDoceId))
                                .map(lc => <option key={lc.id} value={lc.id}>{lc.fullName}</option>)}
                        </select>
                    </div>
                </>
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
    isAdmin: PropTypes.bool.isRequired,
    showPassword: PropTypes.bool,
    setShowPassword: PropTypes.func,
    passwordErrors: PropTypes.array,
    setPasswordErrors: PropTypes.func,
    validatePasswordRealTime: PropTypes.func.isRequired,
    calculateAge: PropTypes.func.isRequired,
};

export default UserFormFields;
