import { useState, useRef } from 'react';
import { Upload, FileArrowDown, X, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { Modal, Button } from './ui';
import api from '../utils/api';

const BulkImportModal = ({ isOpen, onClose }) => {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/users/import-template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'plantilla_importacion_usuarios.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error descargando plantilla:', err);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile);
      setResult(null);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/users/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      });

      setResult({
        type: 'success',
        message: response.data.message,
        successCount: response.data.successCount,
        errorCount: response.data.errorCount,
        total: response.data.total,
        validationErrors: response.data.validationErrors,
        createErrors: response.data.createErrors,
      });
    } catch (err) {
      const data = err.response?.data || {};
      setResult({
        type: 'error',
        message: data.message || 'Error al procesar el archivo',
        errors: data.errors || [],
        successCount: data.successCount || 0,
        errorCount: data.errorCount || 0,
        total: data.total || 0,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setUploading(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <Modal.Content>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg weight-590 text-[var(--ln-text-primary)] mb-1">
              Importar Usuarios desde Excel
            </h3>
            <p className="text-sm text-[var(--ln-text-tertiary)]">
              Sube un archivo Excel con los datos de los usuarios para crearlos de forma masiva.
              Las contraseñas se generan automáticamente y los usuarios deberán cambiarlas al iniciar sesión.
            </p>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--ln-brand-indigo)]/5 border border-[var(--ln-brand-indigo)]/10">
            <FileArrowDown size={24} className="text-[var(--ln-brand-indigo)]" />
            <div className="flex-1">
              <p className="text-sm weight-510 text-[var(--ln-text-primary)]">Descarga la plantilla primero</p>
              <p className="text-xs text-[var(--ln-text-tertiary)]">Usa nuestro formato para evitar errores</p>
            </div>
            <Button variant="primary" size="sm" onClick={handleDownloadTemplate}>
              Descargar Plantilla
            </Button>
          </div>

          {!result && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-[var(--ln-brand-indigo)] bg-[var(--ln-brand-indigo)]/5'
                  : 'border-[var(--ln-border-standard)] hover:border-[var(--ln-brand-indigo)]/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />

              {file ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Upload size={24} className="text-[var(--ln-brand-indigo)]" />
                    <span className="text-sm weight-510 text-[var(--ln-text-primary)]">{file.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }}
                      className="p-1 rounded-lg hover:bg-[var(--ln-border-standard)]/20 text-[var(--ln-text-tertiary)]"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-[var(--ln-text-tertiary)]">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={uploading}
                    onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                  >
                    {uploading ? 'Procesando...' : 'Importar Usuarios'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload size={32} className="mx-auto text-[var(--ln-text-tertiary)]" />
                  <p className="text-sm text-[var(--ln-text-secondary)]">
                    Arrastra tu archivo Excel aquí o haz clic para seleccionarlo
                  </p>
                  <p className="text-xs text-[var(--ln-text-tertiary)]">
                    Solo archivos .xlsx y .xls (máx. 5MB)
                  </p>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${
                result.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : result.errorCount > 0
                    ? 'bg-amber-500/10 border-amber-500/20'
                    : 'bg-red-500/10 border-red-500/20'
              }`}>
                <div className="flex items-start gap-3">
                  {result.type === 'success' ? (
                    <CheckCircle size={20} className="text-emerald-500 mt-0.5" />
                  ) : (
                    <WarningCircle size={20} className="text-amber-500 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm weight-510 ${
                      result.type === 'success' ? 'text-emerald-500' : 'text-amber-500'
                    }`}>
                      {result.message}
                    </p>
                    <div className="mt-2 flex gap-4 text-xs text-[var(--ln-text-tertiary)]">
                      <span>Total procesadas: <strong>{result.total}</strong></span>
                      <span className="text-emerald-500">Creadas: <strong>{result.successCount}</strong></span>
                      {result.errorCount > 0 && (
                        <span className="text-red-500">Con errores: <strong>{result.errorCount}</strong></span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {result.validationErrors && result.validationErrors.length > 0 && (
                <div>
                  <p className="text-xs weight-510 text-[var(--ln-text-tertiary)] uppercase tracking-wider mb-2">
                    Errores de validación ({result.validationErrors.length})
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {result.validationErrors.map((err, i) => (
                      <p key={i} className="text-xs text-red-400 bg-red-500/5 p-2 rounded-lg">
                        {err}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {result.createErrors && result.createErrors.length > 0 && (
                <div>
                  <p className="text-xs weight-510 text-[var(--ln-text-tertiary)] uppercase tracking-wider mb-2">
                    Errores de creación ({result.createErrors.length})
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {result.createErrors.map((err, i) => (
                      <p key={i} className="text-xs text-red-400 bg-red-500/5 p-2 rounded-lg">
                        {err.row}: {err.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="ghost" onClick={handleClose}>
                  Cerrar
                </Button>
                <Button variant="primary" onClick={() => { setResult(null); setFile(null); }}>
                  Importar otro archivo
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal.Content>
    </Modal>
  );
};

export default BulkImportModal;
