import { UserCheck, AngularLogoIcon } from '@phosphor-icons/react';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';

/**
 * CoordinatorBadge - Displays module coordinator information
 * Shows who is the coordinator for a specific module
 */
const CoordinatorBadge = ({ moduleCoordinator, moduleName }) => {
    const { user, isCoordinator } = useAuth();

    if (!moduleCoordinator) return null;

    return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg shadow-sm">
            <AngularLogoIcon size={16} className="text-purple-600 dark:text-purple-400" />
            <div className="flex flex-col">
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                    Coordinador {moduleName}
                </span>
                <div className="flex items-center gap-1.5">
                    <UserCheck size={14} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {moduleCoordinator.fullName}
                    </span>
                </div>
            </div>
        </div>
    );
};

CoordinatorBadge.propTypes = {
    moduleCoordinator: PropTypes.shape({
        id: PropTypes.number,
        fullName: PropTypes.string,
        email: PropTypes.string
    }),
    moduleName: PropTypes.string
};

export default CoordinatorBadge;
