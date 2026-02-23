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

    // Paginación
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false
    });

    const [currentUser, setCurrentUser] = useState(null);

    const searchDebounceTimeoutRef = useRef(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(user);
    }, []);

    const fetchGuests = useCallback(async (page = 1, append = false) => {
        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('limit', pagination.limit);

            if (statusFilter) params.append('status', statusFilter);
            if (invitedByFilter) params.append('invitedById', invitedByFilter);
            if (liderDoceFilter) params.append('liderDoceId', liderDoceFilter);
            if (searchTerm) params.append('search', searchTerm);

            const res = await api.get('/guests', {
                params: Object.fromEntries(params)
            });

            if (append) {
                setGuests(prev => [...prev, ...(res.data.guests || [])]);
            } else {
                setGuests(res.data.guests || []);
            }

            if (res.data.pagination) {
                setPagination(prev => ({
                    ...prev,
                    page: res.data.pagination.page,
                    total: res.data.pagination.total,
                    totalPages: res.data.pagination.totalPages,
                    hasMore: res.data.pagination.hasMore
                }));
            }
        } catch (err) {
            setError(err.userMessage || err.response?.data?.message || 'Error al cargar invitados');
            setGuests([]);
        } finally {
            setLoading(false);
        }
    }, [invitedByFilter, liderDoceFilter, searchTerm, statusFilter, pagination.limit]);

    const loadMore = () => {
        if (!loading && pagination.hasMore) {
            fetchGuests(pagination.page + 1, true);
        }
    };

    useEffect(() => {
        fetchGuests(1);
    }, [fetchGuests, refreshTrigger, statusFilter, invitedByFilter, liderDoceFilter]);

    useEffect(() => {
        if (searchDebounceTimeoutRef.current) {
            clearTimeout(searchDebounceTimeoutRef.current);
        }

        searchDebounceTimeoutRef.current = setTimeout(() => {
            fetchGuests(1);
        }, 500);

        return () => {
            if (searchDebounceTimeoutRef.current) {
                clearTimeout(searchDebounceTimeoutRef.current);
            }
        };
    }, [fetchGuests, searchTerm]);

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
        currentUser,
        fetchGuests,
        loadMore,
        pagination,
        updateGuest,
        deleteGuest,
        convertGuestToMember,
    };
};

export default useGuestManagement;
