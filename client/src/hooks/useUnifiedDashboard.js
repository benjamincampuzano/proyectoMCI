import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/api';

const toISODate = (d) => {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
};

const lastMonthsDefault = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    return { startDate: toISODate(start), endDate: toISODate(end) };
};

const PRESETS = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '12m': 365,
};

/**
 * Hook central del Dashboard unificado tipo Power BI.
 * - Un solo estado de filtros globales (fecha, red, búsqueda, estado)
 * - Una sola carga contra /dashboard con query params + cargas de detalle por módulo
 */
export const useUnifiedDashboard = () => {
    const defaults = useMemo(() => lastMonthsDefault(), []);
    const [filters, setFilters] = useState({
        startDate: defaults.startDate,
        endDate: defaults.endDate,
        liderDoceId: '',
        search: '',
        guestStatus: '',
        preset: '90d',
    });
    const [module, setModule] = useState('resumen');
    const [dashboard, setDashboard] = useState(null);
    const [guestStats, setGuestStats] = useState(null);
    const [dailyChurch, setDailyChurch] = useState([]);
    const [cellTrend, setCellTrend] = useState([]);
    const [lideresDoce, setLideresDoce] = useState([]);
    const [activityRows, setActivityRows] = useState([]);
    const [activityTotal, setActivityTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [error, setError] = useState(null);

    const updateFilter = useCallback((patch) => {
        setFilters((prev) => ({ ...prev, ...patch }));
    }, []);

    const applyPreset = useCallback((preset) => {
        const days = PRESETS[preset];
        if (!days) {
            updateFilter({ preset });
            return;
        }
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        updateFilter({ preset, startDate: toISODate(start), endDate: toISODate(end) });
    }, [updateFilter]);

    const clearFilters = useCallback(() => {
        const d = lastMonthsDefault();
        setFilters({ startDate: d.startDate, endDate: d.endDate, liderDoceId: '', search: '', guestStatus: '', preset: '90d' });
    }, []);

    const fetchAll = useCallback(async (currentFilters) => {
        setLoading(true);
        setError(null);
        const params = {};
        if (currentFilters.startDate) params.startDate = currentFilters.startDate;
        if (currentFilters.endDate) params.endDate = currentFilters.endDate;
        if (currentFilters.liderDoceId) params.liderDoceId = currentFilters.liderDoceId;

        try {
            const [dashRes, guestsRes, dailyRes, cellRes, activityRes] = await Promise.allSettled([
                api.get('/dashboard', { params }),
                api.get('/guests/stats', { params }),
                api.get('/consolidar/church-attendance/daily-stats', { params }),
                api.get('/enviar/cell-attendance/stats', { params }),
                api.get('/network/activity-list', { params: { ...params, page: 1, limit: 50, ...(currentFilters.search ? { search: currentFilters.search } : {}) } }),
            ]);

            if (dashRes.status === 'fulfilled') setDashboard(dashRes.value.data);
            else throw dashRes.reason;

            if (guestsRes.status === 'fulfilled') setGuestStats(guestsRes.value.data);
            if (dailyRes.status === 'fulfilled') setDailyChurch(Array.isArray(dailyRes.value.data) ? dailyRes.value.data : []);
            if (cellRes.status === 'fulfilled') setCellTrend(Array.isArray(cellRes.value.data) ? cellRes.value.data : []);
            if (activityRes.status === 'fulfilled') {
                setActivityRows(activityRes.value.data?.data || []);
                setActivityTotal(activityRes.value.data?.pagination?.total || 0);
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Error al cargar el dashboard');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => fetchAll(filters), 350);
        return () => clearTimeout(t);
    }, [filters.startDate, filters.endDate, filters.liderDoceId, refreshKey, fetchAll]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        let cancelled = false;
        api.get('/network/los-doce').then((res) => {
            if (!cancelled) setLideresDoce(res.data || []);
        }).catch(() => {});
        return () => { cancelled = true; };
    }, []);

    // Derivados para Power BI: búsqueda + estado filtran en cliente sin refetch
    const filtered = useMemo(() => {
        const q = (filters.search || '').toLowerCase();
        const status = filters.guestStatus;
        const byStatus = guestStats?.byStatus || {};
        const funnel = [
            { key: 'NUEVO', label: 'Nuevos', value: byStatus.NUEVO || 0, color: '#3b82f6' },
            { key: 'CONTACTADO', label: 'Contactados', value: byStatus.CONTACTADO || 0, color: '#f59e0b' },
            { key: 'CONSOLIDADO', label: 'Consolidados', value: byStatus.CONSOLIDADO || 0, color: '#8b5cf6' },
            { key: 'GANADO', label: 'Ganados', value: byStatus.GANADO || 0, color: '#10b981' },
        ].filter((f) => (!status || f.key === status));

        const topInviters = (guestStats?.topInviters || []).filter((r) =>
            !q || r.name?.toLowerCase().includes(q)
        );
        const byRed = (guestStats?.invitationsByLiderDoce || []).filter((r) =>
            !q || r.name?.toLowerCase().includes(q)
        );
        const activity = activityRows.filter((r) =>
            !q || r.fullName?.toLowerCase().includes(q) || (r.roles || []).join(' ').toLowerCase().includes(q)
        );

        return { funnel, topInviters, byRed, activity, dailyChurch, cellTrend };
    }, [filters.search, filters.guestStatus, guestStats, activityRows, dailyChurch, cellTrend]);

    return {
        filters, updateFilter, applyPreset, clearFilters,
        module, setModule,
        dashboard, guestStats, lideresDoce,
        activityRows: filtered.activity, activityTotal,
        funnel: filtered.funnel, topInviters: filtered.topInviters, byRed: filtered.byRed,
        dailyChurch: filtered.dailyChurch, cellTrend: filtered.cellTrend,
        loading, error, refresh: () => setRefreshKey((k) => k + 1),
    };
};

export default useUnifiedDashboard;
