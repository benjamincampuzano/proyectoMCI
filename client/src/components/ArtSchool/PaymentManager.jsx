import { useState, useEffect } from 'react';
import { Card, Button, Input } from '../ui';
import api from '../../utils/api';
import toast from 'react-hot-toast';

import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';

const PaymentManager = () => {
    const { hasAnyRole, isCoordinator, isTreasurer } = useAuth();
    const [enrollmentId, setEnrollmentId] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');

    const canManagePayments = hasAnyRole([ROLES.ADMIN, ROLES.PASTOR]) || isCoordinator('Escuela de Artes') || isTreasurer('Escuela de Artes');

    if (!canManagePayments) {
        return (
            <Card title="Gestión de Pagos y Abonos">
                <div className="p-8 text-center bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-800">
                    <p className="text-red-800 dark:text-red-200 font-bold mb-2">Acceso Restringido</p>
                    <p className="text-red-600 dark:text-red-400 text-sm">No tiene los permisos necesarios para realizar abonos. Esta función es exclusiva para el Tesorero del módulo, el Coordinador o Administradores.</p>
                </div>
            </Card>
        );
    }

    const handleRegisterPayment = async (e) => {
        e.preventDefault();
        try {
            await api.post('/arts/payments', { 
                enrollmentId: Number(enrollmentId), 
                amount: Number(amount), 
                notes 
            });
            toast.success('Pago registrado correctamente');
            setAmount('');
            setNotes('');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al registrar el pago');
        }
    };

    return (
        <Card title="Gestión de Pagos y Abonos">
            <form onSubmit={handleRegisterPayment} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input 
                        label="ID Inscripción" 
                        type="number" 
                        value={enrollmentId} 
                        onChange={(e) => setEnrollmentId(e.target.value)} 
                        required 
                    />
                    <Input 
                        label="Monto del Abono ($)" 
                        type="number" 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)} 
                        required 
                    />
                    <Input 
                        label="Notas" 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                    />
                </div>
                <Button type="submit" variant="primary">Registrar Abono</Button>
            </form>
            <div className="mt-8 text-sm text-gray-500">
                <p><strong>Nota:</strong> Esta vista es exclusiva para quienes tienen el rol de TESORERO o COORDINADOR en la Escuela de Artes. Permite abonar la cuota de la inscripción a partir de su ID.</p>
                <p>En el futuro, se puede construir una tabla con el saldo consolidado por alumno utilizando los endpoints `/arts/enrollments/:id` donde vienen cargados sus pagos realizados.</p>
            </div>
        </Card>
    );
};

export default PaymentManager;
