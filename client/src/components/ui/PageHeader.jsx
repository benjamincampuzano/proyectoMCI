const PageHeader = ({ title, description, action }) => (
    <div className="flex justify-between items-end mb-6">
        <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#1d1d1f] dark:text-white mb-1" style={{ letterSpacing: '-0.02em' }}>
                {title}
            </h1>
            {description && (
                <p className="text-[#86868b] dark:text-[#98989d] text-base">{description}</p>
            )}
        </div>
        {action}
    </div>
);

export default PageHeader;
