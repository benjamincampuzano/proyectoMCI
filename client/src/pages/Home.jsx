import { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '../context/AuthContext';
import LosDoceGrid from '../components/LosDoceGrid';
import api from '../utils/api';
import NetworkTree from '../components/NetworkTree';
import UserActivityList from '../components/UserActivityList';
import { PageHeader, Button } from '../components/ui';
import { RefreshCw, Users, Calendar, UserPlus, Phone, ChevronDown } from 'lucide-react';

const ConsolidatedStatsReport = lazy(() => import('../components/ConsolidatedStatsReport'));

const Home = () => {
    const { user, hasRole, hasAnyRole, isSuperAdmin } = useAuth();
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
            fetchLideresDoce(user.id);
        } else if (hasAnyRole(['LIDER_DOCE'])) {
            handleSelectLeader({ id: user.id, fullName: user.fullName, roles: user.roles });
        } else if (hasAnyRole(['LIDER_CELULA', 'DISCIPULO'])) {
            let leaderId = user.id;
            if (hasRole('DISCIPULO')) {
                leaderId = user.liderCelulaId || user.liderDoceId || user.pastorId || user.id;
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

    const fetchLideresDoce = async (pastorId) => {
        try {
            setLoading(true);
            const response = await api.get('/network/los-doce');
            setLideresDoce(response.data);
            if (response.data.length > 0) {
                handleSelectLeader({ id: response.data[0].id, fullName: response.data[0].fullName, roles: ['LIDER_DOCE'] });
            } else {
                setLoading(false);
            }
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
            const response = await api.get(`/network/network/${leader.id}`);
            setNetwork(response.data);
        } catch (err) {
            setError(err.response?.data?.message || err.message);
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

    const canViewNetwork = hasAnyRole(['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO']);
    const canViewReport = hasAnyRole(['ADMIN', 'PASTOR', 'LIDER_DOCE']);
    const isAdminOrPastor = isSuperAdmin() || hasAnyRole(['PASTOR']);

    const renderQuickStats = () => {
        if (!network) return null;
        
        const stats = {
            total: network.totalMembers || 0,
            cells: network.cells?.length || 0,
            leaders: network.children?.length || 0
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Miembros</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Células</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.cells}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Líderes</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.leaders}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
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
                <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2">
                    <Button
                        variant="primary"
                        size="sm"
                        icon={RefreshCw}
                        onClick={refreshNetwork}
                        className="shadow-lg"
                    >
                        Actualizar
                    </Button>
                </div>
            )}

            <div className="space-y-12">
                {/* Network & Structure */}
                <div className="space-y-8">
                    {canViewNetwork ? (
                        <>
                            {isSuperAdmin() && (
                                <div className="min-h-[200px]">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                            Pastores
                                        </h2>
                                        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchPastores}>
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
                                        <ChevronDown className="w-4 h-4" />
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
                                <div className="flex items-center justify-center h-[300px] bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                        <RefreshCw className="w-5 h-5 animate-spin" />
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

                            {/* Activity List Section */}
                            <div className="pt-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                        Actividad Reciente
                                    </h2>
                                </div>
                                <UserActivityList />
                            </div>
                        </>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Panel de Discípulo</h3>
                            <p className="text-gray-600 dark:text-gray-400">Bienvenido al sistema de gestión.</p>
                        </div>
                    )}
                </div>

                {/* Bottom Section: Consolidated Report & Stats */}
                {canViewReport && (
                    <div className="min-h-[600px]">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            Estadísticas Consolidadas
                        </h2>
                        <Suspense fallback={<div className="h-[600px] flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400">Cargando Estadísticas...</div>}>
                            <ConsolidatedStatsReport simpleMode={false} />
                        </Suspense>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
