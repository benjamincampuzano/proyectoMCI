import { useState, useEffect } from 'react';
import { Card, Button, Input } from '../ui';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const RoleManagement = () => {
    const [userId, setUserId] = useState('');
    const [role, setRole] = useState('ESTUDIANTE');
    const [roles, setRoles] = useState([]);

    const handleAssignRole = async () => {
        try {
            await api.post('/arts/roles', { userId: Number(userId), role });
            toast.success('Rol asignado correctamente');
            fetchRoles();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al asignar rol');
        }
    };

    const fetchRoles = async () => {
        if (!userId) return;
        try {
            const res = await api.get(`/arts/roles/${userId}`);
            setRoles(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Card title="Gestión de Roles">
            <div className="space-y-4">
                <div className="flex gap-4 items-end">
                    <Input
                        label="ID de Usuario"
                        type="number"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="Ej: 1"
                    />
                    <div className="form-group flex flex-col justify-end">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Rol a Asignar
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none transition-all duration-300 hover:border-blue-400 focus:bg-white dark:focus:bg-gray-900"
                        >
                            <option value="ESTUDIANTE">ESTUDIANTE</option>
                            <option value="PROFESOR">PROFESOR</option>
                            <option value="TESORERO">TESORERO</option>
                            <option value="COORDINADOR">COORDINADOR</option>
                        </select>
                    </div>
                    <Button onClick={handleAssignRole} variant="primary">
                        Asignar Rol
                    </Button>
                    <Button onClick={fetchRoles} variant="outline" className="ml-2">
                        Ver Roles Actuales
                    </Button>
                </div>
                {roles.length > 0 && (
                    <div className="mt-4">
                        <h4 className="font-medium text-gray-700 dark:text-gray-300">Roles Activos:</h4>
                        <ul className="list-disc pl-5 mt-2">
                            {roles.map(r => (
                                <li key={r.id} className="text-sm text-gray-600 dark:text-gray-400">
                                    {r.role} asignado el {new Date(r.createdAt).toLocaleDateString()}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default RoleManagement;
