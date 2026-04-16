const Select = ({
    label,
    error,
    required = false,
    children,
    className = '',
    ...props
}) => (
    <div className="space-y-1.5">
        {label && (
            <label className="ln-label">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
        )}
        <select
            className={`ln-input ${error ? '!border-red-500/50 !ring-red-500/20' : ''} ${className}`}
            {...props}
        >
            {children}
        </select>
        {error && <p className="text-[11px] text-red-500 font-medium px-1">{error}</p>}
    </div>
);

export default Select;
