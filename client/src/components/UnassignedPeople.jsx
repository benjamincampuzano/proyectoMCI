import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    MagnifyingGlass, User, Phone, Users, Funnel,
    X, FileXls, Spinner, IdentificationCard, Trash,
    SuitcaseSimple, TreeStructure, UserPlus, Clock, MapPin
} from '@phosphor-icons/react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import api from '../utils/api';
import { Card, DataTable, Badge, Input, Button, AsyncSearchSelect, Modal } from './ui';
import { ROLE_DISPLAY_NAMES } from '../constants/roles';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const UnassignedPeople = () => {
    const { hasAnyRole } = useAuth();
    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [cells, setCells] = useState([]);

    // Assignment state
    const [assigningPerson, setAssigningPerson] = useState(null);
    const [selectedCellId, setSelectedCellId] = useState('');
    const [assigning, setAssigning] = useState(false);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [liderDoceFilter, setLiderDoceFilter] = useState(null);
    const [roleFilter, setRoleFilter] = useState('');
    const [networkFilter, setNetworkFilter] = useState('');

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        pages: 0
    });

    const fetchPeople = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const response = await api.get('/users/without-cell', {
                params: {
                    page,
                    search: searchTerm,
                    limit: pagination.limit,
                    liderDoceId: liderDoceFilter?.id,
                    role: roleFilter,
                    network: networkFilter
                }
            });
            setPeople(response.data.users);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error fetching unassigned people:', error);
            toast.error('Error al cargar el listado');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, pagination.limit, liderDoceFilter, roleFilter, networkFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPeople(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, liderDoceFilter, roleFilter, networkFilter, fetchPeople]);

    // Load available cells once (to offer assignment options)
    useEffect(() => {
        api.get('/enviar/cells')
            .then(res => setCells(res.data || []))
            .catch(err => console.error('Error fetching cells:', err));
    }, []);

    const getPersonLiderDoce = (person) => {
        const hierarchyLiderDoce = person.hierarchy?.find(h => h.role === 'LIDER_DOCE');
        return {
            id: person.liderDoceId || hierarchyLiderDoce?.parentId || null,
            name: hierarchyLiderDoce?.parentName || person.liderDoceName || 'Sin red'
        };
    };

    // Only cells belonging to the person's LIDER_DOCE network
    const getEligibleCells = (person) => {
        const liderDoceId = getPersonLiderDoce(person).id;
        if (!liderDoceId) return [];
        return cells.filter(cell => cell.liderDoceId === liderDoceId);
    };

    const openAssignModal = (person) => {
        setAssigningPerson(person);
        setSelectedCellId('');
        const eligible = getEligibleCells(person);
        if (eligible.length === 1) setSelectedCellId(eligible[0].id);
    };

    const handleAssignToCell = async () => {
        if (!assigningPerson || !selectedCellId) return;
        setAssigning(true);
        try {
            await api.post(`/enviar/cells/${selectedCellId}/members`, { memberId: assigningPerson.id });
            toast.success(`${assigningPerson.fullName || assigningPerson.email} asignado a la célula exitosamente`);
            setAssigningPerson(null);
            fetchPeople(1);
        } catch (error) {
            const msg = error.response?.data?.error || error.response?.data?.message || 'Error al asignar a la célula';
            toast.error(msg);
        } finally {
            setAssigning(false);
        }
    };

    const eligibleCells = useMemo(() => {
        if (!assigningPerson) return [];
        const liderDoceId = getPersonLiderDoce(assigningPerson).id;
        if (!liderDoceId) return [];
        return cells.filter(cell => cell.liderDoceId === liderDoceId);
    }, [assigningPerson, cells]);

    const clearFilters = () => {
        setSearchTerm('');
        setLiderDoceFilter(null);
        setRoleFilter('');
        setNetworkFilter('');
    };

    const exportToExcel = async () => {
        setExporting(true);
        try {
            const response = await api.get('/users/without-cell', {
                params: {
                    all: 'true',
                    search: searchTerm,
                    liderDoceId: liderDoceFilter?.id,
                    role: roleFilter,
                    network: networkFilter
                }
            });

            const allPeople = response.data.users;

            if (allPeople.length === 0) {
                toast.error('No hay datos para exportar');
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Personas sin Célula');

            worksheet.columns = [
                { header: 'Nombre Completo', key: 'fullName', width: 30 },
                { header: 'Email', key: 'email', width: 25 },
                { header: 'Teléfono', key: 'phone', width: 15 },
                { header: 'Rol', key: 'roles', width: 20 },
                { header: 'Red', key: 'network_type', width: 15 },
                { header: 'Líder de 12', key: 'network', width: 25 }
            ];

            allPeople.forEach(person => {
                const liderDoce = person.hierarchy?.find(h => h.role === 'LIDER_DOCE');
                worksheet.addRow({
                    fullName: person.profile?.fullName || 'N/A',
                    email: person.email || 'N/A',
                    phone: person.phone || 'N/A',
                    roles: person.roles?.map(r => ROLE_DISPLAY_NAMES[r] || r).join(', ') || 'N/A',
                    network_type: person.profile?.network || 'N/A',
                    network: liderDoce?.parentName || 'Sin red'
                });
            });

            // Style headers
            const headerRow = worksheet.getRow(1);
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF5E6AD2' }
                };
                cell.alignment = { horizontal: 'center' };
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `personas_sin_celula_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success('Excel exportado correctamente');
        } catch (error) {
            console.error('Error exporting to excel:', error);
            toast.error('Error al exportar a Excel');
        } finally {
            setExporting(false);
        }
    };

    const hasActiveFilters = searchTerm || liderDoceFilter || roleFilter || networkFilter;

    const columns = [
        {
            key: 'fullName',
            title: 'Nombre Completo',
            render: (value, row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--ln-accent-violet)]/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-[var(--ln-accent-violet)]" />
                    </div>
                    <div>
                        <div className="font-medium text-[var(--ln-text-primary)]">{value}</div>
                        <div className="text-xs text-[var(--ln-text-tertiary)]">{row.email}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'phone',
            title: 'Teléfono',
            render: (value) => (
                <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[var(--ln-text-tertiary)]" />
                    <span>{value || 'N/A'}</span>
                </div>
            )
        },
        {
            key: 'roles',
            title: 'Rol',
            render: (roles) => (
                <div className="flex flex-wrap gap-1">
                    {roles.map(role => (
                        <Badge
                            key={role}
                            variant={role === 'ADMIN' ? 'danger' : role === 'PASTOR' ? 'warning' : 'primary'}
                        >
                            {ROLE_DISPLAY_NAMES[role] || role}
                        </Badge>
                    ))}
                </div>
            )
        },
        {
            key: 'profile',
            title: 'Red',
            render: (profile) => (
                <Badge variant="secondary">
                    {profile?.network || 'N/A'}
                </Badge>
            )
        },
        {
            key: 'hierarchy',
            title: 'Líder de 12',
            render: (hierarchy) => {
                const liderDoce = hierarchy?.find(h => h.role === 'LIDER_DOCE');
                return liderDoce ? (
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[var(--ln-text-tertiary)]" />
                        <span>{liderDoce.parentName}</span>
                    </div>
                ) : <span className="text-[var(--ln-text-tertiary)]">Sin red</span>;
            }
        },
        {
            key: 'actions',
            title: 'Acciones',
            render: (_, row) => (
                <Button
                    variant="secondary"
                    size="sm"
                    icon={UserPlus}
                    onClick={() => openAssignModal(row)}
                    className="whitespace-nowrap"
                >
                    Asignar a Célula
                </Button>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-[var(--ln-text-primary)]">Personas sin Célula</h3>
                    <p className="text-[var(--ln-text-tertiary)] text-sm">
                        Listado de discípulos y líderes que no han sido asignados a ninguna célula activa.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => setShowFilters(!showFilters)}
                        className={hasActiveFilters ? 'border-[var(--ln-brand-indigo)] text-[var(--ln-brand-indigo)]' : ''}
                        icon={Funnel}
                    >
                        {showFilters ? 'Ocultar Filtros' : 'Filtros'}
                        {hasActiveFilters && (
                            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[var(--ln-brand-indigo)] text-white text-[10px]">
                                {[searchTerm, liderDoceFilter, roleFilter, networkFilter].filter(Boolean).length}
                            </span>
                        )}
                    </Button>

                    <Button
                        variant="primary"
                        onClick={exportToExcel}
                        loading={exporting}
                        icon={FileXls}
                        className="bg-green-600 hover:bg-green-700 border-none"
                    >
                        Exportar Excel
                    </Button>
                </div>
            </div>

            {showFilters && (
                <Card className="p-4 bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.08)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-[var(--ln-text-tertiary)] uppercase tracking-wider">
                                Búsqueda
                            </label>
                            <div className="relative">
                                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ln-text-tertiary)]" size={16} />
                                <Input
                                    className="pl-9 h-9 text-sm"
                                    placeholder="Nombre, email o tel..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-[var(--ln-text-tertiary)] uppercase tracking-wider">
                                Líder de 12
                            </label>
                            <AsyncSearchSelect
                                fetchItems={(term) => {
                                    const searchRoles = hasAnyRole(['ADMIN', 'PASTOR']) ? "LIDER_DOCE,PASTOR" : "LIDER_DOCE";
                                    return api.get('/users/search', { params: { search: term, role: searchRoles } })
                                        .then(res => res.data);
                                }}
                                selectedValue={liderDoceFilter}
                                onSelect={(u) => setLiderDoceFilter(u)}
                                placeholder="Buscar líder..."
                                labelKey="fullName"
                                className="h-9"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-[var(--ln-text-tertiary)] uppercase tracking-wider">
                                Rol
                            </label>
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="w-full h-9 px-3 text-sm rounded-md bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[var(--ln-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ln-accent-violet)]"
                            >
                                <option value="">Todos los roles</option>
                                <option value="DISCIPULO">Discípulo</option>
                                <option value="LIDER_CELULA">Líder de Célula</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-[var(--ln-text-tertiary)] uppercase tracking-wider">
                                Red
                            </label>
                            <select
                                value={networkFilter}
                                onChange={(e) => setNetworkFilter(e.target.value)}
                                className="w-full h-9 px-3 text-sm rounded-md bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[var(--ln-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ln-accent-violet)]"
                            >
                                <option value="">Todas las redes</option>
                                <option value="MUJERES">Mujeres</option>
                                <option value="HOMBRES">Hombres</option>
                                <option value="JOVENES">Jóvenes</option>
                                <option value="KIDS">Kids</option>
                                <option value="ROCAS">Rocas</option>
                                <option value="TEENS">Teens</option>
                            </select>
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <div className="mt-4 pt-4 border-t border-[var(--ln-border-standard)] flex justify-end">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                icon={Trash}
                                className="text-red-500 hover:text-red-600 hover:bg-red-500/5"
                            >
                                Limpiar Filtros
                            </Button>
                        </div>
                    )}
                </Card>
            )}

            <Card className="p-0 overflow-hidden">
                {/* Desktop table */}
                <div className="hidden md:block">
                    <DataTable
                        columns={columns}
                        data={people}
                        loading={loading}
                        pagination={true}
                        pageSize={pagination.limit}
                        emptyMessage={hasActiveFilters ? "No se encontraron personas con los filtros aplicados." : "No hay personas registradas sin célula."}
                    />
                </div>

                {/* Mobile list (vertical cards) */}
                <div className="md:hidden">
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <Spinner className="w-6 h-6 animate-spin text-[var(--ln-accent-violet)]" weight="bold" />
                        </div>
                    ) : people.length === 0 ? (
                        <div className="px-4 py-12 text-center text-[var(--ln-text-tertiary)]">
                            {hasActiveFilters ? "No se encontraron personas con los filtros aplicados." : "No hay personas registradas sin célula."}
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--ln-border-standard)]">
                            {people.map(person => {
                                const liderDoce = getPersonLiderDoce(person);
                                return (
                                    <div key={person.id} className="p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="w-9 h-9 rounded-full bg-[var(--ln-accent-violet)]/10 flex items-center justify-center flex-shrink-0">
                                                    <User className="w-4 h-4 text-[var(--ln-accent-violet)]" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-[var(--ln-text-primary)] break-words">{person.fullName || 'N/A'}</p>
                                                    <p className="text-xs text-[var(--ln-text-tertiary)] truncate">{person.email}</p>
                                                </div>
                                            </div>
                                            <Badge variant="secondary" className="flex-shrink-0">
                                                {person.network || 'N/A'}
                                            </Badge>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5">
                                            {person.roles?.map(role => (
                                                <Badge
                                                    key={role}
                                                    variant={role === 'ADMIN' ? 'error' : role === 'PASTOR' ? 'warning' : 'primary'}
                                                >
                                                    {ROLE_DISPLAY_NAMES[role] || role}
                                                </Badge>
                                            ))}
                                        </div>

                                        <div className="space-y-1.5 text-sm text-[var(--ln-text-tertiary)]">
                                            <p className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 flex-shrink-0" />
                                                <span className="truncate">{person.phone || 'N/A'}</span>
                                            </p>
                                            <p className="flex items-center gap-2 min-w-0">
                                                <Users className="w-4 h-4 flex-shrink-0" />
                                                <span className="truncate">Líder 12: {liderDoce.name || 'Sin red'}</span>
                                            </p>
                                        </div>

                                        <div className="pt-2 border-t border-[var(--ln-border-standard)]">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                icon={UserPlus}
                                                onClick={() => openAssignModal(person)}
                                                className="w-full"
                                            >
                                                Asignar a Célula
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Card>

            {/* Assign to Cell Modal */}
            <Modal
                isOpen={!!assigningPerson}
                onClose={() => setAssigningPerson(null)}
                title="Asignar a Célula"
                size="md"
            >
                {assigningPerson && (
                    <div className="space-y-4">
                        <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-lg p-4 space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[var(--ln-accent-violet)]/10 flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 text-[var(--ln-accent-violet)]" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-medium text-[var(--ln-text-primary)] break-words">{assigningPerson.fullName || 'N/A'}</p>
                                    <p className="text-xs text-[var(--ln-text-tertiary)] truncate">{assigningPerson.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-[var(--ln-text-tertiary)]">
                                <Users className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">Líder 12: {getPersonLiderDoce(assigningPerson).name}</span>
                            </div>
                        </div>

                        {eligibleCells.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-[var(--ln-text-tertiary)] bg-[rgba(255,255,255,0.02)] border border-dashed border-[rgba(255,255,255,0.1)] rounded-lg">
                                <TreeStructure className="w-6 h-6 mx-auto mb-2 opacity-60" />
                                <p className="font-medium text-[var(--ln-text-secondary)] mb-1">No hay células disponibles</p>
                                <p>
                                    {getPersonLiderDoce(assigningPerson).id
                                        ? 'Este usuario no tiene acceso a células de la red de su Líder 12, o no hay células creadas en esa red.'
                                        : 'Este usuario no tiene un Líder 12 asignado, por lo que no puede ingresarse a una célula.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-[var(--ln-text-tertiary)] uppercase tracking-wider">
                                    Selecciona una célula de su red
                                </label>
                                <select
                                    value={selectedCellId}
                                    onChange={(e) => setSelectedCellId(e.target.value)}
                                    className="w-full h-10 px-3 text-sm rounded-md bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[var(--ln-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ln-accent-violet)]"
                                >
                                    <option value="">Selecciona una célula...</option>
                                    {eligibleCells.map(cell => (
                                        <option key={cell.id} value={cell.id}>
                                            {cell.name} - {cell.dayOfWeek} {cell.time} (Líder: {cell.leader?.fullName || 'N/A'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setAssigningPerson(null)}>
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleAssignToCell}
                                disabled={!selectedCellId || assigning}
                                loading={assigning}
                                icon={UserPlus}
                            >
                                Asignar
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default UnassignedPeople;
