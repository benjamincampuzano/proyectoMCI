import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Command, MagnifyingGlass,Faders, ArrowRight, Clock, FileText, Users, Calendar } from '@phosphor-icons/react';
import Typography from './Typography';

/**
 * Command Palette Component - Estilo Linear completo
 * Búsqueda avanzada con shortcuts, actions recientes y navegación por teclado
 */

const CommandPalette = ({ 
  isOpen, 
  onClose, 
  commands = [], 
  placeholder = 'Escribe un comando o busca...', 
  showRecent = true, 
  maxRecent = 5, 
  className = '', 
  ...props 
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState([]);
  const [filteredCommands, setFilteredCommands] = useState([]);
  
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Cargar comandos recientes desde localStorage
  useEffect(() => {
    if (showRecent) {
      const saved = localStorage.getItem('commandPaletteRecent');
      if (saved) {
        try {
          setRecentCommands(JSON.parse(saved).slice(0, maxRecent));
        } catch (e) {
          console.error('Error loading recent commands:', e);
        }
      }
    }
  }, [showRecent, maxRecent]);

  // Enfocar input cuando se abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Filtrar comandos basados en query
  useEffect(() => {
    if (!query.trim()) {
      setFilteredCommands(showRecent ? recentCommands : []);
      setSelectedIndex(0);
      return;
    }

    const filtered = commands.filter(command => {
      const searchStr = query.toLowerCase();
      return (
        command.title?.toLowerCase().includes(searchStr) ||
        command.description?.toLowerCase().includes(searchStr) ||
        command.keywords?.some(keyword => keyword.toLowerCase().includes(searchStr))
      );
    });

    setFilteredCommands(filtered);
    setSelectedIndex(0);
  }, [query, commands, recentCommands, showRecent]);

  // Guardar comando en recientes
  const saveRecentCommand = useCallback((command) => {
    if (!showRecent) return;
    
    const updated = [
      command,
      ...recentCommands.filter(cmd => cmd.id !== command.id)
    ].slice(0, maxRecent);
    
    setRecentCommands(updated);
    localStorage.setItem('commandPaletteRecent', JSON.stringify(updated));
  }, [recentCommands, showRecent, maxRecent]);

  // Manejar selección de comando
  const handleCommandSelect = useCallback((command) => {
    saveRecentCommand(command);
    command.action?.();
    setQuery('');
    onClose();
  }, [saveRecentCommand, onClose]);

  // Manejar teclado
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleCommandSelect(filteredCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredCommands, selectedIndex, handleCommandSelect, onClose]);

  // Scroll al elemento seleccionado
  useEffect(() => {
    if (listRef.current && filteredCommands[selectedIndex]) {
      const selectedElement = listRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, filteredCommands]);

  // Obtener icono por categoría
  const getCommandIcon = (category) => {
    const icons = {
      navigation: <ArrowRight className="w-4 h-4" />,
      file: <FileText className="w-4 h-4" />,
      users: <Users className="w-4 h-4" />,
      calendar: <Calendar className="w-4 h-4" />,
      settings: <Settings className="w-4 h-4" />,
      recent: <Clock className="w-4 h-4" />
    };
    return icons[category] || <ArrowRight className="w-4 h-4" />;
  };

  // Resaltar texto coincidente
  const highlightMatch = (text, query) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="text-[var(--ln-accent-violet)] font-[590]">
          {part}
        </span>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-[rgba(0,0,0,0.85)] backdrop-blur-[2px] flex items-start justify-center pt-[20vh]">
      <div className="w-full max-w-2xl mx-4">
        {/* Command Input */}
        <div className="bg-[var(--ln-bg-surface)] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-[rgba(0,0,0,0)_0px_8px_2px,rgba(0,0,0,0.01)_0px_5px_2px,rgba(0,0,0,0.04)_0px_3px_2px,rgba(0,0,0,0.07)_0px_1px_1px,rgba(0,0,0,0.08)_0px_0px_1px]">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <MagnifyingGlass className="w-5 h-5 text-[var(--ln-text-tertiary)]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="flex-1 bg-transparent text-[16px] font-[400] text-[var(--ln-text-primary)] placeholder:text-[var(--ln-text-tertiary)] border-none outline-none"
              />
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.05)] transition-all duration-200"
              >
                <span className="text-[12px] font-[510] text-[var(--ln-text-tertiary)]">ESC</span>
              </button>
            </div>
          </div>
          
          {/* Results List */}
          <div className="border-t border-[rgba(255,255,255,0.05)] max-h-[400px] overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="p-8 text-center">
                <Typography variant="body" className="text-[var(--ln-text-tertiary)]">
                  {query.trim() ? 'No se encontraron resultados' : 'Escribe para buscar comandos...'}
                </Typography>
              </div>
            ) : (
              <ul ref={listRef} className="py-2">
                {filteredCommands.map((command, index) => (
                  <li key={command.id}>
                    <button
                      type="button"
                      onClick={() => handleCommandSelect(command)}
                      className={`w-full px-4 py-3 flex items-center gap-3 transition-all duration-200 ${
                        index === selectedIndex 
                          ? 'bg-[rgba(113,112,255,0.1)] text-[var(--ln-accent-violet)]' 
                          : 'text-[var(--ln-text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--ln-text-primary)]'
                      }`}
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-[rgba(255,255,255,0.02)]">
                        {getCommandIcon(command.category)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <Typography variant="body-medium" className="truncate">
                            {highlightMatch(command.title, query)}
                          </Typography>
                          {command.shortcut && (
                            <Typography variant="caption" className="text-[var(--ln-text-tertiary)] font-[400]">
                              {command.shortcut}
                            </Typography>
                          )}
                        </div>
                        {command.description && (
                          <Typography variant="caption" className="text-[var(--ln-text-tertiary)] mt-0.5">
                            {highlightMatch(command.description, query)}
                          </Typography>
                        )}
                      </div>
                      
                      {/* Arrow */}
                      <ArrowRight className="w-4 h-4 text-[var(--ln-text-quaternary)]" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-2 text-center">
          <Typography variant="caption" className="text-[var(--ln-text-quaternary)]">
            Usa <span className="px-1 py-0.5 bg-[rgba(255,255,255,0.05)] rounded text-[10px] font-[510]">↑↓</span> para navegar, 
            <span className="px-1 py-0.5 bg-[rgba(255,255,255,0.05)] rounded text-[10px] font-[510]">Enter</span> para seleccionar, 
            <span className="px-1 py-0.5 bg-[rgba(255,255,255,0.05)] rounded text-[10px] font-[510]">Esc</span> para cerrar
          </Typography>
        </div>
      </div>
    </div>
  );
};

// Hook para usar Command Palette
export const useCommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Atajos de teclado globales
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === '/' && !e.metaKey && !e.ctrlKey) || 
          (e.key === 'k' && e.metaKey)) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return {
    isOpen,
    open,
    close,
    toggle: () => setIsOpen(!isOpen)
  };
};

// Provider para Command Palette
export const CommandPaletteProvider = ({ 
  children, 
  commands = [], 
  ...props 
}) => {
  const { isOpen, close } = useCommandPalette();

  return (
    <>
      {children}
      <CommandPalette
        isOpen={isOpen}
        onClose={close}
        commands={commands}
        {...props}
      />
    </>
  );
};

export default CommandPalette;
