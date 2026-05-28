import { WarningCircle, ArrowsClockwise } from '@phosphor-icons/react';
import Button from './Button';

const ErrorState = ({
  title = 'Algo salió mal',
  message = 'Ocurrió un error inesperado. Por favor intenta nuevamente.',
  technicalDetail,
  onRetry,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}>
      <div className="w-full max-w-md mx-auto text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6">
          <WarningCircle size={28} className="text-red-400" weight="bold" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--ln-text-primary)] mb-2">
          {title}
        </h3>
        <p className="text-sm text-[var(--ln-text-tertiary)] mb-6 leading-relaxed">
          {message}
        </p>
        {technicalDetail && (
          <div className="mb-6 bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] rounded-lg p-3 text-left">
            <p className="text-[11px] font-mono text-[var(--ln-text-tertiary)] break-all select-all">
              {technicalDetail}
            </p>
          </div>
        )}
        {onRetry && (
          <Button onClick={onRetry} variant="primary" size="md" icon={ArrowsClockwise}>
            Reintentar
          </Button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;
