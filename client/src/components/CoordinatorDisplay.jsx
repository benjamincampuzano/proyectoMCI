import PropTypes from 'prop-types';
import { UserCircle, Shield, Money, User } from '@phosphor-icons/react';

const CoordinatorDisplay = ({ 
    coordinator, 
    subCoordinator, 
    treasurer, 
    moduleName 
}) => {
    const renderCoordinatorBadge = (data, Icon, label, color) => {
        if (!data) return null;

        return (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-${color}-500/10 border border-${color}-500/20`}>
                <Icon size={16} className={`text-${color}-500`} />
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{label}</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">{data.fullName || data.name || 'Sin asignar'}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            {coordinator && renderCoordinatorBadge(coordinator, UserCircle, 'Coordinador', 'blue')}
            {subCoordinator && renderCoordinatorBadge(subCoordinator, User, 'Subcoordinador', 'purple')}
            {treasurer && renderCoordinatorBadge(treasurer, Money, 'Tesorero', 'emerald')}
        </div>
    );
};

CoordinatorDisplay.propTypes = {
    coordinator: PropTypes.object,
    subCoordinator: PropTypes.object,
    treasurer: PropTypes.object,
    moduleName: PropTypes.string
};

export default CoordinatorDisplay;
