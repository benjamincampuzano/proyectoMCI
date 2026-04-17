import { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '../context/AuthContext';
import LosDoceGrid from '../components/LosDoceGrid';
import api from '../utils/api';
import NetworkTree from '../components/NetworkTree';
import UserActivityList from '../components/UserActivityList';
import { PageHeader, Button } from '../components/ui';
import { 
    ArrowsClockwise, 
    Users, 
    Calendar, 
    CaretDown, 
    StarIcon, 
    Crown,
    UsersThree,
    Spinner
} from '@phosphor-icons/react';

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
                leaderId = user.liderCelulaId || user.liderDoceId || user.pastorId || user.id;
            } else if (hasRole('LIDER_CELULA')) {
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
                try {
                    const pastorNetworkResponse = await api.get(`/network/${user.id}`);
                    const response = await api.get('/network/los-doce');
                    const lideresDoceData = response.data;
                    setLideresDoce(lideresDoceData);
                    
                    if (pastorNetworkResponse.data && lideresDoceData.length > 0) {
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
                        setNetwork(pastorNetwork);
                        setSelectedLeader({ id: user.id, fullName: user.fullName, roles: user.roles });
                    } else if (pastorNetworkResponse.data) {
                        setNetwork(pastorNetworkResponse.data);
                        setSelectedLeader({ id: user.id, fullName: user.fullName, roles: user.roles });
                    } else {
                        setLoading(false);
                    }
                } catch (err) {
                    setError(err.response?.data?.message || err.message);
                    setLoading(false);
                }
            } else {
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
            const response = await api.get(`/network/${leader.id}`);
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

    const renderTabContent = () => {
        if (activeTab === 'red') {
            return (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {isSuperAdmin() && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl weight-590 text-[var(--ln-text-primary)] tracking-tight">
                                    Ministerio
                                </h2>
                            </div>
                            <LosDoceGrid losDoce={pastores} onSelectLeader={handleSelectLeader} />
                        </div>
                    )}

                    {networkLoading ? (
                        <div className="flex flex-col items-center justify-center h-[400px] bg-[var(--ln-bg-panel)] rounded-[24px] border border-[var(--ln-border-standard)] animate-pulse">
                            <ArrowsClockwise className="w-8 h-8 text-[var(--ln-brand-indigo)] animate-spin mb-4" />
                            <div className="text-[var(--ln-text-tertiary)] text-sm weight-510 tracking-wide">
                                Analizando red de discipulado...
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {network ? (<>
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-xl weight-590 text-[var(--ln-text-primary)] tracking-tight">
                                            {isSuperAdmin()
                                                ? `Ministerio de ${selectedLeader?.fullName}`
                                                : 'Mi Red de Discipulado'
                                            }
                                        </h2>
                                    </div>
                                    
                                    {network && (hasAnyRole(['LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO'])) && (
                                        <div className="p-8 bg-[var(--ln-bg-panel)]/50 backdrop-blur-xl rounded-[24px] border border-[var(--ln-border-standard)] shadow-sm">
                                            <div className="flex items-center gap-3 mb-8">
                                                <div className="w-10 h-10 bg-[var(--ln-brand-indigo)]/10 rounded-xl flex items-center justify-center text-[var(--ln-brand-indigo)] border border-[var(--ln-brand-indigo)]/20">
                                                    <Users size={20} weight="bold" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg weight-590 text-[var(--ln-text-primary)] tracking-tight">Línea de Autoridad</h3>
                                                    <p className="text-[12px] text-[var(--ln-text-tertiary)] opacity-70">Cobertura directa sobre tu liderazgo.</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-row gap-4 overflow-x-auto">
                                                {network.pastores && network.pastores.length > 0 && network.pastores.map((pastor, idx) => (
                                                    <div key={`pastor-${idx}`} className="flex-1 bg-white/5 dark:bg-black/20 rounded-[14px] p-3 border border-[var(--ln-border-standard)] hover:border-[var(--ln-text-primary)]/20 transition-all group">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-6 h-6 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
                                                                <Crown size={14} className="text-emerald-500" weight="bold" />
                                                            </div>
                                                            <span className="text-[9px] weight-590 text-emerald-500 uppercase tracking-widest">Pastor</span>
                                                        </div>
                                                        <div className="text-[var(--ln-text-primary)] weight-510 text-sm">
                                                            {pastor.fullName}
                                                        </div>
                                                    </div>
                                                ))}

                                                {network.lideresDoce && network.lideresDoce.length > 0 && network.lideresDoce.map((lider, idx) => (
                                                    <div key={`lider-doce-${idx}`} className="flex-1 bg-white/5 dark:bg-black/20 rounded-[14px] p-3 border border-[var(--ln-border-standard)] hover:border-[var(--ln-text-primary)]/20 transition-all group">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-6 h-6 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20">
                                                                <StarIcon size={14} className="text-purple-500" weight="bold" />
                                                            </div>
                                                            <span className="text-[9px] weight-590 text-purple-500 uppercase tracking-widest">Líder Doce</span>
                                                        </div>
                                                        <div className="text-[var(--ln-text-primary)] weight-510 text-sm">
                                                            {lider.fullName}
                                                        </div>
                                                    </div>
                                                ))}

                                                {network.lideresCelula && network.lideresCelula.length > 0 && hasRole('DISCIPULO') && network.lideresCelula.map((lider, idx) => (
                                                    <div key={`lider-celula-${idx}`} className="flex-1 bg-white/5 dark:bg-black/20 rounded-[14px] p-3 border border-[var(--ln-border-standard)] hover:border-[var(--ln-text-primary)]/20 transition-all group">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-6 h-6 bg-[var(--ln-brand-indigo)]/10 rounded-lg flex items-center justify-center border border-[var(--ln-brand-indigo)]/20">
                                                                <Users size={14} className="text-[var(--ln-brand-indigo)]" weight="bold" />
                                                            </div>
                                                            <span className="text-[9px] weight-590 text-[var(--ln-brand-indigo)] uppercase tracking-widest">Líder Célula</span>
                                                        </div>
                                                        <div className="text-[var(--ln-text-primary)] weight-510 text-sm">
                                                            {lider.fullName}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="p-1 rounded-[32px] bg-white/[0.02] border border-[var(--ln-border-standard)] overflow-hidden shadow-2xl">
                                        <NetworkTree
                                            network={network}
                                            currentUser={user}
                                            onNetworkChange={() => handleSelectLeader(selectedLeader || user)}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[400px] bg-[var(--ln-bg-panel)] rounded-[32px] border border-[var(--ln-border-standard)] text-center px-6">
                                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-[var(--ln-border-standard)]">
                                        <Users className="w-8 h-8 text-[var(--ln-text-tertiary)] opacity-30" />
                                    </div>
                                    <h3 className="text-lg weight-590 text-[var(--ln-text-primary)] tracking-tight">Red No Cargada</h3>
                                    <p className="text-[var(--ln-text-tertiary)] text-sm max-w-[300px] mt-2 opacity-70">
                                        {isSuperAdmin()
                                            ? 'Selecciona un pastor de la lista superior para visualizar la estructura de su ministerio.'
                                            : 'No se encontraron datos para tu red de discipulado en este momento.'
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        if (activeTab === 'actividad') {
            return (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <UserActivityList />
                </div>
            );
        }

        if (activeTab === 'informe') {
            return (
                <div className="min-h-[600px] animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Suspense fallback={
                        <div className="h-[400px] flex flex-col items-center justify-center bg-[var(--ln-bg-panel)] rounded-[32px] border border-[var(--ln-border-standard)]">
                            <Spinner size={32} className="text-[var(--ln-brand-indigo)] animate-spin mb-4" />
                            <p className="text-sm text-[var(--ln-text-tertiary)] weight-510">Preparando analíticas...</p>
                        </div>
                    }>
                        <ConsolidatedStatsReport simpleMode={false} />
                    </Suspense>
                </div>
            );
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen -mt-20">
                <Spinner size={40} className="text-[var(--ln-brand-indigo)] animate-spin" />
                <p className="mt-6 text-[var(--ln-text-tertiary)] weight-510 animate-pulse tracking-wide">Iniciando Dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[400px]">
                <div className="max-w-md w-full bg-red-500/5 border border-red-500/20 p-8 rounded-[24px] text-center">
                    <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500 mx-auto mb-4 border border-red-500/20">
                        <X size={24} weight="bold" />
                    </div>
                    <h3 className="text-lg weight-590 text-[var(--ln-text-primary)] mb-2">Error de Sincronización</h3>
                    <p className="text-sm text-red-500/70 mb-6">{error}</p>
                    <button 
                        onClick={() => { 
                            setError(null); 
                            if (isSuperAdmin()) fetchPastores();
                            else if (hasAnyRole(['PASTOR'])) fetchLideresDoce();
                        }}
                        className="px-6 py-2 bg-[var(--ln-text-primary)] text-[var(--ln-bg-marketing)] rounded-xl weight-590 text-[13px] hover:opacity-90 transition-opacity"
                    >
                        Intentar Reconectar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-32">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-in slide-in-from-top-4 duration-700">
                <PageHeader
                    title={`Hola, ${user?.fullName.split(' ')[0]}`}
                    description={`Diligente en conocer el estado de tus ovejas, y mira con cuidado por tus rebaños.`}
                    action={``}
                />
                
                {canViewNetwork && (
                    <button
                        onClick={refreshNetwork}
                        className="flex items-center gap-2.5 px-5 py-2.5 bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 text-[var(--ln-text-primary)] rounded-xl weight-590 text-[13px] transition-all backdrop-blur-md active:scale-95 group shadow-xl"
                    >
                        <ArrowsClockwise className="w-4 h-4 text-[var(--ln-brand-indigo)] group-hover:rotate-180 transition-transform duration-500" weight="bold" />
                        <span>Sincronizar Datos</span>
                    </button>
                )}
            </div>

            <div className="sticky top-[84px] z-30 -mx-4 px-4 py-2 backdrop-blur-xl bg-[var(--ln-bg-marketing)]/80 border-b border-[var(--ln-border-standard)] animate-in fade-in duration-500">
                <nav className="flex space-x-1" aria-label="Tabs">
                    {canViewNetwork && (
                        <button
                            onClick={() => setActiveTab('red')}
                            className={`
                                py-2 px-5 rounded-lg weight-510 text-[13px] transition-all duration-300 flex items-center gap-2.5
                                ${activeTab === 'red'
                                    ? 'bg-[var(--ln-brand-indigo)]/10 text-[var(--ln-brand-indigo)]'
                                    : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-white/5'
                                }
                            `}
                        >
                            <UsersThree className={`w-4 h-4 ${activeTab === 'red' ? 'text-[var(--ln-brand-indigo)]' : 'opacity-50'}`} weight={activeTab === 'red' ? 'bold' : 'regular'} />
                            Red de Discipulado
                        </button>
                    )}
                    {canViewNetwork && (
                        <button
                            onClick={() => setActiveTab('actividad')}
                            className={`
                                py-2 px-5 rounded-lg weight-510 text-[13px] transition-all duration-300 flex items-center gap-2.5
                                ${activeTab === 'actividad'
                                    ? 'bg-[var(--ln-brand-indigo)]/10 text-[var(--ln-brand-indigo)]'
                                    : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-white/5'
                                }
                            `}
                        >
                            <Calendar className={`w-4 h-4 ${activeTab === 'actividad' ? 'text-[var(--ln-brand-indigo)]' : 'opacity-50'}`} weight={activeTab === 'actividad' ? 'bold' : 'regular'} />
                            Actividad
                        </button>
                    )}
                    {canViewReport && (
                        <button
                            onClick={() => setActiveTab('informe')}
                            className={`
                                py-2 px-5 rounded-lg weight-510 text-[13px] transition-all duration-300 flex items-center gap-2.5
                                ${activeTab === 'informe'
                                    ? 'bg-[var(--ln-brand-indigo)]/10 text-[var(--ln-brand-indigo)]'
                                    : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-white/5'
                                }
                            `}
                        >
                            <ArrowsClockwise className={`w-4 h-4 ${activeTab === 'informe' ? 'text-[var(--ln-brand-indigo)]' : 'opacity-50'}`} weight={activeTab === 'informe' ? 'bold' : 'regular'} />
                            Analíticas
                        </button>
                    )}
                </nav>
            </div>

            <div className="relative">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default Home;