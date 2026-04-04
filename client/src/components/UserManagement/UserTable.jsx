import { EnvelopeOpen, Phone, MapPin, Pencil, Trash, Key } from '@phosphor-icons/react';
import DataTable from '../DataTable';
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
    ADMIN:        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    PASTOR:       'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    LIDER_DOCE:   'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    LIDER_CELULA: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    DISCIPULO:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    INVITADO:     'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400',
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
            key: 'user',
            header: 'Usuario',
            headerClassName: 'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-48',
            cellClassName: 'px-4 py-3',
            render: (user) => (
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-sm">
                        {user.fullName?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate max-w-[140px]" title={user.fullName}>{user.fullName}</p>
                        <p className="text-xs text-gray-500">{user.sex === 'HOMBRE' ? '♂ Hombre' : user.sex === 'MUJER' ? '♀ Mujer' : '—'}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'contact',
            header: 'Contacto & Ubicación',
            headerClassName: 'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-56',
            cellClassName: 'px-4 py-3',
            render: (user) => {
                const age = calculateAge(user.birthDate);
                return (
                    <div className="space-y-0.5 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 truncate max-w-[200px]" title={user.email}>
                            <EnvelopeOpen size={12} className="flex-shrink-0" />
                            <span className="truncate">{user.email}</span>
                        </div>
                        {user.phone && (
                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                                <Phone size={12} className="flex-shrink-0" />
                                <span>{user.phone}</span>
                            </div>
                        )}
                        {user.city && (
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <MapPin size={12} className="flex-shrink-0" />
                                <span className="truncate max-w-[150px]" title={user.address}>{user.city}</span>
                            </div>
                        )}
                        {age !== null && (
                            <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${age < 18 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400'}`}>
                                {age} años{age < 18 ? ' • Menor' : ''}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'authorization',
            header: 'Auth.',
            headerClassName: 'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20 text-center',
            cellClassName: 'px-4 py-3 text-center',
            render: (user) => {
                const isMinor = calculateAge(user.birthDate) < 18;
                return (
                    <div className="flex gap-1 justify-center">
                        <div title="Política de Datos" className={`w-5 h-5 rounded flex items-center justify-center ${user.dataPolicyAccepted ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        </div>
                        <div title="Ley 1581" className={`w-5 h-5 rounded flex items-center justify-center ${user.dataTreatmentAuthorized ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        </div>
                        {isMinor && (
                            <div title="Autorización Tutor" className={`w-5 h-5 rounded flex items-center justify-center ${user.minorConsentAuthorized ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                <div className="w-1.5 h-1.5 rounded-full bg-current" />
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'primary_role',
            header: 'Rol Principal',
            headerClassName: 'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40',
            cellClassName: 'px-4 py-3',
            render: (user) => {
                const primaryRole = user.roles?.find(r => PRIMARY_ROLES.includes(r));
                const needsLiderDoce = !user.liderDoceId &&
                    !user.roles?.includes('ADMIN') &&
                    !user.roles?.includes('PASTOR') &&
                    !user.roles?.includes('LIDER_DOCE');

                return (
                    <div className="flex flex-col gap-1 items-start">
                        {primaryRole ? (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[primaryRole] || 'bg-blue-100 text-blue-800'}`}>
                                {primaryRole.replace(/_/g, ' ')}
                            </span>
                        ) : (
                            <span className="text-xs text-gray-400 italic">Sin rol</span>
                        )}
                        {needsLiderDoce && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50" title="Requiere asignación de Líder de 12">
                                ⚠️ Sin Líder 12
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'secondary_roles',
            header: 'Funciones',
            headerClassName: 'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-44',
            cellClassName: 'px-4 py-3',
            render: (user) => {
                const secondary = user.secondaryRoles || [];
                if (secondary.length === 0) {
                    return <span className="text-xs text-gray-400 italic">—</span>;
                }
                return (
                    <div className="flex flex-wrap gap-1">
                        {secondary.map(role => (
                            <span key={role} className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                                {labelMap(role)}
                            </span>
                        ))}
                    </div>
                );
            }
        },
        ...(canEdit ? [{
            key: 'actions',
            header: 'Acciones',
            headerClassName: 'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-28',
            cellClassName: 'px-4 py-3 text-right',
            render: (user) => (
                <div className="flex justify-end gap-1">
                    <button
                        onClick={() => onEdit(user)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Editar usuario"
                    >
                        <Pencil size={16} />
                    </button>
                    <button
                        onClick={() => onResetPassword(user)}
                        className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                        title="Resetear contraseña"
                    >
                        <Key size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(user.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Eliminar usuario"
                    >
                        <Trash size={16} />
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
            skeletonRowCount={3}
            emptyMessage="No hay datos para mostrar."
            tableClassName="w-full text-left table-fixed"
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
