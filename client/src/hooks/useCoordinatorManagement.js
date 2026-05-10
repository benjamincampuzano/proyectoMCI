import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AVAILABLE_MODULES = [
    { id: 'ganar', name: 'Ganar', description: 'Módulo de Ganar', color: 'blue' },
    { id: 'consolidar', name: 'Consolidar', description: 'Módulo de Consolidación', color: 'emerald' },
    { id: 'enviar', name: 'Enviar', description: 'Módulo de Enviar', color: 'amber' },
    { id: 'discipular', name: 'Discipular', description: 'Módulo de Capacitación Destino', color: 'purple' },
    { id: 'kids', name: 'Kids', description: 'Módulo Kids', color: 'pink' },
    { id: 'escuela-de-artes', name: 'Escuela de Artes', description: 'Escuela de Artes', color: 'orange' },
    { id: 'encuentro', name: 'Encuentros', description: 'Encuentros Pre/Pos', color: 'cyan' },
    { id: 'convencion', name: 'Convenciones', description: 'Convenciones', color: 'indigo' }
];

const useCoordinatorManagement = () => {
    const [coordinators, setCoordinators] = useState([]);
    const [subCoordinators, setSubCoordinators] = useState([]);
    const [treasurers, setTreasurers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedModule, setSelectedModule] = useState('ganar');
    const [moduleData, setModuleData] = useState({
        coordinator: null,
        subCoordinator: null,
        treasurer: null
    });

    // Fetch all coordinators
    const fetchCoordinators = useCallback(async () => {
        try {
            const response = await api.get('/coordinators');
            setCoordinators(response.data || []);
        } catch (error) {
            console.error('Error fetching coordinators:', error);
            toast.error('Error al cargar coordinadores');
        }
    }, []);

    // Fetch all sub-coordinators
    const fetchSubCoordinators = useCallback(async () => {
        try {
            const response = await api.get('/coordinators/subcoordinators');
            setSubCoordinators(response.data || []);
        } catch (error) {
            console.error('Error fetching sub-coordinators:', error);
            // Don't show toast for sub-coordinators to avoid spam
        }
    }, []);

    // Fetch all treasurers
    const fetchTreasurers = useCallback(async () => {
        try {
            const response = await api.get('/coordinators/treasurers');
            setTreasurers(response.data || []);
        } catch (error) {
            console.error('Error fetching treasurers:', error);
            // Don't show toast for treasurers to avoid spam
        }
    }, []);

    // Fetch module specific data
    const fetchModuleData = useCallback(async (moduleId) => {
        setLoading(true);
        try {
            const [coordinatorRes, subCoordinatorRes, treasurerRes] = await Promise.all([
                api.get(`/coordinators/module/${moduleId}`).catch(() => ({ data: null })),
                api.get(`/coordinators/module/${moduleId}/subcoordinator`).catch(() => ({ data: null })),
                api.get(`/coordinators/module/${moduleId}/treasurer`).catch(() => ({ data: null }))
            ]);

            setModuleData({
                coordinator: coordinatorRes.data,
                subCoordinator: subCoordinatorRes.data,
                treasurer: treasurerRes.data
            });
        } catch (error) {
            console.error('Error fetching module data:', error);
            toast.error('Error al cargar datos del módulo');
        } finally {
            setLoading(false);
        }
    }, []);

    // Assign coordinator
    const assignCoordinator = async (moduleId, userId) => {
        try {
            const response = await api.post(`/coordinators/module/${moduleId}`, { userId });
            toast.success('Coordinador asignado exitosamente');
            await fetchModuleData(moduleId);
            await fetchCoordinators();
            return response.data;
        } catch (error) {
            console.error('Error assigning coordinator:', error);
            const message = error.response?.data?.message || 'Error al asignar coordinador';
            toast.error(message);
            throw error;
        }
    };

    // Remove coordinator
    const removeCoordinator = async (moduleId) => {
        try {
            await api.delete(`/coordinators/module/${moduleId}`);
            toast.success('Coordinador removido exitosamente');
            await fetchModuleData(moduleId);
            await fetchCoordinators();
        } catch (error) {
            console.error('Error removing coordinator:', error);
            toast.error('Error al remover coordinador');
            throw error;
        }
    };

    // Assign sub-coordinator
    const assignSubCoordinator = async (moduleId, userId) => {
        try {
            const response = await api.post(`/coordinators/module/${moduleId}/subcoordinator`, { userId });
            toast.success('Subcoordinador asignado exitosamente');
            await fetchModuleData(moduleId);
            await fetchSubCoordinators();
            return response.data;
        } catch (error) {
            console.error('Error assigning subcoordinator:', error);
            const message = error.response?.data?.message || 'Error al asignar subcoordinador';
            toast.error(message);
            throw error;
        }
    };

    // Remove sub-coordinator
    const removeSubCoordinator = async (moduleId) => {
        try {
            await api.delete(`/coordinators/module/${moduleId}/subcoordinator`);
            toast.success('Subcoordinador removido exitosamente');
            await fetchModuleData(moduleId);
            await fetchSubCoordinators();
        } catch (error) {
            console.error('Error removing subcoordinator:', error);
            toast.error('Error al remover subcoordinador');
            throw error;
        }
    };

    // Assign treasurer
    const assignTreasurer = async (moduleId, userId) => {
        try {
            const response = await api.post(`/coordinators/module/${moduleId}/treasurer`, { userId });
            toast.success('Tesorero asignado exitosamente');
            await fetchModuleData(moduleId);
            await fetchTreasurers();
            return response.data;
        } catch (error) {
            console.error('Error assigning treasurer:', error);
            const message = error.response?.data?.message || 'Error al asignar tesorero';
            toast.error(message);
            throw error;
        }
    };

    // Remove treasurer
    const removeTreasurer = async (moduleId) => {
        try {
            await api.delete(`/coordinators/module/${moduleId}/treasurer`);
            toast.success('Tesorero removido exitosamente');
            await fetchModuleData(moduleId);
            await fetchTreasurers();
        } catch (error) {
            console.error('Error removing treasurer:', error);
            toast.error('Error al remover tesorero');
            throw error;
        }
    };

    // Search users for assignment
    const searchUsers = async (searchTerm, role = 'LIDER_DOCE') => {
        try {
            if (!searchTerm || searchTerm.length < 3) return [];
            
            const response = await api.get('/users/search', {
                params: { search: searchTerm, role }
            });
            return response.data || [];
        } catch (error) {
            console.error('Error searching users:', error);
            return [];
        }
    };

    useEffect(() => {
        fetchCoordinators();
        fetchSubCoordinators();
        fetchTreasurers();
    }, [fetchCoordinators, fetchSubCoordinators, fetchTreasurers]);

    useEffect(() => {
        if (selectedModule) {
            fetchModuleData(selectedModule);
        }
    }, [selectedModule, fetchModuleData]);

    // Combine all roles for overview display
    const allCoordinators = [
        ...coordinators.map(c => ({ ...c, assignmentType: 'Coordinador' })),
        ...subCoordinators.map(sc => ({ ...sc, assignmentType: 'Subcoordinador' })),
        ...treasurers.map(t => ({ ...t, assignmentType: 'Tesorero' }))
    ];

    return {
        coordinators,
        subCoordinators,
        treasurers,
        allCoordinators,
        loading,
        selectedModule,
        setSelectedModule,
        moduleData,
        availableModules: AVAILABLE_MODULES,
        assignCoordinator,
        removeCoordinator,
        assignSubCoordinator,
        removeSubCoordinator,
        assignTreasurer,
        removeTreasurer,
        searchUsers,
        refreshCoordinators: fetchCoordinators,
        refreshModuleData: fetchModuleData
    };
};

export default useCoordinatorManagement;
