import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

/**
 * TabNavigator - Unified tab system for module pages
 * Replaces manual tab logic in Ganar, Consolidar, Discipular, Enviar
 */
const TabNavigator = ({ tabs, initialTabId = null, className = '', onTabChange = null }) => {
  const { hasAnyRole, isCoordinator } = useAuth();
  const [activeTabId, setActiveTabId] = useState(initialTabId);

  // Filter tabs based on user roles
  const allowedTabs = tabs.filter(tab => {
    // If tab has customCheck function, use it
    if (tab.customCheck && typeof tab.customCheck === 'function') {
      return tab.customCheck();
    }

    // Otherwise, use role-based checking
    if (!tab.roles || tab.roles.length === 0) return true;
    // Check if user has required roles OR if tab allows coordinators
    const hasRoleAccess = hasAnyRole(tab.roles);
    const hasCoordinatorAccess = tab.requiresCoordinator && isCoordinator();

    // Debug: Log tab filtering
    console.log(`=== TabNavigator Debug - Tab: ${tab.id} ===`);
    console.log('Tab roles:', tab.roles);
    console.log('hasRoleAccess:', hasRoleAccess);
    console.log('hasCoordinatorAccess:', hasCoordinatorAccess);
    console.log('Result:', hasRoleAccess || hasCoordinatorAccess);

    return hasRoleAccess || hasCoordinatorAccess;
  });

  // Set initial tab if not provided or if current tab is not allowed
  useEffect(() => {
    if (!activeTabId || !allowedTabs.find(tab => tab.id === activeTabId)) {
      setActiveTabId(allowedTabs[0]?.id || null);
    }
  }, [activeTabId, allowedTabs]);

  const handleTabChange = (tabId) => {
    setActiveTabId(tabId);
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  const activeTab = allowedTabs.find(tab => tab.id === activeTabId);
  const ActiveComponent = activeTab?.component;

  if (!ActiveComponent) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No tienes acceso a ninguna pestaña en este módulo.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Tab Navigation */}
      <div className="border-b border-[var(--ln-border-standard)]">
        <nav className="flex space-x-1" aria-label="Tabs">
          {allowedTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                py-2.5 px-4 rounded-lg text-[13px] weight-510 transition-all duration-200
                ${activeTabId === tab.id
                  ? 'bg-[var(--ln-brand-indigo)]/10 text-[var(--ln-brand-indigo)]'
                  : 'text-[var(--ln-text-tertiary)] hover:text-[var(--ln-text-primary)] hover:bg-white/[0.04]'
                }
              `}
              aria-current={activeTabId === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default TabNavigator;
