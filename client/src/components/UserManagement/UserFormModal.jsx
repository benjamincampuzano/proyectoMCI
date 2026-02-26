import { useState } from 'react';
import { SpinnerIcon } from '@phosphor-icons/react';
import ActionModal from '../ActionModal';
import UserFormFields from './UserFormFields';
import PropTypes from 'prop-types';

const UserFormModal = ({
    isOpen,
    onClose,
    title,
    formData,
    setFormData,
    mode,
    onSubmit,
    submitting,
    pastores,
    lideresDoce,
    lideresCelula,
    isAdmin,
    validatePasswordRealTime,
    calculateAge
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const [passwordErrors, setPasswordErrors] = useState([]);

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        onSubmit(e);
    };

    return (
        <ActionModal
            isOpen={isOpen}
            title={title}
            onClose={onClose}
            containerClassName="max-w-2xl md:max-w-4xl"
        >
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <UserFormFields
                    formData={formData}
                    setFormData={setFormData}
                    mode={mode}
                    pastores={pastores}
                    lideresDoce={lideresDoce}
                    lideresCelula={lideresCelula}
                    isAdmin={isAdmin}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    passwordErrors={passwordErrors}
                    setPasswordErrors={setPasswordErrors}
                    validatePasswordRealTime={validatePasswordRealTime}
                    calculateAge={calculateAge}
                />

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/30"
                    >
                        {submitting ? (
                            <div className="flex items-center gap-2">
                                <SpinnerIcon className="animate-spin" size={18} />
                                <span>{mode === 'create' ? 'Creando...' : 'Guardando...'}</span>
                            </div>
                        ) : (mode === 'create' ? 'Crear Usuario' : 'Guardar Cambios')}
                    </button>
                </div>
            </form>
        </ActionModal>
    );
};

UserFormModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    formData: PropTypes.object.isRequired,
    setFormData: PropTypes.func.isRequired,
    mode: PropTypes.oneOf(['create', 'edit']).isRequired,
    onSubmit: PropTypes.func.isRequired,
    submitting: PropTypes.bool.isRequired,
    pastores: PropTypes.array.isRequired,
    lideresDoce: PropTypes.array.isRequired,
    lideresCelula: PropTypes.array.isRequired,
    isAdmin: PropTypes.bool.isRequired,
    validatePasswordRealTime: PropTypes.func.isRequired,
    calculateAge: PropTypes.func.isRequired,
};

export default UserFormModal;
