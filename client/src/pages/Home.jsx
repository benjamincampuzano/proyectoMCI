import { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '../context/AuthContext';
import LosDoceGrid from '../components/LosDoceGrid';
import api from '../utils/api';
import NetworkTree from '../components/NetworkTree';
import UserActivityList from '../components/UserActivityList';
import { PageHeader, Button } from '../components/ui';
import { ArrowsClockwise, Users, Calendar, CaretDown } from '@phosphor-icons/react';

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
        console.log('Home useEffect triggered, user:', user);
        console.log('User roles:', user?.roles);
        console.log('isSuperAdmin():', isSuperAdmin());
        console.log('hasAnyRole([PASTOR]):', hasAnyRole(['PASTOR']));
        
        if (isSuperAdmin()) {
            console.log('Fetching pastores (SuperAdmin)');
            fetchPastores();
        } else if (hasAnyRole(['PASTOR'])) {
            console.log('Auto-selecting pastor (PASTOR)');
            handleSelectLeader({ id: user.id, fullName: user.fullName, roles: user.roles });
            setLoading(false); // Add this line to fix loading state
        } else if (hasAnyRole(['LIDER_DOCE'])) {
            console.log('Auto-selecting leader (LIDER_DOCE)');
            handleSelectLeader({ id: user.id, fullName: user.fullName, roles: user.roles });
            setLoading(false); // Add this line to fix loading state
        } else if (hasAnyRole(['LIDER_CELULA', 'DISCIPULO'])) {
            console.log('Auto-selecting leader (LIDER_CELULA/DISCIPULO)');
            let leaderId = user.id;
            if (hasRole('DISCIPULO')) {
                leaderId = user.liderCelulaId || user.liderDoceId || user.pastorId || user.id;
            }
            handleSelectLeader({ id: leaderId, fullName: user.fullName, roles: user.roles });
            setLoading(false);
        } else {
            console.log('No matching role, setting loading to false');
            setLoading(false);
        }
    }, [user]);

    const fetchPastores = async () => {
        try {
            setLoading(true);
            console.log('Fetching pastores...');
            const response = await api.get('/network/pastores');
            console.log('Pastores response:', response.data);
            setPastores(response.data);
        } catch (err) {
            console.error('Error fetching pastores:', err);
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchLideresDoce = async () => {
        try {
            setLoading(true);
            console.log('Fetching lideres doce...');
            const response = await api.get('/network/los-doce');
            console.log('Lideres doce response:', response.data);
            setLideresDoce(response.data);
            if (response.data.length > 0) {
                console.log('Auto-selecting first leader:', response.data[0]);
                handleSelectLeader({ id: response.data[0].id, fullName: response.data[0].fullName, roles: ['LIDER_DOCE'] });
            } else {
                console.log('No lideres doce found');
                setLoading(false);
            }
        } catch (err) {
            console.error('Error fetching lideres doce:', err);
            setError(err.response?.data?.message || err.message);
            setLoading(false);
        }
    };

    const handleSelectLeader = async (leader) => {
        try {
            setNetworkLoading(true);
            setSelectedLeader(leader);
            setError(null);
            console.log('Fetching network for leader:', leader);
            const response = await api.get(`/network/${leader.id}`);
            console.log('Network API response:', response.data);
            setNetwork(response.data);
        } catch (err) {
            console.error('Error fetching network:', err);
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
        }
    };

    const renderQuickStats = () => {
        // Enhanced debugging to see complete data structure
        console.log('Complete network data:', JSON.stringify(network, null, 2));
        console.log('Network type:', typeof network);
        console.log('Network keys:', network ? Object.keys(network) : 'null');
        
        // Try different possible field names for the data
        const stats = {
            total: network?.totalMembers || network?.memberCount || network?.members?.length || network?.total || 0,
            cells: network?.cells?.length || network?.cellCount || network?.celulas?.length || network?.cells_count || 0,
            leaders: network?.children?.length || network?.leaders?.length || network?.lideres?.length || network?.leaders_count || 0
        };

        console.log('Calculated stats:', stats);
        console.log('Total members sources:', {
            totalMembers: network?.totalMembers,
            memberCount: network?.memberCount,
            membersLength: network?.members?.length,
            total: network?.total
        });
        console.log('Cells sources:', {
            cellsLength: network?.cells?.length,
            cellCount: network?.cellCount,
            celulasLength: network?.celulas?.length,
            cells_count: network?.cells_count
        });
        console.log('Leaders sources:', {
            childrenLength: network?.children?.length,
            leadersLength: network?.leaders?.length,
            lideresLength: network?.lideres?.length,
            leaders_count: network?.leaders_count
        });
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
                                <Button variant="ghost" size="sm" icon={ArrowsClockwise} onClick={fetchPastores}>
                                    Actualizar
                                </Button>
                            </div>
                            <LosDoceGrid losDoce={pastores} onSelectLeader={handleSelectLeader} />
                        </div>
                    )}

                    {/* Network Selector for Pastor */}
                    {hasAnyRole(['PASTOR']) && lideresDoce.length > 0 && (
                        <div className="relative">
                            <button
                                onClick={() => setShowNetworkSelector(!showNetworkSelector)}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <span className="text-gray-700 dark:text-gray-300">
                                    Red de: {selectedLeader?.fullName || 'Seleccionar'}
                                </span>
                                <CaretDown className="w-4 h-4" />
                            </button>
                            {showNetworkSelector && (
                                <div className="absolute top-full mt-1 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[200px]">
                                    {lideresDoce.map((ld) => (
                                        <button
                                            key={ld.id}
                                            onClick={() => {
                                                handleSelectLeader({ id: ld.id, fullName: ld.fullName, roles: ['LIDER_DOCE'] });
                                                setShowNetworkSelector(false);
                                            }}
                                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            {ld.fullName}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

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
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                            {isSuperAdmin()
                                                ? `Red de ${selectedLeader?.fullName}`
                                                : 'Mi Red'
                                            }
                                        </h2>
                                        {renderQuickStats()}
                                    </div>
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
