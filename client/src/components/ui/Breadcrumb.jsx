import React from 'react';
import { CaretRight, House } from '@phosphor-icons/react';
import Typography from './Typography';

/**
 * Breadcrumb Component - Estilo Linear completo
 * Navegación jerárquica con separadores y responsive design
 */

const Breadcrumb = ({ 
  items = [], 
  separator = '/', 
  showHome = true, 
  maxItems = 5, 
  className = '', 
  ...props 
}) => {
  // Limitar número de items y agregar elipsis
  const getVisibleItems = () => {
    if (items.length <= maxItems) {
      return items;
    }

    // Mostrar primeros, elipsis y últimos
    const firstItems = items.slice(0, 1);
    const lastItems = items.slice(-2);
    
    return [
      ...firstItems,
      { label: '...', isEllipsis: true },
      ...lastItems
    ];
  };

  const visibleItems = getVisibleItems();

  return (
    <nav 
      aria-label="Breadcrumb navigation" 
      className={`flex items-center gap-2 text-[var(--ln-text-tertiary)] ${className}`}
      {...props}
    >
      {/* Home Icon */}
      {showHome && (
        <>
          <a
            href="/"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-200"
          >
            <House className="w-4 h-4" weight="regular" />
            <Typography variant="caption" className="font-[510]">
              Inicio
            </Typography>
          </a>
          <CaretRight className="w-3 h-3 text-[var(--ln-text-quaternary)]" />
        </>
      )}

      {/* Breadcrumb Items */}
      {visibleItems.map((item, index) => {
        const isLast = index === visibleItems.length - 1;
        const isEllipsis = item.isEllipsis;

        if (isEllipsis) {
          return (
            <React.Fragment key="ellipsis">
              <span className="px-2 py-1">
                <Typography variant="caption" className="font-[510]">
                  ...
                </Typography>
              </span>
              <CaretRight className="w-3 h-3 text-[var(--ln-text-quaternary)]" />
            </React.Fragment>
          );
        }

        const ItemComponent = item.href ? 'a' : 'span';
        const itemProps = item.href ? { href: item.href } : {};

        return (
          <React.Fragment key={item.key || index}>
            <ItemComponent
              {...itemProps}
              onClick={item.onClick}
              className={`
                flex items-center gap-1 px-2 py-1 rounded-md transition-all duration-200
                ${isLast 
                  ? 'text-[var(--ln-text-primary)]' 
                  : 'text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] hover:bg-[rgba(255,255,255,0.04)]'
                }
                ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {item.icon && (
                <span className="flex-shrink-0">
                  {item.icon}
                </span>
              )}
              
              <Typography variant="caption" className="font-[510] truncate max-w-[200px]">
                {item.label}
              </Typography>
            </ItemComponent>

            {/* Separator */}
            {!isLast && (
              <CaretRight className="w-3 h-3 text-[var(--ln-text-quaternary)]" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

// Breadcrumb Item Component - Para uso individual
export const BreadcrumbItem = ({ 
  children, 
  href, 
  icon, 
  active = false, 
  disabled = false, 
  className = '', 
  ...props 
}) => {
  const ItemComponent = href ? 'a' : 'span';
  const itemProps = href ? { href } : {};

  return (
    <ItemComponent
      {...itemProps}
      className={`
        flex items-center gap-1 px-2 py-1 rounded-md transition-all duration-200
        ${active 
          ? 'text-[var(--ln-text-primary)]' 
          : 'text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] hover:bg-[rgba(255,255,255,0.04)]'
        }
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      {...props}
    >
      {icon && (
        <span className="flex-shrink-0">
          {icon}
        </span>
      )}
      
      <Typography variant="caption" className="font-[510] truncate max-w-[200px]">
        {children}
      </Typography>
    </ItemComponent>
  );
};

// Breadcrumb Separator Component
export const BreadcrumbSeparator = ({ 
  children = '/', 
  className = '', 
  ...props 
}) => {
  return (
    <span 
      className={`text-[var(--ln-text-quaternary)] px-1 ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

// Collapsible Breadcrumb - Para mobile
export const CollapsibleBreadcrumb = ({ 
  items = [], 
  breakpoint = 'md', 
  className = '', 
  ...props 
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const shouldCollapse = () => {
    // Simular breakpoint check (en real app usaría hook de viewport)
    return window.innerWidth < 768 && items.length > 3;
  };

  const getVisibleItems = () => {
    if (!shouldCollapse()) {
      return items;
    }

    if (isExpanded) {
      return items;
    }

    // Mostrar solo primeros 2 items + "más"
    return items.slice(0, 2);
  };

  const visibleItems = getVisibleItems();

  return (
    <div className={`flex items-center gap-2 ${className}`} {...props}>
      <nav aria-label="Breadcrumb navigation" className="flex items-center gap-2">
        {visibleItems.map((item, index) => {
          const isLast = index === visibleItems.length - 1;

          return (
            <React.Fragment key={item.key || index}>
              <BreadcrumbItem
                {...item}
                active={isLast && !shouldCollapse()}
              />
              
              {!isLast && (
                <CaretRight className="w-3 h-3 text-[var(--ln-text-quaternary)]" />
              )}
            </React.Fragment>
          );
        })}

        {/* Botón "más" para mobile */}
        {shouldCollapse() && !isExpanded && (
          <>
            <button
              onClick={() => setIsExpanded(true)}
              className="px-2 py-1 rounded-md text-[var(--ln-text-secondary)] hover:text-[var(--ln-text-primary)] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-200"
            >
              <Typography variant="caption" className="font-[510]">
                +{items.length - 2}
              </Typography>
            </button>
            <CaretRight className="w-3 h-3 text-[var(--ln-text-quaternary)]" />
          </>
        )}
      </nav>
    </div>
  );
};

// Schema.org BreadcrumbList para SEO
export const StructuredBreadcrumb = ({ 
  items = [], 
  className = '', 
  ...props 
}) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.label,
      "item": item.href
    }))
  };

  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
      <Breadcrumb items={items} className={className} {...props} />
    </>
  );
};

export default Breadcrumb;
