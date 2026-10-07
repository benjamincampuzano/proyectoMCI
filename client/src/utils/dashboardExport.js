import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Exporta el snapshot del dashboard unificado a Excel (una hoja por módulo).
 */
export const exportUnifiedDashboard = async (payload) => {
    const { dashboard, guestStats, filters, module } = payload;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Somos Manizales';

    const addKV = (sheet, title, rows) => {
        sheet.addRow([title]);
        sheet.addRow([`Filtros: ${filters.startDate || '-'} a ${filters.endDate || '-'} | Red: ${filters.liderDoceId || 'Todas'} | Módulo: ${module}`]);
        sheet.addRow([]);
        rows.forEach(([k, v]) => sheet.addRow([k, v]));
        sheet.getRow(1).font = { bold: true, size: 13 };
        sheet.getColumn(1).width = 32;
        sheet.getColumn(2).width = 28;
    };

    const ganar = dashboard?.ganar || {};
    const s1 = wb.addWorksheet('Ganar');
    addKV(s1, 'Ganar — Invitados', [
        ['Total invitados', ganar.totalGuests ?? guestStats?.totalGuests ?? 0],
        ['Nuevos', ganar.newGuests ?? guestStats?.byStatus?.NUEVO ?? 0],
        ['Contactados', ganar.contactedGuests ?? guestStats?.byStatus?.CONTACTADO ?? 0],
        ['Consolidados', ganar.consolidatedGuests ?? guestStats?.byStatus?.CONSOLIDADO ?? 0],
        ['Ganados', ganar.ganadosGuests ?? guestStats?.byStatus?.GANADO ?? 0],
        ['Conversión %', ganar.conversionRate ?? guestStats?.conversionRate ?? 0],
    ]);

    const c = dashboard?.consolidar || {};
    const s2 = wb.addWorksheet('Consolidar');
    addKV(s2, 'Consolidar — Asistencia iglesia', [
        ['Asistencia reciente', c.recentAttendance ?? 0],
        ['Promedio semanal', c.averageWeekly ?? 0],
    ]);

    const d = dashboard?.discipular || {};
    const s3 = wb.addWorksheet('Discipular');
    addKV(s3, 'Discipular — Escuela', [
        ['Módulos activos', d.activeModules ?? 0],
        ['Inscritos', d.enrolledStudents ?? 0],
        ['Graduados', d.graduatedStudents ?? 0],
        ['Tasa finalización %', d.completionRate ?? 0],
    ]);

    const e = dashboard?.enviar || {};
    const s4 = wb.addWorksheet('Enviar');
    addKV(s4, 'Enviar — Células', [
        ['Células creadas', e.totalCells ?? 0],
        ['Líderes activos', e.activeLeaders ?? 0],
        ['Asistencia reciente células', e.recentAttendance ?? 0],
    ]);

    const enc = dashboard?.encuentros || {};
    const conv = dashboard?.convenciones || {};
    const art = dashboard?.artes || {};
    const s5 = wb.addWorksheet('Eventos y Artes');
    addKV(s5, 'Encuentros / Convenciones / Artes', [
        ['Encuentros activos', enc.activeEncuentros ?? 0],
        ['Inscritos encuentros', enc.registeredCount ?? 0],
        ['Bautizados', enc.baptizedCount ?? 0],
        ['Convenciones activas', conv.activeConventions ?? 0],
        ['Inscritos convenciones', conv.registeredCount ?? 0],
        ['Pagos pendientes (enc+conv)', (enc.pendingPayments || 0) + (conv.pendingPayments || 0)],
        ['Clases de arte', art.totalClasses ?? 0],
        ['Inscritos arte', art.enrolledCount ?? 0],
        ['Recaudado arte', art.collected ?? 0],
        ['Pendiente arte', art.pending ?? 0],
    ]);

    if (guestStats?.topInviters?.length) {
        const s6 = wb.addWorksheet('Top Invitadores');
        s6.addRow(['Nombre', 'Invitados']);
        guestStats.topInviters.forEach((r) => s6.addRow([r.name, r.count]));
        s6.getRow(1).font = { bold: true };
        s6.getColumn(1).width = 34;
        s6.getColumn(2).width = 16;
    }

    const fileName = `dashboard_unificado_${filters.startDate || 'ini'}_${filters.endDate || 'fin'}.xlsx`;
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
};

export default exportUnifiedDashboard;
