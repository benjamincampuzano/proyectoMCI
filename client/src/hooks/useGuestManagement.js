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
    const [alreadyCalled, setAlreadyCalled] = useState(false);
    const [alreadyVisited, setAlreadyVisited] = useState(false);

    // Paginación numérica (10 registros por página)
    const [currentPage, setCurrentPage] = useState(1);
    const currentPageRef = useRef(1);
    const [totalGuests, setTotalGuests] = useState(0);
    const [guestsPerPage] = useState(10);

    const [currentUser, setCurrentUser] = useState(null);

    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        void Promise.resolve().then(() => {
            const user = JSON.parse(localStorage.getItem('user'));
            setCurrentUser(user);
        });
    }, []);

    const fetchGuests = useCallback(async (page = 1) => {
        setLoading(true);
        setError('');

        try {
            const params = { page, limit: guestsPerPage };

            if (statusFilter) params.status = statusFilter;
            if (invitedByFilter && invitedByFilter.id !== undefined) params.invitedById = String(invitedByFilter.id);
            if (liderDoceFilter && liderDoceFilter.id !== undefined) params.liderDoceId = String(liderDoceFilter.id);
            if (debouncedSearchTerm) params.search = debouncedSearchTerm;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            if (pendingCalls) params.pendingCalls = 'true';
            if (pendingVisits) params.pendingVisits = 'true';
            if (alreadyCalled) params.alreadyCalled = 'true';
            if (alreadyVisited) params.alreadyVisited = 'true';

            const res = await api.get('/guests', {
                params
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
    }, [invitedByFilter, liderDoceFilter, debouncedSearchTerm, statusFilter, startDate, endDate, pendingCalls, pendingVisits, alreadyCalled, alreadyVisited, guestsPerPage]);

    // Obtener todos los invitados filtrados (sin paginación) para exportar
    const fetchAllGuests = useCallback(async (options = {}) => {
        const { ignoreNetworkFilter = false } = options;
        try {
            const params = { page: 1, limit: 10000 }; // Límite alto para obtener todos

            if (statusFilter) params.status = statusFilter;
            if (invitedByFilter && invitedByFilter.id !== undefined) params.invitedById = String(invitedByFilter.id);
            // Si el usuario tiene acceso total al módulo (coordinador/subcoordinador/tesorero),
            // no se aplica el filtro de red por Líder de 12 al exportar.
            if (liderDoceFilter && liderDoceFilter.id !== undefined && !ignoreNetworkFilter) params.liderDoceId = String(liderDoceFilter.id);
            if (debouncedSearchTerm) params.search = debouncedSearchTerm;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            if (pendingCalls) params.pendingCalls = 'true';
            if (pendingVisits) params.pendingVisits = 'true';
            if (alreadyCalled) params.alreadyCalled = 'true';
            if (alreadyVisited) params.alreadyVisited = 'true';

            const res = await api.get('/guests', {
                params
            });

            return res.data.guests || [];
        } catch (err) {
            throw new Error(err.userMessage || err.response?.data?.message || 'Error al cargar invitados', { cause: err });
        }
    }, [invitedByFilter, liderDoceFilter, debouncedSearchTerm, statusFilter, startDate, endDate, pendingCalls, pendingVisits, alreadyCalled, alreadyVisited]);

    // Funciones de paginación
    const handlePageChange = useCallback((newPage) => {
        currentPageRef.current = newPage;
        setCurrentPage(newPage);
    }, []);

    const handleNextPage = useCallback(() => {
        const next = currentPageRef.current + 1;
        currentPageRef.current = next;
        setCurrentPage(next);
    }, []);

    const handlePrevPage = useCallback(() => {
        const prev = Math.max(1, currentPageRef.current - 1);
        currentPageRef.current = prev;
        setCurrentPage(prev);
    }, []);

    // Cuando cambian los filtros, volvemos a la página 1
    const filterKey = [statusFilter, invitedByFilter?.id, liderDoceFilter?.id, startDate, endDate, pendingCalls, pendingVisits, alreadyCalled, alreadyVisited, debouncedSearchTerm, refreshTrigger].join('|');
    const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
    if (prevFilterKey !== filterKey) {
        setPrevFilterKey(filterKey);
        setCurrentPage(1);
    }

    // Mantiene la ref sincronizada para re-fetch desde acciones de seguimiento
    useEffect(() => {
        currentPageRef.current = currentPage;
    }, [currentPage]);

    // Efecto principal para hacer fetch cada vez que cambian los filtros o la página
    useEffect(() => {
        void Promise.resolve().then(() => fetchGuests(currentPage));
    }, [currentPage, fetchGuests]);

    const updateGuest = useCallback(async (guestId, updates) => {
        try {
            await api.put(`/guests/${guestId}`, updates);
            await fetchGuests(currentPageRef.current);
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

    const convertGuestToMember = useCallback(async (guestId, { email, password, dataPolicyAccepted, dataTreatmentAuthorized, minorConsentAuthorized } = {}) => {
        try {
            await api.post(`/guests/${guestId}/convert-to-member`, {
                email,
                password,
                dataPolicyAccepted,
                dataTreatmentAuthorized,
                minorConsentAuthorized,
            });
            await fetchGuests(1);
            return { success: true };
        } catch (err) {
            const message = err.userMessage || err.response?.data?.message || 'Error al convertir invitado';
            setError(message);
            return { success: false, message };
        }
    }, [fetchGuests]);

    const registerCall = useCallback(async (guestId, { date, observation }) => {
        try {
            await api.post(`/guests/${guestId}/calls`, { date, observation });
            await fetchGuests(currentPageRef.current);
            return { success: true };
        } catch (err) {
            const message = err.userMessage || err.response?.data?.message || 'Error al registrar llamada';
            setError(message);
            return { success: false, message };
        }
    }, [fetchGuests]);

    const registerVisit = useCallback(async (guestId, { date, observation }) => {
        try {
            await api.post(`/guests/${guestId}/visits`, { date, observation });
            await fetchGuests(currentPageRef.current);
            return { success: true };
        } catch (err) {
            const message = err.userMessage || err.response?.data?.message || 'Error al registrar visita';
            setError(message);
            return { success: false, message };
        }
    }, [fetchGuests]);

    const deleteCall = useCallback(async (guestId, callId) => {
        try {
            await api.delete(`/guests/${guestId}/calls/${callId}`);
            await fetchGuests(currentPageRef.current);
            return { success: true };
        } catch (err) {
            const message = err.userMessage || err.response?.data?.message || 'Error al eliminar llamada';
            setError(message);
            return { success: false, message };
        }
    }, [fetchGuests]);

    const deleteVisit = useCallback(async (guestId, visitId) => {
        try {
            await api.delete(`/guests/${guestId}/visits/${visitId}`);
            await fetchGuests(currentPageRef.current);
            return { success: true };
        } catch (err) {
            const message = err.userMessage || err.response?.data?.message || 'Error al eliminar visita';
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
        alreadyCalled,
        setAlreadyCalled,
        alreadyVisited,
        setAlreadyVisited,
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
        handleNextPage,
        handlePrevPage,
        updateGuest,
        deleteGuest,
        convertGuestToMember,
        registerCall,
        registerVisit,
        deleteCall,
        deleteVisit,
        refreshCurrentPage: () => fetchGuests(currentPageRef.current),
    };
};

export default useGuestManagement;
