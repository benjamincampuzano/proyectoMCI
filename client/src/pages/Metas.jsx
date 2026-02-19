import { useState, useEffect } from 'react';
import { Target, Plus, Clock, CheckCircle2, XCircle, Edit2, Trash2, FileText } from 'lucide-react';
import api from '../utils/api';
import GoalForm from '../components/GoalForm';
import GoalRow from '../components/GoalRow';
import { ROLES, ROLE_GROUPS } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Button } from '../components/ui';

const Metas = () => {
    const { hasAnyRole } = useAuth();
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showGoalForm, setShowGoalForm] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);

    const isEditor = hasAnyRole(ROLE_GROUPS.CAN_MANAGE_GOALS);

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar esta meta?')) {
            try {
                await api.delete(`/metas/${id}`);
                await fetchGoals();
            } catch (error) {
                console.error('Error deleting goal:', error);
                alert('Error al eliminar la meta');
            }
        }
    };

    const fetchGoals = async () => {
        try {
            setLoading(true);
            const response = await api.get('/metas');
            setGoals(response.data);
        } catch (error) {
            console.error('Error fetching goals:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGoals();
    }, []);



    return (
        <div className="space-y-8 max-w-[1600px] mx-auto p-4 md:p-8">
            <PageHeader
                title={<div className="flex items-center gap-3"><Target className="text-blue-600" size={32} />Tablero de Metas</div>}
                description="Seguimiento detallado de objetivos y cumplimiento por líder"
                action={isEditor && (
                    <Button
                        onClick={() => { setEditingGoal(null); setShowGoalForm(true); }}
                        icon={Plus}
                        size="lg"
                        className="shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                        Nueva Meta
                    </Button>
                )}
            />

            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-left">Líder Doce</th>
                                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-left">Meta / KPI</th>
                                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Objetivo</th>
                                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Actual</th>
                                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center w-40">Cumplimiento</th>
                                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Fecha Límite</th>
                                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Estado</th>
                                {isEditor && <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={isEditor ? 8 : 7} className="p-10 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                                            <p className="text-sm font-medium">Cargando metas...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : goals.length === 0 ? (
                                <tr>
                                    <td colSpan={isEditor ? 8 : 7} className="p-16 text-center">
                                        <div className="bg-gray-50 dark:bg-gray-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                            <FileText size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sin metas registradas</h3>
                                        <p className="text-gray-500 text-sm mt-1">No hay datos para mostrar en este momento.</p>
                                    </td>
                                </tr>
                            ) : (
                                goals.map(goal => (
                                    <GoalRow
                                        key={goal.id}
                                        goal={goal}
                                        isEditor={isEditor}
                                        onEdit={(g) => { setEditingGoal(g); setShowGoalForm(true); }}
                                        onDelete={handleDelete}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showGoalForm && (
                <GoalForm
                    isOpen={showGoalForm}
                    onClose={() => setShowGoalForm(false)}
                    onSuccess={() => { fetchGoals(); setShowGoalForm(false); }}
                    initialData={editingGoal}
                />
            )}
        </div>
    );
};

export default Metas;
