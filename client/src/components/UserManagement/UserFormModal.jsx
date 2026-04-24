import { useState, useEffect } from 'react';
import { Spinner, CheckCircle, X } from '@phosphor-icons/react';
import ActionModal from '../ActionModal';
import UserFormFields from './UserFormFields';
import PropTypes from 'prop-types';
import { Button } from '../ui';

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
    users,
    isAdmin,
    validatePasswordRealTime,
    calculateAge,
    getAssignableRoles,
    relatedUsersCache,
    fetchRelatedUsers
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const [passwordErrors, setPasswordErrors] = useState([]);

    useEffect(() => {
        if (isOpen && formData.password && mode === 'create') {
            setPasswordErrors(validatePasswordRealTime(formData.password, formData.fullName));
        } else if (!isOpen) {
            setPasswordErrors([]);
        }
    }, [isOpen, formData.password, formData.fullName, mode, validatePasswordRealTime]);

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        if (passwordErrors.length > 0) return;
        onSubmit(e);
    };

    return (
        <ActionModal
            isOpen={isOpen}
            title={title}
            onClose={onClose}
            containerClassName="max-w-4xl"
        >
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                    <UserFormFields
                        formData={formData}
                        setFormData={setFormData}
                        mode={mode}
                        pastores={pastores}
                        lideresDoce={lideresDoce}
                        lideresCelula={lideresCelula}
                        users={users}
                        isAdmin={isAdmin}
                        showPassword={showPassword}
                        setShowPassword={setShowPassword}
                        passwordErrors={passwordErrors}
                        setPasswordErrors={setPasswordErrors}
                        validatePasswordRealTime={validatePasswordRealTime}
                        calculateAge={calculateAge}
                        getAssignableRoles={getAssignableRoles}
                        relatedUsersCache={relatedUsersCache}
                        fetchRelatedUsers={fetchRelatedUsers}
                    />
                </div>

                <div className="flex justify-end items-center gap-2 sm:gap-4 p-4 sm:p-6 bg-[var(--ln-bg-panel)] border-t border-[var(--ln-border-standard)] flex-shrink-0 sticky bottom-0">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        size="sm"
                        className="text-sm"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={submitting || passwordErrors.length > 0}
                        icon={submitting ? Spinner : (mode === 'create' ? CheckCircle : null)}
                        className={`${submitting ? 'animate-pulse' : ''} text-sm`}
                        size="sm"
                    >
                        {submitting ? 
                            (mode === 'create' ? 'Creando...' : 'Guardando...') : 
                            (mode === 'create' ? 'Crear' : 'Guardar')
                        }
                    </Button>
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
    users: PropTypes.array,
    isAdmin: PropTypes.bool.isRequired,
    validatePasswordRealTime: PropTypes.func.isRequired,
    calculateAge: PropTypes.func.isRequired,
    getAssignableRoles: PropTypes.func,
    relatedUsersCache: PropTypes.object,
    fetchRelatedUsers: PropTypes.func,
};

export default UserFormModal;
