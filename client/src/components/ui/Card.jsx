const Card = ({ title, action, children, className = '' }) => {
    return (
        <div className={`bg-[#f5f5f7] dark:bg-[#272729] rounded-lg shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px] p-5 ${className}`}>
            {(title || action) && (
                <div className="flex justify-between items-center mb-4">
                    {title && <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-white">{title}</h3>}
                    {action && <div>{action}</div>}
                </div>
            )}
            {children}
        </div>
    );
};

export default Card;
