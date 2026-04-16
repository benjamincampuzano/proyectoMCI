import { Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from '../context/ThemeContext';

/**
 * ThemeToggle Component - Estilo Linear completo
 * Icon button circle con ghost styling y transiciones suaves
 */
const ThemeToggle = ({ className = '', ...props }) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[var(--ln-text-primary)] rounded-full p-2 flex items-center justify-center transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] focus:outline-none focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px] ${className}`}
            aria-label={`Cambiar a tema ${theme === 'light' ? 'oscuro' : 'claro'}`}
            {...props}
        >
            {theme === 'light' ? (
                <Moon className="w-5 h-5" weight="regular" />
            ) : (
                <Sun className="w-5 h-5" weight="regular" />
            )}
        </button>
    );
};

export default ThemeToggle;
