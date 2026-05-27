import { useState, useEffect, useRef } from 'react';
import { Check, X, WarningCircle } from '@phosphor-icons/react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import toast from 'react-hot-toast';

const formatDateSpanish = (dateStr) => {
  if (!dateStr) return '...';
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

const reportTypeLabels = {
  church: 'Iglesia',
  cell: 'Célula',
};

const ModalAttendance = ({
  isOpen,
  onClose,
  initialType = null,
  user,
  onSave,
  requireReport = true,
  allowOutsideClose = false,
}) => {
  const [form, setForm] = useState({ type: '', date: '', attended: null });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const prevIsOpen = useRef(isOpen);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      const today = new Date().toISOString().split('T')[0];
      setForm({ type: initialType || '', date: today, attended: null });
      setErrors({});
      setSaving(false);
      setShowCloseConfirm(false);
      triggerRef.current = document.activeElement;
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, initialType]);

  useEffect(() => {
    if (!isOpen && triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

  const validate = () => {
    const errs = {};
    if (!form.date) errs.date = 'La fecha es obligatoria';
    if (form.attended === null) errs.attended = 'Selecciona si asististe o no';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        userId: user?.id,
        type: form.type,
        date: form.date,
        attended: form.attended,
      });
      setSaving(false);
    } catch {
      toast.error('Error al guardar asistencia');
      setSaving(false);
    }
  };

  const handleCloseAttempt = () => {
    if (requireReport) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowCloseConfirm(false);
    onClose();
  };

  const setFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const typeLabel = reportTypeLabels[form.type] || '';
  const typeSelected = initialType || form.type;
  const canSubmit = typeSelected && form.date && form.attended !== null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleCloseAttempt}
        title="Registra tu asistencia"
        size="sm"
        closeOnBackdropClick={allowOutsideClose}
      >
        <Modal.Content>
          <div className="space-y-5">
            {/* Summary banner */}
            <div className="bg-[var(--ln-bg-secondary)] rounded-xl p-4 border border-[var(--ln-border-standard)]">
              <p className="text-sm text-[var(--ln-text-secondary)] leading-relaxed">
                Confirmas que estás registrando tu asistencia para{' '}
                <strong className="text-[var(--ln-text-primary)]">
                  {initialType ? typeLabel : form.type ? typeLabel : '...'}
                </strong>{' '}
                en{' '}
                <strong className="text-[var(--ln-text-primary)]">
                  {formatDateSpanish(form.date)}
                </strong>
                .
              </p>
            </div>

            {/* Type selector */}
            {!initialType && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ln-text-secondary)] mb-2">
                  Tipo de reporte
                </label>
                <div
                  className="flex p-1 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-2xl shadow-inner"
                  role="radiogroup"
                  aria-label="Tipo de reporte"
                >
                  <button
                    type="button"
                    onClick={() => setFormField('type', 'church')}
                    className={`flex-1 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      form.type === 'church'
                        ? 'bg-[var(--ln-brand-indigo)] text-white shadow-lg shadow-[var(--ln-brand-indigo)]/20 active:scale-95'
                        : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)]'
                    }`}
                    aria-pressed={form.type === 'church'}
                  >
                    Iglesia
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!user?.cellId) return;
                      setFormField('type', 'cell');
                    }}
                    className={`flex-1 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      !user?.cellId
                        ? 'opacity-40 cursor-not-allowed'
                        : form.type === 'cell'
                          ? 'bg-[var(--ln-brand-indigo)] text-white shadow-lg shadow-[var(--ln-brand-indigo)]/20 active:scale-95'
                          : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)]'
                    }`}
                    aria-pressed={form.type === 'cell'}
                    disabled={!user?.cellId}
                    title={!user?.cellId ? 'No tienes una célula asignada' : 'Célula'}
                  >
                    Célula
                  </button>
                </div>
                {!user?.cellId && (
                  <div className="mt-2 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <WarningCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" weight="fill" />
                    <p className="text-xs text-red-300 leading-relaxed">
                      No tienes una célula asignada por el momento. Debes de comunicarte con tu líder para que te asigne a una.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Date */}
            <Input
              label="Fecha"
              type="date"
              value={form.date}
              onChange={(e) => setFormField('date', e.target.value)}
              error={errors.date}
              aria-invalid={!!errors.date}
            />

            {/* Attendance */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ln-text-secondary)] mb-2">
                Tu asistencia *
              </label>
              <div
                className="flex p-1 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-2xl shadow-inner"
                role="radiogroup"
                aria-label="Tu asistencia"
              >
                <button
                  type="button"
                  onClick={() => setFormField('attended', true)}
                  className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    form.attended === true
                      ? 'bg-green-600 text-white shadow-lg shadow-green-600/20 active:scale-95'
                      : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)]'
                  }`}
                  aria-pressed={form.attended === true}
                >
                  <Check className="w-4 h-4" weight="bold" />
                  Asistí
                </button>
                <button
                  type="button"
                  onClick={() => setFormField('attended', false)}
                  className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    form.attended === false
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 active:scale-95'
                      : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)]'
                  }`}
                  aria-pressed={form.attended === false}
                >
                  <X className="w-4 h-4" weight="bold" />
                  No asistí
                </button>
              </div>
              {errors.attended && (
                <p className="text-xs text-red-400 mt-1" role="alert">
                  {errors.attended}
                </p>
              )}
            </div>
          </div>
        </Modal.Content>

        <Modal.Footer>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={handleCloseAttempt}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={saving}
              disabled={!canSubmit}
            >
              Guardar asistencia
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Close confirmation dialog */}
      {showCloseConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowCloseConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="close-confirm-title"
        >
          <div
            className="bg-[var(--ln-bg-surface)] border border-[var(--ln-border-standard)] rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <h3
                id="close-confirm-title"
                className="text-lg font-bold text-[var(--ln-text-primary)]"
              >
                ¿Deseas continuar sin registrar?
              </h3>
              <p className="text-sm text-[var(--ln-text-secondary)]">
                Si cierras ahora, no quedará registro de tu asistencia para hoy.
              </p>
            </div>
            <div className="px-6 py-4 bg-[rgba(255,255,255,0.02)] border-t border-[var(--ln-border-standard)] flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowCloseConfirm(false)}
              >
                Seguir reportando
              </Button>
              <Button variant="primary" onClick={handleConfirmClose}>
                Continuar sin reportar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ModalAttendance;
