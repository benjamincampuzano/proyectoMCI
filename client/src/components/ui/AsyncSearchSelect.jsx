import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MagnifyingGlass, Spinner, X, UserCircle } from '@phosphor-icons/react';
import PropTypes from 'prop-types';

const AsyncSearchSelect = ({
    fetchItems,
    onSelect,
    selectedValue,
    placeholder = "Buscar...",
    labelKey = "name",
    valueKey = "id",
    renderItem,
    renderSelected,
    className = "",
    disabled = false
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState(null);
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapperRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    const handleSearch = useCallback(async (term) => {
        if (!term || term.trim().length < 1) {
            setItems([]);
            setError(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await fetchItems(term);
            setItems(Array.isArray(data) ? data : []);
        } catch (err) {
            console.warn("AsyncSearchSelect fetch error:", err);
            setError("Error al cargar datos");
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [fetchItems]);

    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            if (isOpen) {
                handleSearch(searchTerm);
            }
        }, 300);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchTerm, isOpen, handleSearch]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setActiveIndex(-1);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Cargar datos iniciales al abrir el dropdown
    useEffect(() => {
        if (isOpen && !initialDataLoaded && !searchTerm) {
            handleSearch('');
            setInitialDataLoaded(true);
        }
    }, [isOpen, initialDataLoaded, searchTerm, handleSearch]);

    const handleSelect = useCallback((item) => {
        onSelect(item);
        setIsOpen(false);
        setActiveIndex(-1);
        setSearchTerm('');
    }, [onSelect]);

    const clearSelection = useCallback((e) => {
        e.stopPropagation();
        onSelect(null);
    }, [onSelect]);

    const getNestedValue = useCallback((obj, path) => {
        return path.split('.').reduce((acc, part) => acc?.[part], obj);
    }, []);

    const getLabel = useCallback((item) => {
        if (!item) return '';
        if (typeof labelKey === 'function') return labelKey(item);

        // Intentar labelKey directo
        if (item[labelKey]) return item[labelKey];

        // Intentar nested paths comunes
        const commonPaths = [
            `profile.${labelKey}`,
            'fullName',
            'profile.fullName',
            'id'
        ];

        for (const path of commonPaths) {
            const value = getNestedValue(item, path);
            if (value) return value;
        }

        return '';
    }, [labelKey, getNestedValue]);

    const isSelected = selectedValue !== null && selectedValue !== undefined && selectedValue !== '';

    // Navegación por teclado
    const handleKeyDown = useCallback((e) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => Math.min(prev + 1, items.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (activeIndex >= 0 && items[activeIndex]) {
                    handleSelect(items[activeIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setActiveIndex(-1);
                break;
        }
    }, [items, activeIndex, handleSelect]);

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div
                className={`
                    w-full min-h-[44px] px-4 py-2 bg-[var(--ln-input-bg)]
                    border border-[var(--ln-border-standard)] rounded-xl
                    flex items-center justify-between cursor-text
                    focus-within:ring-2 focus-within:ring-[var(--ln-brand-indigo)]/20 focus-within:border-[var(--ln-brand-indigo)]
                    hover:border-[var(--ln-border-primary)]
                    transition-all duration-300
                    ${disabled ? 'opacity-40 cursor-not-allowed grayscale-[0.5]' : ''}
                `}
                onClick={() => !disabled && setIsOpen(true)}
                onKeyDown={(e) => !disabled && handleKeyDown(e)}
                role="combobox"
                tabIndex={0}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-disabled={disabled}
                aria-activedescendant={activeIndex >= 0 ? `option-${activeIndex}` : undefined}
            >
                {(!isSelected || isOpen) ? (
                    <div className="flex items-center flex-1 min-w-0 gap-3">
                        <MagnifyingGlass 
                            className={`w-4 h-4 ${isOpen ? 'text-[var(--ln-brand-indigo)]' : 'text-[var(--ln-text-quaternary)]'} transition-colors`} 
                            weight="bold" 
                        />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none focus:outline-none w-full text-[13.5px] weight-510 text-[var(--ln-text-primary)] placeholder:text-[var(--ln-text-tertiary)]/40"
                            placeholder={isSelected ? getLabel(selectedValue) : placeholder}
                            disabled={disabled}
                            autoFocus={isOpen}
                        />
                    </div>
                ) : (
                    <div className="flex items-center flex-1 min-w-0 group/label">
                        {renderSelected ? renderSelected(selectedValue) : (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-[var(--ln-brand-indigo)]/10 flex items-center justify-center text-[var(--ln-brand-indigo)] text-[10px] weight-700">
                                    {getLabel(selectedValue).charAt(0)}
                                </div>
                                <span className="text-[13.5px] weight-590 text-[var(--ln-text-primary)] truncate block tracking-tight">
                                    {getLabel(selectedValue)}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-2 ml-2">
                    {loading && <Spinner className="w-4 h-4 animate-spin text-[var(--ln-brand-indigo)]" weight="bold" />}
                    {isSelected && !disabled && !loading && (
                        <button
                            type="button"
                            onClick={clearSelection}
                            className="w-6 h-6 flex items-center justify-center rounded-md bg-[var(--ln-bg-panel)] border border-[var(--ln-border-standard)] text-[var(--ln-text-secondary)] hover:text-[var(--ln-brand-indigo)] hover:border-[var(--ln-brand-indigo)]/30 hover:bg-[var(--ln-brand-indigo)]/10 transition-all active:scale-90"
                            title="Limpiar selección"
                        >
                            <X className="w-3.5 h-3.5" weight="bold" />
                        </button>
                    )}
                </div>
            </div>

            {isOpen && !disabled && (
                <div className="relative z-[100] w-full mt-2 bg-[var(--ln-bg-panel)]/80 backdrop-blur-xl border border-[var(--ln-border-standard)] rounded-[20px] shadow-2xl max-h-72 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 ring-1 ring-black/5">
                    <div className="overflow-y-auto max-h-72 p-1.5 custom-scrollbar">
                        {error && (
                            <div className="p-4 text-center space-y-2">
                                <p className="text-red-500 text-[11px] weight-700 uppercase tracking-widest">
                                    {error}
                                </p>
                                <button
                                    onClick={() => handleSearch(searchTerm)}
                                    className="text-[var(--ln-brand-indigo)] text-[12px] weight-590 hover:underline transition-colors"
                                >
                                    Reintentar
                                </button>
                            </div>
                        )}

                        {!loading && !error && items.length === 0 && (
                            <div className="p-8 text-center space-y-2">
                                <div className="mx-auto w-10 h-10 bg-[var(--ln-bg-panel)] rounded-xl flex items-center justify-center text-[var(--ln-text-quaternary)] opacity-40">
                                    <MagnifyingGlass size={20} />
                                </div>
                                <p className="text-[13px] weight-510 text-[var(--ln-text-tertiary)] opacity-60">
                                    {searchTerm ? (
                                        <>
                                            No se encontraron resultados para <span className="text-[var(--ln-text-primary)]">"{searchTerm}"</span>
                                        </>
                                    ) : (
                                        "Comienza a escribir para buscar..."
                                    )}
                                </p>
                            </div>
                        )}

                        <div className="space-y-0.5" role="listbox">
                            {items.map((item, index) => (
                                <div
                                    key={item[valueKey]}
                                    id={`option-${index}`}
                                    onClick={() => handleSelect(item)}
                                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelect(item)}
                                    role="option"
                                    tabIndex={0}
                                    aria-selected={selectedValue?.[valueKey] === item[valueKey]}
                                    className={`group px-3.5 py-2.5 rounded-xl cursor-pointer transition-all border border-transparent hover:border-[var(--ln-border-standard)] ${
                                        activeIndex === index ? 'bg-white/[0.08] border-[var(--ln-border-standard)]' : 'hover:bg-white/[0.04]'
                                    }`}
                                >
                                    {renderItem ? renderItem(item) : (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--ln-brand-indigo)]/10 flex items-center justify-center text-[var(--ln-brand-indigo)] text-[12px] weight-700 shadow-sm border border-[var(--ln-brand-indigo)]/20">
                                                {getLabel(item).charAt(0)}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <div className="text-[13.5px] weight-590 text-[var(--ln-text-primary)] group-hover:text-[var(--ln-brand-indigo)] transition-colors truncate">
                                                    {getLabel(item)}
                                                </div>
                                                {item.email && (
                                                    <div className="text-[11px] weight-510 text-[var(--ln-text-tertiary)] opacity-60 group-hover:opacity-100 transition-opacity truncate">
                                                        {item.email}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

AsyncSearchSelect.propTypes = {
    fetchItems: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
    selectedValue: PropTypes.oneOfType([PropTypes.object, PropTypes.number, PropTypes.string]),
    placeholder: PropTypes.string,
    labelKey: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
    valueKey: PropTypes.string,
    renderItem: PropTypes.func,
    renderSelected: PropTypes.func,
    className: PropTypes.string,
    disabled: PropTypes.bool
};

export default AsyncSearchSelect;
