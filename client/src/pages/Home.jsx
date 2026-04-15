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
                    // console.log('Home.jsx - fetchLideresDoce - pastorNetworkResponse.data:', pastorNetworkResponse.data);
                    
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
                        
                        // console.log('Home.jsx - fetchLideresDoce - pastorNetwork final:', pastorNetwork);
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
            // console.log('Home.jsx - handleSelectLeader - leader:', leader);
            const response = await api.get(`/network/${leader.id}`);
            // console.log('Home.jsx - handleSelectLeader - response.data:', response.data);
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
                                <h2 className="text-xl font-semibold text-[#1d1d1f] dark:text-white">
                                    Pastores
                                </h2>
                            </div>
                            <LosDoceGrid losDoce={pastores} onSelectLeader={handleSelectLeader} />
                        </div>
                    )}

                    {networkLoading ? (
                        <div className="flex items-center justify-center h-[300px] bg-[#f5f5f7] dark:bg-[#272729] rounded-lg">
                            <div className="text-[#86868b] dark:text-[#98989d] flex items-center gap-2">
                                <ArrowsClockwise className="w-4 h-4 animate-spin" />
                                Cargando red de discipulado...
                            </div>
                        </div>
                    ) : (
                        <div className="min-h-[300px]">
                            {network ? (
                                <>
                                    <div className="mb-4">
                                        <h2 className="text-xl font-semibold text-[#1d1d1f] dark:text-white">
                                            {isSuperAdmin()
                                                ? `Ministerio de ${selectedLeader?.fullName}`
                                                : 'Mi Ministerio'
                                            }
                                        </h2>
                                    </div>
                                    {network && (hasAnyRole(['LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO'])) && (
                                        <div className="mb-5 p-4 bg-[#f5f5f7] dark:bg-[#272729] rounded-lg">
                                            <div className="flex items-center gap-2.5 mb-3">
                                                <div className="w-8 h-8 bg-[#34c759] rounded-full flex items-center justify-center text-white">
                                                    <Users size={16} weight="fill" />
                                                </div>
                                                <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-white">Mis Líderes</h3>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                {network.pastor && (
                                                    <div className="bg-white dark:bg-[#1d1d1f] rounded-lg p-3 border border-[#d1d1d6] dark:border-[#3a3a3c]">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className="w-6 h-6 bg-[#34c759]/20 rounded-full flex items-center justify-center">
                                                                <Crown size={12} className="text-[#34c759]" weight="fill" />
                                                            </div>
                                                            <span className="font-semibold text-[#34c759] text-sm">PASTOR</span>
                                                        </div>
                                                        <div className="text-[#1d1d1f] dark:text-white font-normal text-sm">
                                                            {network.pastor.fullName}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {network.liderDoce && (hasAnyRole(['LIDER_CELULA', 'DISCIPULO'])) && (
                                                    <div className="bg-white dark:bg-[#1d1d1f] rounded-lg p-3 border border-[#d1d1d6] dark:border-[#3a3a3c]">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className="w-6 h-6 bg-[#ff9500]/20 rounded-full flex items-center justify-center">
                                                                <StarIcon size={12} className="text-[#ff9500]" weight="fill" />
                                                            </div>
                                                            <span className="font-semibold text-[#ff9500] text-sm">LIDER 12</span>
                                                        </div>
                                                        <div className="text-[#1d1d1f] dark:text-white font-normal text-sm">
                                                            {network.liderDoce.fullName}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {network.liderCelula && hasRole('DISCIPULO') && (
                                                    <div className="bg-white dark:bg-[#1d1d1f] rounded-lg p-3 border border-[#d1d1d6] dark:border-[#3a3a3c]">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className="w-6 h-6 bg-[#0071e3]/20 rounded-full flex items-center justify-center">
                                                                <Users size={12} className="text-[#0071e3]" weight="fill" />
                                                            </div>
                                                            <span className="font-semibold text-[#0071e3] text-sm">LIDER CELULA</span>
                                                        </div>
                                                        <div className="text-[#1d1d1f] dark:text-white font-normal text-sm">
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
                                <div className="flex flex-col items-center justify-center h-[300px] bg-[#f5f5f7] dark:bg-[#272729] rounded-lg border border-[#d1d1d6] dark:border-[#3a3a3c]">
                                    <Users className="w-8 h-8 text-[#86868b] mb-3" />
                                    <p className="text-[#86868b] dark:text-[#98989d] text-sm">
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
        <div className="space-y-6 pb-20">
            <PageHeader
                title={`Bienvenido, ${user?.fullName}`}
                description={`Proverbios 27:23 Sé diligente en conocer el estado de tus ovejas, y mira con cuidado por tus rebaños`}
                action={``}
            />

            {canViewNetwork && (
                <div className="fixed bottom-6 right-6 z-40">
                    <Button
                        variant="primary"
                        size="sm"
                        icon={ArrowsClockwise}
                        onClick={refreshNetwork}
                    >
                        Actualizar
                    </Button>
                </div>
            )}

            <div className="border-b border-[#d1d1d6] dark:border-[#3a3a3c]">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {canViewNetwork && (
                        <button
                            onClick={() => setActiveTab('red')}
                            className={`
                                py-3 px-1 border-b-2 font-normal text-sm transition-colors duration-200
                                ${activeTab === 'red'
                                    ? 'border-[#0071e3] text-[#0071e3]'
                                    : 'border-transparent text-[#86868b] hover:text-[#1d1d1f] hover:border-[#d1d1d6] dark:hover:text-white'
                                }
                            `}
                        >
                            <span className="flex items-center gap-2">
                                <Users className="w-4 h-4" weight="regular" />
                                Red de Personas
                            </span>
                        </button>
                    )}
                    {canViewNetwork && (
                        <button
                            onClick={() => setActiveTab('actividad')}
                            className={`
                                py-3 px-1 border-b-2 font-normal text-sm transition-colors duration-200
                                ${activeTab === 'actividad'
                                    ? 'border-[#0071e3] text-[#0071e3]'
                                    : 'border-transparent text-[#86868b] hover:text-[#1d1d1f] hover:border-[#d1d1d6] dark:hover:text-white'
                                }
                            `}
                        >
                            <span className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" weight="regular" />
                                Actividad y Ministerio
                            </span>
                        </button>
                    )}
                    {canViewReport && (
                        <button
                            onClick={() => setActiveTab('informe')}
                            className={`
                                py-3 px-1 border-b-2 font-normal text-sm transition-colors duration-200
                                ${activeTab === 'informe'
                                    ? 'border-[#0071e3] text-[#0071e3]'
                                    : 'border-transparent text-[#86868b] hover:text-[#1d1d1f] hover:border-[#d1d1d6] dark:hover:text-white'
                                }
                            `}
                        >
                            <span className="flex items-center gap-2">
                                <ArrowsClockwise className="w-4 h-4" weight="regular" />
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