import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * A generic, decoupled asynchronous search select component.
 * 
 * @param {Function} fetchItems - Function to fetch items based on search term. Must return a Promise resolving to an array.
 * @param {Function} onSelect - Callback when an item is selected.
 * @param {Object} selectedValue - The currently selected item (full object) or ID.
 * @param {string} placeholder - Placeholder text for input.
 * @param {string|Function} labelKey - Key of the item object to display as label, or render function.
 * @param {string} valueKey - Key of the item object to use as value logic (default: 'id').
 * @param {Function} renderItem - Optional custom renderer for dropdown items.
 * @param {Function} renderSelected - Optional custom renderer for the selected state.
 * @param {string} className - Additional CSS classes.
 */
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
    const wrapperRef = useRef(null);

    // Debounce logic
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen) { // Only search if dropdown is open to save resources
                handleSearch(searchTerm);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = async (term) => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchItems(term);
            setItems(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("AsyncSearchSelect fetch error:", err);
            setError("Error al cargar datos");
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (item) => {
        onSelect(item);
        setIsOpen(false);
        setSearchTerm('');
    };

    const clearSelection = (e) => {
        e.stopPropagation();
        onSelect(null);
    };

    const getLabel = (item) => {
        if (!item) return '';
        if (typeof labelKey === 'function') return labelKey(item);
        return item[labelKey] || '';
    };

    // Determine if we have a valid selection to show
    const isSelected = selectedValue !== null && selectedValue !== undefined && selectedValue !== '';

    // If selectedValue is an ID but we don't have the full object, the parent should handle display
    // OR we can display "Selected" if we don't know the label. 
    // Ideally selectedValue passed in is the full object, or we rely on parent to pass a `selectedLabel` prop 
    // but for simplicity let's assume selectedValue is the object or we might need a prop for initial label if it's just ID.
    // NOTE: In the legacy components, they often passed just ID and accepted that it wouldn't show label until fetched 
    // or they passed an initial object. To keep this generic, let's assume selectedValue is the Object for display.

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div
                className={`
                    w-full min-h-[42px] px-3 py-2 bg-white dark:bg-gray-700 
                    border border-gray-300 dark:border-gray-600 rounded-lg 
                    flex items-center justify-between cursor-text
                    focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent
                    ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}
                `}
                onClick={() => !disabled && setIsOpen(true)}
            >
                {/* Search Input when Open or Not Selected */}
                {(!isSelected || isOpen) ? (
                    <div className="flex items-center flex-1 min-w-0 gap-2">
                        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none focus:outline-none w-full text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
                            placeholder={isSelected ? getLabel(selectedValue) : placeholder} // Show label as placeholder when editing/searching
                            disabled={disabled}
                            autoFocus={isOpen}
                        />
                    </div>
                ) : (
                    /* Selected Item Display */
                    <div className="flex items-center flex-1 min-w-0">
                        {renderSelected ? renderSelected(selectedValue) : (
                            <span className="text-sm text-gray-900 dark:text-gray-100 truncate block">
                                {getLabel(selectedValue)}
                            </span>
                        )}
                    </div>
                )}

                {/* Actions: Clear or Loading */}
                <div className="flex items-center gap-1 ml-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                    {isSelected && !disabled && !loading && (
                        <button
                            type="button"
                            onClick={clearSelection}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Dropdown Results */}
            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {error && (
                        <div className="p-3 text-red-500 text-sm text-center">{error}</div>
                    )}

                    {!loading && !error && items.length === 0 && (
                        <div className="p-3 text-gray-500 dark:text-gray-400 text-sm text-center">
                            No se encontraron resultados
                        </div>
                    )}

                    {items.map((item) => (
                        <div
                            key={item[valueKey]}
                            onClick={() => handleSelect(item)}
                            className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-700 dark:text-gray-200"
                        >
                            {renderItem ? renderItem(item) : (
                                <div>
                                    <div className="font-medium">{getLabel(item)}</div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

AsyncSearchSelect.propTypes = {
    fetchItems: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
    selectedValue: PropTypes.object,
    placeholder: PropTypes.string,
    labelKey: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
    valueKey: PropTypes.string,
    renderItem: PropTypes.func,
    renderSelected: PropTypes.func,
    className: PropTypes.string,
    disabled: PropTypes.bool
};

export default AsyncSearchSelect;
