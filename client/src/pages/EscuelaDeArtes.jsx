import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { Plus, Calendar, UserIcon,Users, MoneyIcon, CaretRight, Trash, UserCheck, SquaresFour, List, FileTextIcon, TrendUpIcon, ArrowsClockwise, GuitarIcon, GraduationCap, Eye, Pencil } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ArtClassDetails from '../components/ArtClassDetails';
import ArtClassTable from '../components/ArtClassTable';
import ArtSchoolReport from '../components/ArtSchoolReport';
import MultiUserSelect from '../components/MultiUserSelect';
import { AsyncSearchSelect, PageHeader, Button } from '../components/ui';
import ActionModal from '../components/ActionModal';
import ConfirmationModal from '../components/ConfirmationModal';
import CoordinatorSelector from '../components/CoordinatorSelector';
import TreasurerSelector from '../components/TreasurerSelector';
import SubCoordinatorSelector from '../components/SubCoordinatorSelector';
import { ROLES } from '../constants/roles';

const EscuelaDeArtes = () => {
    const { user, hasAnyRole, isCoordinator } = useAuth();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [viewMode, setViewMode] = useState('table'); // 'cards' or 'table'
    const [showReport, setShowReport] = useState(false);
    const [moduleCoordinator, setModuleCoordinator] = useState(null);
    const [moduleSubCoordinator, setModuleSubCoordinator] = useState(null);
    const [moduleTreasurer, setModuleTreasurer] = useState(null);
    const hasAdminOrPastor = hasAnyRole([ROLES.ADMIN, ROLES.PASTOR]);
    const isModuleCoordinator = isCoordinator('escuela-de-artes');
    const isModuleSubCoordinator = user?.isModuleSubCoordinator || 
                                   (user?.moduleSubCoordinations && user.moduleSubCoordinations.includes('escuela-de-artes'));
    const hasFullEditAccess = hasAdminOrPastor || isModuleCoordinator || isModuleSubCoordinator;

    // Handler for coordinator changes
    const handleCoordinatorChange = (newCoordinator) => {
        setModuleCoordinator(newCoordinator);
    };

    // Handler for treasurer changes
    const handleTreasurerChange = (newTreasurer) => {
        setModuleTreasurer(newTreasurer);
    };

    // Handler for sub-coordinator changes
    const handleSubCoordinatorChange = (newSubCoordinator) => {
        setModuleSubCoordinator(newSubCoordinator);
    };

    // Delete Confirmation Modal State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [classToDelete, setClassToDelete] = useState(null);
    
    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [classToEdit, setClassToEdit] = useState(null);

    // Selected User Objects State (for UI display in AsyncSearchSelect)
    const [selectedProfessor, setSelectedProfessor] = useState(null);
    const [selectedCoordinator, setSelectedCoordinator] = useState(null);
    const [scheduleDay, setScheduleDay] = useState('Lunes');
    const [startTime, setStartTime] = useState('10:00');
    const [endTime, setEndTime] = useState('12:00');
    const [durationHours, setDurationHours] = useState('2');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        cost: '',
        duration: '',
        schedule: '',
        professorId: null,
        coordinatorId: null
    });

    useEffect(() => {
        fetchClasses();
        fetchModuleCoordinator();
        fetchModuleSubCoordinator();
        fetchModuleTreasurer();
    }, []);

    const fetchModuleCoordinator = async () => {
        try {
            const res = await api.get('/coordinators/module/escuela-de-artes');
            setModuleCoordinator(res.data);
        } catch (error) {
            console.error('Error fetching coordinator:', error);
            setModuleCoordinator(null);
        }
    };

    const fetchModuleSubCoordinator = async () => {
        try {
            const res = await api.get('/coordinators/module/escuela-de-artes/subcoordinator');
            setModuleSubCoordinator(res.data);
        } catch (error) {
            console.error('Error fetching subcoordinator:', error);
            setModuleSubCoordinator(null);
        }
    };

    const fetchModuleTreasurer = async () => {
        try {
            const res = await api.get('/coordinators/module/escuela-de-artes/treasurer');
            setModuleTreasurer(res.data);
        } catch (error) {
            console.error('Error fetching treasurer:', error);
            setModuleTreasurer(null);
        }
    };

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const res = await api.get('/arts/classes');
            setClasses(res.data);
        } catch (error) {
            console.error('Error fetching classes:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchClassDetails = async (id) => {
        try {
            const res = await api.get(`/arts/classes/${id}`);
            setSelectedClass(res.data);
        } catch (error) {
            console.error('Error fetching details:', error);
            toast.error('Error loading details');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/arts/classes', {
                ...formData,
                cost: parseFloat(formData.cost),
                duration: parseFloat(durationHours) * 60,
                schedule: `${scheduleDay} ${startTime} - ${endTime}`
            });
            setShowCreateModal(false);
            fetchClasses();
            setSelectedProfessor(null);
            setSelectedCoordinator(null);
            setScheduleDay('Lunes');
            setStartTime('10:00');
            setEndTime('12:00');
            setDurationHours('2');
            setFormData({
                name: '',
                description: '',
                cost: '',
                duration: '120',
                schedule: 'Lunes 10:00 - 12:00',
                professorId: null,
                coordinatorId: null
            });
        } catch (error) {
            console.error('Error creating:', error);
            toast.error('Error creating class');
        }
    };

    const handleEdit = (id) => {
        const artClass = classes.find(cls => cls.id === id);
        setClassToEdit(artClass);
        setFormData({
            name: artClass.name,
            description: artClass.description || '',
            cost: (artClass.cost || 0).toString(),
            duration: (artClass.duration || 60).toString(), // Default to 60 minutes if not set
            schedule: artClass.schedule || '',
            professorId: artClass.professor?.id || null,
            coordinatorId: artClass.coordinator?.id || null
        });
        
        // Parse "Lunes 10:00 - 12:00"
        if (artClass.schedule) {
            const parts = artClass.schedule.split(' ');
            if (parts.length >= 4) {
                setScheduleDay(parts[0]);
                setStartTime(parts[1]);
                setEndTime(parts[3]);
            }
        }
        
        setDurationHours((parseInt(artClass.duration || 120) / 60).toString());
        setSelectedProfessor(artClass.professor || null);
        setSelectedCoordinator(artClass.coordinator || null);
        setShowEditModal(true);
    };
    
    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!classToEdit) return;
        
        try {
            await api.put(`/arts/classes/${classToEdit.id}`, {
                ...formData,
                cost: parseFloat(formData.cost),
                duration: parseFloat(durationHours) * 60,
                schedule: `${scheduleDay} ${startTime} - ${endTime}`
            });
            setShowEditModal(false);
            fetchClasses();
            setClassToEdit(null);
            setSelectedProfessor(null);
            setSelectedCoordinator(null);
            setScheduleDay('Lunes');
            setStartTime('10:00');
            setEndTime('12:00');
            setDurationHours('2');
            setFormData({
                name: '',
                description: '',
                cost: '',
                duration: '120',
                schedule: 'Lunes 10:00 - 12:00',
                professorId: null,
                coordinatorId: null
            });
            setSelectedProfessor(null);
            setSelectedCoordinator(null);
            toast.success('Clase actualizada exitosamente');
        } catch (error) {
            console.error('Error updating:', error);
            toast.error('Error actualizando clase');
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        // Find the class to show details in the confirmation modal
        const artClass = classes.find(cls => cls.id === id);
        const enrollmentCount = artClass._count?.enrollments || artClass.enrollments?.length || 0;
        
        if (enrollmentCount > 0) {
            toast.error(`No se puede eliminar la clase porque tiene ${enrollmentCount} estudiante(s) inscrito(s)`);
            return;
        }
        
        setClassToDelete(artClass);
        setShowDeleteConfirm(true);
    };

    const performDelete = async () => {
        if (!classToDelete) return;

        try {
            await api.delete(`/arts/classes/${classToDelete.id}`);
            toast.success('Clase eliminada exitosamente');
            fetchClasses();
            setShowDeleteConfirm(false);
            setClassToDelete(null);
        } catch (error) {
            console.error(error);
            toast.error('Error eliminando clase');
        }
    };
    const stats = useMemo(() => {
        if (!classes || classes.length === 0) {
            return {
                total: 0,
                recaudado: 0,
                pendiente: 0,
                inscritos: 0,
                asistenciaPromedio: 0
            };
        }

        let totalRecaudado = 0;
        let totalPendiente = 0;
        let totalInscritos = 0;
        let totalPresencias = 0;
        let totalPosibles = 0;

        classes.forEach(cls => {
            totalInscritos += cls.enrollments?.length || 0;
            cls.enrollments?.forEach(enrollment => {
                totalRecaudado += enrollment.totalPaid || 0;
                totalPendiente += enrollment.balance || 0;
            });

            // Asistencia
            cls.sessions?.forEach(session => {
                const presentCount = session.attendances?.filter(a => a.status === 'PRESENTE' || a.status === 'TARDE').length || 0;
                totalPresencias += presentCount;
                totalPosibles += cls.enrollments?.length || 0;
            });
        });

        const asistenciaPromedio = totalPosibles > 0 ? (totalPresencias / totalPosibles) * 100 : 0;

        return {
            total: classes.length,
            recaudado: totalRecaudado,
            pendiente: totalPendiente,
            inscritos: totalInscritos,
            asistenciaPromedio: Math.round(asistenciaPromedio)
        };
    }, [classes]);

    const canCreateOrDelete = hasFullEditAccess;
    const canViewReport = hasFullEditAccess;

    // Renderizar contenido según vista
    const renderContent = () => {
        if (showReport) {
            return (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reporte de Escuela de Artes</h2>
                        <Button variant="secondary" onClick={() => setShowReport(false)}>
                            Volver a Lista
                        </Button>
                    </div>
                    <ArtSchoolReport classes={classes} />
                </div>
            );
        }

        if (viewMode === 'cards') {
            // Vista de tarjetas (actual)
            return (
                <>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {classes.map((cls) => (
                                <div
                                    key={cls.id}
                                    className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 overflow-hidden relative"
                                >
                                    <div className="absolute top-0 left-0 w-2 h-full bg-purple-500 group-hover:bg-purple-600 transition-colors"></div>

                                    <div className="p-6 pl-8">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold tracking-wider text-purple-600 dark:text-purple-400 uppercase">
                                                {cls.schedule}
                                            </span>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        fetchClassDetails(cls.id);
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors z-10"
                                                    title="Ver clase e inscribir estudiantes"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {canCreateOrDelete && (
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEdit(cls.id);
                                                            }}
                                                            className="p-1 text-gray-400 hover:text-purple-500 transition-colors z-10"
                                                            title="Editar información de la clase"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDelete(e, cls.id)}
                                                            className="p-1 text-gray-400 hover:text-red-500 transition-colors z-10"
                                                            title="Eliminar clase"
                                                        >
                                                            <Trash size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 transition-colors">
                                            {cls.name}
                                        </h3>

                                        {cls.description && (
                                            <p className="text-gray-600 dark:text-gray-300 italic mb-4 line-clamp-2 text-sm">
                                                "{cls.description}"
                                            </p>
                                        )}

                                        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                                <GuitarIcon size={16} className="mr-2 text-purple-500" />
                                                {cls.duration} semanas
                                            </div>
                                            <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                                <Users size={16} className="mr-2 text-purple-500" />
                                                {cls._count?.enrollments || cls.enrollments?.length || 0} Inscritos
                                            </div>
                                            <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                                <MoneyIcon size={16} className="mr-2 text-orange-500" />
                                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(parseFloat(cls.cost) || 0)}
                                            </div>
                                            <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                                <GraduationCap size={16} className="mr-2 text-green-500" />
                                                Prof: {cls.professor?.profile?.fullName || cls.professor?.fullName || 'Sin Asignar'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {classes.length === 0 && (
                                <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                    No hay clases activas.<br />
                                    ¡Crea una nueva clase para comenzar!
                                </div>
                            )}
                        </div>
                    )}
                </>
            );
        }

        // Vista de tabla
        return (
            <div className="animate-fade-in">
                <ArtClassTable
                    classes={classes}
                    onSelect={fetchClassDetails}
                    canModify={canCreateOrDelete}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                />
            </div>
        );
    };

    // Early return if selectedClass is set
    if (selectedClass) {
        return (
            <ArtClassDetails
                    artClass={selectedClass}
                    onBack={() => setSelectedClass(null)}
                    onRefresh={() => fetchClassDetails(selectedClass.id)}
                />
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Escuela de Artes"
                description="Gestión de clases de arte, inscripciones, asistencias y abonos."
                action={
                    <div className="flex items-center gap-4">
                        <CoordinatorSelector 
                            moduleCoordinator={moduleCoordinator}
                            moduleName="Escuela de Artes"
                            onCoordinatorChange={handleCoordinatorChange}
                            disabled={!hasAdminOrPastor}
                        />
                        <SubCoordinatorSelector 
                            moduleSubCoordinator={moduleSubCoordinator}
                            moduleName="Escuela de Artes"
                            onSubCoordinatorChange={handleSubCoordinatorChange}
                            disabled={!hasAdminOrPastor && !isModuleCoordinator}
                            currentUserId={user?.id}
                            isModuleCoordinator={user?.isCoordinator || isCoordinator()}
                        />
                        <TreasurerSelector 
                            moduleTreasurer={moduleTreasurer}
                            moduleName="Escuela de Artes"
                            onTreasurerChange={handleTreasurerChange}
                            disabled={!hasAdminOrPastor && !isModuleCoordinator}
                            currentUserId={user?.id}
                            isModuleCoordinator={user?.isCoordinator || isCoordinator()}
                        />
                    </div>
                }
            />

            {/* Floating Refresh Button */}
            <div className="fixed bottom-8 right-8 z-40">
                <Button
                    variant="primary"
                    size="sm"
                    icon={ArrowsClockwise}
                    onClick={() => window.location.reload()}
                    className="shadow-xl"
                >
                    Actualizar
                </Button>
            </div>

            {/* Estadísticas Resumidas - Solo cuando no estamos en reporte */}
            {!showReport && classes.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg text-purple-600 dark:text-purple-300">
                                <GuitarIcon size={20} />
                            </div>
                            <span className="text-sm font-bold text-purple-800 dark:text-purple-200 uppercase tracking-tight">Total Clases</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-extrabold text-purple-900 dark:text-white">{stats.total}</span>
                            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">Cantidad de Clases Activas</span>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                                <UserIcon size={20} />
                            </div>
                            <span className="text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-tight">Total Inscritos</span>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-blue-900 dark:text-white">{stats.inscritos}</span>
                            </div>
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">Total Inscritos</span>
                        </div>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-lg text-emerald-600 dark:text-emerald-300">
                                <MoneyIcon size={20} />
                            </div>
                            <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-tight">Recaudado</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-extrabold text-emerald-900 dark:text-white">${stats.recaudado.toLocaleString()}</span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">Dinero Recaudado</span>
                        </div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg text-red-600 dark:text-red-300">
                                <MoneyIcon size={20} />
                            </div>
                            <span className="text-sm font-bold text-red-800 dark:text-red-200 uppercase tracking-tight">Pendiente</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-extrabold text-red-900 dark:text-white">${stats.pendiente.toLocaleString()}</span>
                            <span className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">Pendiente por Recaudar</span>
                        </div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg text-amber-600 dark:text-amber-300">
                                <UserCheck size={20} />
                            </div>
                            <span className="text-sm font-bold text-amber-800 dark:text-amber-200 uppercase tracking-tight">Asistencia</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-extrabold text-amber-900 dark:text-white">{stats.asistenciaPromedio}%</span>
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">Promedio de Asistencia</span>
                        </div>
                    </div>
                </div>
            )}
            {/* Toggle de Vista y Reporte */}
            {!showReport && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center p-1.5 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-2xl shadow-inner">
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 text-[12px] font-semibold ${viewMode === 'cards'
                                ? 'bg-[var(--ln-brand-indigo)] text-white shadow-lg shadow-[var(--ln-brand-indigo)]/20 active:scale-95'
                                : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)]'
                            }`}
                        >
                            <SquaresFour size={18} weight="bold" />
                            Tarjetas
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 text-[12px] font-semibold ${viewMode === 'table'
                                ? 'bg-[var(--ln-brand-indigo)] text-white shadow-lg shadow-[var(--ln-brand-indigo)]/20 active:scale-95'
                                : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)]'
                            }`}
                        >
                            <List size={18} weight="bold" />
                            Tabla
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        {canCreateOrDelete && (
                            <Button
                                variant="primary"
                                icon={Plus}
                                onClick={() => setShowCreateModal(true)}
                                className="shadow-sm border-purple-500/30"
                            >
                                Nueva Clase
                            </Button>
                        )}
                        {canViewReport && (
                            <button
                                onClick={() => setShowReport(true)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                                    showReport
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                            >
                                <FileTextIcon size={16} />
                                Ver Reporte
                            </button>
                        )}
                    </div>
                </div>
            )}

            {renderContent()}

            {/* Create Modal */}
            <ActionModal
                isOpen={showCreateModal}
                title="Nueva Clase"
                onClose={() => setShowCreateModal(false)}
                containerClassName="max-w-lg"
                noContentScroll={false}
            >
                <form onSubmit={handleCreate} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la Clase</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Ej: Clase de Guitarra"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            rows={3}
                            placeholder="Descripción de la clase..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo</label>
                            <input
                                type="number"
                                value={formData.cost}
                                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="0"
                                min="0"
                                step="10000"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duración (Horas por clase)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={durationHours}
                                    onChange={(e) => setDurationHours(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="2"
                                    min="0.5"
                                    step="0.5"
                                    required
                                />
                                <span className="absolute right-3 top-2 text-xs text-gray-400 font-medium bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
                                    8 clases totales
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-800 space-y-4">
                        <label className="block text-sm font-bold text-purple-800 dark:text-purple-200">Definir Horario</label>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Día</label>
                                <select 
                                    value={scheduleDay}
                                    onChange={(e) => setScheduleDay(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                                >
                                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                                        <option key={day} value={day}>{day}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Hora Inicio</label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Hora Fin</label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profesor</label>
                            <AsyncSearchSelect
                                fetchItems={(term) => {
                                    if (!term || term.length < 2) return Promise.resolve([]);
                                    const params = { 
                                        search: term,
                                        allowAllRoles: 'true' // Allow any registered user as professor
                                    };
                                    return api.get('/users/search', { params })
                                        .then(res => res.data);
                                }}
                                selectedValue={selectedProfessor}
                                onSelect={(user) => {
                                    setSelectedProfessor(user);
                                    setFormData({ ...formData, professorId: user?.id || null });
                                }}
                                placeholder="Seleccionar profesor..."
                                renderSelected={(user) => (
                                    <div className="flex items-center">
                                        <span className="text-sm text-gray-900 dark:text-gray-100">
                                            {user?.profile?.fullName || user?.fullName || 'Seleccionar profesor...'}
                                        </span>
                                    </div>
                                )}
                                renderItem={(user) => (
                                    <div>
                                        <div className="font-medium">{user?.profile?.fullName || user?.fullName}</div>
                                        <div className="text-xs text-purple-600">{user.roles?.map(r => r.role?.name).join(', ') || 'Sin rol'}</div>
                                    </div>
                                )}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Auxiliar</label>
                            <AsyncSearchSelect
                                fetchItems={(term) => {
                                    if (!term || term.length < 2) return Promise.resolve([]);
                                    const params = { 
                                        search: term,
                                        allowAllRoles: 'true'
                                    };
                                    return api.get('/users/search', { params })
                                        .then(res => res.data);
                                }}
                                selectedValue={selectedCoordinator}
                                onSelect={(user) => {
                                    setSelectedCoordinator(user);
                                    setFormData({ ...formData, coordinatorId: user?.id || null });
                                }}
                                placeholder="Seleccionar auxiliar..."
                                renderSelected={(user) => (
                                    <div className="flex items-center">
                                        <span className="text-sm text-gray-900 dark:text-gray-100">
                                            {user?.profile?.fullName || user?.fullName || 'Seleccionar auxiliar...'}
                                        </span>
                                    </div>
                                )}
                                renderItem={(user) => (
                                    <div>
                                        <div className="font-medium">{user?.profile?.fullName || user?.fullName}</div>
                                        <div className="text-xs text-purple-600">{user.roles?.map(r => r.role?.name).join(', ') || 'Sin rol'}</div>
                                    </div>
                                )}
                            />
                        </div>
                    </div>
                    <div className="pt-4 flex gap-2 sm:gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowCreateModal(false)}
                            className="flex-1 text-sm"
                            size="sm"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            className="flex-1 text-sm"
                            size="sm"
                        >
                            Crear
                        </Button>
                    </div>
                </form>
            </ActionModal>

            {/* Edit Modal */}
            <ActionModal
                isOpen={showEditModal}
                title="Editar Clase"
                onClose={() => {
                    setShowEditModal(false);
                    setClassToEdit(null);
                    setFormData({
                        name: '',
                        description: '',
                        cost: '',
                        duration: '',
                        schedule: '',
                        professorId: null,
                        coordinatorId: null
                    });
                    setSelectedProfessor(null);
                    setSelectedCoordinator(null);
                }}
                containerClassName="max-w-lg"
                noContentScroll={false}
            >
                <form onSubmit={handleUpdate} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la Clase</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            rows={3}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo ($)</label>
                            <input
                                type="number"
                                value={formData.cost}
                                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duración (semanas)</label>
                            <input
                                type="number"
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Horario</label>
                        <input
                            type="text"
                            value={formData.schedule}
                            onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Ej: Sábados 10:00 AM - 12:00 PM"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profesor</label>
                            <AsyncSearchSelect
                                fetchItems={(term) => {
                                    if (!term || term.length < 2) return Promise.resolve([]);
                                    const params = { 
                                        search: term,
                                        allowAllRoles: 'true' // Allow any registered user as professor
                                    };
                                    return api.get('/users/search', { params })
                                        .then(res => res.data);
                                }}
                                selectedValue={selectedProfessor}
                                onSelect={(user) => {
                                    setSelectedProfessor(user);
                                    setFormData({ ...formData, professorId: user?.id || null });
                                }}
                                placeholder="Seleccionar profesor..."
                                renderSelected={(user) => (
                                    <div className="flex items-center">
                                        <span className="text-sm text-gray-900 dark:text-gray-100">
                                            {user?.profile?.fullName || user?.fullName || 'Seleccionar profesor...'}
                                        </span>
                                    </div>
                                )}
                                renderItem={(user) => (
                                    <div>
                                        <div className="font-medium">{user?.profile?.fullName || user?.fullName}</div>
                                        <div className="text-xs text-purple-600">{user.roles?.map(r => r.role?.name).join(', ') || 'Sin rol'}</div>
                                    </div>
                                )}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Auxiliar</label>
                            <AsyncSearchSelect
                                fetchItems={(term) => {
                                    if (!term || term.length < 2) return Promise.resolve([]);
                                    const params = { 
                                        search: term,
                                        allowAllRoles: 'true'
                                    };
                                    return api.get('/users/search', { params })
                                        .then(res => res.data);
                                }}
                                selectedValue={selectedCoordinator}
                                onSelect={(user) => {
                                    setSelectedCoordinator(user);
                                    setFormData({ ...formData, coordinatorId: user?.id || null });
                                }}
                                placeholder="Seleccionar auxiliar..."
                                renderSelected={(user) => (
                                    <div className="flex items-center">
                                        <span className="text-sm text-gray-900 dark:text-gray-100">
                                            {user?.profile?.fullName || user?.fullName || 'Seleccionar auxiliar...'}
                                        </span>
                                    </div>
                                )}
                                renderItem={(user) => (
                                    <div>
                                        <div className="font-medium">{user?.profile?.fullName || user?.fullName}</div>
                                        <div className="text-xs text-purple-600">{user.roles?.map(r => r.role?.name).join(', ') || 'Sin rol'}</div>
                                    </div>
                                )}
                            />
                        </div>
                    </div>
                    <div className="pt-4 flex gap-2 sm:gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setShowEditModal(false);
                                setClassToEdit(null);
                                setFormData({
                                    name: '',
                                    description: '',
                                    cost: '',
                                    duration: '',
                                    schedule: '',
                                    professorId: null,
                                    coordinatorId: null
                                });
                            }}
                            className="flex-1 text-sm"
                            size="sm"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            className="flex-1 text-sm"
                            size="sm"
                        >
                            Actualizar
                        </Button>
                    </div>
                </form>
            </ActionModal>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setClassToDelete(null);
                }}
                onConfirm={performDelete}
                title="Eliminar Clase"
                message="¿Estás seguro de eliminar esta clase?"
                confirmText="Eliminar Clase"
                confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
            >
                {classToDelete && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Clase:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{classToDelete.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Horario:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{classToDelete.schedule}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Inscritos:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{classToDelete._count?.enrollments || classToDelete.enrollments?.length || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Profesor:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{classToDelete.professor?.fullName || 'Sin asignar'}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                        <div className="text-red-600 dark:text-red-400 mt-0.5">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="text-red-800 dark:text-red-200 font-semibold mb-1">
                                ⚠️ Acción Irreversible
                            </h4>
                            <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
                                <li>• Se eliminará la clase completa</li>
                                <li>• Se perderán todos los registros de inscritos</li>
                                <li>• Se perderán todos los pagos y abonos asociados</li>
                                <li>• No se puede deshacer esta acción</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </ConfirmationModal>
        </div>
    );
};

export default EscuelaDeArtes;
