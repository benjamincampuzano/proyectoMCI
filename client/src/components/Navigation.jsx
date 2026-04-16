import React, { useState } from 'react';
import { List, X, Command } from '@phosphor-icons/react';
import { useTheme } from './context/ThemeContext';
import Button from './ui/Button';
import Typography from './ui/Typography';

/**
 * Navigation Component - Estilo Linear completo
 * Dark sticky header on near-black background con brand indigo CTA
 */

const Navigation = ({ 
  logo, 
  links = [], 
  ctaButton,
  showSearch = true,
  className = ''
}) => {
  const { theme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleSearchTrigger = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  const handleKeyPress = (e) => {
    if ((e.key === '/' || (e.key === 'k' && e.metaKey)) && !isSearchOpen) {
      e.preventDefault();
      setIsSearchOpen(true);
    }
    if (e.key === 'Escape' && isSearchOpen) {
      setIsSearchOpen(false);
    }
  };

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isSearchOpen]);

  return (
    <>
      {/* Desktop Navigation */}
      <nav className={`sticky top-0 z-50 bg-[var(--ln-bg-panel)] border-b border-[rgba(255,255,255,0.05)] backdrop-blur-lg ${className}`}>
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              {logo || (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-[var(--ln-brand-indigo)] rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">M</span>
                  </div>
                  <Typography variant="body-medium" className="text-[var(--ln-text-primary)]">
                    Mi Iglesia
                  </Typography>
                </div>
              )}
            </div>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center space-x-8">
              {links.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  className="text-[13px] font-[510] text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] transition-colors duration-200"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              {/* Search Trigger */}
              {showSearch && (
                <button
                  onClick={handleSearchTrigger}
                  className="hidden md:flex items-center space-x-2 px-3 py-1.5 text-[13px] font-[510] text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] rounded-md border border-[rgba(255,255,255,0.05)] transition-all duration-200"
                >
                  <Command className="w-4 h-4" />
                  <span>Buscar</span>
                </button>
              )}

              {/* CTA Button */}
              {ctaButton ? (
                ctaButton
              ) : (
                <Button variant="primary" size="sm" className="hidden md:block">
                  Iniciar Sesión
                </Button>
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={handleMobileMenuToggle}
                className="md:hidden p-2 rounded-lg bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.05)] transition-all duration-200"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-[var(--ln-text-primary)]" />
                ) : (
                  <List className="w-5 h-5 text-[var(--ln-text-primary)]" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-[rgba(255,255,255,0.05)] bg-[var(--ln-bg-panel)]">
            <div className="px-6 py-4 space-y-4">
              {links.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  className="block text-[14px] font-[510] text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] transition-colors duration-200 py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              
              {showSearch && (
                <button
                  onClick={handleSearchTrigger}
                  className="flex items-center space-x-2 text-[14px] font-[510] text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] transition-colors duration-200 py-2"
                >
                  <Command className="w-4 h-4" />
                  <span>Buscar</span>
                </button>
              )}

              {ctaButton ? (
                <div className="pt-2">
                  {ctaButton}
                </div>
              ) : (
                <Button variant="primary" className="w-full">
                  Iniciar Sesión
                </Button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Search Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-[rgba(0,0,0,0.85)] backdrop-blur-[2px] flex items-start justify-center pt-[20vh]">
          <div className="w-full max-w-2xl mx-4">
            {/* Search Input */}
            <div className="bg-[var(--ln-bg-surface)] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-[rgba(0,0,0,0)_0px_8px_2px,rgba(0,0,0,0.01)_0px_5px_2px,rgba(0,0,0,0.04)_0px_3px_2px,rgba(0,0,0,0.07)_0px_1px_1px,rgba(0,0,0,0.08)_0px_0px_1px]">
              <div className="p-4">
                <div className="flex items-center space-x-3">
                  <Command className="w-5 h-5 text-[var(--ln-text-tertiary)]" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className="flex-1 bg-transparent text-[16px] font-[400] text-[var(--ln-text-primary)] placeholder:text-[var(--ln-text-tertiary)] border-none outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => setIsSearchOpen(false)}
                    className="p-2 rounded-lg bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.05)] transition-all duration-200"
                  >
                    <X className="w-4 h-4 text-[var(--ln-text-tertiary)]" />
                  </button>
                </div>
              </div>
              
              {/* Search Results */}
              <div className="border-t border-[rgba(255,255,255,0.05)] max-h-[400px] overflow-y-auto">
                <div className="p-4">
                  <Typography variant="caption" className="text-[var(--ln-text-tertiary)] mb-3">
                    Comienza a escribir para buscar...
                  </Typography>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
