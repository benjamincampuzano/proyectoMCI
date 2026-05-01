import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../utils/api';

const useGuestManagement = ({ refreshTrigger } = {}) => {
    const [guests, setGuests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [invitedByFilter, setInvitedByFilter] = useState(null);
    const [liderDoceFilter, setLiderDoceFilter] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [pendingCalls, setPendingCalls] = useState(false);
    const [pendingVisits, setPendingVisits] = useState(false);

    // Paginación numérica (10 registros por página)
    const [currentPage, setCurrentPage] = useState(1);
    const [totalGuests, setTotalGuests] = useState(0);
    const [guestsPerPage] = useState(10);

    const [currentUser, setCurrentUser] = useState(null);

    const searchDebounceTimeoutRef = useRef(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(user);
    }, []);

    const fetchGuests = useCallback(async (page = 1) => {
        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('limit', guestsPerPage);

            if (statusFilter) params.append('status', statusFilter);
            if (invitedByFilter && invitedByFilter.id !== undefined) params.append('invitedById', invitedByFilter.id);
            if (liderDoceFilter && liderDoceFilter.id !== undefined) params.append('liderDoceId', liderDoceFilter.id);
            if (searchTerm) params.append('search', searchTerm);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (pendingCalls) params.append('pendingCalls', 'true');
            if (pendingVisits) params.append('pendingVisits', 'true');

            const res = await api.get('/guests', {
                params: Object.fromEntries(params)
            });

            setGuests(res.data.guests || []);

            if (res.data.pagination) {
                setTotalGuests(res.data.pagination.total || 0);
            }
        } catch (err) {
            setError(err.userMessage || err.response?.data?.message || 'Error al cargar invitados');
            setGuests([]);
        } finally {
            setLoading(false);
        }
    }, [invitedByFilter, liderDoceFilter, searchTerm, statusFilter, startDate, endDate, pendingCalls, pendingVisits, guestsPerPage]);

    // Obtener todos los invitados filtrados (sin paginación) para exportar
    const fetchAllGuests = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            params.append('page', 1);
            params.append('limit', 10000); // Límite alto para obtener todos

            if (statusFilter) params.append('status', statusFilter);
            if (invitedByFilter && invitedByFilter.id !== undefined) params.append('invitedById', invitedByFilter.id);
            if (liderDoceFilter && liderDoceFilter.id !== undefined) params.append('liderDoceId', liderDoceFilter.id);
            if (searchTerm) params.append('search', searchTerm);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (pendingCalls) params.append('pendingCalls', 'true');
            if (pendingVisits) params.append('pendingVisits', 'true');

            const res = await api.get('/guests', {
                params: Object.fromEntries(params)
            });

            return res.data.guests || [];
        } catch (err) {
            throw new Error(err.userMessage || err.response?.data?.message || 'Error al cargar invitados');
        }
    }, [invitedByFilter, liderDoceFilter, searchTerm, statusFilter, startDate, endDate, pendingCalls, pendingVisits]);

    // Funciones de paginación
    const handlePageChange = useCallback((newPage) => {
        setCurrentPage(newPage);
    }, []);

    const handleNextPage = useCallback(() => {
        setCurrentPage(prev => prev + 1);
    }, []);

    const handlePrevPage = useCallback(() => {
        setCurrentPage(prev => Math.max(1, prev - 1));
    }, []);

    useEffect(() => {
        fetchGuests(currentPage);
    }, [fetchGuests, refreshTrigger, currentPage, statusFilter, invitedByFilter, liderDoceFilter, startDate, endDate, pendingCalls, pendingVisits]);

    useEffect(() => {
        if (searchDebounceTimeoutRef.current) {
            clearTimeout(searchDebounceTimeoutRef.current);
        }

        searchDebounceTimeoutRef.current = setTimeout(() => {
            setCurrentPage(1);
            fetchGuests(1);
        }, 500);

        return () => {
            if (searchDebounceTimeoutRef.current) {
                clearTimeout(searchDebounceTimeoutRef.current);
            }
        };
    }, [fetchGuests, searchTerm]);

    // Resetear página cuando cambian los filtros
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, invitedByFilter, liderDoceFilter, startDate, endDate, pendingCalls, pendingVisits]);

    const updateGuest = useCallback(async (guestId, updates) => {
        try {
            await api.put(`/guests/${guestId}`, updates);
            await fetchGuests(1);
            return { success: true };
        } catch (err) {
            const message = err.userMessage || err.response?.data?.message || 'Error al actualizar invitado';
            setError(message);
            return { success: false, message };
        }
    }, [fetchGuests]);

    const deleteGuest = useCallback(async (guestId) => {
        try {
            await api.delete(`/guests/${guestId}`);
            await fetchGuests(1);
            return { success: true };
        } catch (err) {
            const message = err.userMessage || err.response?.data?.message || 'Error al eliminar invitado';
            setError(message);
            return { success: false, message };
        }
    }, [fetchGuests]);

    const convertGuestToMember = useCallback(async (guestId, { email, password }) => {
        try {
            await api.post(`/guests/${guestId}/convert-to-member`, { email, password });
            await fetchGuests(1);
            return { success: true };
        } catch (err) {
            const message = err.userMessage || err.response?.data?.message || 'Error al convertir invitado';
            setError(message);
            return { success: false, message };
        }
    }, [fetchGuests]);

    // Calcular información de paginación
    const totalPages = Math.ceil(totalGuests / guestsPerPage) || 1;
    const pagination = {
        page: currentPage,
        pages: totalPages,
        total: totalGuests,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
        onNext: handleNextPage,
        onPrev: handlePrevPage
    };

    return {
        guests,
        loading,
        error,
        setError,
        searchTerm,
        setSearchTerm,
        statusFilter,
        setStatusFilter,
        invitedByFilter,
        setInvitedByFilter,
        liderDoceFilter,
        setLiderDoceFilter,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        pendingCalls,
        setPendingCalls,
        pendingVisits,
        setPendingVisits,
        currentUser,
        fetchGuests,
        fetchAllGuests, // Exportar función para obtener todos los datos filtrados
        // Paginación
        currentPage,
        setCurrentPage: handlePageChange,
        totalGuests,
        guestsPerPage,
        totalPages,
        pagination,
        updateGuest,
        deleteGuest,
        convertGuestToMember,
    };
};

export default useGuestManagement;
