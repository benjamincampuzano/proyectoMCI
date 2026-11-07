import React, { useState, useEffect } from 'react';
import { SquaresFour, ClipboardText, ArrowsClockwise } from '@phosphor-icons/react';
import { Card, Button } from './ui';
import CellManagement from './CellManagement';
import CellAttendance from './CellAttendance';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const CellWorkspace = ({ moduleCoordinator, moduleSubCoordinator, moduleTreasurer }) => {
    const { user, hasAnyRole } = useAuth();
    const [activeView, setActiveView] = useState('attendance'); // 'attendance' or 'management'
    const [selectedCellId, setSelectedCellId] = useState(null);
    const [cells, setCells] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchCells = async () => {
        setLoading(true);
        try {
            const res = await api.get('/enviar/cells');
            const data = res.data || [];
            setCells(data);

            // Auto-selection logic for Disciples
            if (hasAnyRole(['DISCIPULO']) && !hasAnyRole(['ADMIN', 'PASTOR', 'LIDER_DOCE'])) {
                const userCell = data.find(cell =>
                    cell.members?.some(memberId => memberId === user?.id) ||
                    cell.leaderId === user?.id
                );
                if (userCell) {
                    setSelectedCellId(userCell.id);
                } else if (data.length > 0) {
                    setSelectedCellId(data[0].id);
                }
            } else if (data.length > 0 && !selectedCellId) {
                setSelectedCellId(data[0].id);
            }
        } catch (error) {
            console.error('Error fetching cells:', error);
            toast.error('Error al cargar las células');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCells();
    }, []);

    return (
        <div className="space-y-6">
            {/* Workspace Header / View Switcher */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--ln-text-primary)]">
                        {activeView === 'attendance' ? 'Control de Asistencia' : 'Gestión de Células'}
                    </h2>
                    <p className="text-[var(--ln-text-tertiary)] text-sm">
                        {activeView === 'attendance'
                            ? 'Registra la asistencia semanal de los miembros de la célula'
                            : 'Administra la configuración y miembros de las células'}
                    </p>
                </div>

                <div className="flex items-center gap-2 p-1 bg-[rgba(255,255,255,0.05)] rounded-xl border border-[var(--ln-border-standard)]">
                    <button
                        onClick={() => setActiveView('attendance')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeView === 'attendance'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-[rgba(255,255,255,0.05)]'
                        }`}
                    >
                        <ClipboardText size={18} />
                        Asistencia
                    </button>
                    <button
                        onClick={() => setActiveView('management')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeView === 'management'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-[rgba(255,255,255,0.05)]'
                        }`}
                    >
                        <SquaresFour size={18} />
                        Gestión
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <ArrowsClockwise className="animate-spin text-blue-500" size={32} />
                    <span className="ml-3 text-[var(--ln-text-tertiary)]">Cargando entorno de trabajo...</span>
                </div>
            ) : (
                <Card className="p-6 bg-transparent border-none shadow-none">
                    {activeView === 'attendance' ? (
                        <CellAttendance
                            selectedCellId={selectedCellId}
                            setSelectedCellId={setSelectedCellId}
                            cells={cells}
                            moduleCoordinator={moduleCoordinator}
                            moduleSubCoordinator={moduleSubCoordinator}
                            moduleTreasurer={moduleTreasurer}
                        />
                    ) : (
                        <CellManagement
                            selectedCellId={selectedCellId}
                            setSelectedCellId={setSelectedCellId}
                            cells={cells}
                            setCells={setCells}
                            moduleCoordinator={moduleCoordinator}
                            moduleSubCoordinator={moduleSubCoordinator}
                            moduleTreasurer={moduleTreasurer}
                        />
                    )}
                </Card>
            )}
        </div>
    );
};

export default CellWorkspace;
