const PageHeader = ({ title, description, action }) => (
    <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-10 pb-6 border-b border-[var(--ln-border-standard)]">
        <div>
            <h1 className="text-3xl md:text-3xl weight-590 tracking-[-0.704px] text-[var(--ln-text-primary)] mb-1.5 transition-all">
                {title}
            </h1>
            {description && (
                <p className="text-[14px] text-[var(--ln-text-secondary)] font-normal leading-relaxed">{description}</p>
            )}
        </div>
        {action && (
            <div className="flex items-center gap-3">
                {action}
            </div>
        )}
    </div>
);

export default PageHeader;
