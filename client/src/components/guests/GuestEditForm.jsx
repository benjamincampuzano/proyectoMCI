import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FloppyDiskIcon, SpinnerIcon } from '@phosphor-icons/react';
import { AsyncSearchSelect, Modal } from '../ui';
import { getLocalDateString } from '../../utils/dateUtils';
import api from '../../utils/api';

const emptyForm = {
  name: '',
  phone: '',
  address: '',
  city: '',
  birthDate: '',
  sex: '',
  status: 'NUEVO',
  prayerRequest: '',
  observations: '',
  invitedById: null,
  assignedToId: null,
  invitedBy: null,
  assignedTo: null,
};

const inputCls =
  'w-full px-4 py-2.5 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-lg text-[var(--ln-text-primary)] focus:outline-none focus:border-[var(--ln-brand-indigo)] transition-colors';
const labelCls = 'block text-sm font-medium text-[var(--ln-text-secondary)] mb-2';

/**
 * GuestEditForm — formulario de datos personales del invitado, extraído de
 * GuestEditModal para reutilizarlo en el modal de detalle (modo edición)
 * sin duplicar campos ni lógica.
 */
const GuestEditForm = ({ guest, canEditAllFields, onSubmit, onCancel, submitLabel = 'Guardar Cambios' }) => {
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (guest) {
      void Promise.resolve().then(() => {
        setFormData({
        name: guest.name || '',
        phone: guest.phone || '',
        address: guest.address || '',
        city: guest.city || '',
        birthDate: guest.birthDate ? getLocalDateString(guest.birthDate) : '',
        sex: guest.sex || '',
        status: guest.status || 'NUEVO',
        prayerRequest: guest.prayerRequest || '',
        observations: guest.observations || '',
        invitedById: guest.invitedBy?.id || null,
        assignedToId: guest.assignedTo?.id || null,
        invitedBy: guest.invitedBy || null,
        assignedTo: guest.assignedTo || null,
        });
      });
    }
  }, [guest]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!guest?.id) return;
    setSaving(true);
    try {
      await onSubmit({
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        birthDate: formData.birthDate || null,
        sex: formData.sex || null,
        status: formData.status,
        prayerRequest: formData.prayerRequest,
        observations: formData.observations,
        invitedById: formData.invitedById,
        assignedToId: formData.assignedToId,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <Modal.Content className="flex-1 overflow-y-auto">
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Nombre Completo <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={inputCls}
                required
                disabled={!canEditAllFields}
              />
            </div>
            <div>
              <label className={labelCls}>
                Teléfono <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={inputCls}
                required
                disabled={!canEditAllFields}
              />
            </div>
            <div>
              <label className={labelCls}>Fecha de Nacimiento</label>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                className={inputCls}
                disabled={!canEditAllFields}
              />
            </div>
            <div>
              <label className={labelCls}>Sexo</label>
              <select name="sex" value={formData.sex} onChange={handleChange} className={inputCls} disabled={!canEditAllFields}>
                <option value="">Seleccionar...</option>
                <option value="HOMBRE">Hombre</option>
                <option value="MUJER">Mujer</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Dirección</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={inputCls}
                disabled={!canEditAllFields}
              />
            </div>
            <div>
              <label className={labelCls}>Ciudad</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className={inputCls}
                disabled={!canEditAllFields}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Estado</label>
            <select name="status" value={formData.status} onChange={handleChange} className={inputCls}>
              <option value="NUEVO">Nuevo</option>
              <option value="CONTACTADO">Llamado</option>
              <option value="CONSOLIDADO">Visitado</option>
              <option value="GANADO">Consolidado</option>
            </select>
          </div>

          {canEditAllFields && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Invitado Por</label>
                <AsyncSearchSelect
                  fetchItems={(term) =>
                    api
                      .get('/users/search', { params: { search: term, excludeRoles: 'ADMIN,PASTOR' } })
                      .then((res) => res.data)
                  }
                  selectedValue={formData.invitedBy}
                  onSelect={(u) => setFormData({ ...formData, invitedById: u?.id, invitedBy: u })}
                  placeholder="Buscar usuario que invitó..."
                  labelKey="fullName"
                />
              </div>
              <div>
                <label className={labelCls}>Asignado a</label>
                <AsyncSearchSelect
                  fetchItems={(term) =>
                    api
                      .get('/users/search', { params: { search: term, excludeRoles: 'ADMIN,PASTOR' } })
                      .then((res) => res.data)
                  }
                  selectedValue={formData.assignedTo}
                  onSelect={(u) => setFormData({ ...formData, assignedToId: u?.id, assignedTo: u })}
                  placeholder="Seleccionar Líder responsable..."
                  labelKey="fullName"
                />
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Petición de Oración</label>
            <textarea
              name="prayerRequest"
              value={formData.prayerRequest}
              onChange={handleChange}
              rows="3"
              className={`${inputCls} resize-none`}
              placeholder="Escriba la petición de oración del invitado..."
              disabled={!canEditAllFields}
            />
          </div>

          <div>
            <label className={labelCls}>Observaciones Generales</label>
            <textarea
              name="observations"
              value={formData.observations}
              onChange={handleChange}
              rows="3"
              className={`${inputCls} resize-none`}
              placeholder="Notas adicionales sobre el invitado..."
              disabled={!canEditAllFields}
            />
          </div>
        </div>
      </Modal.Content>

      <Modal.Footer className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-sm font-medium text-[var(--ln-text-secondary)] bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-lg hover:bg-[var(--ln-bg-elevated)] transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-[var(--ln-brand-indigo)] hover:bg-[var(--ln-brand-indigo-hover)] text-white px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
        >
          {saving ? (
            <SpinnerIcon size={18} className="animate-spin" />
          ) : (
            <>
              <FloppyDiskIcon size={18} />
              <span>{submitLabel}</span>
            </>
          )}
        </button>
      </Modal.Footer>
    </form>
  );
};

GuestEditForm.propTypes = {
  guest: PropTypes.object,
  canEditAllFields: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  submitLabel: PropTypes.string,
};

export default GuestEditForm;
