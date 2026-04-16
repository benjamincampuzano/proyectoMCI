import React from 'react';

/**
 * Sistema de Layout Linear - Componentes para espaciado y estructura
 * Basado en sistema 8px base y responsive breakpoints
 */

// Container - Máximo ancho 1200px con padding responsive
export const Container = ({ 
  children, 
  size = 'default', 
  className = '', 
  ...props 
}) => {
  const sizeClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl', 
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    default: 'max-w-[1200px]',
    full: 'max-w-full'
  };

  const paddingClasses = {
    none: '',
    sm: 'px-4',
    md: 'px-6',
    lg: 'px-8',
    default: 'px-6 sm:px-8'
  };

  return (
    <div 
      className={`w-full mx-auto ${sizeClasses[size]} ${paddingClasses.default} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Grid - Sistema de grid responsive con espaciado 8px base
export const Grid = ({ 
  children, 
  cols = 'default', 
  gap = 'default', 
  className = '', 
  ...props 
}) => {
  const colsClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    12: 'grid-cols-12',
    default: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    auto: 'grid-cols-[repeat(auto-fit,minmax(250px,1fr))]',
    'auto-sm': 'grid-cols-[repeat(auto-fit,minmax(200px,1fr))]',
    'auto-lg': 'grid-cols-[repeat(auto-fit,minmax(300px,1fr))]'
  };

  const gapClasses = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
    xl: 'gap-6',
    '2xl': 'gap-8',
    default: 'gap-6',
    'tight': 'gap-4',
    'loose': 'gap-8'
  };

  return (
    <div 
      className={`grid ${colsClasses[cols]} ${gapClasses[gap]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Section - Secciones con padding vertical generoso
export const Section = ({ 
  children, 
  size = 'default', 
  className = '', 
  ...props 
}) => {
  const sizeClasses = {
    none: '',
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16',
    xl: 'py-20',
    '2xl': 'py-24',
    default: 'py-16 sm:py-20',
    loose: 'py-20 sm:py-24',
    tight: 'py-8 sm:py-12'
  };

  return (
    <section className={`w-full ${sizeClasses[size]} ${className}`} {...props}>
      {children}
    </section>
  );
};

// Stack - Espaciado vertical consistente
export const Stack = ({ 
  children, 
  spacing = 'default', 
  direction = 'vertical', 
  align = 'start', 
  className = '', 
  ...props 
}) => {
  const spacingClasses = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
    xl: 'gap-6',
    '2xl': 'gap-8',
    '3xl': 'gap-10',
    '4xl': 'gap-12',
    default: 'gap-4',
    tight: 'gap-2',
    loose: 'gap-6'
  };

  const directionClasses = {
    vertical: 'flex flex-col',
    horizontal: 'flex flex-row',
    responsive: 'flex flex-col sm:flex-row'
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline'
  };

  return (
    <div 
      className={`${directionClasses[direction]} ${spacingClasses[spacing]} ${alignClasses[align]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Flex - Utilidades flexbox avanzadas
export const Flex = ({ 
  children, 
  justify = 'start', 
  align = 'start', 
  direction = 'row', 
  wrap = false, 
  gap = 'default', 
  className = '', 
  ...props 
}) => {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly'
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline'
  };

  const directionClasses = {
    row: 'flex-row',
    col: 'flex-col',
    'row-reverse': 'flex-row-reverse',
    'col-reverse': 'flex-col-reverse',
    responsive: 'flex-col sm:flex-row'
  };

  const gapClasses = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
    xl: 'gap-6',
    '2xl': 'gap-8',
    default: 'gap-4'
  };

  const wrapClasses = wrap ? 'flex-wrap' : 'flex-nowrap';

  return (
    <div 
      className={`flex ${directionClasses[direction]} ${justifyClasses[justify]} ${alignClasses[align]} ${wrapClasses} ${gapClasses[gap]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Spacer - Espaciador vertical/horizontal
export const Spacer = ({ size = 'default', axis = 'vertical', className = '', ...props }) => {
  const sizeClasses = {
    xs: axis === 'vertical' ? 'h-1' : 'w-1',
    sm: axis === 'vertical' ? 'h-2' : 'w-2',
    md: axis === 'vertical' ? 'h-4' : 'w-4',
    lg: axis === 'vertical' ? 'h-6' : 'w-6',
    xl: axis === 'vertical' ? 'h-8' : 'w-8',
    '2xl': axis === 'vertical' ? 'h-12' : 'w-12',
    '3xl': axis === 'vertical' ? 'h-16' : 'w-16',
    '4xl': axis === 'vertical' ? 'h-20' : 'w-20',
    default: axis === 'vertical' ? 'h-4' : 'w-4'
  };

  return <div className={`${sizeClasses[size]} ${className}`} {...props} />;
};

// Center - Contenedor centrado
export const Center = ({ children, inline = false, className = '', ...props }) => {
  const baseClasses = inline ? 'inline-flex' : 'flex';
  return (
    <div className={`${baseClasses} items-center justify-center ${className}`} {...props}>
      {children}
    </div>
  );
};

// AspectRatio - Mantener ratio de aspecto
export const AspectRatio = ({ 
  children, 
  ratio = '16/9', 
  className = '', 
  ...props 
}) => {
  const ratioClasses = {
    '1/1': 'aspect-square',
    '4/3': 'aspect-[4/3]',
    '16/9': 'aspect-video',
    '21/9': 'aspect-[21/9]',
    '3/2': 'aspect-[3/2]',
    '2/1': 'aspect-[2/1]'
  };

  return (
    <div className={`relative ${ratioClasses[ratio] || 'aspect-video'} ${className}`} {...props}>
      {children}
    </div>
  );
};

export default {
  Container,
  Grid,
  Section,
  Stack,
  Flex,
  Spacer,
  Center,
  AspectRatio
};
