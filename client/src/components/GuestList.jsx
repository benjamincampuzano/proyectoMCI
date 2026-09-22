import { useState, useEffect, useCallback, useRef } from 'react';
import { UserCheckIcon } from '@phosphor-icons/react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Button } from './ui';
import useGuestManagement from '../hooks/useGuestManagement';
import { useAuth } from '../hooks/useAuth';
import { DATA_POLICY_URL } from '../constants/policies';
import { getWhatsAppPhone } from '../utils/phone';
import { getGuestStatusLabel } from '../utils/guestFollowUp';
import {
  canRegisterFollowUp,
  canSendWhatsApp,
  canDeleteFollowUp,
  canEditGuest,
  canConvertGuest,
  canDeleteGuest,
} from '../utils/guestPermissions';
import GuestEditModal from './GuestEditModal';
import ConfirmationModal from './ConfirmationModal';
import GuestFilters from './guests/GuestFilters';
import GuestTable from './guests/GuestTable';
import GuestCard from './guests/GuestCard';
import GuestDetailModal from './guests/GuestDetailModal';
import FollowUpModal from './guests/FollowUpModal';
import WhatsAppModal from './guests/WhatsAppModal';
import GuestFollowUpHistoryModal from './guests/GuestFollowUpHistoryModal';

/**
 * GuestList — vista única por invitado (lista + seguimiento fusionados).
 * Usa el único estado de filtros/consulta/paginación de useGuestManagement;
 * las acciones de llamada/visita/WhatsApp viven en el hook, no en un
 * fetchGuests independiente.
 */
const GuestList = ({ refreshTrigger }) => {
  const auth = useAuth();
  const { isCoordinator, isSubCoordinator, isTreasurer, isDoceLeader, user } = auth;
  const isModuleCoordinator = isCoordinator('ganar');
  const {
    guests,
    loading,
    error,
    setError,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    invitedByFilter,
    setInvitedByFilter,
    liderDoceFilter,
    setLiderDoceFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    pendingCalls,
    setPendingCalls,
    pendingVisits,
    setPendingVisits,
    alreadyCalled,
    setAlreadyCalled,
    alreadyVisited,
    setAlreadyVisited,
    currentUser,
    fetchAllGuests,
    updateGuest,
    deleteGuest,
    convertGuestToMember,
    registerCall,
    registerVisit,
    deleteCall,
    deleteVisit,
    refreshCurrentPage,
    setCurrentPage,
    guestsPerPage,
    pagination,
  } = useGuestManagement({ refreshTrigger });

  // Modal unificado: { type, guest, data }
  // type: 'edit' | 'delete' | 'convert' | 'call' | 'visit' | 'whatsapp' | 'history' | 'detail'
  const [activeModal, setActiveModal] = useState(null);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null); // { kind: 'call'|'visit', record }
  const [isExporting, setIsExporting] = useState(false);
  const autoLiderDoceFilterAppliedRef = useRef(false);

  const userId = user?.id;
  const userRoles = user?.roles;
  const userFullName = user?.profile?.fullName;
  const userEmail = user?.email;

  useEffect(() => {
    const roles = Array.isArray(userRoles) ? userRoles : [];
    const isDoceLeaderRole = roles.includes('LIDER_DOCE');
    const isSubCoordGanar = isSubCoordinator('ganar');
    const isTreasurerGanar = isTreasurer('ganar');
    const isModuleRole = isModuleCoordinator || isSubCoordGanar || isTreasurerGanar;

    if (isDoceLeaderRole && !isModuleRole && userId) {
      if (liderDoceFilter?.id !== userId) {
        setLiderDoceFilter({ id: userId, fullName: userFullName || userEmail });
      }
      autoLiderDoceFilterAppliedRef.current = true;
      return;
    }
    if (autoLiderDoceFilterAppliedRef.current && isModuleRole && liderDoceFilter?.id === userId) {
      setLiderDoceFilter(null);
      autoLiderDoceFilterAppliedRef.current = false;
    }
  }, [userId, userRoles, isModuleCoordinator, isSubCoordinator, isTreasurer, userFullName, userEmail, liderDoceFilter, setLiderDoceFilter]);

  const openModal = useCallback((type, guest) => {
    const data = {};
    if (type === 'convert') {
      data.email = '';
      data.password = '';
      data.dataPolicyAccepted = false;
      data.dataTreatmentAuthorized = false;
    }
    setActiveModal({ type, guest, data });
  }, []);

  const updateModalData = useCallback((newData) => {
    setActiveModal((prev) => (prev ? { ...prev, data: { ...prev.data, ...newData } } : prev));
  }, []);

  const handleGuestUpdated = useCallback(() => {
    refreshCurrentPage();
    setActiveModal(null);
  }, [refreshCurrentPage]);

  const handleConfirmDelete = useCallback(async () => {
    if (!activeModal?.guest) return;
    await deleteGuest(activeModal.guest.id);
    setActiveModal(null);
  }, [activeModal, deleteGuest]);

  const handleConvertToMember = useCallback(async () => {
    if (!activeModal?.data?.email || !activeModal?.data?.password) {
      setError('Email y contraseña son requeridos');
      return;
    }
    if (!activeModal?.data?.dataPolicyAccepted || !activeModal?.data?.dataTreatmentAuthorized) {
      setError('Debe aceptar la política y autorizar el tratamiento de datos');
      return;
    }
    if (!activeModal?.guest) return;
    try {
      const res = await convertGuestToMember(activeModal.guest.id, {
        email: activeModal.data.email,
        password: activeModal.data.password,
        dataPolicyAccepted: activeModal.data.dataPolicyAccepted,
        dataTreatmentAuthorized: activeModal.data.dataTreatmentAuthorized,
      });
      if (!res.success) return;
      toast.success('Invitado consolidado a Discípulo exitosamente');
      setActiveModal(null);
    } catch (err) {
      setError(err.message || 'Error al convertir invitado');
    }
  }, [activeModal, convertGuestToMember, setError]);

  // --- Seguimiento (migrado desde GuestTracking al hook único) ---
  const selectedGuest = activeModal?.guest
    ? guests.find((g) => g.id === activeModal.guest.id) || activeModal.guest
    : null;

  const editorUser = currentUser || user;
  const detailCanEdit = canEditGuest(editorUser, auth);
  const detailCanEditAllFields = ['ADMIN', 'LIDER_DOCE'].some((r) => (editorUser?.roles || []).includes(r));

  const handleDetailSubmitEdit = useCallback(
    async (values) => {
      if (!selectedGuest) return;
      const res = await updateGuest(selectedGuest.id, values);
      if (!res.success) {
        toast.error(res.message || 'Error al actualizar invitado');
        throw new Error(res.message || 'Error al actualizar invitado');
      }
      toast.success('Invitado actualizado exitosamente');
    },
    [selectedGuest, updateGuest]
  );

  const handleSubmitFollowUp = useCallback(
    async ({ date, observation }) => {
      if (!selectedGuest) return;
      setSavingFollowUp(true);
      try {
        const res =
          activeModal?.type === 'call'
            ? await registerCall(selectedGuest.id, { date, observation })
            : await registerVisit(selectedGuest.id, { date, observation });
        if (res.success) {
          toast.success(activeModal?.type === 'call' ? 'Llamada registrada' : 'Visita registrada');
          setActiveModal(null);
        } else {
          toast.error(res.message || 'Error al guardar');
        }
      } finally {
        setSavingFollowUp(false);
      }
    },
    [selectedGuest, activeModal, registerCall, registerVisit]
  );

  const handleSendWhatsApp = useCallback(
    async ({ stage, previewText }) => {
      if (!selectedGuest) return;
      if (!previewText?.trim()) {
        toast.error('El mensaje no puede estar vacío');
        return;
      }
      setSendingWhatsApp(true);
      try {
        await registerCall(selectedGuest.id, {
          date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          observation: `[WhatsApp - ${stage || 'Personalizado'}] ${previewText}`,
        });
        toast.success('Mensaje registrado exitosamente');
      } catch {
        toast.error('El mensaje se abrirá, pero hubo un error al registrarlo.');
      } finally {
        setSendingWhatsApp(false);
      }
      const text = encodeURIComponent(previewText);
      window.open(`https://wa.me/${getWhatsAppPhone(selectedGuest.phone)}?text=${text}`, '_blank');
      setActiveModal(null);
    },
    [selectedGuest, registerCall]
  );

  const handleConfirmDeleteRecord = useCallback(async () => {
    if (!selectedGuest || !recordToDelete) return;
    const res =
      recordToDelete.kind === 'call'
        ? await deleteCall(selectedGuest.id, recordToDelete.record.id)
        : await deleteVisit(selectedGuest.id, recordToDelete.record.id);
    if (res.success) {
      toast.success(recordToDelete.kind === 'call' ? 'Llamada eliminada' : 'Visita eliminada');
      setRecordToDelete(null);
    } else {
      toast.error(res.message || 'Error al eliminar');
    }
  }, [selectedGuest, recordToDelete, deleteCall, deleteVisit]);

  const actionsFor = useCallback(
    (guest) => ({
      canFollowUp: canRegisterFollowUp(currentUser || user),
      canWhatsApp: canSendWhatsApp(currentUser || user, auth) && !!guest?.phone,
      canEdit: canEditGuest(currentUser || user, auth),
      canConvert: canConvertGuest(currentUser || user),
      canDelete: canDeleteGuest(currentUser || user, auth),
    }),
    [currentUser, user, auth]
  );

  const actionHandlers = {
    onCall: (guest) => openModal('call', guest),
    onVisit: (guest) => openModal('visit', guest),
    onWhatsApp: (guest) => openModal('whatsapp', guest),
    onHistory: (guest) => openModal('history', guest),
    onEdit: (guest) => openModal('edit', guest),
    onConvert: (guest) => openModal('convert', guest),
    onDelete: (guest) => openModal('delete', guest),
  };

  const calculateAge = useCallback((birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }, []);

  const canExport = useCallback(() => {
    const roles = currentUser?.roles || [];
    const hasRoleAccess = roles.includes('ADMIN') || roles.includes('PASTOR') || roles.includes('LIDER_DOCE');
    return hasRoleAccess || isModuleCoordinator || isSubCoordinator('ganar') || isTreasurer('ganar');
  }, [currentUser, isModuleCoordinator, isSubCoordinator, isTreasurer]);

  const showLiderDoceFilter = !isDoceLeader() || isModuleCoordinator;

  const exportToExcel = useCallback(async () => {
    setIsExporting(true);
    try {
      const hasFullModuleAccess = isModuleCoordinator || isSubCoordinator('ganar') || isTreasurer('ganar');
      const allGuests = await fetchAllGuests({ ignoreNetworkFilter: hasFullModuleAccess });
      if (allGuests.length === 0) {
        toast.error('No hay datos para exportar');
        return;
      }
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Invitados');
      worksheet.columns = [
        { header: 'Fecha Creación', key: 'createdAt', width: 15 },
        { header: 'Registrado Por', key: 'registeredBy', width: 20 },
        { header: 'Nombre', key: 'name', width: 25 },
        { header: 'Edad', key: 'age', width: 8 },
        { header: 'Teléfono', key: 'phone', width: 15 },
        { header: 'Dirección', key: 'address', width: 30 },
        { header: 'Petición de Oración', key: 'prayerRequest', width: 40 },
        { header: 'Estado', key: 'status', width: 12 },
        { header: 'Líder Doce', key: 'liderDoce', width: 20 },
        { header: 'Invitado Por', key: 'invitedBy', width: 20 },
        { header: 'Asignado a', key: 'assignedTo', width: 20 },
        { header: 'Célula', key: 'cell', width: 20 },
        { header: 'Líder de Célula', key: 'cellLeader', width: 20 },
        { header: 'Encuentro', key: 'encuentro', width: 30 },
      ];
      allGuests.forEach((guest) => {
        worksheet.addRow({
          createdAt: guest.createdAt ? new Date(guest.createdAt).toLocaleDateString('es-ES') : 'N/A',
          registeredBy: guest.registeredBy?.fullName || 'N/A',
          name: guest.name || 'N/A',
          age: calculateAge(guest.birthDate) || 'N/A',
          phone: guest.phone || 'N/A',
          address: guest.address || 'N/A',
          prayerRequest: guest.prayerRequest || 'N/A',
          status: getGuestStatusLabel(guest.status) || 'N/A',
          liderDoce: guest.assignedTo?.liderDoce?.fullName || guest.invitedBy?.liderDoce?.fullName || 'N/A',
          invitedBy: guest.invitedBy?.fullName || 'N/A',
          assignedTo: guest.assignedTo?.fullName || 'Pendiente',
          cell: guest.cell?.name || 'No asignado',
          cellLeader: guest.cell?.leader?.fullName || 'N/A',
          encuentro: guest.encuentroRegistrations?.map((r) => r.encuentro?.name || r.encuentro?.type).join(', ') || 'No registrado',
        });
      });
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `invitados_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(`Exportados ${allGuests.length} invitados a Excel`);
    } catch (err) {
      toast.error(err.message || 'Error al exportar invitados');
    } finally {
      setIsExporting(false);
    }
  }, [fetchAllGuests, calculateAge, isModuleCoordinator, isSubCoordinator, isTreasurer]);

  return (
    <div className="bg-[var(--ln-bg-panel)] border border-[var(--ln-border-subtle)] rounded-xl p-6 transition-colors">
      <h2 className="text-2xl font-[590] text-[var(--ln-text-primary)] tracking-[-0.288px] mb-6">Invitados</h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-[var(--ln-text-primary)] px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <GuestFilters
        searchTerm={searchTerm}
        setSearchTerm={(v) => { setSearchTerm(v); setCurrentPage(1); }}
        statusFilter={statusFilter}
        setStatusFilter={(v) => { setStatusFilter(v); setCurrentPage(1); }}
        invitedByFilter={invitedByFilter}
        setInvitedByFilter={(v) => { setInvitedByFilter(v); setCurrentPage(1); }}
        liderDoceFilter={liderDoceFilter}
        setLiderDoceFilter={(v) => { setLiderDoceFilter(v); setCurrentPage(1); }}
        startDate={startDate}
        setStartDate={(v) => { setStartDate(v); setCurrentPage(1); }}
        endDate={endDate}
        setEndDate={(v) => { setEndDate(v); setCurrentPage(1); }}
        pendingCalls={pendingCalls}
        setPendingCalls={(v) => { setPendingCalls(v); setCurrentPage(1); }}
        pendingVisits={pendingVisits}
        setPendingVisits={(v) => { setPendingVisits(v); setCurrentPage(1); }}
        alreadyCalled={alreadyCalled}
        setAlreadyCalled={(v) => { setAlreadyCalled(v); setCurrentPage(1); }}
        alreadyVisited={alreadyVisited}
        setAlreadyVisited={(v) => { setAlreadyVisited(v); setCurrentPage(1); }}
        showLiderDoceFilter={showLiderDoceFilter}
        total={pagination?.total ?? guests.length}
        currentUser={currentUser}
        onExport={canExport() ? exportToExcel : null}
        isExporting={isExporting}
        exportDisabled={loading || guests.length === 0}
      />

      <GuestTable
        guests={guests}
        loading={loading}
        pagination={pagination}
        pageSize={guestsPerPage}
        onPageChange={setCurrentPage}
        onOpenDetail={(guest) => openModal('detail', guest)}
        actionsFor={actionsFor}
        actionHandlers={actionHandlers}
      />

      <GuestCard
        guests={guests}
        loading={loading}
        pagination={pagination}
        pageSize={guestsPerPage}
        onPageChange={setCurrentPage}
        onOpenDetail={(guest) => openModal('detail', guest)}
        actionsFor={actionsFor}
        actionHandlers={actionHandlers}
      />

      {/* Modal de detalle */}
      <GuestDetailModal
        guest={selectedGuest}
        isOpen={activeModal?.type === 'detail'}
        onClose={() => setActiveModal(null)}
        onSubmitEdit={handleDetailSubmitEdit}
        canEdit={detailCanEdit}
        canEditAllFields={detailCanEditAllFields}
      />

      {/* Registrar llamada / visita */}
      {(activeModal?.type === 'call' || activeModal?.type === 'visit') && selectedGuest && (
        <FollowUpModal
          type={activeModal.type}
          guest={selectedGuest}
          saving={savingFollowUp}
          onClose={() => setActiveModal(null)}
          onSubmit={handleSubmitFollowUp}
        />
      )}

      {/* WhatsApp */}
      {activeModal?.type === 'whatsapp' && selectedGuest && (
        <WhatsAppModal
          guest={selectedGuest}
          user={currentUser || user}
          sending={sendingWhatsApp}
          onClose={() => setActiveModal(null)}
          onSend={handleSendWhatsApp}
        />
      )}

      {/* Historial */}
      {activeModal?.type === 'history' && selectedGuest && (
        <GuestFollowUpHistoryModal
          guest={selectedGuest}
          canDeleteRecords={canDeleteFollowUp(currentUser || user, auth)}
          onClose={() => setActiveModal(null)}
          onDeleteCall={(call) => setRecordToDelete({ kind: 'call', record: call })}
          onDeleteVisit={(visit) => setRecordToDelete({ kind: 'visit', record: visit })}
        />
      )}

      {/* Confirmar borrado de llamada/visita */}
      <ConfirmationModal
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirm={handleConfirmDeleteRecord}
        title={recordToDelete?.kind === 'call' ? 'Eliminar Llamada' : 'Eliminar Visita'}
        message={`¿Estás seguro de que deseas eliminar este registro de ${recordToDelete?.kind === 'call' ? 'llamada' : 'visita'}?`}
        confirmText={recordToDelete?.kind === 'call' ? 'Eliminar Llamada' : 'Eliminar Visita'}
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
      />

      {/* Modal para convertir a Discípulo */}
      {activeModal?.type === 'convert' && activeModal.guest && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.85)] backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--ln-bg-surface)] border border-[var(--ln-border-standard)] rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-[590] text-[var(--ln-text-primary)] tracking-[-0.24px] mb-4">
              Convertir a Discípulo: {activeModal.guest.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)] mb-1.5">Email</label>
                <input
                  type="email"
                  value={activeModal?.data?.email}
                  onChange={(e) => updateModalData({ email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-md text-[var(--ln-text-primary)]"
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-[12px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)] mb-1.5">Contraseña</label>
                <input
                  type="password"
                  value={activeModal?.data?.password}
                  onChange={(e) => updateModalData({ password: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-md text-[var(--ln-text-primary)]"
                  placeholder="Contraseña"
                />
              </div>
              <div className="bg-[var(--ln-bg-panel)]/50 border border-[var(--ln-border-subtle)] p-4 rounded-xl space-y-3">
                <label className="flex items-start gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="mt-1 w-3.5 h-3.5 accent-[var(--ln-brand-indigo)]"
                    checked={activeModal?.data?.dataPolicyAccepted}
                    onChange={(e) => updateModalData({ dataPolicyAccepted: e.target.checked })}
                  />
                  <span className="text-xs text-[var(--ln-text-secondary)]">
                    Acepto la <a href={DATA_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-[var(--ln-accent-violet)] underline font-[510]">Política de Tratamiento de Datos</a>.
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="mt-1 w-3.5 h-3.5 accent-[var(--ln-brand-indigo)]"
                    checked={activeModal?.data?.dataTreatmentAuthorized}
                    onChange={(e) => updateModalData({ dataTreatmentAuthorized: e.target.checked })}
                  />
                  <span className="text-xs text-[var(--ln-text-secondary)]">Autorizo el tratamiento de mis datos personales.</span>
                </label>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="ghost" onClick={() => setActiveModal(null)}>Cancelar</Button>
                <Button variant="success" onClick={handleConvertToMember}>
                  <UserCheckIcon size={16} /> Convertir
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <GuestEditModal
        isOpen={activeModal?.type === 'edit'}
        onClose={() => setActiveModal(null)}
        guest={activeModal?.guest}
        onGuestUpdated={handleGuestUpdated}
      />

      <ConfirmationModal
        isOpen={activeModal?.type === 'delete'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Invitado"
        message={`¿Estás seguro de que deseas eliminar a "${activeModal?.guest?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default GuestList;

GuestList.propTypes = {
  refreshTrigger: PropTypes.any,
};
