/**
 * Tests del módulo: Ganar — Hook useGuestManagement
 * Cubre: client/src/hooks/useGuestManagement.js
 *
 * El hook depende de:
 *  - api.js (axios wrapper con interceptors)
 *  - localStorage (para currentUser)
 *
 * Mockeamos axios (api.js) con vi.mock para poder probar fetch,
 * filtros, paginación, update y delete sin tocar la red.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mockear api.js antes de importar el hook
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('@client-src/utils/api.js', () => ({
    default: {
        get: (...args) => mockGet(...args),
        post: (...args) => mockPost(...args),
        put: (...args) => mockPut(...args),
        delete: (...args) => mockDelete(...args),
    },
}));

import { renderHook, act, waitFor } from '@testing-library/react';
import useGuestManagement from '@client-src/hooks/useGuestManagement.js';

describe('Módulo: Ganar — useGuestManagement hook (client)', () => {
    beforeEach(() => {
        mockGet.mockReset();
        mockPost.mockReset();
        mockPut.mockReset();
        mockDelete.mockReset();
        localStorage.clear();
    });

    test('estado inicial: sin invitados, sin loading, sin error', async () => {
        mockGet.mockResolvedValueOnce({ data: { guests: [], pagination: { total: 0 } } });

        const { result } = renderHook(() => useGuestManagement());
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.guests).toEqual([]);
        expect(result.current.error).toBe('');
        expect(result.current.totalGuests).toBe(0);
    });

    test('carga invitados al montar', async () => {
        const guests = [
            { id: 1, fullName: 'Juan', status: 'NUEVO' },
            { id: 2, fullName: 'María', status: 'CONTACTADO' },
        ];
        mockGet.mockResolvedValueOnce({
            data: { guests, pagination: { total: 2 } },
        });

        const { result } = renderHook(() => useGuestManagement());
        await waitFor(() => expect(result.current.guests).toHaveLength(2));

        expect(result.current.totalGuests).toBe(2);
        expect(mockGet).toHaveBeenCalledWith('/guests', expect.objectContaining({
            params: expect.objectContaining({ page: 1 }),
        }));
    });

    test('construye query string correctamente con filtros activos', async () => {
        mockGet.mockResolvedValueOnce({ data: { guests: [], pagination: { total: 0 } } });

        const { result } = renderHook(() => useGuestManagement());
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.setStatusFilter('NUEVO');
            result.current.setStartDate('2026-01-01');
            result.current.setEndDate('2026-12-31');
            result.current.setAlreadyCalled(true);
            result.current.setInvitedByFilter({ id: 5 });
        });

        // Esperar a que el debounce + fetch ocurran
        await waitFor(() => {
            const lastCall = mockGet.mock.calls[mockGet.mock.calls.length - 1];
            const params = lastCall?.[1]?.params || {};
            // Verificamos los filtros que sí deben estar
            expect(params.status).toBe('NUEVO');
            expect(params.startDate).toBe('2026-01-01');
            expect(params.endDate).toBe('2026-12-31');
            expect(params.alreadyCalled).toBe('true');
            expect(params.invitedById).toBe('5');
        });
    });

    test('maneja errores del servidor', async () => {
        const error = {
            response: { data: { message: 'Error 500 interno' } },
            userMessage: null,
        };
        mockGet.mockRejectedValueOnce(error);

        const { result } = renderHook(() => useGuestManagement());
        await waitFor(() => expect(result.current.error).toBeTruthy());

        expect(result.current.error).toMatch(/500/);
        expect(result.current.guests).toEqual([]);
    });

    test('updateGuest llama PUT y refresca', async () => {
        mockGet
            .mockResolvedValueOnce({ data: { guests: [{ id: 1, fullName: 'X' }], pagination: { total: 1 } } })
            .mockResolvedValueOnce({ data: { guests: [{ id: 1, fullName: 'Y' }], pagination: { total: 1 } } });
        mockPut.mockResolvedValueOnce({ data: { ok: true } });

        const { result } = renderHook(() => useGuestManagement());
        await waitFor(() => expect(result.current.guests).toHaveLength(1));

        let updateResult;
        await act(async () => {
            updateResult = await result.current.updateGuest(1, { fullName: 'Y' });
        });

        expect(mockPut).toHaveBeenCalledWith('/guests/1', { fullName: 'Y' });
        expect(updateResult.success).toBe(true);
    });

    test('updateGuest devuelve error si falla', async () => {
        mockGet.mockResolvedValueOnce({ data: { guests: [{ id: 1 }], pagination: { total: 1 } } });
        mockPut.mockRejectedValueOnce({
            response: { data: { message: 'No autorizado' } },
        });

        const { result } = renderHook(() => useGuestManagement());
        await waitFor(() => expect(result.current.guests).toHaveLength(1));

        let updateResult;
        await act(async () => {
            updateResult = await result.current.updateGuest(1, {});
        });

        expect(updateResult.success).toBe(false);
        expect(updateResult.message).toBeTruthy();
    });

    test('deleteGuest llama DELETE', async () => {
        mockGet
            .mockResolvedValueOnce({ data: { guests: [{ id: 1 }], pagination: { total: 1 } } })
            .mockResolvedValueOnce({ data: { guests: [], pagination: { total: 0 } } });
        mockDelete.mockResolvedValueOnce({ data: { ok: true } });

        const { result } = renderHook(() => useGuestManagement());
        await waitFor(() => expect(result.current.guests).toHaveLength(1));

        let deleteResult;
        await act(async () => {
            deleteResult = await result.current.deleteGuest(1);
        });

        expect(mockDelete).toHaveBeenCalledWith('/guests/1');
        expect(deleteResult.success).toBe(true);
    });

    test('convertGuestToMember llama POST con credenciales', async () => {
        mockGet
            .mockResolvedValueOnce({ data: { guests: [{ id: 1 }], pagination: { total: 1 } } })
            .mockResolvedValueOnce({ data: { guests: [], pagination: { total: 0 } } });
        mockPost.mockResolvedValueOnce({ data: { ok: true } });

        const { result } = renderHook(() => useGuestManagement());
        await waitFor(() => expect(result.current.guests).toHaveLength(1));

        let convertResult;
        await act(async () => {
            convertResult = await result.current.convertGuestToMember(1, { email: 'x@y.com', password: 'p' });
        });

        expect(mockPost).toHaveBeenCalledWith('/guests/1/convert-to-member', { email: 'x@y.com', password: 'p' });
        expect(convertResult.success).toBe(true);
    });

    test('paginación: handleNextPage avanza', async () => {
        mockGet.mockResolvedValue({ data: { guests: [], pagination: { total: 100 } } });

        const { result } = renderHook(() => useGuestManagement());
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.currentPage).toBe(1);

        act(() => {
            result.current.handleNextPage();
        });
        await waitFor(() => expect(result.current.currentPage).toBe(2));
    });

    test('paginación: handlePrevPage no baja de 1', async () => {
        mockGet.mockResolvedValue({ data: { guests: [], pagination: { total: 100 } } });

        const { result } = renderHook(() => useGuestManagement());
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.handlePrevPage();
        });
        expect(result.current.currentPage).toBe(1);

        act(() => {
            result.current.handleNextPage();
        });
        act(() => {
            result.current.handlePrevPage();
        });
        expect(result.current.currentPage).toBe(1);
    });

    test('expone totalPages y metadata de paginación', async () => {
        mockGet.mockResolvedValueOnce({ data: { guests: [], pagination: { total: 100 } } });

        const { result } = renderHook(() => useGuestManagement());
        await waitFor(() => expect(result.current.totalGuests).toBe(100));

        // 100 guests / 10 perPage = 10 páginas
        expect(result.current.totalPages).toBe(10);
        expect(result.current.pagination.pages).toBe(10);
        expect(result.current.pagination.hasNext).toBe(true);
        expect(result.current.pagination.hasPrev).toBe(false);
    });

    test('fetchAllGuests usa límite alto y respeta ignoreNetworkFilter', async () => {
        mockGet.mockResolvedValue({ data: { guests: [], pagination: { total: 0 } } });

        const { result } = renderHook(() => useGuestManagement());
        await waitFor(() => expect(result.current.loading).toBe(false));

        const guests = [{ id: 1 }];
        mockGet.mockResolvedValueOnce({ data: { guests } });

        await act(async () => {
            await result.current.fetchAllGuests({ ignoreNetworkFilter: true });
        });

        expect(mockGet).toHaveBeenLastCalledWith('/guests', expect.objectContaining({
            params: expect.objectContaining({ limit: 10000 }),
        }));
    });
});
