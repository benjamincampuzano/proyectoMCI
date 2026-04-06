import { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '../context/AuthContext';
import LosDoceGrid from '../components/LosDoceGrid';
import api from '../utils/api';
import NetworkTree from '../components/NetworkTree';
import UserActivityList from '../components/UserActivityList';
import { PageHeader, Button } from '../components/ui';
import { ArrowsClockwise, Users, Calendar, CaretDown, StarIcon, Crown } from '@phosphor-icons/react';

const ConsolidatedStatsReport = lazy(() => import('../components/ConsolidatedStatsReport'));

const Home = () => {
    const { user, hasRole, hasAnyRole, isSuperAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState('red');
    const [pastores, setPastores] = useState([]);
    const [lideresDoce, setLideresDoce] = useState([]);
    const [selectedLeader, setSelectedLeader] = useState(null);
    const [network, setNetwork] = useState(null);
    const [loading, setLoading] = useState(true);
    const [networkLoading, setNetworkLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showNetworkSelector, setShowNetworkSelector] = useState(false);

    useEffect(() => {
        if (isSuperAdmin()) {
            fetchPastores();
        } else if (hasAnyRole(['PASTOR'])) {
            fetchLideresDoce(); 
        } else if (hasAnyRole(['LIDER_DOCE'])) {
            handleSelectLeader({ id: user.id, fullName: user.fullName, roles: user.roles });
            setLoading(false); 
        } else if (hasAnyRole(['LIDER_CELULA', 'DISCIPULO'])) {
            let leaderId = user.id;
            if (hasRole('DISCIPULO')) {
                // Para DISCIPULO: PASTOR -> LIDER_DOCE -> LIDER_CELULA -> DISCIPULO
                leaderId = user.liderCelulaId || user.liderDoceId || user.pastorId || user.id;
            } else if (hasRole('LIDER_CELULA')) {
                // Para LIDER_CELULA: PASTOR -> LIDER_DOCE -> LIDER_CELULA
                leaderId = user.liderDoceId || user.pastorId || user.id;
            }
            handleSelectLeader({ id: leaderId, fullName: user.fullName, roles: user.roles });
            setLoading(false);
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchPastores = async () => {
        try {
            setLoading(true);
            const response = await api.get('/network/pastores');
            setPastores(response.data);
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchLideresDoce = async () => {
        try {
            setLoading(true);
            if (hasAnyRole(['PASTOR'])) {
                // Para PASTOR, obtener su propia red primero
                try {
                    const pastorNetworkResponse = await api.get(`/network/${user.id}`);
                    console.log('Home.jsx - fetchLideresDoce - pastorNetworkResponse.data:', pastorNetworkResponse.data);
                    
                    // Obtener los LIDER_DOCE del pastor
                    const response = await api.get('/network/los-doce');
                    const lideresDoceData = response.data;
                    setLideresDoce(lideresDoceData);
                    
                    if (pastorNetworkResponse.data && lideresDoceData.length > 0) {
                        // Usar la red del pastor como base y agregar los LIDER_DOCE como discípulos
                        const pastorNetwork = {
                            ...pastorNetworkResponse.data,
                            disciples: [
                                ...(pastorNetworkResponse.data.disciples || []),
                                ...lideresDoceData.map(lider => ({
                                    id: lider.id,
                                    fullName: lider.fullName,
                                    roles: lider.roles
                                }))
                            ]
                        };
                        
                        console.log('Home.jsx - fetchLideresDoce - pastorNetwork final:', pastorNetwork);
                        setNetwork(pastorNetwork);
                        setSelectedLeader({ id: user.id, fullName: user.fullName, roles: user.roles });
                    } else if (pastorNetworkResponse.data) {
                        // Si no tiene LIDER_DOCE, usar solo su red
                        setNetwork(pastorNetworkResponse.data);
                        setSelectedLeader({ id: user.id, fullName: user.fullName, roles: user.roles });
                    } else {
                        setLoading(false);
                    }
                } catch (err) {
                    console.error('Error obteniendo red del pastor:', err);
                    setError(err.response?.data?.message || err.message);
                    setLoading(false);
                }
            } else {
                // Para otros roles, cargar lista de LIDER_DOCE
                const response = await api.get('/network/los-doce');
                setLideresDoce(response.data);
                if (response.data.length > 0) {
                    handleSelectLeader({ id: response.data[0].id, fullName: response.data[0].fullName, roles: ['LIDER_DOCE'] });
                }
            }
            setLoading(false);
        } catch (err) {
            setError(err.response?.data?.message || err.message);
            setLoading(false);
        }
    };

    const handleSelectLeader = async (leader) => {
        try {
            setNetworkLoading(true);
            setSelectedLeader(leader);
            setError(null);
            console.log('Home.jsx - handleSelectLeader - leader:', leader);
            const response = await api.get(`/network/${leader.id}`);
            console.log('Home.jsx - handleSelectLeader - response.data:', response.data);
            setNetwork(response.data);
        } catch (err) {
            if (err.response?.status === 404) {
                setError('Líder no encontrado o red no disponible');
            } else {
                setError(err.response?.data?.error || err.message);
            }
        } finally {
            setNetworkLoading(false);
        }
    };

    const refreshNetwork = () => {
        if (selectedLeader) {
            handleSelectLeader(selectedLeader);
        } else if (isSuperAdmin()) {
            fetchPastores();
        } else if (hasAnyRole(['PASTOR'])) {
            fetchLideresDoce();
        }
    };

    const canViewNetwork = hasAnyRole(['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO']);
    const canViewReport = hasAnyRole(['ADMIN', 'PASTOR', 'LIDER_DOCE']);
    const isAdminOrPastor = isSuperAdmin() || hasAnyRole(['PASTOR']);

    // Render content based on active tab
    const renderTabContent = () => {
        if (activeTab === 'red') {
            // Red de Personas tab
            return (
                <>
                    {isSuperAdmin() && (
                        <div className="min-h-[200px]">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    Pastores
                                </h2>
                            </div>
                            <LosDoceGrid losDoce={pastores} onSelectLeader={handleSelectLeader} />
                        </div>
                    )}

                    {/* Para PASTOR, mostrar directamente su red completa sin selector */}

                    {networkLoading ? (
                        <div className="flex items-center justify-center h-[300px] bg-gray-50 dark:bg-gray-800 rounded-2xl">
                            <div className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <ArrowsClockwise className="w-5 h-5 animate-spin" />
                                Cargando red de discipulado...
                            </div>
                        </div>
                    ) : (
                        <div className="min-h-[300px]">
                            {network ? (
                                <>
                                    <div className="mb-4">
                                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                            {isSuperAdmin()
                                                ? `Red de ${selectedLeader?.fullName}`
                                                : 'Mi Red'
                                            }
                                        </h2>
                                    </div>
                                    {network && (hasAnyRole(['LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO'])) && (
                                        <div className="mb-6 p-6 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-900/20 dark:to-amber-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-lg">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-12 h-12 bg-emerald-600 dark:bg-emerald-700 rounded-full flex items-center justify-center text-white shadow-lg">
                                                    <Users size={24} weight="fill" />
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Mis Líderes</h3>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {/* Tarjeta PASTOR - se muestra para todos los roles */}
                                                {network.pastor && (
                                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-emerald-200 dark:border-emerald-700 shadow-sm hover:shadow-md transition-all duration-200">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                                                                <Crown size={16} className="text-emerald-600 dark:text-emerald-400" weight="fill" />
                                                            </div>
                                                            <span className="font-bold text-emerald-700 dark:text-emerald-400 text-lg">PASTOR</span>
                                                        </div>
                                                        <div className="text-gray-900 dark:text-white font-medium">
                                                            {network.pastor.fullName}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* Tarjeta LIDER_DOCE - se muestra para LIDER_CELULA y DISCIPULO */}
                                                {network.liderDoce && (hasAnyRole(['LIDER_CELULA', 'DISCIPULO'])) && (
                                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-amber-200 dark:border-amber-700 shadow-sm hover:shadow-md transition-all duration-200">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
                                                                <StarIcon size={16} className="text-amber-600 dark:text-amber-400" weight="fill" />
                                                            </div>
                                                            <span className="font-bold text-amber-700 dark:text-amber-400 text-lg">LIDER 12</span>
                                                        </div>
                                                        <div className="text-gray-900 dark:text-white font-medium">
                                                            {network.liderDoce.fullName}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* Tarjeta LIDER_CELULA - se muestra solo para DISCIPULO */}
                                                {network.liderCelula && hasRole('DISCIPULO') && (
                                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700 shadow-sm hover:shadow-md transition-all duration-200">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                                                <Users size={16} className="text-blue-600 dark:text-blue-400" weight="fill" />
                                                            </div>
                                                            <span className="font-bold text-blue-700 dark:text-blue-400 text-lg">LIDER CELULA</span>
                                                        </div>
                                                        <div className="text-gray-900 dark:text-white font-medium">
                                                            {network.liderCelula.fullName}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <NetworkTree
                                        network={network}
                                        currentUser={user}
                                        onNetworkChange={() => handleSelectLeader(selectedLeader || user)}
                                    />
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[300px] bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                                    <Users className="w-12 h-12 text-gray-400 mb-4" />
                                    <p className="text-gray-500 dark:text-gray-400">
                                        {isSuperAdmin()
                                            ? 'Selecciona un pastor para ver su red'
                                            : 'No hay red disponible'
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            );
        }

        if (activeTab === 'actividad') {
            // Actividad y Ministerio tab
            return (
                <div>
                    <UserActivityList />
                </div>
            );
        }

        if (activeTab === 'informe') {
            // Informe General tab
            return (
                <div className="min-h-[600px]">
                    <Suspense fallback={<div className="h-[600px] flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400">Cargando Estadísticas...</div>}>
                        <ConsolidatedStatsReport simpleMode={false} />
                    </Suspense>
                </div>
            );
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500 dark:text-gray-400">Cargando...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex flex-col items-center">
                <p className="mb-3">{error}</p>
                <Button variant="outline" onClick={() => { 
                    setError(null); 
                    if (isSuperAdmin()) fetchPastores();
                    else if (hasAnyRole(['PASTOR'])) fetchLideresDoce();
                }}>
                    Reintentar
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            <PageHeader
                title="Dashboard Principal"
                description={`Bienvenido, ${user?.fullName}`}
            />

            {/* Quick Actions FAB */}
            {canViewNetwork && (
                <div className="fixed bottom-8 right-8 z-40 flex flex-col gap-3">
                    <Button
                        variant="primary"
                        size="sm"
                        icon={ArrowsClockwise}
                        onClick={refreshNetwork}
                        className="shadow-xl"
                    >
                        Actualizar
                    </Button>
                </div>
            )}

            {/* Tabs Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {canViewNetwork && (
                        <button
                            onClick={() => setActiveTab('red')}
                            className={`
                                py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                                ${activeTab === 'red'
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                }
                            `}
                        >
                            <span className="flex items-center gap-2">
                                <Users className="w-5 h-5" weight="duotone" />
                                Red de Personas
                            </span>
                        </button>
                    )}
                    {canViewNetwork && (
                        <button
                            onClick={() => setActiveTab('actividad')}
                            className={`
                                py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                                ${activeTab === 'actividad'
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                }
                            `}
                        >
                            <span className="flex items-center gap-2">
                                <Calendar className="w-5 h-5" weight="duotone" />
                                Actividad y Ministerio
                            </span>
                        </button>
                    )}
                    {canViewReport && (
                        <button
                            onClick={() => setActiveTab('informe')}
                            className={`
                                py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                                ${activeTab === 'informe'
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                }
                            `}
                        >
                            <span className="flex items-center gap-2">
                                <ArrowsClockwise className="w-5 h-5" weight="duotone" />
                                Informe General
                            </span>
                        </button>
                    )}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in duration-300">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default Home;