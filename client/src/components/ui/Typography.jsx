import React from 'react';

/**
 * Sistema de Tipografía Linear - Componente unificado para toda la jerarquía tipográfica
 * Basado en las especificaciones exactas del DESIGN.md
 */

const Typography = ({ 
  variant = 'body', 
  component, 
  className = '', 
  children, 
  ...props 
}) => {
  // Mapeo de variantes a elementos HTML por defecto
  const defaultComponent = {
    'display-xl': 'h1',
    'display-lg': 'h1', 
    'display': 'h1',
    'h1': 'h1',
    'h2': 'h2',
    'h3': 'h3',
    'body-large': 'p',
    'body-emphasis': 'p',
    'body': 'p',
    'body-medium': 'p',
    'body-semibold': 'p',
    'small': 'p',
    'small-medium': 'p',
    'small-semibold': 'p',
    'small-light': 'p',
    'caption-large': 'span',
    'caption': 'span',
    'label': 'span',
    'micro': 'span',
    'tiny': 'span',
    'link-large': 'a',
    'link-medium': 'a',
    'link-small': 'a',
    'link-caption': 'a',
    'mono-body': 'code',
    'mono-caption': 'code',
    'mono-label': 'code'
  };

  // Sistema completo de estilos tipográficos Linear
  const typographyClasses = {
    // Display Sizes - con letter-spacing negativo agresivo
    'display-xl': 'text-[72px] font-[510] leading-[1.00] tracking-[-1.584px] text-[var(--ln-text-primary)] font-[var(--font-sans)]',
    'display-lg': 'text-[64px] font-[510] leading-[1.00] tracking-[-1.408px] text-[var(--ln-text-primary)] font-[var(--font-sans)]',
    'display': 'text-[48px] font-[510] leading-[1.00] tracking-[-1.056px] text-[var(--ln-text-primary)] font-[var(--font-sans)]',
    
    // Headings
    'h1': 'text-[32px] font-[400] leading-[1.13] tracking-[-0.704px] text-[var(--ln-text-primary)] font-[var(--font-sans)]',
    'h2': 'text-[24px] font-[400] leading-[1.33] tracking-[-0.288px] text-[var(--ln-text-primary)] font-[var(--font-sans)]',
    'h3': 'text-[20px] font-[590] leading-[1.33] tracking-[-0.24px] text-[var(--ln-text-primary)] font-[var(--font-sans)]',
    
    // Body Text
    'body-large': 'text-[18px] font-[400] leading-[1.60] tracking-[-0.165px] text-[var(--ln-text-secondary)] font-[var(--font-sans)]',
    'body-emphasis': 'text-[17px] font-[590] leading-[1.60] tracking-normal text-[var(--ln-text-primary)] font-[var(--font-sans)]',
    'body': 'text-[16px] font-[400] leading-[1.50] tracking-normal text-[var(--ln-text-secondary)] font-[var(--font-sans)]',
    'body-medium': 'text-[16px] font-[510] leading-[1.50] tracking-normal text-[var(--ln-text-primary)] font-[var(--font-sans)]',
    'body-semibold': 'text-[16px] font-[590] leading-[1.50] tracking-normal text-[var(--ln-text-primary)] font-[var(--font-sans)]',
    
    // Small Text
    'small': 'text-[15px] font-[400] leading-[1.60] tracking-[-0.165px] text-[var(--ln-text-secondary)] font-[var(--font-sans)]',
    'small-medium': 'text-[15px] font-[510] leading-[1.60] tracking-[-0.165px] text-[var(--ln-text-primary)] font-[var(--font-sans)]',
    'small-semibold': 'text-[15px] font-[590] leading-[1.60] tracking-[-0.165px] text-[var(--ln-text-primary)] font-[var(--font-sans)]',
    'small-light': 'text-[15px] font-[300] leading-[1.47] tracking-[-0.165px] text-[var(--ln-text-secondary)] font-[var(--font-sans)]',
    
    // Caption & Label
    'caption-large': 'text-[14px] font-[510] leading-[1.50] tracking-[-0.182px] text-[var(--ln-text-secondary)] font-[var(--font-sans)]',
    'caption': 'text-[13px] font-[400] leading-[1.50] tracking-[-0.13px] text-[var(--ln-text-tertiary)] font-[var(--font-sans)]',
    'label': 'text-[12px] font-[400] leading-[1.40] tracking-normal text-[var(--ln-text-secondary)] font-[var(--font-sans)]',
    'micro': 'text-[11px] font-[510] leading-[1.40] tracking-normal text-[var(--ln-text-tertiary)] font-[var(--font-sans)]',
    'tiny': 'text-[10px] font-[400] leading-[1.50] tracking-[-0.15px] text-[var(--ln-text-quaternary)] font-[var(--font-sans)]',
    
    // Links
    'link-large': 'text-[16px] font-[400] leading-[1.50] tracking-normal text-[var(--ln-accent-violet)] hover:text-[var(--ln-accent-hover)] underline font-[var(--font-sans)] transition-colors duration-200',
    'link-medium': 'text-[15px] font-[510] leading-[2.67] tracking-normal text-[var(--ln-accent-violet)] hover:text-[var(--ln-accent-hover)] underline font-[var(--font-sans)] transition-colors duration-200',
    'link-small': 'text-[14px] font-[510] leading-[1.50] tracking-normal text-[var(--ln-accent-violet)] hover:text-[var(--ln-accent-hover)] underline font-[var(--font-sans)] transition-colors duration-200',
    'link-caption': 'text-[13px] font-[400] leading-[1.50] tracking-[-0.13px] text-[var(--ln-accent-violet)] hover:text-[var(--ln-accent-hover)] underline font-[var(--font-sans)] transition-colors duration-200',
    
    // Monospace
    'mono-body': 'text-[14px] font-[400] leading-[1.50] tracking-normal text-[var(--ln-text-secondary)] font-[var(--font-mono)]',
    'mono-caption': 'text-[13px] font-[400] leading-[1.50] tracking-normal text-[var(--ln-text-tertiary)] font-[var(--font-mono)]',
    'mono-label': 'text-[12px] font-[400] leading-[1.40] tracking-normal text-[var(--ln-text-quaternary)] font-[var(--font-mono)]'
  };

  const Component = component || defaultComponent[variant] || 'span';
  const classes = `${typographyClasses[variant]} ${className}`;

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
};

// Componentes especializados para mayor conveniencia
export const Display = ({ size = 'medium', children, ...props }) => {
  const sizeMap = {
    xl: 'display-xl',
    lg: 'display-lg', 
    md: 'display',
    sm: 'h1'
  };
  
  return (
    <Typography variant={sizeMap[size]} {...props}>
      {children}
    </Typography>
  );
};

export const Heading = ({ level = 1, children, ...props }) => {
  const levelMap = {
    1: 'h1',
    2: 'h2', 
    3: 'h3'
  };
  
  return (
    <Typography variant={levelMap[level]} {...props}>
      {children}
    </Typography>
  );
};

export const Text = ({ variant = 'body', children, ...props }) => {
  return (
    <Typography variant={variant} {...props}>
      {children}
    </Typography>
  );
};

export const Link = ({ size = 'medium', children, ...props }) => {
  const sizeMap = {
    large: 'link-large',
    medium: 'link-medium',
    small: 'link-small', 
    caption: 'link-caption'
  };
  
  return (
    <Typography variant={sizeMap[size]} {...props}>
      {children}
    </Typography>
  );
};

export const Mono = ({ variant = 'body', children, ...props }) => {
  const variantMap = {
    body: 'mono-body',
    caption: 'mono-caption',
    label: 'mono-label'
  };
  
  return (
    <Typography variant={variantMap[variant]} {...props}>
      {children}
    </Typography>
  );
};

export default Typography;
