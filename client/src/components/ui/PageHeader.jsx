const PageHeader = ({ title, description, action }) => (
    <div className="flex justify-between items-end mb-8">
        <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 dark:text-white mb-2">
                {title}
            </h1>
            {description && (
                <p className="text-gray-500 dark:text-gray-400 text-base">{description}</p>
            )}
        </div>
        {action}
    </div>
);

export default PageHeader;
