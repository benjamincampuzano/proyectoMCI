import React, { useState, useRef, useEffect } from 'react';

/**
 * Tooltip Component - Estilo Linear completo
 * Con backdrop, multi-layer shadows, y posicionamiento inteligente
 */

const Tooltip = ({ 
  children, 
  content, 
  position = 'top', 
  trigger = 'hover', 
  delay = 200, 
  disabled = false, 
  className = '', 
  ...props 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [calculatedPosition, setCalculatedPosition] = useState(position);
  const tooltipRef = useRef(null);
  const triggerRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const calculatePosition = () => {
    if (!tooltipRef.current || !triggerRef.current) return position;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Check for overflow and adjust position
    let newPosition = position;

    switch (position) {
      case 'top':
        if (triggerRect.top - tooltipRect.height < 0) {
          newPosition = 'bottom';
        }
        if (triggerRect.left + tooltipRect.width > viewport.width) {
          newPosition = 'top-left';
        }
        break;
      case 'bottom':
        if (triggerRect.bottom + tooltipRect.height > viewport.height) {
          newPosition = 'top';
        }
        if (triggerRect.left + tooltipRect.width > viewport.width) {
          newPosition = 'bottom-left';
        }
        break;
      case 'left':
        if (triggerRect.left - tooltipRect.width < 0) {
          newPosition = 'right';
        }
        break;
      case 'right':
        if (triggerRect.right + tooltipRect.width > viewport.width) {
          newPosition = 'left';
        }
        break;
    }

    setCalculatedPosition(newPosition);
  };

  const showTooltip = () => {
    if (disabled) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      // Calculate position after tooltip is visible
      setTimeout(calculatePosition, 0);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const getPositionClasses = () => {
    const positions = {
      top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
      'top-left': 'bottom-full left-0 mb-2',
      'top-right': 'bottom-full right-0 mb-2',
      bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
      'bottom-left': 'top-full left-0 mt-2',
      'bottom-right': 'top-full right-0 mt-2',
      left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
      'left-top': 'right-full top-0 mr-2',
      'left-bottom': 'right-full bottom-0 mr-2',
      right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
      'right-top': 'left-full top-0 ml-2',
      'right-bottom': 'left-full bottom-0 ml-2'
    };

    return positions[calculatedPosition] || positions.top;
  };

  const getArrowClasses = () => {
    const arrows = {
      top: 'bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full',
      'top-left': 'bottom-0 left-4 translate-y-full',
      'top-right': 'bottom-0 right-4 translate-y-full',
      bottom: 'top-0 left-1/2 transform -translate-x-1/2 -translate-y-full',
      'bottom-left': 'top-0 left-4 -translate-y-full',
      'bottom-right': 'top-0 right-4 -translate-y-full',
      left: 'right-0 top-1/2 transform -translate-y-1/2 translate-x-full',
      'left-top': 'right-0 top-4 translate-x-full',
      'left-bottom': 'right-0 bottom-4 translate-x-full',
      right: 'left-0 top-1/2 transform -translate-y-1/2 -translate-x-full',
      'right-top': 'left-0 top-4 -translate-x-full',
      'right-bottom': 'left-0 bottom-4 -translate-x-full'
    };

    return arrows[calculatedPosition] || arrows.top;
  };

  const getArrowRotation = () => {
    const rotations = {
      top: 'rotate-45',
      bottom: 'rotate-45',
      left: 'rotate-45',
      right: 'rotate-45',
      'top-left': 'rotate-45',
      'top-right': 'rotate-45',
      'bottom-left': 'rotate-45',
      'bottom-right': 'rotate-45',
      'left-top': 'rotate-45',
      'left-bottom': 'rotate-45',
      'right-top': 'rotate-45',
      'right-bottom': 'rotate-45'
    };

    return rotations[calculatedPosition] || rotations.top;
  };

  const triggerProps = {
    ref: triggerRef,
    className: 'inline-block'
  };

  if (trigger === 'click') {
    triggerProps.onClick = () => setIsVisible(!isVisible);
  } else {
    triggerProps.onMouseEnter = showTooltip;
    triggerProps.onMouseLeave = hideTooltip;
    triggerProps.onFocus = showTooltip;
    triggerProps.onBlur = hideTooltip;
  }

  return (
    <div className={`relative inline-block ${className}`} {...props}>
      <div {...triggerProps}>
        {children}
      </div>
      
      {isVisible && content && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 ${getPositionClasses()}`}
          onMouseEnter={trigger === 'hover' ? showTooltip : undefined}
          onMouseLeave={trigger === 'hover' ? hideTooltip : undefined}
        >
          {/* Tooltip Content */}
          <div className="relative">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-[rgba(0,0,0,0.85)] backdrop-blur-[2px] rounded-lg" />
            
            {/* Content */}
            <div className="relative bg-[var(--ln-bg-surface)] border border-[rgba(255,255,255,0.08)] rounded-lg shadow-[rgba(0,0,0,0)_0px_8px_2px,rgba(0,0,0,0.01)_0px_5px_2px,rgba(0,0,0,0.04)_0px_3px_2px,rgba(0,0,0,0.07)_0px_1px_1px,rgba(0,0,0,0.08)_0px_0px_1px] px-3 py-2 max-w-xs">
              <div className="text-[12px] font-[400] text-[var(--ln-text-primary)] leading-[1.40]">
                {content}
              </div>
            </div>
            
            {/* Arrow */}
            <div className={`absolute ${getArrowClasses()}`}>
              <div className={`w-2 h-2 bg-[var(--ln-bg-surface)] border-r border-t border-[rgba(255,255,255,0.08)] ${getArrowRotation()}`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple Tooltip - Para casos básicos sin posicionamiento complejo
export const SimpleTooltip = ({ 
  children, 
  content, 
  className = '', 
  ...props 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={`relative inline-block ${className}`} {...props}>
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="inline-block"
      >
        {children}
      </div>
      
      {isVisible && content && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="relative">
            <div className="bg-[var(--ln-bg-surface)] border border-[rgba(255,255,255,0.08)] rounded-lg shadow-[rgba(0,0,0,0.4)_0px_2px_4px] px-2 py-1 text-[11px] font-[400] text-[var(--ln-text-primary)] whitespace-nowrap">
              {content}
            </div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-1.5 h-1.5 bg-[var(--ln-bg-surface)] border-r border-t border-[rgba(255,255,255,0.08)] rotate-45" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Tooltip Provider - Para configuración global
export const TooltipProvider = ({ 
  children, 
  delay = 200, 
  disabled = false, 
  ...props 
}) => {
  return (
    <div 
      className="tooltip-provider" 
      data-tooltip-delay={delay}
      data-tooltip-disabled={disabled}
      {...props}
    >
      {children}
    </div>
  );
};

export default Tooltip;
