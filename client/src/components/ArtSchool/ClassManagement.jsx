import { useState, useEffect } from 'react';
import { Card, Button, Input } from '../ui';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const ClassManagement = () => {
    const [classes, setClasses] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '', cost: '', professorId: '', startDate: '', endDate: '' });

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            const res = await api.get('/arts/classes');
            setClasses(res.data);
        } catch (error) {
            console.error('Error fetching classes', error);
        }
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        try {
            await api.post('/arts/classes', formData);
            toast.success('Clase creada correctamente');
            setShowForm(false);
            fetchClasses();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al crear la clase');
        }
    };

    return (
        <Card title="Gestión de Clases" action={<Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancelar' : 'Nueva Clase'}</Button>}>
            {showForm && (
                <form onSubmit={handleCreateClass} className="space-y-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Nombre de la Clase" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                        <Input label="Descripción" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                        <Input label="Costo Total ($)" type="number" value={formData.cost} onChange={(e) => setFormData({...formData, cost: e.target.value})} required />
                        <Input label="ID Profesor" type="number" value={formData.professorId} onChange={(e) => setFormData({...formData, professorId: e.target.value})} />
                    </div>
                    <Button type="submit" variant="primary">Crear Clase</Button>
                </form>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                        <tr>
                            <th className="px-6 py-3">ID</th>
                            <th className="px-6 py-3">Nombre</th>
                            <th className="px-6 py-3">Costo</th>
                            <th className="px-6 py-3">Profesor</th>
                            <th className="px-6 py-3">Inscritos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {classes.map(c => (
                            <tr key={c.id} className="bg-white border-b dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                                <td className="px-6 py-4">{c.id}</td>
                                <td className="px-6 py-4">{c.name}</td>
                                <td className="px-6 py-4">${c.cost}</td>
                                <td className="px-6 py-4">{c.professor?.profile?.fullName || 'Sin Asignar'}</td>
                                <td className="px-6 py-4">{c._count?.enrollments || 0}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

export default ClassManagement;
