import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import { getTodayString } from '../utils/dateUtils';

const useCellAttendance = () => {
    const [date, setDate] = useState(getTodayString());

    const [cells, setCells] = useState([]);
    const [selectedCell, setSelectedCell] = useState(null);

    const [members, setMembers] = useState([]);
    const [attendances, setAttendances] = useState({});

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState('');

    const fetchCells = useCallback(async () => {
        try {
            const response = await api.get('/enviar/cells');
            const data = response.data;
            if (Array.isArray(data)) {
                setCells(data);
                if (data.length > 0) {
                    setSelectedCell(data[0].id);
                } else {
                    setSelectedCell(null);
                }
            } else {
                setCells([]);
                setSelectedCell(null);
            }
        } catch (err) {
            setCells([]);
            setSelectedCell(null);
            setError(err.userMessage || 'Error fetching cells');
        }
    }, []);

    const fetchCellMembers = useCallback(async () => {
        if (!selectedCell) return;

        try {
            setLoading(true);
            const response = await api.get(`/enviar/cells/${selectedCell}/members`);
            const data = response.data;

            if (Array.isArray(data)) {
                setMembers(data);
            } else {
                setMembers([]);
            }
        } catch (err) {
            setError(err.userMessage || 'Error fetching cell members');
        } finally {
            setLoading(false);
        }
    }, [selectedCell]);

    const fetchCellAttendance = useCallback(async () => {
        if (!selectedCell) return;

        try {
            const response = await api.get(`/enviar/cell-attendance/${selectedCell}/${date}`);
            const data = response.data;

            const attendanceMap = {};
            if (Array.isArray(data)) {
                data.forEach(att => {
                    attendanceMap[att.userId] = att.status;
                });
            }

            setAttendances(attendanceMap);
        } catch (err) {
            setError(err.userMessage || 'Error fetching cell attendance');
        }
    }, [date, selectedCell]);

    useEffect(() => {
        void Promise.resolve().then(fetchCells);
    }, [fetchCells]);

    useEffect(() => {
        if (selectedCell) {
            void Promise.resolve().then(() => {
                fetchCellMembers();
                fetchCellAttendance();
            });
        }
    }, [fetchCellAttendance, fetchCellMembers, selectedCell, date]);

    const toggleAttendance = useCallback((userId, status) => {
        setAttendances(prev => {
            const currentStatus = prev[userId];

            if (currentStatus === status || status === null) {
                const newState = { ...prev };
                delete newState[userId];
                return newState;
            }

            return {
                ...prev,
                [userId]: status
            };
        });
    }, []);

    const saveAttendance = useCallback(async () => {
        if (!selectedCell) return { success: false, message: 'Célula no seleccionada' };

        const memberMap = new Map(members.map(m => [m.id, m]));
        const attendanceData = Object.entries(attendances)
            .filter(([userId]) => memberMap.has(parseInt(userId)))
            .map(([userId, status]) => ({
                userId: parseInt(userId),
                status,
                type: memberMap.get(parseInt(userId))?.type || 'USER'
            }));

        try {
            setSaving(true);
            await api.post('/enviar/cell-attendance', {
                date,
                cellId: selectedCell,
                attendances: attendanceData
            });
            return { success: true };
        } catch (err) {
            const message = err.userMessage || 'Error al guardar asistencia';
            setError(message);
            return { success: false, message };
        } finally {
            setSaving(false);
        }
    }, [attendances, date, selectedCell, members]);

    return {
        date,
        setDate,
        cells,
        selectedCell,
        setSelectedCell,
        members,
        attendances,
        toggleAttendance,
        loading,
        saving,
        error,
        setError,
        refetchCells: fetchCells,
        refetchMembers: fetchCellMembers,
        refetchAttendance: fetchCellAttendance,
        saveAttendance,
    };
};

export default useCellAttendance;
