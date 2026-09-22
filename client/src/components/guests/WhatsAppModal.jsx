import { useState } from 'react';
import PropTypes from 'prop-types';
import { X, WhatsappLogoIcon } from '@phosphor-icons/react';
import { WHATSAPP_TEMPLATES, buildWhatsAppMessage } from './whatsappTemplates';

/** Modal WhatsApp (extraído de GuestTracking). */
const WhatsAppModal = ({ guest, user, onClose, onSend, sending = false }) => {
  const [stage, setStage] = useState('');
  const [templateKey, setTemplateKey] = useState('');
  const [preview, setPreview] = useState('');

  if (!guest) return null;

  const pickStage = (s) => {
    setStage(s);
    setTemplateKey('');
    setPreview('');
  };
  const pickTemplate = (key) => {
    setTemplateKey(key);
    setPreview(buildWhatsAppMessage(stage, key, guest, user));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--ln-overlay)] backdrop-blur-[2px]">
      <div className="bg-[var(--ln-bg-surface)] border border-[var(--ln-border-standard)] rounded-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--ln-border-subtle)] flex items-center justify-between bg-[var(--ln-bg-panel)]">
          <div className="flex items-center gap-2">
            <WhatsappLogoIcon className="w-5 h-5 text-[var(--ln-success)]" />
            <h3 className="text-lg font-[590] text-[var(--ln-text-primary)]">Enviar Mensaje</h3>
          </div>
          <button onClick={onClose} className="text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] rounded-md p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Elige el tipo de mensaje</label>
            <select
              value={stage}
              onChange={(e) => pickStage(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-md text-[var(--ln-text-primary)]"
            >
              <option value="">Seleccione una etapa...</option>
              <option value="Bienvenida">Bienvenida (Inmediato)</option>
              <option value="Consolidacion">Consolidación (Seguimiento)</option>
              <option value="Integracion">Integración (Llamado a la acción)</option>
              <option value="Recuperacion">Recuperación (Cuando deja de asistir)</option>
            </select>
          </div>
          {stage && (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">Plantilla</label>
              <div className="flex gap-2">
                {Object.keys(WHATSAPP_TEMPLATES[stage]).map((key) => (
                  <button
                    key={key}
                    onClick={() => pickTemplate(key)}
                    className={`flex-1 px-3 py-2 text-sm font-[510] rounded-md border transition-colors ${
                      templateKey === key
                        ? 'bg-[var(--ln-emerald)]/15 border-[var(--ln-emerald)]/40 text-[var(--ln-success)]'
                        : 'bg-[var(--ln-btn-ghost)] border-[var(--ln-border-subtle)] text-[var(--ln-text-secondary)]'
                    }`}
                  >
                    Opción {key}
                  </button>
                ))}
              </div>
            </div>
          )}
          {templateKey && (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-[510] uppercase tracking-wider text-[var(--ln-text-tertiary)]">
                Previsualización (Puedes editarlo)
              </label>
              <textarea
                value={preview}
                onChange={(e) => setPreview(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[var(--ln-input-bg)] border border-[var(--ln-border-standard)] rounded-md text-[var(--ln-text-primary)] resize-none"
                rows="6"
              />
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-[var(--ln-bg-panel)] border-t border-[var(--ln-border-subtle)] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-[510] text-[var(--ln-text-secondary)] hover:bg-[var(--ln-btn-subtle)] rounded-md">
            Cancelar
          </button>
          <button
            onClick={() => onSend({ stage, previewText: preview })}
            disabled={!preview.trim() || sending}
            className="px-4 py-2 text-sm font-[510] text-white bg-[var(--ln-success)] disabled:opacity-40 rounded-md flex items-center gap-2"
          >
            <WhatsappLogoIcon className="w-4 h-4" />
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
};

WhatsAppModal.propTypes = {
  guest: PropTypes.object,
  user: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSend: PropTypes.func.isRequired,
  sending: PropTypes.bool,
};

export default WhatsAppModal;
