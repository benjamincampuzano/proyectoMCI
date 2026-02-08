const Input = ({
    label,
    error,
    required = false,
    className = '',
    ...props
}) => (
    <div className="space-y-1">
        {label && (
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
        )}
        <input
            className={`w-full px-4 py-2 rounded-lg border ${error
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:outline-none transition-colors ${className}`}
            {...props}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
);

export default Input;
