const PageHeader = ({ title, description, action }) => (
    <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {title}
            </h1>
            {description && (
                <p className="text-gray-500 dark:text-gray-400">{description}</p>
            )}
        </div>
        {action}
    </div>
);

export default PageHeader;
