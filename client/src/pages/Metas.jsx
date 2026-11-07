import { Wrench, ClockCountdown } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Button } from '../components/ui';

/**
 * Módulo de Metas 1X1 — EN MANTENIMIENTO.
 *
 * La proyección y el seguimiento 1X1 se retiraron temporalmente para
 * rediseñar el modelo de cálculo. La ruta se conserva para no romper los
 * enlaces del menú: todos los roles ven este aviso y nadie puede editar.
 */
const Metas = () => {
    const navigate = useNavigate();

    return (
        <div>
            <PageHeader
                title="Metas 1X1"
                description="Proyección y seguimiento de la estrategia 1X1."
            />

            <div className="flex items-center justify-center py-16 px-4">
                <div className="w-full max-w-lg rounded-2xl border border-[var(--ln-border-standard)] bg-[var(--ln-bg-secondary)]/40 p-10 text-center">
                    <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
                        <Wrench size={26} weight="bold" className="text-amber-500" />
                    </div>

                    <h2 className="text-xl weight-590 tracking-[-0.4px] text-[var(--ln-text-primary)]">
                        Módulo en mantenimiento
                    </h2>

                    <p className="mt-3 text-[13px] leading-relaxed text-[var(--ln-text-secondary)]">
                        Estamos rediseñando el módulo de Metas 1X1. La proyección y el
                        seguimiento no están disponibles por el momento y no se puede
                        editar ningún dato desde esta pantalla.
                    </p>

                    <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-[var(--ln-border-standard)] bg-[var(--ln-bg-panel)]/60 px-4 py-2.5 text-[12px] text-[var(--ln-text-tertiary)]">
                        <ClockCountdown size={15} weight="bold" className="shrink-0" />
                        <span>Volverá a estar disponible próximamente.</span>
                    </div>

                    <p className="mt-6 text-[11px] text-[var(--ln-text-quaternary)] opacity-80">
                        Si necesitas esta información mientras tanto, contacta a un
                        administrador.
                    </p>

                    <div className="mt-7 flex justify-center">
                        <Button variant="ghost" size="md" onClick={() => navigate('/')}>
                            Volver al panel
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Metas;
