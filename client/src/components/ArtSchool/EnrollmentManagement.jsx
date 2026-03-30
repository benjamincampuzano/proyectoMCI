import { useState, useEffect } from 'react';
import { Card, Button, Input } from '../ui';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const EnrollmentManagement = () => {
    const [userId, setUserId] = useState('');
    const [classId, setClassId] = useState('');
    const [classes, setClasses] = useState([]);

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const res = await api.get('/arts/classes');
                setClasses(res.data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchClasses();
    }, []);

    const handleEnroll = async (e) => {
        e.preventDefault();
        try {
            await api.post('/arts/enrollments', { userId, classId });
            toast.success('Estudiante inscrito exitosamente');
            setUserId('');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al inscribir estudiante');
        }
    };

    return (
        <Card title="Inscripción de Estudiantes">
            <form onSubmit={handleEnroll} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group flex flex-col justify-end">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Clase
                        </label>
                        <select
                            value={classId}
                            onChange={(e) => setClassId(e.target.value)}
                            required
                            className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none transition-all duration-300 hover:border-blue-400 focus:bg-white dark:focus:bg-gray-900"
                        >
                            <option value="">Selecciona una clase</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <Input 
                        label="ID de Usuario / Estudiante" 
                        type="number" 
                        value={userId} 
                        onChange={(e) => setUserId(e.target.value)} 
                        required 
                    />
                </div>
                <Button type="submit" variant="primary">Inscribir</Button>
            </form>
        </Card>
    );
};

export default EnrollmentManagement;
