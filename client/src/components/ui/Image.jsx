import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Spinner } from '@phosphor-icons/react';

/**
 * Image Component - Estilo Linear completo
 * Con treatment, lazy loading, placeholders y múltiples variantes
 */

const Image = ({ 
  src, 
  alt, 
  width, 
  height, 
  fit = 'cover', 
  loading = 'lazy', 
  placeholder, 
  fallback, 
  radius = 'default', 
  className = '', 
  onLoad, 
  onError, 
  ...props 
}) => {
  const [imageState, setImageState] = useState('loading');
  const [currentSrc, setCurrentSrc] = useState(src);
  const imgRef = useRef(null);

  useEffect(() => {
    setCurrentSrc(src);
    setImageState(src ? 'loading' : 'empty');
  }, [src]);

  const handleLoad = (e) => {
    setImageState('loaded');
    onLoad?.(e);
  };

  const handleError = (e) => {
    setImageState('error');
    if (fallback) {
      setCurrentSrc(fallback);
      setImageState('loaded');
    }
    onError?.(e);
  };

  const getRadiusClasses = () => {
    const radiusMap = {
      none: '',
      sm: 'rounded-sm',
      default: 'rounded-lg',
      md: 'rounded-xl',
      lg: 'rounded-2xl',
      full: 'rounded-full',
      top: 'rounded-t-lg',
      bottom: 'rounded-b-lg'
    };

    return radiusMap[radius] || radiusMap.default;
  };

  const getFitClasses = () => {
    const fitMap = {
      cover: 'object-cover',
      contain: 'object-contain',
      fill: 'object-fill',
      'scale-down': 'object-scale-down',
      none: 'object-none'
    };

    return fitMap[fit] || fitMap.cover;
  };

  const renderPlaceholder = () => {
    if (placeholder) {
      return typeof placeholder === 'string' ? (
        <div className="flex items-center justify-center text-[var(--ln-text-tertiary)] bg-[rgba(255,255,255,0.02)]">
          {placeholder}
        </div>
      ) : (
        placeholder
      );
    }

    return (
      <div className="flex items-center justify-center text-[var(--ln-text-tertiary)] bg-[rgba(255,255,255,0.02)]">
        <ImageIcon className="w-8 h-8" />
      </div>
    );
  };

  const renderError = () => {
    if (fallback && currentSrc !== fallback) {
      return null; // El fallback se mostrará en el img principal
    }

    return (
      <div className="flex items-center justify-center text-[var(--ln-text-tertiary)] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)]">
        <ImageIcon className="w-8 h-8" />
      </div>
    );
  };

  const renderLoading = () => (
    <div className="flex items-center justify-center text-[var(--ln-text-tertiary)] bg-[rgba(255,255,255,0.02)]">
      <Spinner className="w-6 h-6" />
    </div>
  );

  const renderContent = () => {
    switch (imageState) {
      case 'loading':
        return renderLoading();
      case 'error':
        return renderError();
      case 'empty':
        return renderPlaceholder();
      default:
        return (
          <img
            ref={imgRef}
            src={currentSrc}
            alt={alt}
            width={width}
            height={height}
            loading={loading}
            onLoad={handleLoad}
            onError={handleError}
            className={`w-full h-full ${getFitClasses()} ${getRadiusClasses()} transition-opacity duration-200 ${className}`}
            {...props}
          />
        );
    }
  };

  return (
    <div 
      className={`relative overflow-hidden ${getRadiusClasses()} ${className}`}
      style={{ width, height }}
    >
      {renderContent()}
    </div>
  );
};

// Avatar Image Component
export const Avatar = ({ 
  src, 
  alt, 
  size = 'default', 
  name, 
  status, 
  className = '', 
  ...props 
}) => {
  const [imageState, setImageState] = useState(src ? 'loading' : 'empty');

  const getSizeClasses = () => {
    const sizeMap = {
      xs: 'w-6 h-6',
      sm: 'w-8 h-8',
      default: 'w-10 h-10',
      md: 'w-12 h-12',
      lg: 'w-16 h-16',
      xl: 'w-20 h-20'
    };

    return sizeMap[size] || sizeMap.default;
  };

  const getInitials = (name) => {
    if (!name) return '';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  const getStatusClasses = () => {
    const statusMap = {
      online: 'bg-[#10b981]',
      offline: 'bg-[#62666d]',
      busy: 'bg-[#f59e0b]',
      away: 'bg-[#f59e0b]'
    };

    return statusMap[status] || statusMap.offline;
  };

  return (
    <div className={`relative ${getSizeClasses()} ${className}`} {...props}>
      <div className="w-full h-full rounded-full overflow-hidden bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)]">
        {src && imageState !== 'error' ? (
          <Image
            src={src}
            alt={alt}
            fit="cover"
            radius="full"
            className="w-full h-full"
            onLoad={() => setImageState('loaded')}
            onError={() => setImageState('error')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--ln-text-secondary)] bg-[var(--ln-bg-surface)]">
            <span className="text-sm font-[590]">
              {getInitials(name)}
            </span>
          </div>
        )}
      </div>

      {/* Status Indicator */}
      {status && (
        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--ln-bg-surface)] ${getStatusClasses()}`} />
      )}
    </div>
  );
};

// Gallery Image Component
export const GalleryImage = ({ 
  src, 
  alt, 
  caption, 
  onClick, 
  selected = false, 
  className = '', 
  ...props 
}) => {
  const [imageState, setImageState] = useState('loading');

  return (
    <div 
      className={`
        relative group cursor-pointer overflow-hidden rounded-lg
        border-2 transition-all duration-200
        ${selected 
          ? 'border-[var(--ln-accent-violet)] shadow-[rgba(113,112,255,0.4)_0px_0px_0px_2px]' 
          : 'border-transparent hover:border-[rgba(255,255,255,0.12)]'
        }
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      <Image
        src={src}
        alt={alt}
        fit="cover"
        className="w-full h-48"
        onLoad={() => setImageState('loaded')}
        onError={() => setImageState('error')}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {caption && (
          <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
            <p className="text-sm font-[400] line-clamp-2">
              {caption}
            </p>
          </div>
        )}
      </div>

      {/* Selection Indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-[var(--ln-accent-violet)] rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-[590]">✓</span>
        </div>
      )}
    </div>
  );
};

// Hero Image Component
export const HeroImage = ({ 
  src, 
  alt, 
  title, 
  subtitle, 
  height = '400px', 
  className = '', 
  ...props 
}) => {
  const [imageState, setImageState] = useState('loading');

  return (
    <div className={`relative overflow-hidden ${className}`} {...props}>
      <div className="absolute inset-0">
        <Image
          src={src}
          alt={alt}
          fit="cover"
          className="w-full h-full"
          style={{ height }}
          onLoad={() => setImageState('loaded')}
          onError={() => setImageState('error')}
        />
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

      {/* Content */}
      <div className="relative z-10 h-full flex items-center justify-center text-center px-6">
        <div className="max-w-4xl">
          {title && (
            <h1 className="text-4xl md:text-5xl font-[590] text-white mb-4 tracking-[-1.056px] leading-[1.00]">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-lg md:text-xl font-[400] text-white/90 max-w-2xl mx-auto leading-[1.60] tracking-[-0.165px]">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Image;
