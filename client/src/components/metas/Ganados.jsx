import { Fragment, useEffect, useMemo, useState } from 'react';
import { UsersThree } from '@phosphor-icons/react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../utils/api';
import { EQUIPOS_MANUALES } from './Asistencia';

const fechaISO = (value) => {
    const d = new Date(value);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const encabezado = (iso) => {
    const [y, m, d] = iso.split('-');
    return `${d}-${m}-${y.slice(2)}`;
};
const normalizarNombre = (nombre) => (nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const mostrarConteo = (valor) => valor || <span className="font-normal text-[var(--ln-text-quaternary)]/60">—</span>;
const etiquetaEquipo = (nombres) => {
    const personas = normalizarNombre(nombres).split(' Y ').join(' ').split(' ');
    const etiqueta = EQUIPOS_MANUALES.find((equipo) => {
        const tokensEtiqueta = normalizarNombre(equipo.nombre).split(' ').filter((token) => token !== 'Y');
        return tokensEtiqueta.every((token) => personas.includes(token));
    });
    return etiqueta?.nombre || nombres.toUpperCase();
};

export default function Ganados() {
    const [desde, setDesde] = useState(`${new Date().getFullYear()}-01-01`);
    const [hasta, setHasta] = useState(fechaISO(new Date()));
    const [filas, setFilas] = useState([]);
    const [fechas, setFechas] = useState([]);
    const [semestre, setSemestre] = useState(() => {
        const hoy = new Date();
        return `${hoy.getFullYear()}-${hoy.getMonth() < 6 ? 1 : 2}`;
    });
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let vigente = true;
        const cargar = async () => {
            setCargando(true); setError('');
            try {
                const { data: usersData } = await api.get('/users', { params: { role: 'LIDER_DOCE', limit: 500 } });
                const users = usersData.users || usersData;
                const visitados = new Set();
                const parejas = [];
                users.forEach((u) => {
                    if (visitados.has(u.id)) return;
                    visitados.add(u.id);
                    const spouse = u.spouseId ? users.find((x) => x.id === u.spouseId) : null;
                    if (spouse) visitados.add(spouse.id);
                    const nombres = spouse ? `${u.fullName} y ${spouse.fullName}` : u.fullName;
                    parejas.push({ id: u.id, nombre: etiquetaEquipo(nombres) });
                });
                const data = await Promise.all(parejas.map(async (p) => {
                    const { data: response } = await api.get('/guests', { params: { liderDoceId: p.id, startDate: desde, endDate: hasta, limit: 500, page: 1 } });
                    const invitados = response.guests || response;
                    return { ...p, invitados: Array.isArray(invitados) ? invitados : [] };
                }));
                const dias = [...new Set(data.flatMap((p) => p.invitados.map((g) => fechaISO(g.createdAt))))].sort();
                if (vigente) { setFilas(data); setFechas(dias); }
            } catch (e) {
                if (vigente) setError(e.response?.data?.message || e.response?.data?.error || 'No se pudo cargar el reporte.');
            } finally { if (vigente) setCargando(false); }
        };
        cargar();
        return () => { vigente = false; };
    }, [desde, hasta]);

    const semestres = useMemo(() => [...new Set(fechas.map((f) => {
        const [year, month] = f.split('-').map(Number);
        return `${year}-${month <= 6 ? 1 : 2}`;
    }))].sort(), [fechas]);
    useEffect(() => {
        if (semestres.length && !semestres.includes(semestre)) setSemestre(semestres[semestres.length - 1]);
    }, [semestres, semestre]);
    const fechasSemestre = useMemo(() => fechas.filter((f) => {
        const [year, month] = f.split('-').map(Number);
        return `${year}-${month <= 6 ? 1 : 2}` === semestre;
    }), [fechas, semestre]);

    const totales = useMemo(() => fechasSemestre.map((f) => filas.reduce((acc, p) => {
        p.invitados.filter((g) => fechaISO(g.createdAt) === f).forEach((g) => {
            if (g.sex === 'HOMBRE') acc.h += 1;
            else if (g.sex === 'MUJER') acc.m += 1;
        });
        return acc;
    }, { h: 0, m: 0 })), [fechasSemestre, filas]);

    const datosGrafico = useMemo(() => {
        const puntos = fechasSemestre.map((fecha, index) => ({
            fecha: encabezado(fecha), total: totales[index].h + totales[index].m
        }));
        if (puntos.length < 2) return puntos.map((punto) => ({ ...punto, tendencia: punto.total }));
        const n = puntos.length;
        const sumaX = (n * (n - 1)) / 2;
        const sumaY = puntos.reduce((suma, punto) => suma + punto.total, 0);
        const sumaXY = puntos.reduce((suma, punto, indice) => suma + indice * punto.total, 0);
        const sumaX2 = puntos.reduce((suma, _punto, indice) => suma + indice * indice, 0);
        const pendiente = (n * sumaXY - sumaX * sumaY) / (n * sumaX2 - sumaX * sumaX);
        const intercepto = (sumaY - pendiente * sumaX) / n;
        return puntos.map((punto, indice) => ({ ...punto, tendencia: Math.max(0, intercepto + pendiente * indice) }));
    }, [fechasSemestre, totales]);

    return <section className="mt-4 overflow-hidden rounded-2xl border border-white bg-[var(--ln-bg-secondary)]/40">
        <header className="flex flex-col gap-3 border-b border-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
            <div className="flex items-start gap-2.5 sm:items-center sm:gap-3"><UsersThree size={21} className="mt-0.5 shrink-0 text-[#5e6ad2] sm:mt-0" /><div><h2 className="text-[15px] font-semibold text-[var(--ln-text-primary)]">Reporte de Invitados</h2><p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-[var(--ln-text-tertiary)]">Todos los invitados por fecha y sexo, agrupados por Lider Doce.</p></div></div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:flex sm:flex-wrap sm:items-center"><label className="col-span-2 flex min-w-0 flex-col gap-1 text-[var(--ln-text-tertiary)] sm:col-span-1 sm:flex-row sm:items-center">Semestre<select value={semestre} onChange={(e) => setSemestre(e.target.value)} className="w-full rounded border border-white bg-[var(--ln-bg-secondary)] p-1.5 text-[var(--ln-text-primary)] sm:w-auto">{semestres.map((s) => { const [year, half] = s.split('-'); return <option key={s} value={s}>{half === '1' ? 'Ene–Jun' : 'Jul–Dic'} {year}</option>; })}{semestres.length === 0 && <option value={semestre}>{semestre.replace('-', ' · S')}</option>}</select></label><label className="flex min-w-0 flex-col gap-1 text-[var(--ln-text-tertiary)] sm:flex-row sm:items-center">Desde<input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-full min-w-0 rounded border border-white bg-transparent p-1.5 text-[var(--ln-text-primary)] sm:w-auto" /></label><label className="flex min-w-0 flex-col gap-1 text-[var(--ln-text-tertiary)] sm:flex-row sm:items-center">Hasta<input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-full min-w-0 rounded border border-white bg-transparent p-1.5 text-[var(--ln-text-primary)] sm:w-auto" /></label></div>
        </header>
        {error && <p className="p-5 text-sm text-red-400">{error}</p>}
        {cargando ? <p className="p-8 text-center text-sm text-[var(--ln-text-tertiary)]">Cargando reporte…</p> : !error && <div className="max-w-full overflow-x-auto overscroll-x-contain"><table className="w-full min-w-max border-collapse text-xs"><thead><tr><th rowSpan="2" className="sticky left-0 z-20 w-[126px] min-w-[126px] max-w-[126px] border-r border-b border-white bg-[#5e6ad2] px-2 py-2 text-left font-semibold uppercase tracking-wide text-white sm:w-[170px] sm:min-w-[170px] sm:max-w-[170px] sm:px-3">Pareja LIDER_DOCE</th>{fechasSemestre.map((f) => <th key={f} colSpan="3" className="border-r border-b border-white bg-[#5e6ad2]/90 px-2 py-1.5 text-center font-semibold tabular-nums text-white">{encabezado(f)}</th>)}</tr><tr>{fechasSemestre.flatMap((f) => [<th key={`${f}-h`} className="border-r border-b border-white bg-[#5e6ad2]/90 px-2 py-1 text-center text-[10px] font-semibold text-white">Hombres</th>, <th key={`${f}-m`} className="border-r border-b border-white bg-[#8C5ED2]/90 px-2 py-1 text-center text-[10px] font-semibold text-white">Mujeres</th>, <th key={`${f}-t`} className="border-r border-b border-white bg-[#5EA4D2]/90 px-2 py-1 text-center text-[10px] font-semibold text-white">Total</th>])}</tr><tr><th className="sticky left-0 z-20 border-r border-b border-white bg-[#5e6ad2] px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-white">Total del día</th>{totales.map((t, i) => { const total = t.h + t.m; return <Fragment key={`total-${i}`}><th className="border-r border-b border-white bg-[#5e6ad2]/90 px-3 py-1 text-center text-[10px] font-semibold tabular-nums text-white">{mostrarConteo(t.h)}</th><th className="border-r border-b border-white bg-[#8C5ED2]/90 px-3 py-1 text-center text-[10px] font-semibold tabular-nums text-white">{mostrarConteo(t.m)}</th><th className="border-r border-b border-white bg-[#5EA4D2]/90 px-3 py-1 text-center text-[10px] font-semibold tabular-nums text-white">{mostrarConteo(total)}</th></Fragment>; })}</tr></thead><tbody>{filas.map((p, idx) => { const rowBg = idx % 2 ? 'bg-[var(--ln-bg-surface)]' : 'bg-[var(--ln-bg-surface)]/60'; return <tr key={p.id}><th title={p.nombre} className={`sticky left-0 z-10 w-[126px] min-w-[126px] max-w-[126px] truncate border-r border-b border-white px-2 py-2 text-left font-semibold uppercase tracking-tight text-[var(--ln-text-primary)] sm:w-[170px] sm:min-w-[170px] sm:max-w-[170px] sm:px-3 ${rowBg}`}>{p.nombre}</th>{fechasSemestre.map((f) => { const gs = p.invitados.filter((g) => fechaISO(g.createdAt) === f); const h = gs.filter((g) => g.sex === 'HOMBRE').length; const m = gs.filter((g) => g.sex === 'MUJER').length; const total = h + m; return <Fragment key={`${p.id}-${f}`}><td className={`border-r border-b border-white px-3 py-2 text-center tabular-nums text-[var(--ln-text-primary)] bg-[#5e6ad2]/[0.07] ${rowBg}`}>{mostrarConteo(h)}</td><td className={`border-r border-b border-white px-3 py-2 text-center tabular-nums text-[var(--ln-text-primary)] bg-[#8C5ED2]/[0.07] ${rowBg}`}>{mostrarConteo(m)}</td><td className={`border-r border-b border-white px-3 py-2 text-center font-semibold tabular-nums text-[var(--ln-text-primary)] bg-[#5EA4D2]/[0.07] ${rowBg}`}>{mostrarConteo(total)}</td></Fragment>; })}</tr>; })}</tbody></table>{fechasSemestre.length === 0 && <p className="p-8 text-center text-sm text-[var(--ln-text-tertiary)]">No hay personas ganadas en este semestre e intervalo.</p>}</div>}
        {!cargando && !error && <div className="border-t border-white px-3 py-4 sm:px-5 sm:py-5">
            <h3 className="mb-1 text-sm font-semibold text-[var(--ln-text-primary)]">Total de personas ganadas por día</h3>
            <p className="mb-4 text-xs text-[var(--ln-text-tertiary)]">Total diario de todos los Lider Doce, según el semestre y el intervalo seleccionados.</p>
            {datosGrafico.length === 0 ? <p className="py-8 text-center text-sm text-[var(--ln-text-tertiary)]">No hay datos para graficar en este semestre.</p> : <div className="h-[360px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={datosGrafico} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--ln-border)" />
                        <XAxis dataKey="fecha" tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fill: 'var(--ln-text-tertiary)', fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: 'var(--ln-bg-secondary)', border: '1px solid var(--ln-border)', borderRadius: 10, color: 'var(--ln-text-primary)' }} />
                        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--ln-text-secondary)' }} />
                        <Line type="monotone" dataKey="total" name="Personas ganadas" stroke="#5e6ad2" strokeWidth={2.5} dot={{ r: 3, fill: '#5e6ad2' }} activeDot={{ r: 5 }} />
                        <Line type="linear" dataKey="tendencia" name="Tendencia" stroke="#D28C5E" strokeWidth={2} strokeDasharray="6 4" dot={false} activeDot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>}
        </div>}
    </section>;
}
