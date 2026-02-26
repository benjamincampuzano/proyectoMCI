import { EnvelopeOpen, Phone, MapPin, Pencil, Trash} from '@phosphor-icons/react';
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

const UserTable = ({ users, loading, canEdit, onEdit, onDelete }) => {
    const columns = [
        {
            key: 'user',
            header: 'Usuario',
            headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase',
            cellClassName: 'px-6 py-4',
            render: (user) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold">
                        {user.fullName?.charAt(0)}
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{user.fullName}</p>
                        <p className="text-xs text-gray-500">{user.sex === 'HOMBRE' ? 'Hombre' : 'Mujer'}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'contact',
            header: 'Contacto',
            headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase',
            cellClassName: 'px-6 py-4',
            render: (user) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <EnvelopeOpen size={14} /> {user.email}
                    </div>
                    {user.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <Phone size={14} /> {user.phone}
                        </div>
                    )}
                    <div className="mt-1">
                        {user.birthDate ? (
                            <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${calculateAge(user.birthDate) < 18 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400'}`}>
                                    {calculateAge(user.birthDate)} años {calculateAge(user.birthDate) < 18 && '• Menor de edad'}
                                </span>
                            </div>
                        ) : (
                            <span className="text-xs text-gray-400">Sin fecha nac.</span>
                        )}
                    </div>
                </div>
            )
        },
        {
            key: 'authorization',
            header: 'Autorización',
            headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase',
            cellClassName: 'px-6 py-4',
            render: (user) => {
                const isMinor = calculateAge(user.birthDate) < 18;
                return (
                    <div className="flex gap-2">
                        <div title="Política de Datos" className={`w-6 h-6 rounded flex items-center justify-center ${user.dataPolicyAccepted ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            <div className="w-2 h-2 rounded-full bg-current" />
                        </div>
                        <div title="Ley 1581" className={`w-6 h-6 rounded flex items-center justify-center ${user.dataTreatmentAuthorized ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            <div className="w-2 h-2 rounded-full bg-current" />
                        </div>
                        {isMinor && (
                            <div title="Autorización Tutor" className={`w-6 h-6 rounded flex items-center justify-center ${user.minorConsentAuthorized ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                <div className="w-2 h-2 rounded-full bg-current" />
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'location',
            header: 'Ubicación',
            headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase',
            cellClassName: 'px-6 py-4',
            render: (user) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <MapPin size={14} className="flex-shrink-0" />
                        <span className="truncate max-w-[150px]" title={user.address}>{user.address || 'Sin dirección'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{user.city || 'Desconocida'}</span>
                    </div>
                </div>
            )
        },
        {
            key: 'roles',
            header: 'Rol',
            headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase',
            cellClassName: 'px-6 py-4',
            render: (user) => (
                <div className="flex flex-wrap gap-1">
                    {user.roles?.map(role => (
                        <span key={role} className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            {role.replace('_', ' ')}
                        </span>
                    ))}
                </div>
            )
        },
        ...(canEdit ? [{
            key: 'actions',
            header: 'Acciones',
            headerClassName: 'px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right',
            cellClassName: 'px-6 py-4 text-right',
            render: (user) => (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => onEdit(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                        <Pencil size={18} />
                    </button>
                    <button
                        onClick={() => onDelete(user.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <Trash size={18} />
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
        />
    );
};

UserTable.propTypes = {
    users: PropTypes.array.isRequired,
    loading: PropTypes.bool.isRequired,
    canEdit: PropTypes.bool.isRequired,
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
};

export default UserTable;
