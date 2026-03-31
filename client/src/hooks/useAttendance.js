import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';

const useAttendance = () => {
    const [stats, setStats] = useState([]);
    const [cells, setCells] = useState([]);
    const [selectedCell, setSelectedCell] = useState('');

    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
    });

    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchCells = useCallback(async () => {
        try {
            const response = await api.get('/enviar/cells');
            const data = response.data;
            if (Array.isArray(data)) {
                setCells(data);
            } else {
                setCells([]);
            }
        } catch (err) {
            console.error('Error fetching cells:', err);
            // Handle network errors silently
            if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
                console.log('Server not available - using empty cells list');
                setCells([]);
            } else {
                setError(err.response?.data?.error || 'Error fetching cells');
            }
        }
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/enviar/cell-attendance/stats', {
                params: {
                    startDate,
                    endDate,
                    ...(selectedCell && { cellId: selectedCell })
                }
            });

            const data = response.data;
            if (Array.isArray(data)) {
                setStats(data);
            } else {
                setStats([]);
            }
        } catch (err) {
            console.error('Error fetching stats:', err);
            // Handle network errors silently
            if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
                console.log('Server not available - using empty stats');
                setStats([]);
            } else {
                setError(err.response?.data?.error || 'Error fetching stats');
            }
        } finally {
            setLoading(false);
        }
    }, [endDate, selectedCell, startDate]);

    useEffect(() => {
        fetchCells();
    }, [fetchCells]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return {
        stats,
        cells,
        selectedCell,
        setSelectedCell,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        loading,
        error,
        setError,
        refetchCells: fetchCells,
        refetchStats: fetchStats,
    };
};

export default useAttendance;
