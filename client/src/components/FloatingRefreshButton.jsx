import PropTypes from "prop-types";
import { ArrowsClockwise } from "@phosphor-icons/react";

/**
 * FloatingRefreshButton
 *
 * Botón flotante de "Actualizar" usado en páginas de módulo (Kids, Ganar, Consolidar).
 * Refresca los datos mostrados en el tab activo.
 *
 * Diseño:
 * - Posición fija esquina inferior derecha.
 * - Respetando safe-area-inset-bottom para PWAs/mobile con home indicator.
 * - Tokens de color del design system (var(--ln-brand-indigo)).
 * - Accesible: aria-label descriptivo, role="button", focus visible.
 */
const FloatingRefreshButton = ({
  onClick,
  label = "Actualizar",
  loadingLabel = "Actualizando...",
  ariaLabel = "Actualizar datos del módulo",
  loading = false,
  disabled = false,
}) => {
  const isDisabled = disabled || loading;
  const spin = loading;

  return (
    <div
      className="fixed bottom-8 right-8 z-40"
      style={{ bottom: "max(2rem, env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        aria-label={ariaLabel}
        aria-busy={loading}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--ln-brand-indigo)] hover:bg-[var(--ln-accent-hover)] text-white rounded-xl font-medium text-[13px] transition-all shadow-lg shadow-[var(--ln-brand-indigo)]/20 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ln-accent-violet)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ln-bg-marketing)] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <ArrowsClockwise className={`w-4 h-4 ${spin ? 'animate-spin' : ''}`} weight="bold" />
        {loading ? loadingLabel : label}
      </button>
    </div>
  );
};

FloatingRefreshButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  label: PropTypes.string,
  loadingLabel: PropTypes.string,
  ariaLabel: PropTypes.string,
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
};

export { FloatingRefreshButton };
export default FloatingRefreshButton;
