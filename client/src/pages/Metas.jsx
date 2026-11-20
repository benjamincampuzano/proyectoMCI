import { PageHeader } from '../components/ui';
import Asistencia from '../components/metas/Asistencia';
import Ganados from '../components/metas/Ganados';
import { Tabs } from '../components/ui';
import { useState } from 'react';

const Metas = () => {
    const [tab, setTab] = useState(0);
    const [visitadas, setVisitadas] = useState(() => new Set([0]));

    const cambiarTab = (index) => {
        setTab(index);
        setVisitadas((actuales) => new Set(actuales).add(index));
    };

    return (
        <div>
            <PageHeader
                title="Metas"
                description="Seguimiento de asistencia y personas ganadas por los Equipos de 12."
            />
            <Tabs variant="default" items={[{ title: 'Asistencia' }, { title: 'Reporte de Ganados' }]} onTabChange={cambiarTab} />
            <div className={tab === 0 ? '' : 'hidden'}><Asistencia /></div>
            {visitadas.has(1) && <div className={tab === 1 ? '' : 'hidden'}><Ganados /></div>}
        </div>
    );
};

export default Metas;
