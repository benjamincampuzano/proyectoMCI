import { useState } from 'react';
import { Users } from '@phosphor-icons/react';
import TabNavigator from '../components/TabNavigator';
import GuestRegistrationForm from '../components/GuestRegistrationForm';
import GuestList from '../components/GuestList';
import GuestStats from '../components/GuestStats';
import OracionDeTresManagement from '../components/OracionDeTresManagement';
import { PageHeader, Button } from '../components/ui';
import { ROLES, ROLE_GROUPS } from '../constants/roles';

const Ganar = () => {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showRegistration, setShowRegistration] = useState(false);

    const handleGuestCreated = () => {
        // Trigger refresh of guest list and hide form
        setRefreshTrigger(prev => prev + 1);
        setShowRegistration(false);
    };

    const GuestListTab = () => (
        <>
            {showRegistration && (
                <GuestRegistrationForm onGuestCreated={handleGuestCreated} />
            )}
            <GuestList refreshTrigger={refreshTrigger} />
        </>
    );

    const tabs = [
        { id: 'list', label: 'Lista de Invitados', component: GuestListTab },
        {
            id: 'stats',
            label: 'Estadísticas',
            component: GuestStats,
            roles: ROLE_GROUPS.ALL_LEADERS
        },
        {
            id: 'oracion',
            label: 'Oración de Tres',
            component: OracionDeTresManagement,
            roles: [ROLES.ADMIN, ROLES.LIDER_DOCE, ROLES.LIDER_CELULA, ROLES.DISCIPULO]
        }
    ];

    const [activeTab, setActiveTab] = useState('list');

    return (
        <div className="space-y-6">
            <PageHeader
                title="Ganar"
                description="Registro y seguimiento de invitados"
                action={activeTab === 'list' && (
                    <Button
                        variant={showRegistration ? 'error' : 'primary'}
                        onClick={() => setShowRegistration(!showRegistration)}
                    >
                        {showRegistration ? 'Cancelar Registro' : 'Registrar Nuevo Invitado'}
                    </Button>
                )}
            />

            <TabNavigator
                tabs={tabs}
                initialTabId="list"
                onTabChange={(tabId) => {
                    setActiveTab(tabId);
                    if (tabId !== 'list') {
                        setShowRegistration(false);
                    }
                }}
            />
        </div>
    );
};

export default Ganar;
