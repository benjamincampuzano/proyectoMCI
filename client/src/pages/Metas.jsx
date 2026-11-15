import { Fragment, useEffect, useState } from 'react';
import { UsersThree, Trash, Plus, X } from '@phosphor-icons/react';
import { PageHeader, Button, Modal } from '../components/ui';
import { useAuth } from '../context/AuthContext';
// import api from '../utils/api'; // Solo se necesita al activar la carga automática (ver bloque comentado).

/* ================================================================
 * DATOS DEL CUADRO "ASISTENCIA"
 * ---------------------------------------------------------------
 * Hoy todo es manual: las filas (parejas de LIDER_DOCE) salen de
 * EQUIPOS_MANUALES, los números se digitan en pantalla y las
 * columnas se agregan a mano desde el botón "Agregar columna"
 * eligiendo la fecha. Todo queda guardado en el navegador
 * (localStorage).
 *
 * Más abajo está comentado el código para cuando sea automático.
 * ================================================================ */

/** Primer sábado del periodo (aaaa-mm-dd): de aquí salen las columnas iniciales. */
const FECHA_INICIO = '2026-07-04';

/** Cantidad de semanas iniciales (cada una: sábado + domingo + virtual). */
const CANTIDAD_SEMANAS = 11;

/** Clave de persistencia de los valores en localStorage. */
const STORAGE_KEY = 'metas-asistencia-v1';

/** Clave de persistencia de las columnas (fechas) en localStorage. */
const COLUMNAS_KEY = 'metas-asistencia-columnas-v1';

/** Clave de persistencia del autor de cada dato (usuario + momento). */
const AUTORES_KEY = 'metas-asistencia-autores-v1';

/**
 * Equipos de 12: parejas de LIDER_DOCE.
 * Mientras la carga no sea automática, edita esta lista a mano.
 */
const EQUIPOS_MANUALES = [
    { id: 'andres-y-andrea', nombre: 'ANDRES Y ANDREA' },
    { id: 'andres-y-tatiana', nombre: 'ANDRES Y TATIANA' },
    { id: 'ana-sotelo', nombre: 'ANA SOTELO' },
    { id: 'cristian-y-vanessa', nombre: 'CRISTIAN Y VANESSA' },
    { id: 'cesar-y-monica', nombre: 'CESAR Y MONICA' },
    { id: 'daniel-ayala', nombre: 'DANIEL AYALA' },
    { id: 'diego-y-diana', nombre: 'DIEGO Y DIANA' },
    { id: 'duvan-y-dory', nombre: 'DUVAN Y DORY' },
    { id: 'felipe-y-johana', nombre: 'FELIPE Y JOHANA' },
    { id: 'freedy-y-lina', nombre: 'FREEDY Y LINA' },
    { id: 'johana-giraldo', nombre: 'JOHANA GIRALDO' },
    { id: 'mauricio-y-milena', nombre: 'MAURICIO Y MILENA' },
    { id: 'yonathan-y-betzy', nombre: 'YONATHAN Y BETZY' }
];

/** Convierte una fecha a 'aaaa-mm-dd' (local, sin desfase de zona horaria). */
const toIso = (date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${date.getFullYear()}-${mm}-${dd}`;
};

/** De 'aaaa-mm-dd' a Date (sin desfase de zona horaria). */
const desdeIso = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
};

/** Formato de encabezado: '04-07-26'. */
const toHeader = (date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(2);
    return `${dd}-${mm}-${yy}`;
};

/** Fecha y hora de la última edición: '04-07-2026 10:32'. */
const formatearFecha = (ts) => {
    const d = new Date(ts);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${d.getFullYear()} ${hh}:${mi}`;
};

/**
 * Devuelve el sábado de la semana que contiene la fecha dada
 * (semana de sábado a viernes), en ISO.
 */
const sabadoDeLaSemana = (fechaISO) => {
    const fecha = desdeIso(fechaISO);
    fecha.setDate(fecha.getDate() - ((fecha.getDay() + 1) % 7));
    return toIso(fecha);
};

/** Genera las columnas iniciales: cada sábado de la semana. */
const buildColumnas = (inicio, cantidad) => {
    const start = desdeIso(inicio);

    return Array.from({ length: cantidad }, (_, i) => {
        const sabado = new Date(start);
        sabado.setDate(start.getDate() + i * 7);
        return toIso(sabado);
    });
};

/** Columnas iniciales (fechas de sábado en ISO). */
const COLUMNAS_INICIALES = buildColumnas(FECHA_INICIO, CANTIDAD_SEMANAS);

/** Lee las columnas guardadas; si no hay, usa las iniciales. */
const leerColumnas = () => {
    try {
        const guardadas = JSON.parse(localStorage.getItem(COLUMNAS_KEY));
        if (Array.isArray(guardadas)) {
            const validas = guardadas.filter((iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso));
            if (validas.length > 0) return [...new Set(validas)].sort();
        }
    } catch {
        // Clave corrupta: se usan las columnas iniciales.
    }
    return COLUMNAS_INICIALES;
};

/** Lee el autor de cada dato: { "<clave>": { nombre, ts } }. */
const leerAutores = () => {
    try {
        const guardados = JSON.parse(localStorage.getItem(AUTORES_KEY));
        if (guardados && typeof guardados === 'object') return guardados;
    } catch {
        // Clave corrupta: se empieza sin autorías.
    }
    return {};
};

/* ================================================================
 * CARGA AUTOMÁTICA — APAGADA POR AHORA
 * ---------------------------------------------------------------
 * Cuando el backend entregue las dos cosas de abajo, descomenta el
 * import de `api` y este useEffect, y borra EQUIPOS_MANUALES y la
 * lectura inicial de localStorage.
 *
 *   useEffect(() => {
 *       const cargar = async () => {
 *           // 1) Parejas de LIDER_DOCE (una fila por cónyuges).
 *           //    GET /api/users?role=LIDER_DOCE devuelve fullName y
 *           //    spouseId, con lo que se arma la pareja "X Y Y".
 *           const { data } = await api.get('/users', {
 *               params: { role: 'LIDER_DOCE', limit: 500 }
 *           });
 *           const usuarios = data.users || [];
 *           const visitados = new Set();
 *           const parejas = [];
 *
 *           usuarios.forEach((u) => {
 *               if (visitados.has(u.id)) return;
 *               visitados.add(u.id);
 *               const conyuge = u.spouseId
 *                   ? usuarios.find((x) => x.id === u.spouseId)
 *                   : null;
 *               if (conyuge) visitados.add(conyuge.id);
 *
 *               parejas.push({
 *                   id: conyuge ? `p-${u.id}-${conyuge.id}` : `u-${u.id}`,
 *                   nombre: (conyuge
 *                       ? `${u.fullName} y ${conyuge.fullName}`
 *                       : u.fullName
 *                   ).toUpperCase(),
 *                   liderDoceId: u.id
 *               });
 *           });
 *
 *           // 2) Asistencia por fecha de cada pareja.
 *           //    GET /api/enviar/cell-attendance/stats?liderDoceId=&startDate=&endDate=
 *           //    devuelve [{ date, present, absent }].
 *           //    ⚠ OJO: `present` todavía mezcla presencial y VIRTUAL, así
 *           //    que la columna "Virtual" quedará vacía hasta que el server
 *           //    agregue un campo `virtual` a esa respuesta.
 *           const desde = columnas[0];
 *           const hastaFin = desdeIso(columnas[columnas.length - 1]);
 *           hastaFin.setDate(hastaFin.getDate() + 1);
 *           const hasta = toIso(hastaFin);
 *           const nuevos = {};
 *
 *           await Promise.all(parejas.map(async (p) => {
 *               const { data: stats } = await api.get('/enviar/cell-attendance/stats', {
 *                   params: { liderDoceId: p.liderDoceId, startDate: desde, endDate: hasta }
 *               });
 *
 *               (stats || []).forEach((s) => {
 *                   const dia = desdeIso(s.date).getDay();
 *                   const t = dia === 6 ? 'sab' : dia === 0 ? 'dom' : null;
 *                   if (t) nuevos[`${p.id}|${s.date}|${t}`] = String(s.present);
 *               });
 *           }));
 *
 *           setEquipos(parejas);
 *           setValores(nuevos);
 *       };
 *
 *       void cargar();
 *   }, []);
 *
 * (Recuerda cambiar `const equipos = EQUIPOS_MANUALES;` por
 *  `const [equipos, setEquipos] = useState(EQUIPOS_MANUALES);`)
 * ================================================================ */

const Metas = () => {
    const equipos = EQUIPOS_MANUALES;

    // Usuario logueado: con él se etiqueta quién modifica cada dato.
    const { user } = useAuth();
    const nombreUsuario = user?.fullName || 'Usuario';

    // Columnas: fechas de sábado ('aaaa-mm-dd') ordenadas de menor a mayor.
    const [columnas, setColumnas] = useState(leerColumnas);

    // Valores: { "<equipo>|<aaaa-mm-dd>|<sab|dom|vir>": "12" }
    const [valores, setValores] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch {
            return {};
        }
    });

    // Autor de cada dato: { "<clave>": { nombre, ts } }
    const [autores, setAutores] = useState(leerAutores);

    // Etiqueta que aparece al pasar por una celda.
    const [hover, setHover] = useState(null);

    const [confirmClear, setConfirmClear] = useState(false);

    // Columna que se pidió quitar (espera confirmación antes de borrarla).
    const [columnaAEliminar, setColumnaAEliminar] = useState(null);

    // Modal para agregar una columna con la fecha a mano.
    const [modalAbierto, setModalAbierto] = useState(false);
    const [fechaNueva, setFechaNueva] = useState('');
    const [errorFecha, setErrorFecha] = useState('');

    // Persiste cada cambio en el navegador.
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(valores));
        } catch {
            // Sin espacio en localStorage: los cambios siguen en memoria.
        }
    }, [valores]);

    useEffect(() => {
        try {
            localStorage.setItem(AUTORES_KEY, JSON.stringify(autores));
        } catch {
            // Sin espacio en localStorage: los cambios siguen en memoria.
        }
    }, [autores]);

    // La etiqueta sigue a la celda: si la página se mueve, se oculta.
    useEffect(() => {
        if (!hover) return undefined;
        const ocultar = () => setHover(null);
        window.addEventListener('scroll', ocultar, true);
        window.addEventListener('resize', ocultar);
        return () => {
            window.removeEventListener('scroll', ocultar, true);
            window.removeEventListener('resize', ocultar);
        };
    }, [hover]);

    useEffect(() => {
        try {
            localStorage.setItem(COLUMNAS_KEY, JSON.stringify(columnas));
        } catch {
            // Sin espacio en localStorage: los cambios siguen en memoria.
        }
    }, [columnas]);

    // Cada columna es un sábado: se deriva su domingo (día siguiente).
    const semanas = columnas.map((isoSab) => {
        const sabado = desdeIso(isoSab);
        const domingo = new Date(sabado);
        domingo.setDate(sabado.getDate() + 1);
        return { isoSab, sabado, domingo };
    });

    // Vista previa de las columnas que se crearán al confirmar.
    const sabadoPrevia = fechaNueva ? sabadoDeLaSemana(fechaNueva) : '';
    const domingoPrevia = (() => {
        if (!sabadoPrevia) return '';
        const d = desdeIso(sabadoPrevia);
        d.setDate(d.getDate() + 1);
        return toIso(d);
    })();

    const handleChange = (clave, valor) => {
        const limpio = valor.replace(/\D/g, '').slice(0, 4);

        // Sin cambio real: no se toca la autoría.
        if ((valores[clave] ?? '') === limpio) return;

        setValores((prev) => ({ ...prev, [clave]: limpio }));
        setAutores((prev) => ({
            ...prev,
            [clave]: { nombre: nombreUsuario, ts: Date.now() }
        }));
    };

    // Etiqueta al pasar (o enfocar) una celda: quién modificó el dato.
    const mostrarAutor = (e, clave) => {
        const r = e.currentTarget.getBoundingClientRect();
        const autor = autores[clave];

        setHover({
            clave,
            x: Math.min(Math.max(r.left + r.width / 2, 120), window.innerWidth - 120),
            y: r.top,
            arriba: r.top > 110, // si no hay espacio arriba, se pone debajo
            nombre: autor?.nombre || null,
            ts: autor?.ts || null
        });
    };

    const ocultarAutor = () => setHover(null);

    // Suma de todos los equipos para una fecha y tipo (sab | dom | vir).
    const totalDia = (fecha, tipo) => {
        let total = 0;
        equipos.forEach((equipo) => {
            const n = parseInt(valores[`${equipo.id}|${fecha}|${tipo}`], 10);
            if (Number.isFinite(n)) total += n;
        });
        return total;
    };

    const handleClear = () => {
        setValores({});
        setAutores({});
        setConfirmClear(false);
    };

    const cerrarModal = () => {
        setModalAbierto(false);
        setFechaNueva('');
        setErrorFecha('');
    };

    const handleAgregarColumna = () => {
        if (!fechaNueva) {
            setErrorFecha('Elige una fecha.');
            return;
        }

        const sabado = sabadoDeLaSemana(fechaNueva);

        if (columnas.includes(sabado)) {
            setErrorFecha('Esa semana ya está en la tabla.');
            return;
        }

        setColumnas((prev) => [...prev, sabado].sort());
        cerrarModal();
    };

    // Quita la columna (Sáb + Dom + Virtual) solo tras confirmar.
    // Los valores digitados no se borran: si se vuelve a agregar la
    // fecha, reaparecen.
    const confirmarQuitarColumna = () => {
        if (!columnaAEliminar) return;
        const iso = columnaAEliminar;
        setColumnas((prev) => prev.filter((c) => c !== iso));
        setColumnaAEliminar(null);
    };

    // Texto de la alerta al quitar una columna.
    const mensajeQuitar = (() => {
        if (!columnaAEliminar) return '';
        const sab = desdeIso(columnaAEliminar);
        const dom = new Date(sab);
        dom.setDate(sab.getDate() + 1);
        return `Se quitarán las columnas Sáb ${toHeader(sab)}, Dom ${toHeader(dom)} y Virtual de la tabla. `
            + 'Los números digitados no se borran: si vuelves a agregar esa fecha, reaparecerán.';
    })();

    return (
        <div>
            <PageHeader
                title="Metas"
                description="Asistencia semanal de los Equipos de 12: sábados, domingos y personas en virtual."
            />

            <div className="rounded-2xl border border-white bg-[var(--ln-bg-secondary)]/40 overflow-hidden">
                {/* Encabezado del cuadro */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#5e6ad2]/30 bg-[#5e6ad2]/10">
                            <UsersThree size={16} weight="bold" className="text-[#5e6ad2]" />
                        </div>
                        <div>
                            <h2 className="text-[15px] font-[590] leading-tight text-[var(--ln-text-primary)] tracking-[-0.2px]">
                                Asistencia
                            </h2>
                            <p className="text-[11.5px] text-[var(--ln-text-tertiary)]">
                                Cantidad de asistencias por fecha y de personas en virtual
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={Plus}
                            onClick={() => setModalAbierto(true)}
                        >
                            Agregar columna
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={Trash}
                            onClick={() => setConfirmClear(true)}
                            disabled={Object.keys(valores).length === 0}
                        >
                            Limpiar datos
                        </Button>
                    </div>
                </div>

                {/* Tabla con scroll horizontal */}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-max border-collapse text-[12px]">
                        <thead>
                            <tr>
                                <th
                                    rowSpan={1}
                                    className="sticky left-0 z-20 min-w-[150px] border-r border-b border-white bg-[#5e6ad2] px-2.5 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wide text-white"
                                >
                                    Equipo de 12
                                </th>

                                {semanas.map((sem) => (
                                    <Fragment key={sem.isoSab}>
                                        <th className="group relative min-w-[50px] border-r border-b border-white bg-[#5e6ad2]/90 px-1 py-1.5 text-center text-white">
                                            <span className="block text-[8.5px] font-medium uppercase opacity-80">Sáb</span>
                                            <span className="block text-[10px] font-semibold tabular-nums">
                                                {toHeader(sem.sabado)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setColumnaAEliminar(sem.isoSab)}
                                                aria-label={`Quitar columna del ${toHeader(sem.sabado)}`}
                                                title="Quitar columna"
                                                className="absolute right-0 top-0 rounded-bl p-0.5 text-white/70 opacity-0 transition-opacity hover:bg-black/20 hover:text-white focus:opacity-100 group-hover:opacity-100"
                                            >
                                                <X size={9} weight="bold" />
                                            </button>
                                        </th>
                                        <th className="min-w-[50px] border-r border-b border-white bg-[#8C5ED2]/90 px-1 py-1.5 text-center text-white">
                                            <span className="block text-[8.5px] font-medium uppercase opacity-80">Dom</span>
                                            <span className="block text-[10px] font-semibold tabular-nums">
                                                {toHeader(sem.domingo)}
                                            </span>
                                        </th>
                                        <th className="min-w-[50px] border-r border-b border-white bg-[#5EA4D2]/90 px-1 py-1.5 text-center text-[10px] font-semibold text-white">
                                            <span className="block text-[8.5px] font-medium uppercase opacity-80">Virtual</span>
                                            <span className="block text-[10px] font-semibold tabular-nums">Youtube</span>
                                        </th>
                                    </Fragment>
                                ))}
                            </tr>

                            {/* Totales por columna (debajo de la fecha) */}
                            <tr>
                                <th
                                    className="sticky left-0 z-20 min-w-[150px] border-r border-b border-white bg-[#5e6ad2] px-2.5 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-white"
                                >
                                    Total del día
                                </th>

                                {semanas.map((sem) => (
                                    <Fragment key={sem.isoSab}>
                                        <th className="min-w-[50px] border-r border-b border-white bg-[#5e6ad2]/90 px-1 py-1 text-center text-[10.5px] font-semibold tabular-nums text-white">
                                            {totalDia(sem.isoSab, 'sab') || '—'}
                                        </th>
                                        <th className="min-w-[50px] border-r border-b border-white bg-[#8C5ED2]/90 px-1 py-1 text-center text-[10.5px] font-semibold tabular-nums text-white">
                                            {totalDia(toIso(sem.domingo), 'dom') || '—'}
                                        </th>
                                        <th className="min-w-[50px] border-r border-b border-white bg-[#5EA4D2]/90 px-1 py-1 text-center text-[10.5px] font-semibold tabular-nums text-white">
                                            {totalDia(sem.isoSab, 'vir') || '—'}
                                        </th>
                                    </Fragment>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {equipos.map((equipo, idx) => {
                                const rowBg = idx % 2 === 1
                                    ? 'bg-[var(--ln-bg-surface)]'
                                    : 'bg-[var(--ln-bg-surface)]/60';

                                return (
                                    <tr key={equipo.id}>
                                        <th
                                            scope="row"
                                            className={`sticky left-0 z-10 min-w-[150px] border-r border-b border-white px-2.5 py-1.5 text-left text-[10.5px] font-semibold uppercase tracking-tight text-[var(--ln-text-primary)] ${rowBg}`}
                                        >
                                            {equipo.nombre}
                                        </th>

                                        {semanas.map((sem) => {
                                            const isoSab = sem.isoSab;
                                            const isoDom = toIso(sem.domingo);

                                            return (
                                                <Fragment key={isoSab}>
                                                    {[
                                                        { tipo: 'sab', fecha: isoSab, label: 'sábado' },
                                                        { tipo: 'dom', fecha: isoDom, label: 'domingo' },
                                                        { tipo: 'vir', fecha: isoSab, label: 'virtual' }
                                                    ].map(({ tipo, fecha, label }) => {
                                                        const clave = `${equipo.id}|${fecha}|${tipo}`;
                                                        const esVirtual = tipo === 'vir';

                                                        return (
                                                            <td
                                                                key={clave}
                                                                onMouseEnter={(e) => mostrarAutor(e, clave)}
                                                                onMouseLeave={ocultarAutor}
                                                                onFocus={(e) => mostrarAutor(e, clave)}
                                                                onBlur={ocultarAutor}
                                                                className={`border-r border-b border-white p-0.5 ${esVirtual ? 'bg-cyan-400/[0.07]' : ''}`}
                                                            >
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    value={valores[clave] ?? ''}
                                                                    onChange={(e) => handleChange(clave, e.target.value)}
                                                                    aria-label={`${equipo.nombre} — asistencia de ${label} ${fecha}`}
                                                                    placeholder="—"
                                                                    className={`w-full min-w-[38px] rounded px-0.5 py-1 text-center text-[11px] tabular-nums text-[var(--ln-text-primary)] outline-none transition-colors placeholder:text-[var(--ln-text-quaternary)]/45 hover:bg-white/[0.05] focus:bg-[var(--ln-brand-indigo)]/10 focus:ring-1 focus:ring-[var(--ln-brand-indigo)] ${esVirtual ? 'focus:bg-cyan-400/15 focus:ring-cyan-500' : ''}`}
                                                                />
                                                            </td>
                                                        );
                                                    })}
                                                </Fragment>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pie */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white px-5 py-3 text-[11px] text-[var(--ln-text-tertiary)]">
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-[#5E6AD2]" />
                        Sábado y domingo: cantidad de asistencias
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-[#8C5ED2]" />
                        Total del día: suma de todos los equipos
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-[#5EA4D2]" />
                        Virtual: personas que se conectaron por Youtube
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full bg-[var(--ln-text-quaternary)]" />
                        Pasa el cursor por una celda para ver quién la modificó
                    </span>
                    <span className="ml-auto text-[var(--ln-text-quaternary)]">
                        Los datos se guardan automáticamente en este navegador.
                    </span>
                </div>
            </div>

            {/* Agregar columna con fecha manual */}
            <Modal
                isOpen={modalAbierto}
                onClose={cerrarModal}
                title="Agregar columna"
                size="sm"
            >
                <Modal.Content className="space-y-4">
                    <p className="text-[12.5px] text-[var(--ln-text-tertiary)]">
                        Elige una fecha: se crearán tres columnas para esa semana
                        (sábado, domingo y virtual).
                    </p>

                    <div>
                        <label htmlFor="metas-fecha-columna" className="ln-label">
                            Fecha
                        </label>
                        <input
                            id="metas-fecha-columna"
                            type="date"
                            value={fechaNueva}
                            onChange={(e) => {
                                setFechaNueva(e.target.value);
                                setErrorFecha('');
                            }}
                            className="ln-input [color-scheme:light] dark:[color-scheme:dark]"
                        />
                    </div>

                    {sabadoPrevia && (
                        <div className="rounded-md border border-[var(--ln-border-standard)] bg-[var(--ln-bg-secondary)]/60 px-3 py-2 text-[12px] text-[var(--ln-text-secondary)]">
                            <span className="font-[590]">Se agregará:</span>{' '}
                            <span className="tabular-nums">
                                Sáb {toHeader(desdeIso(sabadoPrevia))} · Dom {toHeader(desdeIso(domingoPrevia))} · Virtual
                            </span>
                        </div>
                    )}

                    {errorFecha && (
                        <p className="text-[11.5px] font-medium text-red-500">{errorFecha}</p>
                    )}
                </Modal.Content>

                <Modal.Footer>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={cerrarModal}>
                            Cancelar
                        </Button>
                        <Button variant="primary" size="sm" onClick={handleAgregarColumna}>
                            Agregar
                        </Button>
                    </div>
                </Modal.Footer>
            </Modal>

            {/* Alerta: limpiar los datos */}
            <Modal
                isOpen={confirmClear}
                onClose={() => setConfirmClear(false)}
                title="¿Limpiar los datos?"
                size="sm"
                variant="danger"
                closeOnBackdropClick={false}
            >
                <Modal.Content>
                    <p>
                        Se borrarán todos los números digitados en este navegador,
                        junto con el registro de quién los modificó. Esta acción no
                        se puede deshacer.
                    </p>
                </Modal.Content>
                <Modal.Footer>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
                            Cancelar
                        </Button>
                        <Button variant="error" size="sm" onClick={handleClear}>
                            Limpiar
                        </Button>
                    </div>
                </Modal.Footer>
            </Modal>

            {/* Alerta: confirmación antes de quitar una columna */}
            <Modal
                isOpen={!!columnaAEliminar}
                onClose={() => setColumnaAEliminar(null)}
                title="¿Quitar la columna?"
                size="sm"
                variant="danger"
                closeOnBackdropClick={false}
            >
                <Modal.Content>
                    <p>{mensajeQuitar}</p>
                </Modal.Content>
                <Modal.Footer>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setColumnaAEliminar(null)}>
                            Cancelar
                        </Button>
                        <Button variant="error" size="sm" onClick={confirmarQuitarColumna}>
                            Quitar columna
                        </Button>
                    </div>
                </Modal.Footer>
            </Modal>

            {/* Etiqueta con el autor del dato al pasar por una celda */}
            {hover && (
                <div
                    role="tooltip"
                    className="pointer-events-none fixed z-[200] max-w-[240px] rounded-md border border-white/10 bg-[#1d1d1f] px-2.5 py-1.5 shadow-lg"
                    style={{
                        left: hover.x,
                        top: hover.arriba ? hover.y - 8 : hover.y + 8,
                        transform: hover.arriba ? 'translate(-50%, -100%)' : 'translate(-50%, 0)'
                    }}
                >
                    <span className="block text-[9.5px] font-semibold uppercase tracking-wide text-white/50">
                        Modificado por
                    </span>
                    {hover.nombre ? (
                        <>
                            <span className="block text-[11.5px] font-[590] leading-snug text-white">
                                {hover.nombre}
                            </span>
                            <span className="block text-[10px] tabular-nums text-white/60">
                                {formatearFecha(hover.ts)}
                            </span>
                        </>
                    ) : (
                        <span className="block text-[11px] text-white/70">
                            Sin ediciones registradas
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default Metas;
