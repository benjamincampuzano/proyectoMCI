import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../utils/api';
import {
    Users,
    GraduationCap,
    TrendUp,
    WarningCircle,
    Warning,
    CheckCircle,
    Clock,
    ArrowRight
} from '@phosphor-icons/react';
import { ErrorState, Progress } from '../ui';

const LEVELS = [
    { label: '1A', moduleNumber: 1, name: 'Pastoreados en su amor' },
    { label: '1B', moduleNumber: 2, name: 'El poder de una Visión' },
    { label: '2A', moduleNumber: 3, name: 'La estrategia del Ganar' },
    { label: '2B', moduleNumber: 4, name: 'Familias con Propósito' },
    { label: '3A', moduleNumber: 5, name: 'Liderazgo Eficaz' },
    { label: '3B', moduleNumber: 6, name: 'El Espíritu Santo en Mí' }
];

// Desglosa la asistencia de una inscripción por códigos (AS/AJ/ANJ/BAJA/SIN_CLASE).
// SIN_CLASE significa que la clase aún no se ha impartido, por lo que no cuenta
// como inasistencia. "recorded" son las clases con dato real de asistencia.
const getAttendanceInfo = (enrollment) => {
    const codes = enrollment.attendanceCodes ||
        (enrollment.classAttendances || []).reduce((acc, c) => {
            if (c.status && acc[c.status] !== undefined) acc[c.status] += 1;
            return acc;
        }, {
            ASISTE: 0,
            AUSENCIA_JUSTIFICADA: 0,
            AUSENCIA_NO_JUSTIFICADA: 0,
            BAJA: 0,
            SIN_CLASE: 0
        });

    const asiste = codes.ASISTE || 0;
    const aj = codes.AUSENCIA_JUSTIFICADA || 0;
    const anj = codes.AUSENCIA_NO_JUSTIFICADA || 0;
    const baja = codes.BAJA || 0;
    const sinClase = codes.SIN_CLASE || 0;
    const recorded = asiste + aj + anj + baja;

    return {
        asiste,
        aj,
        anj,
        baja,
        sinClase,
        recorded,
        attendedPct: recorded > 0 ? (asiste / recorded) * 100 : null,
        effectivePct: recorded > 0 ? ((asiste + aj * 0.5) / recorded) * 100 : null
    };
};

const SkeletonLoading = () => (
    <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] p-5 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 bg-[rgba(255,255,255,0.05)] rounded-lg" />
                        <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded w-24" />
                    </div>
                    <div className="h-7 bg-[rgba(255,255,255,0.05)] rounded w-16 mb-2" />
                    <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded w-32" />
                </div>
            ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
                <div key={i} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
                    <div className="h-5 bg-[rgba(255,255,255,0.05)] rounded w-40 mb-6" />
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((j) => (
                            <div key={j} className="h-4 bg-[rgba(255,255,255,0.05)] rounded" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const SchoolDashboard = ({ refreshTrigger = 0 }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [showProgressMobile, setShowProgressMobile] = useState(true);
    const [showAlertsMobile, setShowAlertsMobile] = useState(true);

    const safeNum = (val) => {
        const n = parseFloat(val);
        return isNaN(n) ? 0 : n;
    };

    const handleRetry = useCallback(() => {
        setLoading(true);
        setError(null);
        setRetryCount(c => c + 1);
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        api.get('/school/student-matrix', { signal: controller.signal })
            .then(res => {
                if (!controller.signal.aborted) {
                    setStudents(res.data || []);
                }
            })
            .catch(err => {
                if (err.name === 'CanceledError' || err.name === 'AbortError') return;
                if (!controller.signal.aborted) {
                    setError({
                        message: err.userMessage || 'Error al cargar el resumen de la escuela',
                        technicalDetail: err.response?.status
                            ? `Error ${err.response.status}: ${err.response.statusText}`
                            : err.message
                    });
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [refreshTrigger, retryCount]);

    const metrics = useMemo(() => {
        const activeStudents = (students || []).filter(s => s.enrollments && s.enrollments.length > 0);
        const allEnrollments = activeStudents.flatMap(s => s.enrollments || []);
        const completedEnrollments = allEnrollments.filter(e => e.isCompleted);
        const gradedEnrollments = allEnrollments.filter(e => e.avgGrade !== null && e.avgGrade !== undefined);
        const withAttendance = allEnrollments.map(e => getAttendanceInfo(e)).filter(info => info.recorded > 0);

        const averageGrade = gradedEnrollments.length > 0
            ? gradedEnrollments.reduce((sum, e) => sum + safeNum(e.avgGrade), 0) / gradedEnrollments.length
            : 0;

        const averageAttendance = withAttendance.length > 0
            ? withAttendance.reduce((sum, info) => sum + (info.effectivePct || 0), 0) / withAttendance.length
            : 0;

        const progress = LEVELS.map(level => {
            const levelEnrollments = allEnrollments.filter(e => e.module?.moduleNumber === level.moduleNumber);
            const completed = levelEnrollments.filter(e => e.isCompleted).length;
            return {
                ...level,
                enrolled: levelEnrollments.length,
                completed,
                pct: levelEnrollments.length > 0 ? (completed / levelEnrollments.length) * 100 : 0
            };
        });

        const lagging = [];
        activeStudents.forEach(s => {
            (s.enrollments || []).forEach(e => {
                if (e.isCompleted) return;
                const info = getAttendanceInfo(e);

                let status, severity;
                if (info.baja > 0) {
                    status = 'Registró baja';
                    severity = 2;
                } else if (e.finalGrade !== null && e.finalGrade !== undefined && !e.isCompleted) {
                    status = 'No aprobado';
                    severity = 2;
                } else if (info.anj >= 2) {
                    status = 'Ausencias injustificadas';
                    severity = 2;
                } else if (info.effectivePct !== null && info.effectivePct < 60) {
                    status = 'Asistencia baja';
                    severity = 2;
                } else {
                    return;
                }

                lagging.push({
                    student: s,
                    enrollment: e,
                    info,
                    status,
                    severity
                });
            });
        });

        lagging.sort((a, b) => b.severity - a.severity
            || b.info.anj - a.info.anj
            || (a.info.effectivePct || 0) - (b.info.effectivePct || 0));

        const countBy = (status) => lagging.filter(a => a.status === status).length;

        return {
            totalStudents: activeStudents.length,
            totalEnrollments: allEnrollments.length,
            completedEnrollments: completedEnrollments.length,
            avancePct: allEnrollments.length > 0 ? (completedEnrollments.length / allEnrollments.length) * 100 : 0,
            averageGrade,
            averageAttendance,
            alerts: {
                notApproved: countBy('No aprobado'),
                dropped: countBy('Registró baja'),
                unjustified: countBy('Ausencias injustificadas'),
                lowAttendance: countBy('Asistencia baja'),
                total: lagging.length
            },
            lagging: lagging.slice(0, 8),
            progress
        };
    }, [students]);

    const getProgressVariant = (pct) => {
        if (pct >= 70) return 'success';
        if (pct >= 40) return 'warning';
        return 'error';
    };

    if (loading) return <SkeletonLoading />;

    if (error) {
        return (
            <ErrorState
                title="No se pudo cargar el resumen"
                message={error.message}
                technicalDetail={error.technicalDetail}
                onRetry={handleRetry}
            />
        );
    }

    if (metrics.totalEnrollments === 0) {
        return (
            <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-10 text-center">
                <GraduationCap size={40} className="mx-auto mb-4 text-[var(--ln-text-tertiary)]" />
                <h3 className="text-lg font-semibold text-[var(--ln-text-primary)] mb-2">
                    Aún no hay estudiantes inscritos
                </h3>
                <p className="text-sm text-[var(--ln-text-secondary)]">
                    Inscribe estudiantes en una clase desde la pestaña "Clases y Notas" para ver el resumen de la escuela.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                            <Users size={20} />
                        </div>
                        <span className="text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-tight">Alumnos Activos</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-extrabold text-blue-900 dark:text-white">{metrics.totalStudents}</span>
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                            {metrics.totalEnrollments} inscripciones
                        </span>
                    </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-xl border border-green-100 dark:border-green-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg text-green-600 dark:text-green-300">
                            <TrendUp size={20} />
                        </div>
                        <span className="text-sm font-bold text-green-800 dark:text-green-200 uppercase tracking-tight">Avance General</span>
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-green-900 dark:text-white">{metrics.avancePct.toFixed(0)}%</span>
                        </div>
                        <div className="mt-2">
                            <Progress
                                value={metrics.avancePct}
                                variant={getProgressVariant(metrics.avancePct)}
                                size="sm"
                            />
                        </div>
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">
                            {metrics.completedEnrollments} de {metrics.totalEnrollments} módulos completados
                        </span>
                    </div>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-800 rounded-lg text-indigo-600 dark:text-indigo-300">
                            <GraduationCap size={20} />
                        </div>
                        <span className="text-sm font-bold text-indigo-800 dark:text-indigo-200 uppercase tracking-tight">Promedio General</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-extrabold text-indigo-900 dark:text-white">
                            {metrics.averageGrade ? metrics.averageGrade.toFixed(1) : '-'}
                        </span>
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                            Asistencia Global {metrics.averageAttendance.toFixed(0)}%
                        </span>
                    </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-xl border border-amber-100 dark:border-amber-800 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg text-amber-600 dark:text-amber-300">
                            <WarningCircle size={20} />
                        </div>
                        <span className="text-sm font-bold text-amber-800 dark:text-amber-200 uppercase tracking-tight">Requieren Atención</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-extrabold text-amber-900 dark:text-white">
                            {metrics.alerts.total}
                        </span>
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                            {metrics.alerts.notApproved} no aprobados · {metrics.alerts.dropped} bajas
                        </span>
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                            {metrics.alerts.unjustified} con ausencias injustificadas · {metrics.alerts.lowAttendance} con asistencia baja
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Progreso por Nivel */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => setShowProgressMobile(!showProgressMobile)}
                        className="w-full flex items-center justify-between p-6 pb-0 md:pb-6 md:cursor-default"
                    >
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Avance por Nivel</h3>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform md:hidden ${showProgressMobile ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <div className={`${showProgressMobile ? 'block' : 'hidden'} md:block`}>
                        <div className="p-6 space-y-5">
                            {metrics.progress.map(level => (
                                <div key={level.moduleNumber}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-xs font-extrabold flex-shrink-0 ${
                                                level.pct >= 70
                                                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                                    : level.pct >= 40
                                                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                                        : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                            }`}>
                                                {level.label}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{level.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {level.completed} de {level.enrolled} alumnos completados
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 flex-shrink-0 ml-3">{level.pct.toFixed(0)}%</span>
                                    </div>
                                    <Progress
                                        value={level.pct}
                                        variant={getProgressVariant(level.pct)}
                                        size="sm"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Alertas de Alumnos Rezagados */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => setShowAlertsMobile(!showAlertsMobile)}
                        className="w-full flex items-center justify-between p-6 pb-0 md:pb-6 md:cursor-default"
                    >
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Alumnos Rezagados</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Inscripciones no aprobadas, ausencias injustificadas o baja asistencia
                            </p>
                        </div>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform md:hidden ${showAlertsMobile ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <div className={`${showAlertsMobile ? 'block' : 'hidden'} md:block`}>
                        {metrics.lagging.length === 0 ? (
                            <div className="p-6 text-center">
                                <CheckCircle size={32} className="mx-auto mb-3 text-green-500" />
                                <p className="text-sm font-medium text-gray-900 dark:text-white">¡Todo al día!</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">No hay alumnos rezagados en la escuela.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                {metrics.lagging.map(({ student, enrollment, info, status }) => {
                                    const isWarning = status === 'Asistencia baja';
                                    const codesSummary = info.recorded > 0
                                        ? `AS ${info.asiste} · AJ ${info.aj} · ANJ ${info.anj} · BAJA ${info.baja}`
                                        : 'Sin registros de asistencia';
                                    return (
                                        <li key={`${student.id}-${enrollment.id}`} className="px-6 py-4 flex items-start gap-3">
                                            <span className={`flex-shrink-0 p-2 rounded-lg ${isWarning
                                                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300'
                                                : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300'}`}>
                                                {isWarning ? <Warning size={18} weight="bold" /> : <Clock size={18} weight="bold" />}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                        {student.fullName}
                                                    </p>
                                                    <span className={`flex-shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${isWarning
                                                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                                        : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'}`}>
                                                        {status}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                                                    {enrollment.module?.name || 'Módulo'}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {codesSummary}
                                                    {info.effectivePct !== null && ` · Asistencia ${info.effectivePct.toFixed(0)}%`}
                                                </p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {metrics.totalEnrollments > metrics.lagging.length && metrics.lagging.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    Mostrando los {metrics.lagging.length} alumnos con mayor retraso.
                    <ArrowRight size={12} />
                </p>
            )}
        </div>
    );
};

export default SchoolDashboard;