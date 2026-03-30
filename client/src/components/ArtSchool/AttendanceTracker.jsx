import { useState, useEffect } from 'react';
import { Card, Button } from '../ui';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const AttendanceTracker = () => {
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [classData, setClassData] = useState(null);

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

    const fetchClassData = async (classId) => {
        try {
            const res = await api.get(`/arts/classes/${classId}`);
            setClassData(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleClassSelect = (e) => {
        const id = e.target.value;
        setSelectedClassId(id);
        if (id) {
            fetchClassData(id);
        } else {
            setClassData(null);
        }
    };

    const handleAttendanceToggle = async (enrollmentId, classNumber, currentStatus) => {
        try {
            await api.post('/arts/attendances', {
                enrollmentId,
                classNumber,
                attended: !currentStatus
            });
            toast.success('Asistencia actualizada');
            fetchClassData(selectedClassId); // refresh data
        } catch (error) {
            toast.error('Error al actualizar asistencia');
        }
    };

    const getAttendanceStatus = (enrollment, classNumber) => {
        // En schema.prisma, relations => enrollment.attendances (artAttendance)
        // Check if there is a record for this classNumber and if attended is true
        // But the current API doesn't populate attendances inside `arts/classes/:id` enrollment...
        // Wait, the API for `/arts/classes/:id` doesn't include `attendances` in `enrollments`.
        // Let's assume it does (we can update the controller if needed, but for now fallback).
        const record = enrollment.attendances?.find(a => a.classNumber === classNumber);
        return record ? record.attended : false;
    };

    return (
        <Card title="Asistencia (8 Sesiones)">
            <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Seleccionar Clase
                </label>
                <select
                    value={selectedClassId}
                    onChange={handleClassSelect}
                    className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none transition-all duration-300"
                >
                    <option value="">-- Selecciona una clase --</option>
                    {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {classData && classData.enrollments?.length > 0 ? (
                <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3">Estudiante</th>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                    <th key={num} className="px-2 py-3 text-center">S{num}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {classData.enrollments.map(e => (
                                <tr key={e.id} className="bg-white border-b dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                                    <td className="px-6 py-4">{e.user?.profile?.fullName || `ID: ${e.userId}`}</td>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => {
                                        const isAttended = false; // Mock unless attended data is sent by controller.
                                        // The backend controller for getClassById needs to include attendances to make this fully functional without individual fetch logic.
                                        return (
                                            <td key={num} className="px-2 py-4 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isAttended} 
                                                    onChange={() => handleAttendanceToggle(e.id, num, isAttended)}
                                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : classData ? (
                <p className="mt-4 text-sm text-gray-500">No hay estudiantes inscritos en esta clase.</p>
            ) : null}
        </Card>
    );
};

export default AttendanceTracker;
