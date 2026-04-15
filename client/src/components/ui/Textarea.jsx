const Textarea = ({
    label,
    error,
    required = false,
    className = '',
    ...props
}) => (
    <div className="space-y-1">
        {label && (
            <label className="block text-sm font-medium text-[#1d1d1f] dark:text-white/80">
                {label}
                {required && <span className="text-[#ff3b30] ml-1">*</span>}
            </label>
        )}
        <textarea
            className={`w-full px-3 py-2 rounded-lg border ${error
                    ? 'border-[#ff3b30] focus:ring-[#ff3b30]'
                    : 'border-[#d1d1d6] dark:border-[#3a3a3c] focus:ring-[#0071e3]'
                } bg-white dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-white focus:ring-2 focus:outline-none transition-colors resize-vertical placeholder:text-[#86868b] ${className}`}
            {...props}
        />
        {error && <p className="text-sm text-[#ff3b30]">{error}</p>}
    </div>
);

export default Textarea;
