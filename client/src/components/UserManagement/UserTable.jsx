import { EnvelopeOpen, Phone, MapPin, Pencil, Trash, Key, IdentificationCard, GenderMale, GenderFemale, Cake, CheckCircle, Warning, UserCircle, WhatsappLogo } from '@phosphor-icons/react';
import DataTable from '../ui/DataTable';
import PropTypes from 'prop-types';

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

const ROLE_COLORS = {
    ADMIN:        'bg-red-500/10 text-red-500 border-red-500/20',
    PASTOR:       'bg-purple-500/10 text-purple-500 border-purple-500/20',
    LIDER_DOCE:   'bg-[var(--ln-brand-indigo)]/10 text-[var(--ln-brand-indigo)] border-[var(--ln-brand-indigo)]/20',
    LIDER_CELULA: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    DISCIPULO:    'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    INVITADO:     'bg-[var(--ln-bg-panel)] text-[var(--ln-text-quaternary)] border-[var(--ln-border-standard)]',
};
const PRIMARY_ROLES = Object.keys(ROLE_COLORS);

const labelMap = (role) => {
    if (role === 'PROFESOR') return 'Profesor';
    if (role === 'AUXILIAR') return 'Auxiliar';
    if (role.startsWith('ARTE_')) return `Arte: ${role.replace('ARTE_', '')}`;
    if (role.startsWith('COORD_')) return `Coord. ${role.replace('COORD_', '')}`;
    if (role.startsWith('TES_')) return `Tes. ${role.replace('TES_', '')}`;
    return role.replace(/_/g, ' ');
};

const UserTable = ({ users, loading, canEdit, pagination, onEdit, onDelete, onResetPassword }) => {
    const columns = [
        {
            key: 'fullName',
            title: 'Usuario',
            render: (_, user) => (
                <div className="flex items-center gap-3.5 min-w-0 group/user">
                    <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-[var(--ln-brand-indigo)]/10 flex items-center justify-center text-[var(--ln-brand-indigo)] weight-590 text-sm border border-[var(--ln-brand-indigo)]/20 transition-transform group-hover/user:scale-110 shadow-sm uppercase">
                        {user.fullName?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[14px] weight-590 text-[var(--ln-text-primary)] truncate tracking-tight" title={user.fullName}>{user.fullName}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                            <div className="flex items-center gap-1.5">
                                {user.sex === 'HOMBRE' ? (
                                    <GenderMale size={12} className="text-blue-500" />
                                ) : user.sex === 'MUJER' ? (
                                    <GenderFemale size={12} className="text-pink-500" />
                                ) : (
                                    <GenderMale size={12} className="text-[var(--ln-text-quaternary)] opacity-60" />
                                )}
                                <span className="text-[10px] weight-700 text-[var(--ln-text-quaternary)] uppercase tracking-wider">{user.sex === 'HOMBRE' ? 'Hombre' : user.sex === 'MUJER' ? 'Mujer' : 'S/D'}</span>
                            </div>
                            {(() => {
                                const isPastor = user.roles?.includes('PASTOR');
                                const isLiderDoce = user.roles?.includes('LIDER_DOCE');

                                let displayValue = null;
                                let label = 'L12';

                                if (isPastor) {
                                    displayValue = user.fullName;
                                    label = 'PASTOR';
                                } else if (isLiderDoce) {
                                    displayValue = user.pastorName;
                                    label = 'PA';
                                } else {
                                    displayValue = user.liderDoceName;
                                    label = 'L12';
                                }

                                return displayValue ? (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--ln-brand-indigo)]/10 border border-[var(--ln-brand-indigo)]/20">
                                        <span className="text-[9px] weight-700 text-[var(--ln-brand-indigo)] uppercase tracking-wider">{label}: {displayValue}</span>
                                    </div>
                                ) : null;
                            })()}
                        </div>
                    </div>
                </div>
            )
        },
        {
            key: 'email',
            title: 'Contacto',
            render: (_, user) => {
                const age = calculateAge(user.birthDate);
                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[12px] weight-510 text-[var(--ln-text-secondary)] hover:text-[var(--ln-brand-indigo)] transition-colors truncate max-w-[220px]" title={user.email}>
                            <EnvelopeOpen size={14} className="text-[var(--ln-text-quaternary)]" weight="bold" />
                            <span className="truncate">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            {user.phone && (
                                <div className="flex items-center gap-1.5 text-[11px] weight-510 text-[var(--ln-text-tertiary)] opacity-80">
                                    <Phone size={13} className="text-[var(--ln-text-quaternary)]" weight="bold" />
                                    <span>{user.phone}</span>
                                    <a
                                        href={`https://wa.me/${user.phone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-1 p-1 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-700 transition-colors"
                                        title="Enviar WhatsApp"
                                    >
                                        <WhatsappLogo size={14} weight="bold" />
                                    </a>
                                </div>
                            )}
                            {age !== null && (
                                <div className="flex items-center gap-1.5 text-[10px] weight-700 uppercase tracking-widest px-2 py-0.5 rounded-md bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] text-[var(--ln-text-quaternary)]">
                                    <Cake size={12} weight="bold" />
                                    {age} {age === 1 ? 'AÑO' : 'AÑOS'}
                                </div>
                            )}
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'authorization',
            title: 'Permisos',
            render: (_, user) => {
                const isMinor = calculateAge(user.birthDate) < 18;
                return (
                    <div className="flex gap-1.5 justify-center">
                        <div title="Ley de Datos (1501)" className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] ${user.dataPolicyAccepted ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-red-500 shadow-red-500/20'}`} />
                        <div title="Uso de Información" className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] ${user.dataTreatmentAuthorized ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-red-500 shadow-red-500/20'}`} />
                        {isMinor && (
                            <div title="Consentimiento Tutor" className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] ${user.minorConsentAuthorized ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-amber-500 shadow-amber-500/20'}`} />
                        )}
                    </div>
                );
            }
        },
        {
            key: 'primary_role',
            title: 'Rol / Perfil',
            render: (_, user) => {
                const primaryRole = user.roles?.find(r => PRIMARY_ROLES.includes(r));
                const needsLiderDoce = !user.liderDoceId &&
                    !user.roles?.includes('ADMIN') &&
                    !user.roles?.includes('PASTOR') &&
                    !user.roles?.includes('LIDER_DOCE');

                return (
                    <div className="flex flex-col gap-2 items-start">
                        {primaryRole ? (
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] weight-700 uppercase tracking-widest border ${ROLE_COLORS[primaryRole] || 'bg-blue-500/10 text-blue-500 border-blue-500/20'} shadow-sm`}>
                                {primaryRole.replace(/_/g, ' ')}
                            </span>
                        ) : (
                            <span className="text-[11px] weight-510 text-[var(--ln-text-quaternary)] italic opacity-60">—</span>
                        )}
                        {needsLiderDoce && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] weight-700 uppercase tracking-widest" title="Requiere asignación de Líder de 12">
                                <Warning size={10} weight="bold" /> Sin Líder
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'secondaryRoles',
            title: 'Asignaciones',
            render: (value, user) => {
                const secondary = value || [];
                if (secondary.length === 0) {
                    return <span className="text-[11px] weight-510 text-[var(--ln-text-quaternary)] italic opacity-40">Funciones generales</span>;
                }
                return (
                    <div className="flex flex-wrap gap-1.5">
                        {secondary.map(role => (
                            <span key={role} className="inline-flex px-1.5 py-0.5 rounded-md text-[9px] weight-700 uppercase tracking-tight bg-[var(--ln-bg-panel)] text-[var(--ln-text-secondary)] border border-[var(--ln-border-standard)] shadow-sm">
                                {labelMap(role)}
                            </span>
                        ))}
                    </div>
                );
            }
        },
        ...(canEdit ? [{
            key: 'actions',
            title: 'Acciones',
            render: (_, user) => (
                <div className="flex justify-end gap-1">
                    <button
                        onClick={() => onEdit(user)}
                        className="p-2 text-[var(--ln-text-tertiary)] hover:text-[var(--ln-brand-indigo)] hover:bg-[var(--ln-brand-indigo)]/5 rounded-xl transition-all border border-transparent hover:border-[var(--ln-brand-indigo)]/10"
                        title="Editar usuario"
                    >
                        <Pencil size={18} weight="bold" />
                    </button>
                    <button
                        onClick={() => onResetPassword(user)}
                        className="p-2 text-[var(--ln-text-tertiary)] hover:text-amber-500 hover:bg-amber-500/5 rounded-xl transition-all border border-transparent hover:border-amber-500/10"
                        title="Resetear contraseña"
                    >
                        <Key size={18} weight="bold" />
                    </button>
                    <button
                        onClick={() => onDelete(user.id)}
                        className="p-2 text-[var(--ln-text-tertiary)] hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all border border-transparent hover:border-red-500/10"
                        title="Eliminar usuario"
                    >
                        <Trash size={18} weight="bold" />
                    </button>
                </div>
            )
        }] : [])
    ];

    return (
        <DataTable
            columns={columns}
            data={users}
            loading={loading}
            emptyMessage="No se encontraron usuarios"
            pagination={pagination}
        />
    );
};

UserTable.propTypes = {
    users: PropTypes.array.isRequired,
    loading: PropTypes.bool.isRequired,
    canEdit: PropTypes.bool.isRequired,
    pagination: PropTypes.shape({
        page: PropTypes.number.isRequired,
        pages: PropTypes.number.isRequired,
        total: PropTypes.number.isRequired,
        onNext: PropTypes.func.isRequired,
        onPrev: PropTypes.func.isRequired
    }),
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onResetPassword: PropTypes.func.isRequired,
};

export default UserTable;
